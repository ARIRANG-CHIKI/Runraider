"""
gorunning.kr 자동 재수집 스크립트 (트랙 A: 자동화 파이프라인용)

주의: 이 스크립트는 GitHub Actions 러너(실제 인터넷 접속 가능)에서 실행되는 걸 전제로 작성했다.
지금 작업 중인 샌드박스는 gorunning.kr에 직접 접속(curl/requests)이 안 막혀 있어서
실제 HTML 구조를 보고 셀렉터를 확정하지 못했다. 아래 파싱 로직은 gorunning.kr이
공개 페이지에서 보여주는 텍스트 패턴(📅 날짜 | 📍 장소, 거리: ..., 등록 ~월/일)을
근거로 최선으로 짠 것이라, 실제 러너에서 처음 돌릴 때 결과를 한 번 검증해야 한다.
"""
import re
import csv
import time
import requests
from bs4 import BeautifulSoup

BASE = "https://gorunning.kr"
HEADERS = {"User-Agent": "Mozilla/5.0 (compatible; RunRaiderBot/1.0)"}

STATUS_MAP = {
    "등록중": "접수중",
    "등록마감": "접수마감",
    "등록 예정": "접수전",
    "등록예정": "접수전",
}


def fetch(url: str) -> BeautifulSoup:
    r = requests.get(url, headers=HEADERS, timeout=20)
    r.raise_for_status()
    return BeautifulSoup(r.text, "html.parser")


def parse_listing(soup: BeautifulSoup) -> list[dict]:
    records = []
    # 대회 상세 링크는 /races/{id}/{slug}/ 형태
    for a in soup.select('a[href*="/races/"]'):
        href = a.get("href", "")
        if not re.search(r"/races/\d+/", href):
            continue
        name = a.get_text(strip=True)
        if not name:
            continue
        # 링크를 감싸는 카드 블록 텍스트에서 날짜/장소/거리/상태 추출
        card = a.find_parent(["article", "li", "div"]) or a.parent
        block_text = card.get_text(" ", strip=True) if card else ""

        date_m = re.search(r"(\d{4})년\s*(\d{2})월\s*(\d{2})일", block_text)
        place_m = re.search(r"📍\s*([^\n|]+?)(?=\s*거리[:：]|\s*등록|$)", block_text)
        dist_m = re.search(r"거리[:：]\s*([^\n]+?)(?=\s*등록|$)", block_text)
        status_word = "접수중"
        if "마감" in block_text and "등록 ~" not in block_text:
            status_word = "접수마감"
        elif re.search(r"등록\s*~\d{2}/\d{2}", block_text):
            status_word = "접수중"

        records.append({
            "race_name": name,
            "race_date": f"{date_m.group(1)}-{date_m.group(2)}-{date_m.group(3)}" if date_m else "",
            "distance_labels": dist_m.group(1).strip() if dist_m else "",
            "region": "",
            "location_detail": place_m.group(1).strip() if place_m else "",
            "host_org": "",
            "registration_status": status_word,
            "source_url": BASE + href if href.startswith("/") else href,
            "source": "gorunning.kr",
            "tier": "Tier2",
        })
    return records


def main():
    all_records = {}
    # 월별 페이지를 순회 (이번 달 + 다음 5개월)
    from datetime import date
    today = date.today()
    for offset in range(6):
        year = today.year + (today.month - 1 + offset) // 12
        month = (today.month - 1 + offset) % 12 + 1
        url = f"{BASE}/races/monthly/{year}-{month:02d}/"
        try:
            soup = fetch(url)
        except Exception as e:
            print(f"실패: {url} ({e})")
            continue
        for rec in parse_listing(soup):
            all_records[rec["race_name"]] = rec
        time.sleep(1)

    fieldnames = ["race_name", "race_date", "distance_labels", "region",
                  "location_detail", "host_org", "registration_status",
                  "source_url", "source", "tier"]
    with open("gorunning_extracted_sample.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames)
        w.writeheader()
        for rec in all_records.values():
            w.writerow(rec)

    print(f"수집 완료: {len(all_records)}건 -> gorunning_extracted_sample.csv")


if __name__ == "__main__":
    main()
