"""
춘천마라톤(chuncheonmarathon.com) 개별 스크래퍼 - 인기 Tier1 메이저 대회 몇 개만
직접 사이트에서 상태를 가져오자는 절충안의 첫 번째. gorunning.kr 같은 통합
사이트가 아니라 대회 주최측이 직접 운영하는 사이트라, 오히려 노출을 원해서
차단 위험은 낮다고 판단(마감시일 봇 차단 없음, 서버가 HTML을 바로 내려줌).

같은 방식을 다른 메이저 대회에도 쓰려면 사이트마다 이 스크립트를 새로 짜야 한다 -
서울마라톤/JTBC 서울마라톤은 확인해보니 자바스크립트로 화면을 그리는 방식이라
이 방식(requests+정규식)으로는 안 되고, 헤드리스 브라우저가 필요해서 별도 작업.

접수 일정이 "명예의 전당 접수 -> 조선멤버십 얼리버드 -> N회 완주자 접수 -> 일반접수
Full -> 일반접수 10km" 이렇게 여러 단계로 나뉘어 있어서, 정확한 단계별 판정 대신
전체 단계 중 제일 이른 시작일 ~ 제일 늦은 마감일을 접수기간으로 보고 상태를 판정한다
(엄밀하진 않지만, "완전히 시작 전"과 "완전히 끝남"은 정확히 구분됨).
"""
import re
import requests

URL = "https://www.chuncheonmarathon.com/"
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 "
                  "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
}
RACE_NAME = "춘천마라톤"  # rebuild_all.py의 tier1 리스트에 있는 정확한 이름과 일치해야 함


def parse_korean_date(text: str, year: int):
    """'7월 20일(월) 10시' 같은 텍스트를 (월, 일, 시) 튜플로 변환. 못 찾으면 None."""
    m = re.search(r"(\d{1,2})월\s*(\d{1,2})일.*?(\d{1,2})시", text)
    if not m:
        return None
    month, day, hour = int(m.group(1)), int(m.group(2)), int(m.group(3))
    return f"{year}-{month:02d}-{day:02d}"


def main():
    try:
        r = requests.get(URL, headers=HEADERS, timeout=20)
        r.raise_for_status()
        r.encoding = "utf-8"  # 서버가 charset 헤더를 안 줘서 requests가 ISO-8859-1로 잘못 추측함
        html = r.text
    except Exception as e:
        print(f"경고: {URL} 접속 실패 ({e}). 갱신 스킵.")
        return

    # 대회일에서 연도 추출 (예: "2026년 10월 25일(일) 09시")
    m_year = re.search(r"(\d{4})년\s*\d{1,2}월\s*\d{1,2}일", html)
    if not m_year:
        print("경고: 대회 연도를 못 찾음 - 페이지 구조가 바뀌었을 가능성. 갱신 스킵.")
        return
    year = int(m_year.group(1))

    idx = html.find("접수일정")
    if idx == -1:
        print("경고: '접수일정' 섹션을 못 찾음 - 페이지 구조가 바뀌었을 가능성. 갱신 스킵.")
        return
    section = html[idx:idx + 4000]

    # 각 <span class="text-content">...</span> 안의 날짜 텍스트를 전부 모아서
    # 제일 이른 날짜 / 제일 늦은 날짜를 찾는다.
    dates = []
    for content in re.findall(r'text-content">([^<]+)</span>', section):
        d = parse_korean_date(content, year)
        if d:
            dates.append(d)

    if len(dates) < 2:
        print(f"경고: 접수 날짜를 {len(dates)}개밖에 못 찾음 (최소 2개 기대). "
              f"페이지 구조가 바뀌었을 가능성. 갱신 스킵.")
        return

    reg_start, reg_end = min(dates), max(dates)

    from datetime import date
    today_str = date.today().isoformat()
    if today_str < reg_start:
        status = "접수전"
    elif today_str > reg_end:
        status = "접수마감"
    else:
        status = "접수중"

    import csv
    with open("chuncheon_update.csv", "w", newline="", encoding="utf-8-sig") as f:
        w = csv.DictWriter(f, fieldnames=["race_name", "registration_status", "reg_start", "reg_end"])
        w.writeheader()
        w.writerow({"race_name": RACE_NAME, "registration_status": status, "reg_start": reg_start, "reg_end": reg_end})

    print(f"춘천마라톤 갱신: {status} ({reg_start} ~ {reg_end})")


if __name__ == "__main__":
    main()
