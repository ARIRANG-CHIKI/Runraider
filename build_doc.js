const {
  Document, Packer, Paragraph, TextRun, HeadingLevel, Table, TableRow, TableCell,
  WidthType, ShadingType, BorderStyle, AlignmentType, VerticalAlign
} = require('docx');

const FONT = "맑은 고딕";
const PAGE_WIDTH = 12240; // US Letter DXA
const PAGE_HEIGHT = 15840;
const MARGIN = 900;
const TABLE_WIDTH = PAGE_WIDTH - MARGIN * 2; // 10440

function txt(text, opts = {}) {
  return new TextRun({ text, font: FONT, size: 20, ...opts });
}

function headerCell(text, width) {
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "2F5496" },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 100, bottom: 100, left: 120, right: 120 },
    children: [new Paragraph({
      children: [txt(text, { bold: true, color: "FFFFFF", size: 19 })]
    })]
  });
}

function bodyCell(text, width, opts = {}) {
  const lines = Array.isArray(text) ? text : [text];
  return new TableCell({
    width: { size: width, type: WidthType.DXA },
    verticalAlign: VerticalAlign.CENTER,
    margins: { top: 90, bottom: 90, left: 120, right: 120 },
    shading: opts.fill ? { type: ShadingType.CLEAR, color: "auto", fill: opts.fill } : undefined,
    children: lines.map(l => new Paragraph({
      children: [txt(l, { bold: !!opts.bold, size: opts.size || 19 })],
      spacing: { after: 40 }
    }))
  });
}

function h1(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { before: 320, after: 160 },
    border: { bottom: { color: "2F5496", space: 4, style: BorderStyle.SINGLE, size: 8 } },
    children: [txt(text, { bold: true, size: 28, color: "2F5496" })]
  });
}

function h2(text) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 240, after: 120 },
    children: [txt(text, { bold: true, size: 23, color: "1F3864" })]
  });
}

function p(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 140, line: 300 },
    children: [txt(text, { size: 20, ...opts })]
  });
}

function bullet(text) {
  return new Paragraph({
    spacing: { after: 80, line: 280 },
    bullet: { level: 0 },
    children: [txt(text, { size: 20 })]
  });
}

// ---------- Table 1: 벤치마킹 리스트 + 장단점 ----------
const t1Widths = [900, 1700, 1700, 3070, 3070];
const t1Header = new TableRow({
  tableHeader: true,
  children: [
    headerCell("구분", t1Widths[0]),
    headerCell("사이트", t1Widths[1]),
    headerCell("유형", t1Widths[2]),
    headerCell("장점", t1Widths[3]),
    headerCell("단점", t1Widths[4]),
  ]
});

const benchRows = [
  ["국내", "러닝위키\n(runningwikii.com)", "콘텐츠형 미디어 + 캘린더",
    ["월별·지역별·시즌별 카테고리 세분화", "러닝화 리뷰, 페이스 계산기 등 부가 콘텐츠로 체류시간 확보", "SEO 콘텐츠 다량 보유, 검색 유입에 강함"],
    ["접수 상태(접수중/마감) 정보가 비어있는 경우 다수", "필터 기능 없이 월별 탭 이동만 가능", "광고 배치로 정보 탐색이 방해받음"]],
  ["국내", "마라톤GO\n(marathongo.co.kr)", "종합 러닝 플랫폼",
    ["지역·접수상태·거리·진행상태 다중 필터 제공", "찜하기 기능", "러닝화·크루·계산기·뉴스·커뮤니티까지 올인원 구성"],
    ["정보 밀도가 높아 초기 진입장벽 존재", "일부 기능은 로그인 유도로 확인 제한적", "카드형 UI가 다소 복잡"]],
  ["국내", "고러닝\n(gorunning.kr)", "심플 집계형 캘린더",
    ["마감임박·D-day·신규추가 등 상태 기반 큐레이션이 우수", "거리별·지역별 대회 수를 노출해 신뢰도 형성", "업데이트 로그 명시, 영어 버전 지원"],
    ["대회 상세 정보(코스 난이도, 후기)는 상대적으로 얕음", "부가 콘텐츠가 러닝화 정도로 제한적"]],
  ["국내", "러너블\n(runable.me)", "접수대행 + 커머스형",
    ["대회 접수·결제까지 원스톱 처리", "기록 관리, 커뮤니티, 해외 원정 투어 상품까지 확장", "실거래 발생으로 수익모델이 명확함"],
    ["단순 일정 조회 목적엔 정보가 과다·복잡", "접수 대행 계약을 맺은 대회만 노출되어 커버리지 제한"]],
  ["국내", "로드런\n(roadrun.co.kr)", "레거시 정보형",
    ["437개 이상 대회 등록", "종목·요일·접수여부·지역·연도 등 필터 다양"],
    ["UI/UX가 노후화되어 가독성 낮음", "모바일 대응 미흡 추정", "시각적 신뢰도 하락"]],
  ["해외", "FindMyMarathon.com", "데이터 중심 큐레이션",
    ["코스 고도 프로파일, PR스코어·보스턴퀄(BQ) 여부 등 실질적 의사결정 데이터 제공", "페이스밴드 판매로 수익화", "대회 비교(Compare) 기능"],
    ["디자인이 예스러움(올드한 UI)", "미국 중심이라 글로벌 커버리지는 약함"]],
  ["해외", "Ahotu\n(ahotu.com)", "글로벌 통합 DB",
    ["다국어(한국어 포함) 지원", "연도·월·가격·지역 등 풍부한 필터", "전 세계 대회를 폭넓게 커버"],
    ["현지 대회의 세부 정보(접수 마감일 등) 정확도가 떨어질 수 있음", "로컬 커뮤니티 기능 부재"]],
];

const t1Rows = benchRows.map((r, i) => new TableRow({
  children: [
    bodyCell(r[0], t1Widths[0], { bold: true, fill: i < 5 ? "EAF1FB" : "FDF2E9" }),
    bodyCell(r[1], t1Widths[1], { bold: true }),
    bodyCell(r[2], t1Widths[2]),
    bodyCell(r[3], t1Widths[3]),
    bodyCell(r[4], t1Widths[4]),
  ]
}));

const table1 = new Table({
  width: { size: TABLE_WIDTH, type: WidthType.DXA },
  columnWidths: t1Widths,
  rows: [t1Header, ...t1Rows]
});

// ---------- Table 2: 개선 방향 ----------
const t2Widths = [2400, 4020, 4020];
const t2Header = new TableRow({
  tableHeader: true,
  children: [
    headerCell("항목", t2Widths[0]),
    headerCell("벤치마킹 사이트들의 한계", t2Widths[1]),
    headerCell("우리의 개선 방향", t2Widths[2]),
  ]
});

const improveRows = [
  ["접수 상태 정확성",
    "접수중/마감 정보가 갱신 지연되거나 비어있는 경우가 많음 (특히 러닝위키)",
    "주최 측 공식 페이지 자동 확인 주기 단축 + 사용자 신고 기능으로 실시간성 확보"],
  ["정보 탐색 UX",
    "필터가 아예 없거나(러닝위키) 반대로 정보가 과밀함(마라톤GO, 러너블)",
    "고러닝식 '상태 기반 큐레이션'(마감임박/신규/D-day)을 기본값으로, 상세 정보는 클릭 후 노출하는 계층 구조"],
  ["의사결정 지원 데이터",
    "국내 사이트 대부분 코스 난이도·고도·기록 적합도 데이터가 없음 (해외 FindMyMarathon만 보유)",
    "코스 고도 프로파일, 평지/기록형 여부, 초보자 난이도 스코어를 국내 최초로 도입"],
  ["개인화·추천",
    "모든 사이트가 정적 목록만 제공, 목표(완주/기록/여행)별 추천이 없음",
    "초보자·기록도전·여행러너 등 유형별 맞춤 추천 + 찜하기·마감임박 알림 기능"],
  ["접수 대행 여부",
    "러너블은 계약 맺은 대회만 노출(커버리지 제한), 나머지는 정보성이라 외부 이탈 시 정보 부족",
    "접수 대행은 하지 않고 '정보 큐레이션 허브'로 포지셔닝, 이탈 전 필요한 정보(마감일·정원·코스)를 충분히 제공"],
  ["해외 대회 커버리지",
    "국내 사이트는 해외 정보가 거의 없고, 해외 사이트는 한국 대회를 다루지 않음",
    "국내 85 : 해외 15 비중으로, 러너 관심이 높은 해외 메이저(보스턴·도쿄·오사카·뉴욕 등) 위주로 선별 큐레이션"],
];

const t2Rows = improveRows.map(r => new TableRow({
  children: [
    bodyCell(r[0], t2Widths[0], { bold: true, fill: "EAF1FB" }),
    bodyCell(r[1], t2Widths[1]),
    bodyCell(r[2], t2Widths[2]),
  ]
}));

const table2 = new Table({
  width: { size: TABLE_WIDTH, type: WidthType.DXA },
  columnWidths: t2Widths,
  rows: [t2Header, ...t2Rows]
});

// ---------- Table 3: 마일스톤 ----------
const t3Widths = [1600, 1400, 4460, 2980];
const t3Header = new TableRow({
  tableHeader: true,
  children: [
    headerCell("단계", t3Widths[0]),
    headerCell("기간(예상)", t3Widths[1]),
    headerCell("주요 작업", t3Widths[2]),
    headerCell("산출물", t3Widths[3]),
  ]
});

const milestoneRows = [
  ["1단계\n데이터 기반 구축", "1개월차",
    ["국내 대회 데이터 소싱(주최사·협회·기존 사이트 크롤링 + 수동 검수)", "DB 스키마 설계(대회명/일정/지역/거리/접수기간/공식링크)", "접수상태 자동 갱신 로직 설계"],
    ["대회 DB (최소 150개 이상)", "크롤링·검수 파이프라인"]],
  ["2단계\nMVP UI 출시", "2개월차",
    ["상태기반 큐레이션 홈(마감임박/신규/D-day)", "지역·거리·월별 필터", "대회 상세페이지, 모바일 반응형 디자인"],
    ["베타 웹사이트 오픈"]],
  ["3단계\n의사결정 지원 기능", "3개월차",
    ["코스 고도·난이도 데이터 추가", "초보자/기록도전/여행러너 유형별 추천", "찜하기·마감임박 알림(카카오톡/이메일)"],
    ["개인화 추천 기능", "알림 시스템"]],
  ["4단계\n신뢰성·해외 확장", "4개월차",
    ["접수 상태 실시간성 검증 체계(주최측 확인 + 사용자 신고)", "해외 메이저 대회(15%) 큐레이션 추가", "대회 후기·리뷰 기능"],
    ["정확도 검증 리포트", "해외 대회 섹션"]],
  ["5단계\n성장·수익화", "5개월차 이후",
    ["SEO·콘텐츠 마케팅", "크루/커뮤니티 기능", "광고·제휴(러닝화, 용품) 수익모델", "사용자 피드백 기반 고도화"],
    ["정식 출시", "수익화 채널 확보"]],
];

const t3Rows = milestoneRows.map((r, i) => new TableRow({
  children: [
    bodyCell(r[0], t3Widths[0], { bold: true, fill: "EAF1FB" }),
    bodyCell(r[1], t3Widths[1], { bold: true }),
    bodyCell(r[2], t3Widths[2]),
    bodyCell(r[3], t3Widths[3]),
  ]
}));

const table3 = new Table({
  width: { size: TABLE_WIDTH, type: WidthType.DXA },
  columnWidths: t3Widths,
  rows: [t3Header, ...t3Rows]
});

const doc = new Document({
  sections: [{
    properties: {
      page: {
        size: { width: PAGE_WIDTH, height: PAGE_HEIGHT },
        margin: { top: MARGIN, bottom: MARGIN, left: MARGIN, right: MARGIN }
      }
    },
    children: [
      new Paragraph({
        spacing: { after: 60 },
        children: [txt("마라톤 일정표 사이트 기획 리서치", { bold: true, size: 40, color: "1F3864" })]
      }),
      new Paragraph({
        spacing: { after: 260 },
        children: [txt("대상 시장: 국내 85% + 해외 15%  ·  핵심 사용자: 러너(참가자)", { size: 20, color: "595959" })]
      }),

      h1("1. 벤치마킹 사이트 리스트 및 장단점"),
      p("국내 마라톤 일정 조회/접수 사이트 5곳과, 참고할 만한 해외 사이트 2곳을 조사했습니다."),
      table1,

      h1("2. 개선 방향"),
      p("현재 벤치마킹 사이트들이 공통적으로 갖고 있는 한계와, 우리가 채택할 개선 방향을 정리했습니다."),
      table2,

      h1("3. 우리가 가야 할 방향성"),
      p("국내 사이트들은 크게 '정보 제공형'(러닝위키, 로드런)과 '종합 플랫폼·커머스형'(마라톤GO, 러너블)으로 양극화되어 있고, 고러닝만 유일하게 상태 기반의 심플한 큐레이션 UX를 갖추고 있습니다. 해외는 FindMyMarathon처럼 데이터 기반 의사결정 도구를 갖춘 사례가 있지만, 국내에는 아직 없습니다."),
      p("따라서 우리는 '접수 대행(커머스)'이 아니라 '정보 큐레이션 + 의사결정 지원'에 집중하는 방향을 제안합니다. 구체적으로 세 가지 축입니다."),
      bullet("고러닝의 상태 기반 큐레이션 UX(마감임박/신규/D-day)를 계승하되, 필터를 더 정교화한다."),
      bullet("FindMyMarathon의 데이터형 의사결정 지원(코스 난이도, 고도, 기록 적합도)을 국내 최초로 도입한다."),
      bullet("접수 상태의 실시간 정확성을 핵심 신뢰 요소로 삼아 '가장 정확한 마라톤 일정표'라는 포지셔닝을 확보한다."),
      p("접수 대행(결제·PG 연동)은 초기 범위에서 제외합니다. 러너블 같은 기존 강자와 정면 경쟁하기보다, 정보 큐레이션의 우위로 먼저 트래픽과 신뢰를 확보한 뒤 확장 여부를 검토하는 것이 안전합니다.", { bold: false }),

      h1("4. 마일스톤"),
      table3,
    ]
  }]
});

Packer.toBuffer(doc).then(buf => {
  require('fs').writeFileSync('마라톤_일정표_사이트_기획리서치.docx', buf);
  console.log('done');
});
