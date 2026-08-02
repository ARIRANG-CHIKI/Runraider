// 사용자가 알림을 클릭(확인)하면 그 대회는 더 이상 반복 알림을 보내지 않도록 기록
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const { endpoint, raceId } = JSON.parse(event.body);
    if (!endpoint || raceId == null) {
      return { statusCode: 400, body: "필수 값이 없습니다." };
    }
    const store = getStore("push-subscriptions");
    const key = Buffer.from(endpoint).toString("base64").slice(0, 60);
    const entry = await store.get(key, { type: "json" });
    if (!entry) return { statusCode: 404, body: "구독 정보를 찾을 수 없습니다." };

    const seen = new Set(entry.seenRaceIds || []);
    seen.add(raceId);
    await store.setJSON(key, { ...entry, seenRaceIds: [...seen] });

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: "처리 실패: " + err.message };
  }
};
