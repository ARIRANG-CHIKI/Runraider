/** 원본: netlify/functions/contact.js. 시험 버전, 미검증 (Resend 호출뿐이라 리스크 낮음). */
interface Env {
  RESEND_API_KEY: string;
  CONTACT_EMAIL: string;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c] as string));
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.RESEND_API_KEY || !env.CONTACT_EMAIL) {
    return new Response("서버 설정 오류로 문의를 보낼 수 없습니다.", { status: 500 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return new Response("잘못된 요청입니다.", { status: 400 });
  }

  const { name, email, message, website } = body;
  if (website) return Response.json({ ok: true }); // 허니팟

  if (!message || !message.trim()) return new Response("문의 내용을 입력해주세요.", { status: 400 });
  if (message.length > 3000) return new Response("문의 내용이 너무 깁니다.", { status: 400 });

  const safeName = escapeHtml(name || "익명");
  const safeEmail = escapeHtml(email || "미입력");
  const safeMessage = escapeHtml(message).replace(/\n/g, "<br>");

  const r = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${env.RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: "런레이더 문의 <alert@runraider.co.kr>",
      to: env.CONTACT_EMAIL,
      reply_to: email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : undefined,
      subject: `[런레이더 문의] ${safeName}님`,
      html: `<p><b>보낸사람:</b> ${safeName} (${safeEmail})</p><p><b>내용:</b></p><p>${safeMessage}</p>`,
    }),
  });

  if (!r.ok) {
    console.error("Resend 발송 실패:", await r.text());
    return new Response("발송에 실패했습니다. 잠시 후 다시 시도해주세요.", { status: 502 });
  }
  return Response.json({ ok: true });
};
