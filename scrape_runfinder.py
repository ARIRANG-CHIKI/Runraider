"""
runfinder.kr 재수집 스크립트 (세 번째 데이터 소스).

2026-08-31: gorunning.kr/marathongo.co.kr 대비 커버리지 비교 결과, 197건 중
저희한테 없는 게 14건, 그 중 진짜 새 대회는 8건 정도였음(나머지는 표기 차이로
인한 중복/취소된 대회 placeholder 텍스트 등 노이즈). 그래도 넣기로 함 - 대신
gorunning.kr 스크래퍼가 오늘 겪은 사고(구조 바뀌어서 필드 텅 빔)를 여기서도
똑같이 방지해야 해서, 동일한 방식의 안전장치를 건다.

runfinder.kr은 자체 API(finddata.php)가 있어서 HTML 파싱이 필요 없음 - 그만큼
구조 변경에는 더 강하지만, API 자체가 막히거나 응답 스키마가 바뀌는 리스크는
동일하게 존재.
"""
import csv
import difflib
import json
import re
import requests

BASE = "https://runfinder.kr"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; RunRaiderBot/1.0)"}

# 저희 기존 데이터셋과 겹치는 대회를 걸러내기 위한 이름 정규화 (제N회, 괄호, 공백 제거)
def norm(name: str) -> str:
    name = re.sub(r"제\d+회|\(.*?\)", "", name)
    name = re.sub(r"[\s\-_]", "", name)
    return name.lower()


def fetch_all_items():
    items = []
    for page in range(1, 6):  # 넉넉하게 5페이지까지 (현재 197건은 2페이지면 충분)
        r = requests.get(f"{BASE}/finddata.php", params={"page": page, "limit": 100, "status": ""},
                          headers=HEADERS, timeout=20)
        r.raise_for_status()
        data = r.json()
        items.extend(data["items"])
        if page >= data["pagination"]["total_pages"]:
            break
    return items


def compute_status(reg_start, reg_end, today_str):
    if not reg_start or not reg_end:
        return "접수중"  # 정보 없으면 일단 노출 (오검출로 숨기는 것보다 나음)
    if today_str < reg_start:
        return "접수전"
    if today_str > reg_end:
        return "접수마감"
    return "접수중"


def main():
    from datetime import date
    today_str = date.today().isoformat()

    try:
        items = fetch_all_items()
    except Exception as e:
        print(f"경고: runfinder.kr 접속 실패 ({e}). 기존 CSV를 보존하고 실패 처리합니다.")
        raise SystemExit(1)

    # 안전장치 1: 최소 건수 (API 응답이 비정상적으로 비면 구조/차단 문제로 판단)
    MIN_ITEMS = 50
    if len(items) < MIN_ITEMS:
        print(f"경고: runfinder.kr에서 {len(items)}건만 수집됨 (최소 {MIN_ITEMS}건 기준 미달). "
              f"API 스키마 변경/차단 가능성. 기존 CSV를 보존하고 실패 처리합니다.")
        raise SystemExit(1)

    # 안전장치 2: 핵심 필드(race_date, region) 완전성 체크
    EMPTY_THRESHOLD = 0.2
    for field in ["race_date", "region"]:
        empty_ratio = sum(1 for i in items if not i.get(field)) / len(items)
        if empty_ratio > EMPTY_THRESHOLD:
            print(f"경고: '{field}' 필드가 {empty_ratio:.0%}나 비어있습니다. "
                  f"API 응답 스키마가 바뀌었을 가능성이 높습니다. 실패 처리합니다.")
            raise SystemExit(1)

    # 저희 기존 데이터(gorunning + marathongo 기반)와 겹치는 이름은 제외
    with open("gorunning_extracted_sample.csv", encoding="utf-8-sig") as f:
        existing_names = {norm(row["race_name"]) for row in csv.DictReader(f)}
    with open("marathongo_domestic_new_only.csv", encoding="utf-8-sig") as f:
        existing_names |= {norm(row["race_name"]) for row in csv.DictReader(f)}

    def is_duplicate(n: str) -> bool:
        if n in existing_names:
            return True
        if any(n in e or e in n for e in existing_names if len(e) >= 4):
            return True
        # 표기 차이(중간 삽입어, 잘린 글자 등)로 부분 문자열로도 안 걸리는 경우까지
        # 잡기 위해 유사도 비교 (예: "jtbc마라톤" vs "jtbc서울마라톤")
        return any(difflib.SequenceMatcher(None, n, e).ratio() >= 0.75 for e in existing_names)

    new_rows = []
    seen = set()
    for i in items:
        raw_name = i["race_name"].strip()
        if "취소" in raw_name:
            continue  # "해당 대회는 취소되었습니다" 같은 placeholder 텍스트
        n = norm(raw_name)
        if not n or is_duplicate(n) or n in seen:
            continue
        if not i.get("race_date"):
            continue  # 날짜 없는 건 사이트 핵심 기능(D-day 등)이 아예 안 돌아서 제외
        seen.add(n)
        new_rows.append({
            "race_name": i["race_name"].strip(),
            "race_date": i["race_date"],
            "distance_labels": (i.get("race_type") or "").replace(",", " "),
            "region": i.get("region") or "",
            "location_detail": i.get("location") or "",
            "host_org": i.get("organizer") or "",
            "registration_status": compute_status(i.get("register_start_date"), i.get("register_end_date"), today_str),
            "source_url": i.get("homepage") or i.get("detail_url") or f"{BASE}{i['race_view_url']}",
            "source": "runfinder.kr",
            "tier": "Tier2",
            "reg_start": i.get("register_start_date") or "",
            "reg_end": i.get("register_end_date") or "",
        })

    fieldnames = ["race_name", "race_date", "distance_labels", "region", "location_detail",
                  "host_org", "registration_status", "source_url", "source", "tier",
                  "reg_start", "reg_end"]
    with open("runfinder_new_only.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for row in new_rows:
            w.writerow(row)

    print(f"수집 완료: 전체 {len(items)}건 중 신규 {len(new_rows)}건 -> runfinder_new_only.csv")


if __name__ == "__main__":
    main()
