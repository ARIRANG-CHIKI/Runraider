/** 원본: netlify/functions/mark-seen.js. 시험 버전, 미검증. */
import { subscriberKey, getSubscriber, setSubscriber } from "./_kvStore";

interface Env {
  SUBSCRIBERS: KVNamespace;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const { endpoint, raceId } = await request.json<any>();
    if (!endpoint || raceId == null) {
      return new Response("필수 값이 없습니다.", { status: 400 });
    }
    const key = subscriberKey(endpoint);
    const entry = await getSubscriber(env.SUBSCRIBERS, key);
    if (!entry) return new Response("구독 정보를 찾을 수 없습니다.", { status: 404 });

    const seen = new Set(entry.seenRaceIds || []);
    seen.add(raceId);
    await setSubscriber(env.SUBSCRIBERS, key, { ...entry, seenRaceIds: [...seen] });

    return Response.json({ ok: true });
  } catch (err) {
    return new Response("처리 실패: " + (err as Error).message, { status: 500 });
  }
};
