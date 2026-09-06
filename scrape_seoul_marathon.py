"""
서울마라톤(동아마라톤, seoul-marathon.com) 개별 스크래퍼 - Tier1 두 번째.

이 사이트는 자바스크립트(SPA)로 화면을 그려서 requests+정규식으로는 접수 상태를
못 읽는다 (원본 HTML엔 텍스트가 없음). Playwright로 실제 렌더링 후 읽어야 함.

접수 페이지(/98) 자체엔 "동마클럽에서 신청하세요"라는 안내만 있고 정작 접수
기간/상태는 안 나온다 - 대신 공지사항 게시판(/94)에 "OO 본접수 마감", "OO 접수
시작" 같은 제목으로 공지가 올라오는 걸 보고 상태를 추정한다. 완전히 구조화된
데이터가 아니라 제목 키워드 기반 추정이라, "마감"/"시작" 둘 다 없는 애매한
제목만 있으면 상태를 함부로 못 정하고 갱신을 스킵한다 (틀리게 우기지 않는 것이
안전).
"""
import re
from datetime import date

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

URL = "https://seoul-marathon.com/94"
RACE_NAME = "서울마라톤(동아마라톤)"

# 제목에 이 키워드가 있으면 접수 관련 공지로 간주
CLOSE_KEYWORDS = ["접수 마감", "접수마감"]
OPEN_KEYWORDS = ["접수 시작", "접수 오픈", "본접수 안내"]
# 주의: "마감 안내"/"접수 안내" 처럼 너무 넓은 키워드는 기록증 제출 마감,
# 선등록 마감 등 접수 자체와 무관한 절차의 마감/안내까지 오판할 수 있어서
# 뺐다 (JTBC 스크래퍼 테스트 중 "기록증 제출 마감"을 접수마감으로 잘못
# 잡는 걸 발견하고 둘 다 좁혀놓음).


def fetch_notices():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        page.goto(URL, wait_until="networkidle", timeout=30000)
        html = page.content()
        browser.close()
    soup = BeautifulSoup(html, "html.parser")
    notices = []
    for it in soup.select("ul.list"):
        title_el = it.select_one("li.tit a span")
        time_el = it.select_one("li.time")
        if not title_el or not time_el:
            continue
        title = title_el.get_text(strip=True)
        d = time_el.get_text(strip=True)
        if re.match(r"^\d{4}-\d{2}-\d{2}$", d):
            notices.append((d, title))
    return notices


def main():
    try:
        notices = fetch_notices()
    except Exception as e:
        print(f"경고: {URL} 접속/렌더링 실패 ({e}). 갱신 스킵.")
        return

    if len(notices) < 3:
        print(f"경고: 공지사항을 {len(notices)}개밖에 못 찾음 (최소 3개 기대). "
              f"페이지 구조가 바뀌었을 가능성. 갱신 스킵.")
        return

    # 최신순으로 정렬(게시판이 이미 최신순이지만 확실히 하기 위해 한 번 더)
    notices.sort(key=lambda x: x[0], reverse=True)

    status = None
    reg_date = None
    for d, title in notices:
        if any(k in title for k in CLOSE_KEYWORDS):
            status = "접수마감"
            reg_date = d
            break
        if any(k in title for k in OPEN_KEYWORDS):
            # 시작 공지가 오래된 거면 그새 마감됐을 수 있음 (마감 공지가 항상
            # 올라온다는 보장이 없어서) - 최근 것만 신뢰한다.
            days_old = (date.today() - date.fromisoformat(d)).days
            if days_old <= 21:
                status = "접수중"
                reg_date = d
            break

    if status is None:
        print("경고: 최근 공지사항에서 신뢰할 만한 접수 마감/시작 키워드를 못 찾음. "
              "애매한 상태로 잘못 덮어쓰지 않기 위해 갱신 스킵.")
        return

    import csv
    with open("seoul_marathon_update.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["race_name", "registration_status", "reg_end", "source_notice_date"])
        w.writeheader()
        w.writerow({"race_name": RACE_NAME, "registration_status": status,
                    "reg_end": reg_date if status == "접수마감" else "",
                    "source_notice_date": reg_date})

    print(f"서울마라톤(동아마라톤) 갱신: {status} (근거 공지 날짜: {reg_date})")


if __name__ == "__main__":
    main()
