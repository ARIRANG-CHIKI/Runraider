/**
 * Cloudflare Pages Functions 버전 - 원본: netlify/functions/subscribe.js
 * 시험 버전, 미검증. Pages Functions는 파일명이 곧 경로가 되고(functions/subscribe.ts
 * -> /subscribe), onRequestPost/onRequestDelete 같은 이름의 export로 메서드별 분기.
 */
import { subscriberKey, getSubscriber, setSubscriber } from "./_kvStore";

interface Env {
  SUBSCRIBERS: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { subscription, favoriteIds, mutedIds, email, notifyHours } = await request.json<any>();
    if (!subscription?.endpoint) {
      return new Response("구독 정보가 없습니다.", { status: 400 });
    }
    const key = subscriberKey(subscription.endpoint);
    const existing = (await getSubscriber(env.SUBSCRIBERS, key)) || {};
    await setSubscriber(env.SUBSCRIBERS, key, {
      subscription,
      favoriteIds: favoriteIds || [],
      mutedIds: mutedIds || [],
      email: email !== undefined ? email : existing.email || null,
      notifyHours: notifyHours?.length ? notifyHours : existing.notifyHours || [10, 14, 17],
      seenRaceIds: existing.seenRaceIds || [],
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ ok: true });
  } catch (err) {
    return new Response("저장 실패: " + (err as Error).message, { status: 500 });
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { endpoint } = await request.json<any>();
    if (!endpoint) return new Response("endpoint가 없습니다.", { status: 400 });
    await env.SUBSCRIBERS.delete(subscriberKey(endpoint));
    return Response.json({ ok: true });
  } catch (err) {
    return new Response("구독 취소 실패: " + (err as Error).message, { status: 500 });
  }
};
