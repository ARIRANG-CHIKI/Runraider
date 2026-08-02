// 스케줄 함수: 찜한 대회 마감임박 체크 후 웹푸시 + 이메일 발송
// netlify.toml의 scheduled 설정으로 매일 1회 자동 실행됨
const { getStore } = require("@netlify/blobs");
const webpush = require("web-push");

const VAPID_PUBLIC = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;

webpush.setVapidDetails("mailto:runraider@example.com", VAPID_PUBLIC, VAPID_PRIVATE);

function daysUntil(iso) {
  const today = new Date();
  const target = new Date(iso + "T00:00:00");
  return Math.round((target - today) / 86400000);
}

async function sendEmail(to, subject, html) {
  if (!RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: "런레이더 <alert@runraider.dev>",
      to,
      subject,
      html
    })
  });
}

exports.handler = async () => {
  const dataRes = await fetch("https://runraider.netlify.app/data.json");
  const { races } = await dataRes.json();
  const raceById = Object.fromEntries(races.map(r => [r.id, r]));

  const store = getStore("push-subscriptions");
  const { blobs } = await store.list();

  let notified = 0;
  for (const b of blobs) {
    const entry = await store.get(b.key, { type: "json" });
    if (!entry) continue;
    const { subscription, favoriteIds, mutedIds, email, seenRaceIds } = entry;
    const muted = mutedIds || [];
    const seen = seenRaceIds || [];

    // 알림을 끄지 않았고, 아직 클릭해서 확인하지 않은 대회는 마감 3일 전부터 매일 알림
    const closing = (favoriteIds || [])
      .filter(id => !muted.includes(id))
      .filter(id => !seen.includes(id))
      .map(id => raceById[id])
      .filter(r => r && r.status === "접수중" && r.regEnd)
      .map(r => ({ ...r, dday: daysUntil(r.regEnd) }))
      .filter(r => r.dday >= 0 && r.dday <= 3);

    if (closing.length === 0) continue;

    for (const race of closing) {
      const payload = JSON.stringify({
        title: "🏃 런레이더 - 마감임박",
        body: `찜한 [${race.name}] 접수가 ${race.regEnd} 마감이에요. 서두르세요!`,
        url: `https://runraider.netlify.app/race.html?id=${race.id}`,
        raceId: race.id
      });
      try {
        if (subscription) await webpush.sendNotification(subscription, payload);
        notified++;
      } catch (e) {
        console.error("웹푸시 실패:", e.message);
      }
    }

    if (email) {
      const listHtml = closing.map(r => `<li>${r.name} (${r.regEnd} 마감)</li>`).join("");
      await sendEmail(email, "찜한 대회 접수 마감 임박 안내", `<p>곧 마감되는 대회예요:</p><ul>${listHtml}</ul>`);
    }
  }

  return { statusCode: 200, body: JSON.stringify({ notified }) };
};
