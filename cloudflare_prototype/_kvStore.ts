/**
 * Netlify Blobs(_blobStore.js)에 대응하는 Cloudflare KV 래퍼 - 시험 버전, 미검증.
 * KV는 Blobs보다 훨씬 단순함 - 토큰/siteID 넘기는 인증 과정 자체가 없음, wrangler.toml에
 * KV 네임스페이스를 바인딩(SUBSCRIBERS)해두면 env.SUBSCRIBERS로 바로 씀.
 */
export function subscriberKey(endpoint: string): string {
  // Buffer는 Workers 기본 런타임에 없어서 btoa로 대체 (동일하게 base64 인코딩됨)
  return btoa(endpoint).slice(0, 60);
}

export async function getSubscriber(kv: KVNamespace, key: string) {
  const raw = await kv.get(key);
  return raw ? JSON.parse(raw) : null;
}

export async function setSubscriber(kv: KVNamespace, key: string, data: unknown) {
  await kv.put(key, JSON.stringify(data));
}
