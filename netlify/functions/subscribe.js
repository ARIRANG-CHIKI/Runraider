// 웹푸시 구독 저장 (Netlify Blobs 사용, DB 없이 무료로 동작)
const { getStore } = require("@netlify/blobs");

exports.handler = async (event) => {
  if (event.httpMethod === "DELETE") {
    try {
      const { endpoint } = JSON.parse(event.body);
      if (!endpoint) {
        return { statusCode: 400, body: "endpoint가 없습니다." };
      }
      const store = getStore("push-subscriptions");
      const key = Buffer.from(endpoint).toString("base64").slice(0, 60);
      await store.delete(key);
      return { statusCode: 200, body: JSON.stringify({ ok: true }) };
    } catch (err) {
      return { statusCode: 500, body: "구독 취소 실패: " + err.message };
    }
  }
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }
  try {
    const { subscription, favoriteIds, mutedIds, email } = JSON.parse(event.body);
    if (!subscription || !subscription.endpoint) {
      return { statusCode: 400, body: "구독 정보가 없습니다." };
    }
    const store = getStore("push-subscriptions");
    const key = Buffer.from(subscription.endpoint).toString("base64").slice(0, 60);
    const existing = await store.get(key, { type: "json" }) || {};
    await store.setJSON(key, {
      subscription,
      favoriteIds: favoriteIds || [],
      mutedIds: mutedIds || [],
      email: email || null,
      seenRaceIds: existing.seenRaceIds || [],
      updatedAt: new Date().toISOString()
    });
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  } catch (err) {
    return { statusCode: 500, body: "저장 실패: " + err.message };
  }
};
