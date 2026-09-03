/**
 * Cloudflare Workers용 마감임박 알림 체크 함수 - 시험 버전 (2026-09-02)
 *
 * 아직 실제 Cloudflare 프로젝트에서 실행 테스트 안 해봄. web-push(Node 전용) 대신
 * @block65/webcrypto-web-push(Web Crypto API 기반, Workers 호환)로 포팅한 초안.
 *
 * 원본(Netlify): netlify/functions/check-deadlines.js
 * 원본과 다른 점:
 *  - exports.handler 대신 Workers의 scheduled 핸들러 형태
 *  - Netlify Blobs(getSubStore) 대신 Cloudflare KV (env.SUBSCRIBERS) 사용 - 아직
 *    실제 KV 네임스페이스 바인딩 설정 안 함, wrangler.toml에 추가 필요
 *  - webpush.sendNotification() 대신 buildPushPayload() + fetch()
 *
 * 확인 필요한 것 (실제 Cloudflare 프로젝트 만들면 검증):
 *  - buildPushPayload()가 반환하는 payload 객체의 정확한 필드명(headers/body 등)
 *  - VAPID 키를 그대로 재사용 가능한지(형식이 web-push 라이브러리와 동일한지)
 */
import { buildPushPayload } from "@block65/webcrypto-web-push";

interface Env {
  SUBSCRIBERS: KVNamespace;
  VAPID_PUBLIC_KEY: string;
  VAPID_PRIVATE_KEY: string;
  RESEND_API_KEY: string;
}

interface SubscriberEntry {
  subscription: { endpoint: string; expirationTime: number | null; keys: { p256dh: string; auth: string } };
  favoriteIds: number[];
  email: string | null;
  notifyHours: number[];
}

function daysUntil(iso: string): number {
  const today = new Date();
  const target = new Date(iso + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

async function sendEmail(env: Env, to: string, subject: string, html: string) {
  if (!env.RESEND_API_KEY) return;
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: "런레이더 <alert@runraider.co.kr>", to, subject, html }),
  });
}

// 스케줄이 UTC 1/5/8시에 도는데, 사용자에게는 KST 10/14/17시로 표시 (KST = UTC+9)
const UTC_TO_KST_SLOT: Record<number, number> = { 1: 10, 5: 14, 8: 17 };

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const dataRes = await fetch("https://runraider.co.kr/data.json");
    const { races } = await dataRes.json<{ races: any[] }>();
    const raceById = Object.fromEntries(races.map((r) => [r.id, r]));

    const currentSlot = UTC_TO_KST_SLOT[new Date().getUTCHours()];

    // KV는 Netlify Blobs의 store.list()에 해당하는 게 list() - 키 목록만 주므로
    // 각각 get 필요 (Netlify Blobs와 사용법 유사)
    const { keys } = await env.SUBSCRIBERS.list();

    let notified = 0;
    for (const { name } of keys) {
      const raw = await env.SUBSCRIBERS.get(name);
      if (!raw) continue;
      const entry: SubscriberEntry = JSON.parse(raw);
      const { subscription, favoriteIds, email, notifyHours } = entry;

      if (currentSlot && notifyHours?.length && !notifyHours.includes(currentSlot)) continue;

      const closing = (favoriteIds || [])
        .map((id) => raceById[id])
        .filter((r) => r && r.status === "접수중" && r.regEnd)
        .map((r) => ({ ...r, dday: daysUntil(r.regEnd) }))
        .filter((r) => r.dday >= 0 && r.dday <= 3);

      if (closing.length === 0) continue;

      for (const race of closing) {
        const ddayLabel = race.dday === 0 ? "오늘 마감" : `D-${race.dday} 마감임박`;
        // buildPushPayload의 message.data는 Jsonifiable 값(객체 그대로) - 라이브러리가
        // 내부에서 직렬화함. 원본(web-push)처럼 미리 JSON.stringify 하면 이중 인코딩됨.
        const message = {
          data: {
            title: `런레이더 · ${ddayLabel}`,
            body: `${race.name} · ${race.regEnd}`,
            url: `https://runraider.co.kr/race.html?id=${race.id}`,
          },
        };
        try {
          const payload = await buildPushPayload(message, subscription, {
            subject: "mailto:runraider@example.com",
            publicKey: env.VAPID_PUBLIC_KEY,
            privateKey: env.VAPID_PRIVATE_KEY,
          });
          // payload.body가 Uint8Array인데, 이 TS lib 버전 기준 Workers의 BodyInit
          // 타입과 제네릭 파라미터가 미묘하게 안 맞아서(런타임엔 문제 없음) 캐스팅함.
          await fetch(subscription.endpoint, payload as RequestInit);
          notified++;
        } catch (e) {
          console.error("웹푸시 실패:", (e as Error).message);
        }
      }

      if (email) {
        const listHtml = closing.map((r) => `<li>${r.name} (${r.regEnd} 마감)</li>`).join("");
        await sendEmail(env, email, "찜한 대회 접수 마감 임박 안내", `<p>곧 마감되는 대회예요:</p><ul>${listHtml}</ul>`);
      }
    }

    console.log(`알림 발송: ${notified}건`);
  },
};
