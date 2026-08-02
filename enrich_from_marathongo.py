import re, sqlite3, json
from datetime import date

TODAY = date(2026, 7, 27)

with open("marathongo_raw.txt", encoding="utf-8") as f:
    raw = f.read()

# split into bracket entries: [innertext](url)
entries = re.findall(r"\[(.*?)\]\((https://marathongo\.co\.kr/raceDetail/[^)]+)\)", raw)
print(f"marathongo 항목 수: {len(entries)}")

conn = sqlite3.connect("/tmp/marathon.db")
cur = conn.cursor()
cur.execute("ALTER TABLE races ADD COLUMN reg_start TEXT")
cur.execute("ALTER TABLE races ADD COLUMN reg_end TEXT")
cur.execute("ALTER TABLE races ADD COLUMN source2 TEXT")

races = cur.execute("SELECT race_id, race_name FROM races").fetchall()

period_re = re.compile(r"(\d{4})\.(\d{2})\.(\d{2})\s*~\s*(\d{4})\.(\d{2})\.(\d{2})")

matched = 0
for race_id, race_name in races:
    for inner, url in entries:
        if race_name and race_name in inner:
            m = period_re.search(inner)
            if m:
                start = f"{m.group(1)}-{m.group(2)}-{m.group(3)}"
                end = f"{m.group(4)}-{m.group(5)}-{m.group(6)}"
                cur.execute("UPDATE races SET reg_start=?, reg_end=?, source2=? WHERE race_id=?",
                            (start, end, "marathongo.co.kr", race_id))
                matched += 1
            break

conn.commit()
print(f"marathongo 접수기간 매칭 성공: {matched}건")

# ---- 마감임박 / 시작임박 계산 ----
rows = cur.execute("""
    SELECT race_id, race_name, race_date, region, registration_status, reg_start, reg_end
    FROM races WHERE reg_start IS NOT NULL
""").fetchall()

closing_soon, opening_soon = [], []
for race_id, name, race_date, region, status, reg_start, reg_end in rows:
    if reg_end:
        d_close = (date.fromisoformat(reg_end) - TODAY).days
        if status == "접수중" and 0 <= d_close <= 7:
            closing_soon.append((name, race_date, region, reg_end, d_close))
    if reg_start:
        d_open = (date.fromisoformat(reg_start) - TODAY).days
        if status in ("접수전",) and 0 <= d_open <= 14:
            opening_soon.append((name, race_date, region, reg_start, d_open))

closing_soon.sort(key=lambda x: x[4])
opening_soon.sort(key=lambda x: x[4])

print("\n=== 마감임박 (접수중 + 마감 7일 이내) ===")
for r in closing_soon:
    print(r)

print("\n=== 시작임박 (접수전 + 오픈 14일 이내) ===")
for r in opening_soon:
    print(r)

with open("urgency.json", "w", encoding="utf-8") as f:
    json.dump({"closing_soon": closing_soon, "opening_soon": opening_soon}, f, ensure_ascii=False)

conn.close()
