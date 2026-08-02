const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, VerticalAlign
} = require('docx');

const FONT = "맑은 고딕";
const PAGE_WIDTH = 12240;
const PAGE_HEIGHT = 15840;
const MARGIN = 900;
const TABLE_WIDTH = PAGE_WIDTH - MARGIN * 2;

function txt(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: 20, ...opts });
}
function headerCell(text, width, opts = {}) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: opts.fill || "2F5496" },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 110, right: 110 },
    children: [new Paragraph({ children: [txt(text, { bold: true, color: "FFFFFF", size: 18 })] })]
  });
}
function bodyCell(text, width, opts = {}) {
  const lines = Array.isArray(text) ? text : [text];
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 80, bottom: 80, left: 110, right: 110 },
    shading: opts.fill ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill } : undefined,
    children: lines.map(l => new Paragraph({
      children: [txt(l, { bold: !!opts.bold, size: opts.size || 18 })],
      spacing: { after: 30 }
    }))
  });
}
function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 300, after: 140 },
    border: { bottom: { color: "2F5496", space: 4, style: BorderStyle.SINGLE, size: 8 } },
    children: [txt(text, { bold: true, size: 26, color: "2F5496" })]
  });
}
function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 100 },
    children: [txt(text, { bold: true, size: 21, color: "1F3864" })]
  });
}
function p(text, opts = {}) {
  return new Paragraph({ spacing: { after: 120, line: 300 }, children: [txt(text, { size: 19, ...opts })] });
}
function bullet(text) {
  return new Paragraph({ spacing: { after: 60, line: 280 }, bullet: { level: 0 }, children: [txt(text, { size: 19 })] });
}

// ---- 변경 이력 ----
const logWidths = [1600, 8840];
const logHeader = new TableRow({ tableHeader: true, children: [headerCell("날짜", logWidths[0]), headerCell("결정/추가 내용", logWidths[1])] });
const logRows = [
  ["2026-07-27", "벤치마킹 7개 사이트 조사, 개선방향 6가지, 방향성 3축, 마일스톤 5단계 확정"],
  ["2026-07-27", "국내 85% : 해외 15% 커버리지 비중 확정"],
  ["2026-07-27", "데이터 소스 Tier1(메이저 직접소스)/Tier2(국내 롱테일 크롤링)/Tier3(발굴·보강) 3계층 전략 확정"],
  ["2026-07-27", "DB 스키마 1차 확정: races + race_distances (검증이력 테이블은 제외, last_verified_at 필드로 단순화)"],
  ["2026-07-27", "Tier1 메이저 대회 7곳 실데이터 수집 완료 (접수상태·기간·정원 확인)"],
  ["2026-07-27", "race_resources 서브테이블 추가 결정: 국내(코스후기·꿀팁 큐레이션) / 해외(자체 작성 접수가이드)"],
  ["2026-07-27", "race_resources 콘텐츠 1차 제작: 국내 3개 대회(서울/JTBC/춘천) 코스후기·꿀팁 큐레이션 + 해외 4개 대회(보스턴/도쿄/뉴욕/시카고) 접수가이드 작성"],
  ["2026-07-27", "마감임박·시작임박 로직 구현 (마라톤GO 접수기간 데이터로 166건 중 37건 실제 D-day 계산 검증)"],
  ["2026-07-27", "배포 가능한 정적 웹앱(index.html/style.css/app.js/data.json) 빌드 및 로컬 테스트 완료. 브랜드명 '런레이더' 확정"],
  ["2026-07-27", "Tier1에 BMW 베를린 마라톤·TCS 런던 마라톤 추가 수집 완료 - 6대 월드 메이저(보스턴·도쿄·런던·베를린·시카고·뉴욕) 전부 확보 (총 168건). 마라톤GO 해외 목록(약 90건)을 Tier3 발굴 소스로 식별, 파싱은 다음 단계 예정"],
  ["2026-07-27", "마라톤GO 국내 목록 전체 스캔 완료: 고러닝 159건과 대조해 신규 10건 발굴(중복 4건은 검증 후 제외), 접수기간 교차보강 매칭 37→42건으로 확대 (총 178건). 남은 후보 소스 4곳 상태 확정 - 러닝위키(저작권 경고로 스크래핑 보류), 로드런(EUC-KR 인코딩+네트워크 정책 이중 차단), 랭킹마라톤·전국마라톤협회(JS 렌더링으로 정적 수집 불가)"],
  ["2026-07-27", "신규 소스 러너블(runable.me) 발굴: 접수시작을 분 단위로 제공 - 기존 대회 2건(인사이더런, WYD 생명사랑)에 정밀 시각 반영해 '시작임박' 정확도 향상(reg_start_time 필드 추가). 경쟁 서비스 런콕(runkok.com) 확인 - 우리와 동일하게 마감임박/시작임박 알림을 포지셔닝 중, 벤치마킹 대상 추가. 잠수교10K나이트런(내일 07.28 14시 접수 시작 - D-1 초긴급) 등 8건은 대회일 미확정으로 보류, 상세페이지 확인 후 다음 회차에 추가 예정 - 확인 안 된 날짜는 신뢰도 원칙상 임의로 넣지 않음"],
  ["2026-07-27", "races 테이블에 competitiveness_note 필드 신설: Tier1 9개 대회 전부에 실제 접수 경쟁 강도(마감 소요시간·경쟁률·당첨률) 리서치 반영 - 예) 춘천 사전신청 3분마감, JTBC 10분마감, 런던 밸럿 113만명 응모/당첨률 1.5%(역대최저), 시카고 2.4:1, 도쿄 10:1, 보스턴 2027년 신규 랜덤선발 트랙 추가. 대회 목록 화면에 🔥 배지로 노출"],
  ["2026-07-27", "official_url 신뢰도 개선: Tier2 대회 링크가 마라톤GO 상세페이지(중간 사이트)로 걸려있던 문제 발견 - 각 상세페이지의 '신청하기' 버튼(대회 자체 공식 사이트)을 추출해 15건 교체 완료. 단 JTBC처럼 러너블이 공식 접수 대행 파트너인 경우는 러너블 링크가 곧 공식 채널이므로 그대로 유지. 나머지 Tier2도 순차 교체 예정 - '우리가 직접 안내판이지 중간 사이트가 아니다'는 원칙 재확인"],
  ["2026-07-27", "사이트 구조 변경: 목록에서 누르면 바로 외부(공식/마라톤GO) 사이트로 나가던 것을 race.html 자체 상세페이지로 먼저 연결되도록 변경. 상세페이지에서 접수기간·경쟁강도·코스꿀팁(국내)/접수가이드(해외)를 보여주고, 맨 아래 '공식 사이트에서 신청하기' 버튼을 눌러야 실제 외부로 이동 - race_resources 콘텐츠(9건)를 문서에만 머물지 않고 실제 화면에 최초로 노출. resources.json 신규 파일 추가"],
  ["2026-07-28", "상세페이지 디자인 보완(틴트 히어로 배너·거리 필배지·아이콘형 정보행)과 마감임박/시작임박 목록의 파란 밑줄 하이퍼링크 스타일 제거(밑줄 없는 카드형 클릭)로 UX 다듬기"],
  ["2026-07-28", "official_url 신뢰도 개선 1차: 마라톤GO에 상세페이지가 존재하는 국내 대회 65곳을 전수 확인해 63건을 대회 자체 공식 사이트로 교체(전마협 대회는 mara1080.com이 실제 공식 접수처라 유지)"],
  ["2026-07-28", "official_url 신뢰도 개선 완료: 나머지 106건(마라톤GO엔 없고 고러닝에만 있던 대회)도 고러닝 상세페이지의 '웹사이트' 필드를 전수 확인해 교체 - Tier2 169건 전체 완료. TODAY 계산 버그 수정(payload.generatedAt 고정값 대신 방문자의 실제 접속일 기준으로 D-day 계산하도록 app.js/race.js 수정). 매주 월요일 11시 자동 재수집·재빌드 스케줄 작업 등록(신규 대회 발굴 + 임박 대회 접수기간 재확인, Netlify 재배포는 수동 유지)"],
  ["2026-07-28", "race_resources 콘텐츠 2차 확장: Tier2 국내 대회 6개(가평자라섬·안동·대청호·인천송도·순천만울트라·다이나핏 태백) 코스 꿀팁을 실제 참가후기·기사 검색 기반으로 신규 작성해 반영 (국내 코스 꿀팁 총 3→9개). 나머지 163개 Tier2 대회는 후속 확장 과제로 남음"],
  ["2026-07-28", "링크 신뢰도 재검증 + 데이터 중복 정리: 구로구청장배(다음카페)·울산남구육상연맹(Notion) 링크는 실제 접속 확인 결과 정상 채널로 확인. 고러닝·마라톤GO 교차 수집 및 공식 URL 전수 대조 과정에서 놓친 완전 중복 8건(대구세계마스터즈 10km/육상경기, JUST RUN10 세종, 스마일런페스티벌, 인천송도마라톤, 포항 이차전지 마라톤, S-OIL 감동의 마라톤, 수원교구 생명사랑 마라톤) 발견해 제거 - 총 178건에서 170건으로 정리(reg_start/reg_end 등 더 정확한 정보를 가진 쪽 유지). race_resources 3차 확장: 철원DMZ·평창대관령·김제새만금·청도반시 4개 대회 코스 꿀팁 추가 작성(국내 코스 꿀팁 총 9→13개)"],
  ["2026-07-28", "race_resources 4차 확장 + 참가비·정원 필드 신설: 한강서울하프·대청호(대전)·경주·시흥하프·나주·봉화송이 6개 대회 코스 꿀팁 추가(국내 코스 꿀팁 총 13→19개). races 테이블에 fee_info/capacity_info 컬럼 신설, fee_capacity.json으로 확실히 확인된 참가비·정원 정보 7건 반영 - 상세페이지에 💰참가비/👥정원 행으로 노출. 확인 안 된 대회는 억지로 채우지 않고 비워둠"],
  ["2026-07-28", "race_resources 5차 확장: 경남마라톤·부산바다마라톤·과천마라톤·한경서울마라톤·달서하프마라톤·여주세종대왕마라톤·동대문마라톤 7개 추가(국내 코스 꿀팁 총 19→26개). 참가비·정원 3건 추가(부산바다마라톤·여주세종대왕마라톤·동대문마라톤, 총 10건) - 직전 대회 기준인 항목은 텍스트에 명시"],
  ["2026-07-29", "찜하기(즐겨찾기) 기능 추가: 로그인 없이 브라우저 localStorage에 저장하는 방식으로 구현 - 목록·상세페이지 모두 별 아이콘으로 토글, 목록 상단에 '내가 찜한 대회' 섹션과 '찜한 대회만 보기' 필터 추가. 기기/브라우저 간 동기화는 안 됨을 문구로 명시. 사용자 피드백으로 발견된 표시 오류 3건 수정: 거리 정보 없을 때 '미정' → '거리 미확인', 주최 정보 없을 때 '-' → '정보 없음', '최종확인' 날짜에 의미 설명 문구 추가. Netlify 배포가 프로젝트 멤버 전용(비공개) 상태로 남아있던 것을 발견해 배포 안내 문서에 공개 전환 방법 추가"],
].map(r => new TableRow({ children: [bodyCell(r[0], logWidths[0], { bold: true }), bodyCell(r[1], logWidths[1])] }));
const logTable = new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, columnWidths: logWidths, rows: [logHeader, ...logRows] });

// ---- 차별점 ----
const diffWidths = [2200, 8240];
const diffHeader = new TableRow({ tableHeader: true, children: [headerCell("축", diffWidths[0]), headerCell("내용", diffWidths[1])] });
const diffRows = [
  ["큐레이션 UX", "고러닝식 상태 기반 큐레이션(마감임박/신규/D-day)을 계승하되 필터를 더 정교화"],
  ["의사결정 지원", "코스 고도·난이도·PB 적합도 데이터를 국내 최초 도입 + 코스후기/꿀팁/접수가이드 콘텐츠 큐레이션"],
  ["신뢰도", "접수 상태의 실시간 정확성(last_verified_at) → '가장 정확한 마라톤 일정표'로 포지셔닝"],
].map(r => new TableRow({ children: [bodyCell(r[0], diffWidths[0], { bold: true, fill: "EAF1FB" }), bodyCell(r[1], diffWidths[1])] }));
const diffTable = new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, columnWidths: diffWidths, rows: [diffHeader, ...diffRows] });

// ---- 문제점 ----
const probWidths = [2600, 7840];
const probHeader = new TableRow({ tableHeader: true, children: [headerCell("항목", probWidths[0]), headerCell("기존 사이트 문제점", probWidths[1])] });
const probRows = [
  ["접수 상태 정확성", "갱신 지연되거나 비어있음 (특히 러닝위키)"],
  ["정보 탐색 UX", "필터 없거나(러닝위키) 반대로 과밀함(마라톤GO, 러너블)"],
  ["의사결정 지원 데이터", "코스 난이도·고도·PB 적합도 데이터 전무 (해외 FindMyMarathon만 보유)"],
  ["개인화·추천", "모든 사이트가 정적 목록만 제공"],
  ["접수 대행 커버리지", "러너블은 계약 맺은 대회만 노출"],
  ["해외 대회 커버리지", "국내 사이트는 해외 미포함, 해외 사이트는 한국 미포함"],
].map(r => new TableRow({ children: [bodyCell(r[0], probWidths[0], { bold: true, fill: "FDF2E9" }), bodyCell(r[1], probWidths[1])] }));
const probTable = new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, columnWidths: probWidths, rows: [probHeader, ...probRows] });

// ---- 데이터 소스 전략 ----
const tierWidths = [1300, 2500, 3320, 3320];
const tierHeader = new TableRow({ tableHeader: true, children: [headerCell("계층", tierWidths[0]), headerCell("정의", tierWidths[1]), headerCell("예시", tierWidths[2]), headerCell("수집 방식", tierWidths[3])] });
const tierRows = [
  ["Tier1", "메이저/시그니처 대회 (20~30개). 정확도 최우선", "서울·JTBC·춘천·보스턴·도쿄·런던·베를린·뉴욕·시카고 (6대 월드 메이저 전부 포함)", "개별 공식 사이트 직접 확인(수동)"],
  ["Tier2", "국내 롱테일 대회 (수백 개). 커버리지 최우선", "고러닝, 마라톤GO, 러닝위키, 로드런, 전국마라톤협회, 러너블, 랭킹마라톤", "통합 사이트 자동 크롤링"],
  ["Tier3", "발굴·보강용", "Ahotu, FindMyMarathon, 마라톤GO 해외목록, 지자체 체육회", "해외 발굴 자동 크롤링 / 지역 소규모는 수동"],
].map(r => new TableRow({ children: [
  bodyCell(r[0], tierWidths[0], { bold: true, fill: "EAF1FB" }),
  bodyCell(r[1], tierWidths[1]), bodyCell(r[2], tierWidths[2]), bodyCell(r[3], tierWidths[3])
] }));
const tierTable = new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, columnWidths: tierWidths, rows: [tierHeader, ...tierRows] });

// ---- DB 스키마 ----
function schemaTable(rows) {
  const w = [2200, 8240];
  const header = new TableRow({ tableHeader: true, children: [headerCell("필드", w[0], { fill: "1F3864" }), headerCell("설명", w[1], { fill: "1F3864" })] });
  const body = rows.map(r => new TableRow({ children: [bodyCell(r[0], w[0], { bold: true }), bodyCell(r[1], w[1])] }));
  return new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, columnWidths: w, rows: [header, ...body] });
}

const racesFields = [
  ["race_id", "대회 고유번호 (PK)"],
  ["race_name / race_date / region / host_org", "대회명, 날짜, 지역, 주최"],
  ["registration_start / registration_end / registration_status", "접수 시작·마감일, 현재 상태(접수전/접수중/마감임박/마감)"],
  ["official_url", "공식 홈페이지 링크"],
  ["last_verified_at", "마지막으로 정확성을 확인한 시각 - 신뢰도의 핵심 필드"],
  ["tier", "Tier1(메이저 직접소스) / Tier2(국내 롱테일) / Tier3(발굴용)"],
  ["course_elevation_profile / course_difficulty_score", "코스 고도, 난이도(의사결정 지원용)"],
  ["reg_start_time", "접수 시작 시각(시:분) - 러너블 등 정밀 소스로 보강, '시작임박' 정확도용"],
  ["competitiveness_note", "실제 접수 경쟁 강도(마감 소요시간·경쟁률·당첨률) - 현재 Tier1 9곳만 확보"],
];
const distFields = [
  ["distance_id, race_id", "대회당 거리 옵션 고유번호, 소속 대회"],
  ["distance_label", "풀코스 / 하프 / 10km / 5km 등"],
  ["fee, capacity", "종목별 참가비, 정원"],
];
const resourceFields = [
  ["resource_id, race_id", "리소스 고유번호, 소속 대회"],
  ["resource_type", "코스후기 / 꿀팁 / 접수가이드"],
  ["title, url, summary", "제목, 링크, 짧은 요약"],
  ["curated_by, last_reviewed_at", "큐레이션 주체(자체작성/외부큐레이션), 최종 검토일"],
  ["비고", "국내: 외부 블로그 큐레이션(코스후기·꿀팁, 평생 콘텐츠) / 해외: 자체 작성 접수가이드(연도별 변경 가능성 있어 last_verified_at 기반 갱신)"],
];

// ---- 국내 코스후기·꿀팁 큐레이션 ----
const domWidths = [1800, 3400, 5240];
const domHeader = new TableRow({ tableHeader: true, children: [headerCell("대회", domWidths[0]), headerCell("참고 리소스", domWidths[1]), headerCell("핵심 꿀팁 요약", domWidths[2])] });
const domRows = [
  ["서울마라톤\n(동아마라톤)",
   ["나무위키 '서울 마라톤'", "DC인사이드 러닝 갤러리 코스 분석"],
   "대회 2주 전부터 커피를 끊으면 30km 지점에서 카페인 각성 효과를 노릴 수 있다는 팁이 공유됨. 응원 구간이 많아 완주 만족도가 높은 편."],
  ["JTBC 서울마라톤",
   ["나무위키 'JTBC 서울마라톤'", "러닝위키 JTBC 마라톤 코스가이드(고도·구간난이도)"],
   "상암~잠실을 가로지르는 코스로 고저차가 있어 풀코스치고 난이도 높음. 애오개고개·수서 구간 업다운 주의. 기록보다 완주·경험 목적 참가 만족도가 높고, 응원 규모는 국내 최대."],
  ["춘천마라톤",
   ["클리앙 춘천마라톤 후기 게시글"],
   "날씨 대비용 우비(비닐) 챙기되 뛰다 보면 더워져 벗게 되는 경우가 많음. 10km 지점까지는 완만한 업다운 반복. 화장실 위치를 미리 파악해두는 게 좋다는 후기 다수."],
].map(r => new TableRow({ children: [bodyCell(r[0], domWidths[0], { bold: true, fill: "EAF1FB" }), bodyCell(r[1], domWidths[1]), bodyCell(r[2], domWidths[2])] }));
const domTable = new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, columnWidths: domWidths, rows: [domHeader, ...domRows] });

// ---- 해외 접수가이드 (자체 작성) ----
const ovsWidths = [1600, 2600, 6240];
const ovsHeader = new TableRow({ tableHeader: true, children: [headerCell("대회", ovsWidths[0]), headerCell("진입 경로", ovsWidths[1]), headerCell("접수 절차 요약", ovsWidths[2])] });
const ovsRows = [
  ["보스턴 마라톤",
   "BQ 기록 보유자 신청",
   "연령·성별별 자격기록(BQ)을 보유해야 신청 가능. 2027년 대회는 2026.9.14~9.18(5일간, 선착순 아님) B.A.A. 'Athletes' Village' 플랫폼에서 개인정보·참가비·공식기록(대회명·날짜·기록)을 제출. 기록 검증에 최대 수일 소요되며, 자격기록을 충족해도 정원 초과 시 탈락 가능(최근 추가 랜덤 선발 옵션 신설)."],
  ["도쿄 마라톤",
   "① 일반추첨 ② ONE TOKYO GLOBAL 회원 ③ 채리티",
   "① 일반추첨: 매년 8월 중 약 2주간 신청, 9월 말 결과발표. 경쟁률 약 10:1(30만 명 중 3만 명). ② ONE TOKYO GLOBAL: 해외 러너 대상 유료 멤버십 가입 시 일반추첨보다 먼저 별도 풀에서 추첨(3회 연속 낙첨 시 다음 대회 확정권 부여). ③ 채리티: 공인 자선단체(37곳) 확정 기부 시 보장 출전권. 당첨 후 참가비 결제(해외 $230 / 국내 19,800엔)."],
  ["TCS 뉴욕시티 마라톤",
   "① 일반추첨 ② 9+1 프로그램 ③ 채리티",
   "① 일반추첨: 매년 2월경 신청, 3월 초 발표. NYC인근/전미/해외 3개 풀로 나눠 추첨(2026년 24만 명+ 응모). ② 9+1: 1년간 NYRR 공인대회 9개 완주 + 봉사 1회(또는 유료회원) 시 다음 해 확정 출전권 - 장기 전략형. ③ 채리티: 공식 파트너(Team for Kids 등) 통해 최소 $3,000 모금 시 확정 출전권."],
  ["시카고 마라톤",
   "① 일반추첨 ② 투어 프로그램 ③ 채리티",
   "① 일반추첨: 매년 초 신청 기간 공지(2026년분은 이미 마감). ② 2026년처럼 일반접수 마감 후에는 공식 '투어 프로그램'(여행패키지 경유)으로만 참가 가능. ③ 채리티: 공식 자선단체 통해 최소 $2,200 모금 시 확정 출전권. 오픈 알림은 공식 뉴스레터 구독으로 받는 것을 권장."],
  ["BMW 베를린 마라톤",
   "WMM 공동 로터리 추첨",
   "Abbott World Marathon Majors 통합 로터리 시스템으로 신청. 2026년 대회(9.27)분 로터리는 2025.9.25~11.6에 이미 진행되어 마감됨 - 결과는 11월 말 이메일/온라인 계정으로 통보. 정원 약 54,000명. 다음 등록 사이클(2027년 대회분)은 2026년 하반기 공지 예정이므로 알림 설정 권장."],
  ["TCS 런던 마라톤",
   "밸럿(추첨) + 유료 더블찬스",
   "2027년 대회(4.25)분 밸럿은 2027.4.24 09:00~5.1 16:00 진행 예정(선착순 아닌 완전 무작위 추첨). 기본 무료 응모 가능하며, £49.99 추가 결제 시 당첨 확률 2배 부여 옵션 있음. 결과는 7월 초 발표. 참가비는 당첨 후 별도 결제(영국 거주자 £79.99 / 해외 거주자 £225)."],
].map(r => new TableRow({ children: [bodyCell(r[0], ovsWidths[0], { bold: true, fill: "FDF2E9" }), bodyCell(r[1], ovsWidths[1]), bodyCell(r[2], ovsWidths[2])] }));
const ovsTable = new Table({ width: { size: TABLE_WIDTH, type: WidthType.DXA }, columnWidths: ovsWidths, rows: [ovsHeader, ...ovsRows] });

const doc = new Document({
  sections: [{
    properties: { page: { size: { width: PAGE_WIDTH, height: PAGE_HEIGHT }, margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN } } },
    children: [
      new Paragraph({ spacing: { after: 60 }, children: [txt("런레이더 - 기획 마스터 스펙", { bold: true, size: 36, color: "1F3864" })] }),
      new Paragraph({ spacing: { after: 200 }, children: [txt("이 문서는 결정된 내용이 계속 누적되는 살아있는 스펙입니다. 대상 시장: 국내 85% + 해외 15% · 핵심 사용자: 러너(참가자)", { size: 18, color: "595959" })] }),

      h1("0. 변경 이력"),
      logTable,

      h1("1. 우리가 가야 할 방향성 (차별점 3축)"),
      diffTable,

      h1("2. 기존 사이트 문제점"),
      probTable,

      h1("3. 데이터 소스 전략 (Tier)"),
      tierTable,

      h1("4. DB 스키마"),
      h2("races (핵심 테이블)"),
      schemaTable(racesFields),
      h2("race_distances (거리 옵션 서브테이블)"),
      p("대회 하나가 풀코스·하프·10km 등 여러 종목을 동시에 파는 경우가 대부분이라, 종목별 참가비·정원을 분리해서 관리."),
      schemaTable(distFields),
      h2("race_resources (코스후기·꿀팁·접수가이드 서브테이블)"),
      p("크롤링으로는 만들 수 없는 콘텐츠형 차별점. 국내는 외부의 잘 쓰인 블로그를 큐레이션(코스·꿀팁은 시간이 지나도 유효), 해외는 매년 규정이 바뀌는 접수 방법을 우리가 직접 조사해 작성 - Tier1 데이터 수집 시 확보한 공식 소스를 그대로 활용."),
      schemaTable(resourceFields),

      h1("5. 마일스톤"),
      p("1단계(1개월차) 데이터 기반 구축 → 2단계(2개월차) MVP UI 출시 → 3단계(3개월차) 의사결정 지원 기능(코스 데이터, race_resources 콘텐츠 포함) → 4단계(4개월차) 신뢰성 검증·해외 확장 → 5단계(5개월차 이후) 성장·수익화. 상세 내용은 최초 리서치 문서(마라톤_일정표_사이트_기획리서치.docx) 참고."),

      h1("6. race_resources 콘텐츠 (1차)"),
      h2("국내 - 코스후기·꿀팁 큐레이션 (평생 콘텐츠, 외부 소스 큐레이션)"),
      domTable,
      h2("해외 - 접수가이드 (자체 작성, 매년 규정 변동 있어 last_verified_at 기반 갱신 필요)"),
      p("Tier1 실데이터 수집 시 확보한 공식 소스를 근거로 작성함. 연도가 바뀌면 규정이 달라질 수 있어 매 시즌 공식 사이트로 재검증 필요."),
      ovsTable,
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  require('fs').writeFileSync('마라톤_사이트_기획_마스터스펙.docx', buf);
  console.log('done');
});
