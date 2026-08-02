import re, csv, json

SRC = "/sessions/adoring-hopeful-sagan/mnt/.claude/projects/C--Users----AppData-Roaming-Claude-local-agent-mode-sessions-69f2b30e-5de3-45fc-9f94-7f03a7924e0d-adb612e3-f29e-46e6-9bcf-48a689ea64a8-local-d097f789-942d-4999-8c22-a11c8566cc92-outputs/32f4d7f7-ab44-4192-874f-9d8bc9b667d1/tool-results/mcp-workspace-web_fetch-1785138798029.txt"

with open(SRC, encoding="utf-8") as f:
    lines = f.readlines()

month_re = re.compile(r"^##\s+(\d{4})년\s+(\d{2})월")
day_re = re.compile(r"^###\s+(\d{2})월\s+(\d{2})일")
# table row: | idx | [name](url) ... | distances | region | place | host | status |
row_re = re.compile(
    r"^\|\s*\d+\s*\|\s*\[(?P<name>[^\]]+)\]\((?P<url>[^)]+)\)\s*\|\s*(?P<dist>[^|]*)\|\s*(?P<region>[^|]*)\|\s*(?P<place>[^|]*)\|\s*(?P<host>[^|]*)\|\s*(?P<status>[^|]*)\|"
)

cur_year, cur_month = None, None
records = []

for line in lines:
    line = line.rstrip("\n")
    m = month_re.match(line)
    if m:
        cur_year, cur_month = m.group(1), m.group(2)
        continue
    d = day_re.match(line)
    if d:
        cur_month, cur_day = d.group(1), d.group(2)
        continue
    r = row_re.match(line)
    if r and cur_year:
        records.append({
            "race_name": r.group("name").strip(),
            "race_date": f"{cur_year}-{cur_month}-{cur_day}",
            "distance_labels": r.group("dist").strip(),
            "region": r.group("region").strip(),
            "location_detail": r.group("place").strip(),
            "host_org": r.group("host").strip(),
            "registration_status_raw": r.group("status").strip(),
            "source_url": r.group("url").strip(),
            "source": "gorunning.kr",
            "tier": "Tier2",
        })

# normalize status to our schema's registration_status vocabulary
status_map = {"등록중": "접수중", "등록마감": "접수마감", "등록 예정": "접수전", "등록예정": "접수전"}
for rec in records:
    rec["registration_status"] = status_map.get(rec["registration_status_raw"], rec["registration_status_raw"])

print(f"파싱된 레코드 수: {len(records)}")
print(json.dumps(records[:5], ensure_ascii=False, indent=2))

with open("gorunning_extracted_sample.csv", "w", newline="", encoding="utf-8-sig") as f:
    fieldnames = ["race_name","race_date","distance_labels","region","location_detail","host_org","registration_status","source_url","source","tier"]
    w = csv.DictWriter(f, fieldnames=fieldnames)
    w.writeheader()
    for rec in records:
        w.writerow({k: rec[k] for k in fieldnames})

print("CSV 저장 완료: gorunning_extracted_sample.csv")
