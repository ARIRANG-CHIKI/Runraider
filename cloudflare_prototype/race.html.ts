/**
 * Cloudflare Pages Functions로 /race.html?id=N 요청을 races/N.html로 대신 서빙.
 * 시험 버전, 미검증. Netlify에서 netlify.toml의 [[redirects]] + force=true로 했던 걸
 * 코드로 옮긴 것 (Cloudflare의 정적 _redirects 파일은 쿼리스트링 값으로 분기를 못 함).
 *
 * 파일 위치가 곧 라우팅: functions/race.html.ts 파일이 정확히 "/race.html" 경로를 가로챔.
 *
 * ⚠️ 확인 필요: wrangler.toml(또는 wrangler.jsonc)에서 run_worker_first를 true로
 * 설정해야 함. 기본값(false)이면 "정적 파일이 이미 있으면 함수를 아예 안 부르고 그
 * 파일을 그대로 서빙"하는데, race.html이 실제로 존재하는 정적 파일이라 이 함수 자체가
 * 절대 안 불림 - Netlify에서 겪었던 "force=true 안 넣어서 리다이렉트 규칙이 무시되던"
 * 사고와 정확히 같은 종류의 함정이라 여기 미리 적어둠.
 */
interface Env {
  ASSETS: Fetcher;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = url.searchParams.get("id");

  if (id && /^\d+$/.test(id)) {
    const assetUrl = new URL(`/races/${id}.html`, url.origin);
    const assetRes = await env.ASSETS.fetch(new Request(assetUrl.toString(), request));
    if (assetRes.status !== 404) {
      // 브라우저 주소창은 그대로 /race.html?id=N 유지, 내용만 races/N.html 걸로 바꿔치기
      return new Response(assetRes.body, assetRes);
    }
    // races/N.html이 없는 id(신규 대회 등) - 원래 race.html(자바스크립트가 fetch로
    // 렌더링하는 SPA 버전)로 폴백
  }

  return env.ASSETS.fetch(request);
};
