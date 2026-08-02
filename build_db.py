import sqlite3, csv, os

DB_PATH = "/tmp/marathon.db"
if os.path.exists(DB_PATH):
    os.remove(DB_PATH)

conn = sqlite3.connect(DB_PATH)
cur = conn.cursor()

cur.executescript("""
CREATE TABLE races (
  race_id INTEGER PRIMARY KEY AUTOINCREMENT,
  race_name TEXT NOT NULL,
  race_date TEXT,
  region TEXT,
  location_detail TEXT,
  host_org TEXT,
  registration_start TEXT,
  registration_end TEXT,
  registration_status TEXT,
  official_url TEXT,
  last_verified_at TEXT,
  tier TEXT,
  source TEXT,
  course_elevation_profile TEXT,
  course_difficulty_score TEXT
);

CREATE TABLE race_distances (
  distance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  race_id INTEGER NOT NULL REFERENCES races(race_id),
  distance_label TEXT,
  fee TEXT,
  capacity TEXT
);

CREATE TABLE race_resources (
  resource_id INTEGER PRIMARY KEY AUTOINCREMENT,
  race_id INTEGER REFERENCES races(race_id),
  resource_type TEXT,
  title TEXT,
  url TEXT,
  summary TEXT,
  curated_by TEXT,
  last_reviewed_at TEXT
);
""")

# ---- Tier2: 고러닝 크롤링 결과 적재 ----
with open("gorunning_extracted_sample.csv", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))

for r in rows:
    cur.execute("""
        INSERT INTO races (race_name, race_date, region, location_detail, host_org,
                           registration_status, official_url, last_verified_at, tier, source)
        VALUES (?,?,?,?,?,?,?,?,?,?)
    """, (r["race_name"], r["race_date"], r["region"], r["location_detail"], r["host_org"],
          r["registration_status"], r["source_url"], "2026-07-27", r["tier"], r["source"]))
    race_id = cur.lastrowid
    labels = [x for x in r["distance_labels"].split() if x]
    if not labels:
        labels = ["미정"]
    for lab in labels:
        cur.execute("INSERT INTO race_distances (race_id, distance_label) VALUES (?,?)", (race_id, lab))

# ---- Tier1: 실데이터 수집 결과 적재 (앞서 조사한 7개 메이저 대회) ----
tier1 = [
    ("서울마라톤(동아마라톤)", "2027-03-21", None, None, "동아일보사", "접수전",
     "https://seoul-marathon.com/", ["풀코스", "10km"]),
    ("JTBC 서울마라톤", "2026-11-01", None, None, "JTBC", "접수마감",
     "http://marathon.jtbc.com/", ["풀코스", "10km"]),
    ("춘천마라톤", "2026-10-25", "강원", "춘천 공지천교", "조선일보/춘천시", "접수마감",
     "https://www.chuncheonmarathon.com/", ["풀코스", "10km"]),
    ("보스턴 마라톤", "2027-04-19", None, None, "B.A.A.", "접수전",
     "https://www.baa.org/races/boston-marathon/", ["풀코스"]),
    ("도쿄 마라톤", "2027-03-07", None, None, "Tokyo Marathon Foundation", "부문별 상이",
     "https://www.marathon.tokyo/en/", ["풀코스"]),
    ("TCS 뉴욕시티 마라톤", "2026-11-01", None, None, "NYRR", "접수마감",
     "https://www.nyrr.org/tcsnycmarathon", ["풀코스"]),
    ("시카고 마라톤", "2026-10-11", None, None, "Bank of America Chicago Marathon", "접수마감",
     "https://www.chicagomarathon.com/", ["풀코스"]),
]
for name, date, region, loc, host, status, url, dists in tier1:
    cur.execute("""
        INSERT INTO races (race_name, race_date, region, location_detail, host_org,
                           registration_status, official_url, last_verified_at, tier, source)
        VALUES (?,?,?,?,?,?,?,?,?,?)
    """, (name, date, region, loc, host, status, url, "2026-07-27", "Tier1", "공식 사이트 직접확인"))
    race_id = cur.lastrowid
    for lab in dists:
        cur.execute("INSERT INTO race_distances (race_id, distance_label) VALUES (?,?)", (race_id, lab))

conn.commit()

# ---- 검증 쿼리 ----
print("=== 전체 레코드 수 ===")
print("races:", cur.execute("SELECT COUNT(*) FROM races").fetchone()[0])
print("race_distances:", cur.execute("SELECT COUNT(*) FROM race_distances").fetchone()[0])

print("\n=== 계층(tier)별 대회 수 ===")
for row in cur.execute("SELECT tier, COUNT(*) FROM races GROUP BY tier ORDER BY 2 DESC"):
    print(row)

print("\n=== 지역별 대회 수 top5 (Tier2만) ===")
for row in cur.execute("SELECT region, COUNT(*) c FROM races WHERE tier='Tier2' GROUP BY region ORDER BY c DESC LIMIT 5"):
    print(row)

print("\n=== 접수상태별 분포 ===")
for row in cur.execute("SELECT registration_status, COUNT(*) FROM races GROUP BY registration_status ORDER BY 2 DESC"):
    print(row)

print("\n=== 서울 지역 + 접수중인 대회, 대회일 빠른 순 5개 ===")
for row in cur.execute("""
    SELECT race_name, race_date, registration_status
    FROM races WHERE region='서울' AND registration_status='접수중'
    ORDER BY race_date LIMIT 5
"""):
    print(row)

print("\n=== JOIN 테스트: 대회별 거리 옵션 묶어보기 (앞 5개) ===")
for row in cur.execute("""
    SELECT r.race_name, GROUP_CONCAT(d.distance_label, ', ') AS distances
    FROM races r JOIN race_distances d ON r.race_id = d.race_id
    GROUP BY r.race_id LIMIT 5
"""):
    print(row)

print("\n=== Tier1 대회 목록 (races + race_distances 조인) ===")
for row in cur.execute("""
    SELECT r.race_name, r.race_date, r.registration_status, GROUP_CONCAT(d.distance_label, ', ')
    FROM races r JOIN race_distances d ON r.race_id = d.race_id
    WHERE r.tier='Tier1'
    GROUP BY r.race_id ORDER BY r.race_date
"""):
    print(row)

conn.close()
print("\nDB 저장 완료:", DB_PATH)
