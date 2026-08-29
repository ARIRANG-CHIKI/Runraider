// Netlify Blobs 자동 환경설정이 이 사이트에서 안 먹는 경우를 위한 안전장치.
// BLOBS_TOKEN 환경변수가 설정돼 있으면 siteID/token을 명시적으로 넘겨서 강제로 연결하고,
// 없으면 기존처럼 자동 감지를 시도한다 (나중에 자동 감지가 고쳐지면 이 쪽으로 자연히 넘어감).
const { getStore } = require("@netlify/blobs");

function getSubStore() {
  if (process.env.BLOBS_TOKEN && process.env.SITE_ID) {
    return getStore({
      name: "push-subscriptions",
      siteID: process.env.SITE_ID,
      token: process.env.BLOBS_TOKEN
    });
  }
  return getStore("push-subscriptions");
}

module.exports = { getSubStore };
