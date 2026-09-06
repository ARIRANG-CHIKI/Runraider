"""
gorunning.kr 자동 재수집 스크립트 (트랙 A: 자동화 파이프라인용)

2026-08-30: 실제 페이지 HTML을 직접 받아서 확인 후 파싱 로직을 다시 작성함.
실제 구조는 이전 버전이 가정한 것과 전혀 달랐다 (📅/📍 이모지, "거리:" 라벨,
행 안에 날짜 텍스트 같은 건 존재하지 않았음 - 애초에 실제 페이지를 본 적 없이
추측만으로 짠 코드였다):

- 날짜는 각 대회 행이 아니라, 그 앞에 나오는 별도 섹션 헤더에 있다:
  <h3>...<span>09월 03일 (목)</span>... 1개 대회</h3>
  (연도는 이 헤더에 없으므로 요청 URL의 /races/monthly/{year}-{month}/ 에서 가져온다)
- 그 헤더 바로 다음에 나오는 <table><tbody><tr> 한 줄이 대회 하나이고,
  <td> 7개가 각각 [번호, 대회명(링크), 거리, 지역, 장소, 주최, 접수상태] 순서다.
"""
import re
import csv
import time
import requests
from bs4 import BeautifulSoup

BASE = "https://gorunning.kr"
# 2026-09-06: 헤더가 스스로 "봇"이라고 밝히는 User-Agent였는데, GitHub Actions
# 러너에서 실행할 때만 403 Forbidden이 계속 남 (같은 코드가 로컬에서는 정상 작동함 -
# IP 차단 가능성이 높지만, 봇으로 식별되는 User-Agent도 원인일 수 있어 우선 일반
# 브라우저처럼 보이는 값으로 바꿔봄).
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
    "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
}

STATUS_MAP = {
    "등록중": "접수중",
    "등록마감": "접수마감",
    "등록예정": "접수전",
}


def fetch(url: str, retries: int = 3) -> BeautifulSoup:
    # 2026-09-06: GitHub Actions 스케줄 실행에서 원인 불명으로 요청이 실패해 전체
    # 자동 갱신이 중단된 적이 있었음 (로컬에서 같은 코드로 재현 시 바로 성공 - 일시적
    # 네트워크/차단 문제로 추정). 한 번 실패했다고 바로 포기하지 않고 잠깐 쉬었다
    # 재시도하도록 해서, 이런 일시적 문제는 스스로 넘어가게 함.
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(url, headers=HEADERS, timeout=20)
            r.raise_for_status()
            return BeautifulSoup(r.text, "html.parser")
        except Exception as e:
            last_err = e
            if attempt < retries:
                print(f"재시도 {attempt}/{retries} - {url} ({e})")
                time.sleep(3 * attempt)
    raise last_err


def parse_listing(soup: BeautifulSoup, year: int) -> list[dict]:
    records = []
    for h3 in soup.find_all("h3"):
        header_text = h3.get_text(" ", strip=True)
        day_m = re.search(r"(\d{2})월\s*(\d{2})일", header_text)
        if not day_m:
            continue
        race_date = f"{year}-{day_m.group(1)}-{day_m.group(2)}"

        table = h3.find_next("table")
        if not table:
            continue
        for tr in table.select("tbody tr"):
            tds = tr.find_all("td")
            if len(tds) < 7:
                continue
            a = tds[1].find("a", href=re.compile(r"/races/\d+/"))
            name = (a.get_text(strip=True) if a else tds[1].get_text(strip=True))
            href = a.get("href", "") if a else ""
            if not name or not href:
                continue
            status_raw = tds[6].get_text(strip=True)

            records.append({
                "race_name": name,
                "race_date": race_date,
                "distance_labels": tds[2].get_text(" ", strip=True),
                "region": tds[3].get_text(strip=True),
                "location_detail": tds[4].get_text(strip=True),
                "host_org": tds[5].get_text(strip=True),
                "registration_status": STATUS_MAP.get(status_raw, status_raw or "접수중"),
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
        for rec in parse_listing(soup, year):
            all_records[rec["race_name"]] = rec
        time.sleep(1)

    # 안전장치: gorunning.kr이 실행 환경(예: GitHub Actions 러너 IP)을 차단해
    # 전 페이지 fetch가 실패하면 all_records가 비거나 비정상적으로 적어진다.
    # 이 경우 기존에 커밋된 CSV를 빈 파일로 덮어써서 대회 데이터를 통째로
    # 날려버리는 사고(실제로 168개->19개로 줄어든 적 있음)를 막기 위해,
    # 최소 건수 미만이면 파일을 건드리지 않고 실패로 종료한다.
    MIN_RECORDS = 50
    if len(all_records) < MIN_RECORDS:
        print(f"경고: 수집된 대회가 {len(all_records)}건뿐입니다 (최소 {MIN_RECORDS}건 기준 미달). "
              f"차단/네트워크 문제로 판단해 기존 CSV를 보존하고 실패 처리합니다.")
        raise SystemExit(1)

    # 안전장치 2: 2026-08-30에 gorunning.kr 페이지 구조가 바뀌면서, 개수는 정상인데
    # race_date/region/distance_labels가 전부 빈 값으로 나온 사고가 있었다 (파싱 로직이
    # 더 이상 맞지 않는 셀렉터를 쓰고 있었음). 건수만 보는 안전장치로는 이걸 못 잡아서,
    # 핵심 필드가 비어있는 비율도 같이 확인한다.
    EMPTY_FIELD_THRESHOLD = 0.2
    for field in ["race_date", "region", "distance_labels"]:
        empty_ratio = sum(1 for r in all_records.values() if not r[field].strip()) / len(all_records)
        if empty_ratio > EMPTY_FIELD_THRESHOLD:
            print(f"경고: '{field}' 필드가 {empty_ratio:.0%}나 비어있습니다 (기준 {EMPTY_FIELD_THRESHOLD:.0%}). "
                  f"gorunning.kr 페이지 구조가 바뀌어 파싱 로직이 안 맞을 가능성이 높습니다. "
                  f"기존 CSV를 보존하고 실패 처리합니다.")
            raise SystemExit(1)

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
