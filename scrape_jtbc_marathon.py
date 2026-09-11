"""
JTBC 서울마라톤(marathon.jtbc.com) 개별 스크래퍼 - Tier1 세 번째.

서울마라톤(동아마라톤)과 같은 방식(공지사항 제목 키워드로 상태 추정)이지만,
imweb 게시판 템플릿 버전이 달라서 CSS 선택자가 다르다 (li.tit span 대신
li.tit a.list_text_title span, 날짜도 텍스트가 "2일전" 같은 상대시간이라
<li class="time" title="정확한 날짜"> 속성에서 읽어야 함).

주의: "추가접수" 같은 제목은 본접수 마감 후 별도로 짧게(선착순) 열리는
특수 케이스라 CLOSE/OPEN 키워드 둘 다에 안 걸리게 일부러 빼놨다 - 잘못
"접수중"으로 덮어썼다가 실제론 며칠 뒤에나 열리는 거였다는 사고를 막기 위함
(2026-09-06 실제로 이런 공지를 발견: "추가 접수 일정 9월 8일 14시~선착순마감"
- 아직 시작 전인데 제목만 보면 이미 열린 것처럼 보일 수 있어서 위험).
"""
import re
from datetime import date

from playwright.sync_api import sync_playwright
from bs4 import BeautifulSoup

URL = "http://marathon.jtbc.com/17"
RACE_NAME = "JTBC 서울마라톤"

CLOSE_KEYWORDS = ["접수 마감", "접수마감"]
OPEN_KEYWORDS = ["본접수 안내", "본접수 시작", "접수 오픈"]
# 주의: "기록증 제출 마감", "선등록 마감" 같은 건 접수 자체 마감이 아니라
# 서류 제출/선등록 등 다른 절차의 마감이라 일부러 키워드에서 뺐다 - 이걸
# "접수 마감"으로 착각해서 오판한 적 있음(실제 테스트에서 발견).


def fetch_notices():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page()
        # networkidle은 이 사이트에서 안 끝난다(광고/분석 스크립트가 연결을 계속
        # 유지) - domcontentloaded로 받고 게시판 목록 셀렉터가 뜰 때까지만 기다린다.
        page.goto(URL, wait_until="domcontentloaded", timeout=30000)
        page.wait_for_selector("li.tit a.list_text_title", timeout=15000)
        html = page.content()
        browser.close()
    soup = BeautifulSoup(html, "html.parser")
    titles = soup.select("li.tit a.list_text_title span")
    times = soup.select("li.time")
    notices = []
    for t, d in zip(titles, times):
        title = t.get_text(strip=True)
        date_attr = d.get("title", "")
        m = re.match(r"^(\d{4}-\d{2}-\d{2})", date_attr)
        if title and m:
            notices.append((m.group(1), title))
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

    notices.sort(key=lambda x: x[0], reverse=True)

    status = None
    reg_date = None
    for d, title in notices:
        if any(k in title for k in CLOSE_KEYWORDS):
            status = "접수마감"
            reg_date = d
            break
        if any(k in title for k in OPEN_KEYWORDS):
            # "접수 시작/오픈" 공지는 오래된 것일 수 있다 - 그 뒤로 마감 공지가
            # 안 올라왔다고 해서 지금도 열려있다는 보장이 없음 (실제로 4월
            # 공지를 보고 9월에도 "접수중"이라고 오판한 적 있음). 최근 것만
            # 신뢰한다.
            days_old = (date.today() - date.fromisoformat(d)).days
            if days_old <= 21:
                status = "접수중"
                reg_date = d
            break

    if status is None:
        print("경고: 최근 공지사항에서 신뢰할 만한 접수 마감/시작 키워드를 못 찾음 "
              "(오래된 시작 공지나 추가접수 등 애매한 건 일부러 무시함). 갱신 스킵.")
        return

    import csv
    with open("jtbc_marathon_update.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["race_name", "registration_status", "reg_end", "source_notice_date"])
        w.writeheader()
        w.writerow({"race_name": RACE_NAME, "registration_status": status,
                    "reg_end": reg_date if status == "접수마감" else "",
                    "source_notice_date": reg_date})

    print(f"JTBC 서울마라톤 갱신: {status} (근거 공지 날짜: {reg_date})")


if __name__ == "__main__":
    main()
