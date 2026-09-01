// 문의하기 폼 처리: 방문자가 보낸 메시지를 Resend로 운영자 개인 이메일에 전달.
// 운영자 이메일은 코드에 없고 Netlify 환경변수(CONTACT_EMAIL)에만 있음 - 공개 저장소라
// 절대 코드에 하드코딩하면 안 됨.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const CONTACT_EMAIL = process.env.CONTACT_EMAIL;

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  if (!RESEND_API_KEY || !CONTACT_EMAIL) {
    return { statusCode: 500, body: "서버 설정 오류로 문의를 보낼 수 없습니다." };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: "잘못된 요청입니다." };
  }

  const { name, email, message, website } = body;

  // 허니팟: 화면에는 안 보이는 필드라 사람은 절대 안 채움, 스팸봇만 채움
  if (website) {
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  if (!message || !message.trim()) {
    return { statusCode: 400, body: "문의 내용을 입력해주세요." };
  }
  if (message.length > 3000) {
    return { statusCode: 400, body: "문의 내용이 너무 깁니다." };
  }

  const safeName = escapeHtml(name || "익명");
  const safeEmail = escapeHtml(email || "미입력");
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: "런레이더 문의 <alert@runraider.co.kr>",
        to: CONTACT_EMAIL,
        reply_to: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined,
        subject: `[런레이더 문의] ${safeName}님`,
        html: `<p><b>보낸사람:</b> ${safeName} (${safeEmail})</p><p><b>내용:</b></p><p>${safeMessage}</p>`
      })
    });
    if (!r.ok) {
      const errText = await r.text();
      console.error("Resend 발송 실패:", errText);
      return { statusCode: 502, body: "발송에 실패했습니다. 잠시 후 다시 시도해주세요." };
    }
  } catch (err) {
    console.error("문의 발송 오류:", err.message);
    return { statusCode: 500, body: "발송 중 오류가 발생했습니다." };
  }

  return { statusCode: 200, body: JSON.stringify({ ok: true }) };
};
