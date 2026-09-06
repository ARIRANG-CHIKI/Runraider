function statusClass(status) {
  return "status-" + status.replace(/\s/g, ".");
}

function daysBetween(iso, today) {
  return Math.round((new Date(iso + "T00:00:00") - today) / 86400000);
}

function fmtDday(n) {
  return n === 0 ? "오늘" : n > 0 ? `D-${n}` : `D+${-n}`;
}

const FAV_KEY = "runraider_favorites";
function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }
  catch { return []; }
}
function isFavorite(id) { return getFavorites().includes(id); }
function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1); else favs.push(id);
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
}

const params = new URLSearchParams(location.search);
const id = Number(params.get("id"));

Promise.all([
  // 절대경로 필수: 이 스크립트는 /race.html?id=N(루트)으로도, races/N.html
  // (하위 폴더 정적 파일) 직접 경로로도 로드된다. 상대경로였다면 후자에서
  // /races/data.json을 찾아 404가 나서 "데이터를 불러오지 못했습니다"가
  // 뜬다 (실제로 재현·확인됨. sitemap/RSS는 전자 형태만 써서 지금까지
  // 못 걸렸지만, 검색엔진이 직접 경로를 크롤링하면 노출될 수 있었음).
  fetch("/data.json", { cache: "no-cache" }).then(r => r.json()),
  fetch("/resources.json").then(r => r.json()).catch(() => ({}))
]).then(([payload, resources]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const race = payload.races.find(r => r.id === id);
  const el = document.getElementById("race-detail");

  if (!race) {
    el.innerHTML = `<div class="race-detail-empty">대회 정보를 찾을 수 없습니다. <a href="index.html">목록으로 돌아가기</a></div>`;
    return;
  }

  document.title = `${race.name} (${race.date}) | 런레이더`;
  let metaDesc = document.querySelector('meta[name="description"]');
  if (!metaDesc) {
    metaDesc = document.createElement("meta");
    metaDesc.name = "description";
    document.head.appendChild(metaDesc);
  }
  metaDesc.content = `${race.name} — ${race.date} · ${race.region}${race.place ? " " + race.place : ""} · 접수상태: ${race.status}. 접수기간, 코스 정보, 참가비 등 최신 확인 정보.`;

  const canonicalUrl = `https://runraider.co.kr/race.html?id=${race.id}`;
  let canonical = document.querySelector('link[rel="canonical"]');
  if (!canonical) {
    canonical = document.createElement("link");
    canonical.rel = "canonical";
    document.head.appendChild(canonical);
  }
  canonical.href = canonicalUrl;

  const res = resources[race.name];
  const dday = daysBetween(race.date, today);
  const ddayLabel = dday >= 0 ? fmtDday(dday) : `종료 D+${-dday}`;

  const distPills = race.distances.split(",").map(d => d.trim()).filter(Boolean)
    .map(d => `<span class="dist-pill">${d}</span>`).join("");

  el.innerHTML = `
    <div class="detail-card">
      <div class="detail-hero">
        <div class="detail-head">
          <div>
            <h1 class="race-name-lg">${race.tier === "Tier1" ? '<span class="tier1-badge">Tier1</span>' : ""}${race.dateUncertain ? '<span class="uncertain-badge">⚠️ 일정 미확정</span>' : ""}${race.name}</h1>
            <div class="detail-meta">${race.date}</div>
          </div>
          <span class="status-badge ${statusClass(race.status)}">${race.status}</span>
        </div>
        <div class="dist-pills">${distPills}</div>
        <div class="detail-dday">${ddayLabel}</div>
        <button id="detail-fav-btn" class="fav-btn detail-fav-btn${isFavorite(race.id) ? " fav-active" : ""}" type="button">${isFavorite(race.id) ? "★ 찜한 대회" : "☆ 찜하기"}</button>
      </div>

      ${race.dateUncertain ? `<div class="detail-tips-empty" style="margin:0 20px 16px;">⚠️ 이 날짜는 최근 확인된 개최 정보를 기준으로 추정한 값이에요. 실제 신청 전에 공식 사이트에서 정확한 일정을 다시 확인해주세요.</div>` : ""}

      ${race.competitivenessNote ? `<div class="competitiveness-note detail-competitiveness">🔥 ${race.competitivenessNote}</div>` : ""}

      <div class="detail-body">
        <div class="detail-rows">
          <div class="detail-row"><span class="detail-row-icon">📍</span><span class="detail-row-label">위치</span><span class="detail-row-value">${race.region}${race.place ? " · " + race.place : ""}${race.place ? ` <a class="map-link" href="https://map.naver.com/p/search/${encodeURIComponent(race.place)}" target="_blank" rel="noopener">🗺️ 지도에서 보기</a>` : ""}</span></div>
          <div class="detail-row"><span class="detail-row-icon">🏛️</span><span class="detail-row-label">주최</span><span class="detail-row-value">${race.host || "정보 없음"}</span></div>
          <div class="detail-row"><span class="detail-row-icon">📝</span><span class="detail-row-label">접수기간</span><span class="detail-row-value">${race.regStart || "미확인"}${race.regStartTime ? " " + race.regStartTime : ""} ~ ${race.regEnd || "미확인"}</span></div>
          ${race.feeInfo ? `<div class="detail-row"><span class="detail-row-icon">💰</span><span class="detail-row-label">참가비</span><span class="detail-row-value">${race.feeInfo}</span></div>` : ""}
          ${race.capacityInfo ? `<div class="detail-row"><span class="detail-row-icon">👥</span><span class="detail-row-label">정원</span><span class="detail-row-value">${race.capacityInfo}</span></div>` : ""}
          <div class="detail-row"><span class="detail-row-icon">✅</span><span class="detail-row-label">확인일</span><span class="detail-row-value">${race.lastVerifiedAt} 기준 확인됨</span></div>
        </div>
        <p class="detail-verified-note">위 정보는 표시된 날짜에 대회 공식 사이트·주최측 정보를 기준으로 확인한 내용입니다. 실제 접수 상황은 공식 사이트에서 다시 확인해 주세요.</p>

        ${res && res.courseMapUrl ? `
          <div class="detail-section">
            <div class="detail-section-title">🗺️ 코스 지도</div>
            <img class="detail-course-map" src="${res.courseMapUrl}" alt="${race.name} 코스맵" loading="lazy" />
            <p class="detail-refs">출처: ${res.courseMapSource || "대회 공식 사이트"}</p>
          </div>` : ""}

        <div class="detail-section">
          <div class="detail-section-title">💡 코스 꿀팁</div>
          ${res && res.tips ? `
            <p class="detail-tips">${res.tips}</p>
            <p class="detail-refs">참고: ${res.refs.join(", ")}</p>
          ` : `
            <div class="detail-tips-empty">
              <span class="detail-tips-empty-icon">ℹ️</span>
              <span>아직 검증된 코스 정보가 없어요. 공식 사이트에서 최신 코스를 확인하세요.</span>
            </div>
          `}
        </div>

        ${res && res.guide ? `
          <div class="detail-section">
            <div class="detail-section-title">📋 접수 방법 (${res.entry})</div>
            <p class="detail-tips">${res.guide}</p>
          </div>` : ""}

        <a class="apply-button" href="${race.url}" target="_blank" rel="noopener">공식 사이트에서 신청하기 →</a>
      </div>
    </div>

    <div id="similar-races" class="detail-section similar-section"></div>
  `;

  // 비슷한 대회 추천: 같은 지역/비슷한 거리대의 다른 대회 (홈 화면 "찜한 대회
  // 기반 추천"과 같은 점수 방식 재사용) - 외부 API 없이 기존 데이터만으로
  // 상세페이지를 덜 비어보이게 채우는 용도.
  const myDists = new Set(race.distances.split(",").map(d => d.trim()));
  const similar = payload.races
    .filter(r => r.id !== race.id && r.status !== "접수마감")
    .map(r => {
      let score = 0;
      if (r.region === race.region) score += 2;
      if (r.distances.split(",").some(d => myDists.has(d.trim()))) score += 1;
      return { ...r, score };
    })
    .filter(r => r.score > 0)
    .sort((a, b) => b.score - a.score || Math.abs(new Date(a.date) - today) - Math.abs(new Date(b.date) - today))
    .slice(0, 4);

  if (similar.length) {
    document.getElementById("similar-races").innerHTML = `
      <div class="detail-section-title">🏃 비슷한 대회</div>
      <div class="urgency-list">
        ${similar.map(r => `
          <a class="urgency-item" href="race.html?id=${r.id}">
            <div><div class="urgency-name">${r.name}</div><div class="urgency-sub">${r.date} · ${r.regionLabel || r.region} · ${r.distances}</div></div>
            <span class="status-badge ${statusClass(r.status)}">${r.status}</span>
          </a>`).join("")}
      </div>`;
  }

  document.getElementById("detail-fav-btn").addEventListener("click", () => {
    toggleFavorite(race.id);
    const btn = document.getElementById("detail-fav-btn");
    const fav = isFavorite(race.id);
    btn.classList.toggle("fav-active", fav);
    btn.textContent = fav ? "★ 찜한 대회" : "☆ 찜하기";
  });
}).catch(err => {
  document.getElementById("race-detail").innerHTML = `<div class="race-detail-empty">데이터를 불러오지 못했습니다.</div>`;
  console.error(err);
});
