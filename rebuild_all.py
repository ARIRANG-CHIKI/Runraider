import sqlite3, csv, re, json, os

DB_PATH = "/tmp/marathon_rebuild.db"
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
  registration_status TEXT,
  official_url TEXT,
  last_verified_at TEXT,
  tier TEXT,
  source TEXT,
  reg_start TEXT,
  reg_end TEXT,
  competitiveness_note TEXT
);
CREATE TABLE race_distances (
  distance_id INTEGER PRIMARY KEY AUTOINCREMENT,
  race_id INTEGER NOT NULL REFERENCES races(race_id),
  distance_label TEXT
);
""")

# ---- Tier2: 고러닝 ----
with open("gorunning_extracted_sample.csv", encoding="utf-8-sig") as f:
    rows = list(csv.DictReader(f))
for r in rows:
    cur.execute("""INSERT INTO races (race_name, race_date, region, location_detail, host_org,
                   registration_status, official_url, last_verified_at, tier, source, reg_start, reg_end)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (r["race_name"], r["race_date"], r["region"], r["location_detail"], r["host_org"],
                 r["registration_status"], r["source_url"], "2026-07-27", r["tier"], r["source"], None, None))
    race_id = cur.lastrowid
    for lab in [x for x in r["distance_labels"].split() if x] or ["미정"]:
        cur.execute("INSERT INTO race_distances (race_id, distance_label) VALUES (?,?)", (race_id, lab))

# ---- Tier2: 마라톤GO 국내 전체 스캔에서 발굴한 신규 대회 (고러닝 미등재분) ----
with open("marathongo_domestic_new_only.csv", encoding="utf-8-sig") as f:
    mg_new_rows = list(csv.DictReader(f))
for r in mg_new_rows:
    cur.execute("""INSERT INTO races (race_name, race_date, region, location_detail, host_org,
                   registration_status, official_url, last_verified_at, tier, source, reg_start, reg_end)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?,?)""",
                (r["race_name"], r["race_date"], r["region"], r["location_detail"], r["host_org"],
                 r["registration_status"], r["source_url"], "2026-07-27", r["tier"], r["source"],
                 r["reg_start"] or None, r["reg_end"] or None))
    race_id = cur.lastrowid
    for lab in [x for x in r["distance_labels"].split() if x] or ["미정"]:
        cur.execute("INSERT INTO race_distances (race_id, distance_label) VALUES (?,?)", (race_id, lab))

# ---- Tier1: 메이저 대회 실데이터 ----
tier1 = [
    ("서울마라톤(동아마라톤)", "2027-03-21", None, None, "동아일보사", "접수전",
     "https://seoul-marathon.com/", ["풀코스", "10km"],
     "그룹별(우선접수/골드패키지/일반) 순차 오픈 구조 - 그룹별 마감 속도가 달라 정확한 소요시간은 미확인, 앞 그룹일수록 조기마감 가능성 높음"),
    ("JTBC 서울마라톤", "2026-11-01", None, None, "JTBC", "접수마감",
     "http://marathon.jtbc.com/", ["풀코스", "10km"],
     "2025년 본접수 역대 최다 신청 - 풀코스·10K 모두 10분 이내 마감. 단 2026년부터는 추첨(래플) 방식이라 '빨리'보다 '기간 내' 신청이 핵심"),
    ("춘천마라톤", "2026-10-25", "강원", "춘천 공지천교", "조선일보/춘천시", "접수마감",
     "https://www.chuncheonmarathon.com/", ["풀코스", "10km"],
     "조선멤버십 얼리버드 사전신청권(1000장) 3분 마감. 일반 접수도 선착순이라 오픈 시각(초 단위)까지 미리 준비 필요"),
    ("보스턴 마라톤", "2027-04-19", "해외", None, "B.A.A.", "접수전",
     "https://www.baa.org/races/boston-marathon/", ["풀코스"],
     "자격기록(BQ) 충족자도 정원 초과 시 랜덤 탈락 가능. 2027년부터 컷오프를 살짝 놓친 주자를 위한 신규 '랜덤 선발' 트랙 약 1,000자리 신설"),
    ("도쿄 마라톤", "2027-03-07", "해외", None, "Tokyo Marathon Foundation", "부문별 상이",
     "https://www.marathon.tokyo/en/", ["풀코스"],
     "일반추첨 경쟁률 약 10:1 (30만 명 신청에 3만 명 선발)"),
    ("TCS 뉴욕시티 마라톤", "2026-11-01", "해외", None, "NYRR", "접수마감",
     "https://www.nyrr.org/tcsnycmarathon", ["풀코스"],
     "역대 최다 24만 명 이상 응모 (3개 지역 풀로 나눠 추첨, 정확한 배율은 비공개)"),
    ("시카고 마라톤", "2026-10-11", "해외", None, "Bank of America Chicago Marathon", "접수마감",
     "https://www.chicagomarathon.com/", ["풀코스"],
     "2024년 12만 명 이상 신청에 정원 5만 명 - 경쟁률 약 2.4:1"),
    ("BMW 베를린 마라톤", "2026-09-27", "해외", None, "SCC EVENTS", "접수마감",
     "https://www.bmw-berlin-marathon.com/en/", ["풀코스"],
     "정원 54,000명, WMM 공동 로터리 - 신청자 수 대비 정확한 배율은 비공개"),
    ("TCS 런던 마라톤", "2027-04-25", "해외", None, "London Marathon Events", "접수전",
     "https://www.londonmarathonevents.co.uk/london-marathon/take-part", ["풀코스"],
     "2026년 밸럿에 113만 명 이상 응모(역대 최고) - 일반 자리 약 1.7만 개, 당첨확률 약 1.5%(66명 중 1명) - 6대 메이저 중 가장 낮은 당첨률"),
]
for name, dt, region, loc, host, status, url, dists, comp_note in tier1:
    cur.execute("""INSERT INTO races (race_name, race_date, region, location_detail, host_org,
                   registration_status, official_url, last_verified_at, tier, source, competitiveness_note)
                   VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
                (name, dt, region, loc, host, status, url, "2026-07-27", "Tier1", "공식 사이트 직접확인", comp_note))
    race_id = cur.lastrowid
    for lab in dists:
        cur.execute("INSERT INTO race_distances (race_id, distance_label) VALUES (?,?)", (race_id, lab))

conn.commit()

# ---- 마라톤GO 접수기간 교차보강 ----
with open("marathongo_raw.txt", encoding="utf-8") as f:
    raw = f.read()
entries = re.findall(r"\[(.*?)\]\((https://marathongo\.co\.kr/raceDetail/[^)]+)\)", raw)
period_re = re.compile(r"(\d{4})\.(\d{2})\.(\d{2})\s*~\s*(\d{4})\.(\d{2})\.(\d{2})")

races = cur.execute("SELECT race_id, race_name FROM races").fetchall()
matched = 0
for race_id, race_name in races:
    for inner, url in entries:
        if race_name and race_name in inner:
            m = period_re.search(inner)
            if m:
                start = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
                end = f"{m.group(4)}-{m.group(5)}-{m.group(6)}"
                cur.execute("UPDATE races SET reg_start=?, reg_end=? WHERE race_id=?", (start, end, race_id))
                matched += 1
            break
conn.commit()
print(f"races: {cur.execute('SELECT COUNT(*) FROM races').fetchone()[0]}, marathongo 매칭: {matched}")

# ---- 공식 링크 교체: 마라톤GO/고러닝 상세페이지가 아닌 대회 자체 공식 사이트로 ----
official_matched = 0
for fname in ["official_urls_batch1.csv", "official_urls_batch2.csv", "official_urls_batch3.csv",
              "official_urls_batch4.csv", "official_urls_batch5.csv", "official_urls_batch6.csv",
              "official_urls_batch7a.csv", "official_urls_batch7b.csv", "official_urls_batch7c.csv",
              "official_urls_batch8_known.csv"]:
    with open(fname, encoding="utf-8-sig") as f:
        for row in csv.DictReader(f):
            cur.execute("SELECT race_id FROM races WHERE race_name=?", (row["race_name"],))
            hit = cur.fetchone()
            if hit:
                cur.execute("UPDATE races SET official_url=? WHERE race_id=?",
                            (row["official_url"], hit[0]))
                official_matched += 1
conn.commit()
print(f"공식 링크 교체: {official_matched}건 (마라톤GO 상세페이지 -> 대회 자체 공식 사이트)")

# ---- 러너블(runable.me) 접수시각 정밀 보강: 분 단위 접수 시작 시각 ----
cur.execute("ALTER TABLE races ADD COLUMN reg_start_time TEXT")
RUNABLE_TIME_FIX = {
    "인사이더런": {"time": "14:00"},
    "WYD와 함께하는": {"time": "09:00", "reg_start": "2026-08-02", "reg_end": "2026-08-23"},  # 생명사랑 마라톤·걷기대회
}
races2 = cur.execute("SELECT race_id, race_name FROM races").fetchall()
runable_matched = 0
for race_id, race_name in races2:
    for key, fix in RUNABLE_TIME_FIX.items():
        if key in race_name:
            cur.execute("UPDATE races SET reg_start_time=? WHERE race_id=?", (fix["time"], race_id))
            if fix.get("reg_start"):
                cur.execute("UPDATE races SET reg_start=?, reg_end=? WHERE race_id=?",
                            (fix["reg_start"], fix["reg_end"], race_id))
            runable_matched += 1
            break
conn.commit()
print(f"러너블 접수시각 보강: {runable_matched}건")

# ---- 참가비·정원 정보 보강 ----
cur.execute("ALTER TABLE races ADD COLUMN fee_info TEXT")
cur.execute("ALTER TABLE races ADD COLUMN capacity_info TEXT")
fee_matched = 0
with open("fee_capacity.json", encoding="utf-8") as f:
    fee_data = json.load(f)
for race_name, info in fee_data.items():
    cur.execute("SELECT race_id FROM races WHERE race_name=?", (race_name,))
    hit = cur.fetchone()
    if hit:
        cur.execute("UPDATE races SET fee_info=?, capacity_info=? WHERE race_id=?",
                     (info.get("fee"), info.get("capacity"), hit[0]))
        fee_matched += 1
conn.commit()
print(f"참가비·정원 정보 보강: {fee_matched}건")

# ---- 최종 JSON 내보내기 ----
out_rows = cur.execute("""
    SELECT r.race_id, r.race_name, r.race_date, r.region, r.location_detail, r.host_org,
           r.registration_status, r.official_url, r.tier, r.last_verified_at,
           r.reg_start, r.reg_end, GROUP_CONCAT(d.distance_label, ', '), r.reg_start_time,
           r.competitiveness_note, r.fee_info, r.capacity_info
    FROM races r LEFT JOIN race_distances d ON r.race_id = d.race_id
    GROUP BY r.race_id
    ORDER BY r.race_date
""").fetchall()

data = []
for r in out_rows:
    data.append({
        "id": r[0], "name": r[1], "date": r[2], "region": r[3] or "기타",
        "place": r[4] or "", "host": r[5] if (r[5] and r[5].strip() not in ("", "-")) else "",
        "status": r[6], "url": r[7],
        "tier": r[8], "lastVerifiedAt": r[9], "regStart": r[10], "regEnd": r[11],
        "distances": (r[12] if r[12] and r[12] != "미정" else "거리 미확인"), "regStartTime": r[13], "competitivenessNote": r[14],
        "feeInfo": r[15], "capacityInfo": r[16]
    })

with open("data_export.json", "w", encoding="utf-8") as f:
    json.dump({"generatedAt": "2026-07-27", "races": data}, f, ensure_ascii=False, indent=0)

print(f"data_export.json 저장 완료, {len(data)}건")
conn.close()
