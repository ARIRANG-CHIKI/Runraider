// 임시 진단용 함수 - Netlify 서버 IP로 gorunning.kr 접속이 되는지만 확인.
// 결과 확인되면 삭제 예정.
exports.handler = async () => {
  try {
    const r = await fetch("https://gorunning.kr/races/monthly/2026-09/", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36",
      },
    });
    const text = await r.text();
    return {
      statusCode: 200,
      body: JSON.stringify({ gorunningStatus: r.status, bodyLength: text.length }),
    };
  } catch (err) {
    return { statusCode: 200, body: JSON.stringify({ error: err.message }) };
  }
};
