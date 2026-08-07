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
  fetch("data.json").then(r => r.json()),
  fetch("resources.json").then(r => r.json()).catch(() => ({}))
]).then(([payload, resources]) => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const race = payload.races.find(r => r.id === id);
  const el = document.getElementById("race-detail");

  if (!race) {
    el.innerHTML = `<div class="race-detail-empty">대회 정보를 찾을 수 없습니다. <a href="index.html">목록으로 돌아가기</a></div>`;
    return;
  }

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
            <div class="race-name-lg">${race.tier === "Tier1" ? '<span class="tier1-badge">Tier1</span>' : ""}${race.dateUncertain ? '<span class="uncertain-badge">⚠️ 일정 미확정</span>' : ""}${race.name}</div>
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
          <div class="detail-row"><span class="detail-row-icon">📍</span><span class="detail-row-label">위치</span><span class="detail-row-value">${race.region}${race.place ? " · " + race.place : ""}</span></div>
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
  `;

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
