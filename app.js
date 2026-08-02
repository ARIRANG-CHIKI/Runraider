const PAGE_SIZE = 40;
const FAV_KEY = "runraider_favorites";
let allRaces = [];
let visibleCount = PAGE_SIZE;
let TODAY = null;

function daysBetween(iso) {
  return Math.round((new Date(iso + "T00:00:00") - TODAY) / 86400000);
}

function fmtDday(n) {
  return n === 0 ? "오늘" : `D-${n}`;
}

function getFavorites() {
  try { return JSON.parse(localStorage.getItem(FAV_KEY) || "[]"); }
  catch { return []; }
}

function isFavorite(id) {
  return getFavorites().includes(id);
}

const MUTE_KEY = "runraider_muted_notifications";
function getMuted() {
  try { return JSON.parse(localStorage.getItem(MUTE_KEY) || "[]"); }
  catch { return []; }
}
function isMuted(id) { return getMuted().includes(id); }
function toggleMute(id) {
  const muted = getMuted();
  const idx = muted.indexOf(id);
  if (idx >= 0) muted.splice(idx, 1); else muted.push(id);
  localStorage.setItem(MUTE_KEY, JSON.stringify(muted));
  syncPushSubscription();
}

async function syncPushSubscription() {
  if (!("serviceWorker" in navigator)) return;
  const reg = await navigator.serviceWorker.getRegistration("sw.js");
  if (!reg) return;
  const sub = await reg.pushManager.getSubscription();
  if (!sub) return;
  await fetch("/.netlify/functions/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub, favoriteIds: getFavorites(), mutedIds: getMuted() })
  }).catch(() => {});
}

function toggleFavorite(id) {
  const favs = getFavorites();
  const idx = favs.indexOf(id);
  if (idx >= 0) favs.splice(idx, 1); else favs.push(id);
  localStorage.setItem(FAV_KEY, JSON.stringify(favs));
  syncPushSubscription();
}

function favButton(id) {
  const filled = isFavorite(id);
  return `<button class="fav-btn${filled ? " fav-active" : ""}" data-id="${id}" aria-label="찜하기" type="button">${filled ? "★" : "☆"}</button>`;
}

function muteButton(id) {
  const muted = isMuted(id);
  return `<button class="mute-btn${muted ? " muted" : ""}" data-mute-id="${id}" aria-label="알림 끄기" type="button" title="${muted ? "알림 꺼짐 - 클릭해서 켜기" : "알림 끄기"}">${muted ? "🔕" : "🔔"}</button>`;
}

function renderFavorites() {
  const favs = getFavorites();
  const section = document.getElementById("favorites-section");
  const list = document.getElementById("favorites-list");
  const items = allRaces.filter(x => favs.includes(x.id));
  if (!items.length) { section.hidden = true; return; }
  section.hidden = false;
  list.innerHTML = items.map(x => `
    <a class="urgency-item" href="race.html?id=${x.id}">
      <div><div class="urgency-name">${x.name}</div><div class="urgency-sub">${x.date} · ${x.region}</div></div>
      <div class="race-item-right">${muteButton(x.id)}${favButton(x.id)}</div>
    </a>`).join("");
}

function renderRecommendations() {
  const favs = getFavorites();
  const section = document.getElementById("reco-section");
  const list = document.getElementById("reco-list");
  if (!section || !list) return;
  if (favs.length === 0) { section.hidden = true; return; }

  const favRaces = allRaces.filter(x => favs.includes(x.id));
  const regionCount = {};
  const distSet = new Set();
  favRaces.forEach(x => {
    regionCount[x.region] = (regionCount[x.region] || 0) + 1;
    x.distances.split(",").map(d => d.trim()).forEach(d => distSet.add(d));
  });
  const topRegions = Object.entries(regionCount).sort((a, b) => b[1] - a[1]).map(([r]) => r);

  const scored = allRaces
    .filter(x => !favs.includes(x.id) && x.status !== "접수마감")
    .map(x => {
      let score = 0;
      if (topRegions.includes(x.region)) score += 2;
      if (x.distances.split(",").some(d => distSet.has(d.trim()))) score += 1;
      return { ...x, score };
    })
    .filter(x => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  if (scored.length === 0) { section.hidden = true; return; }
  section.hidden = false;
  list.innerHTML = scored.map(x => `
    <a class="urgency-item" href="race.html?id=${x.id}">
      <div><div class="urgency-name">${x.name}</div><div class="urgency-sub">${x.date} · ${x.region} · ${x.distances}</div></div>
      ${favButton(x.id)}
    </a>`).join("");
}

function renderUrgency() {
  const closing = allRaces
    .filter(x => x.status === "접수중" && x.regEnd)
    .map(x => ({ ...x, dday: daysBetween(x.regEnd) }))
    .filter(x => x.dday >= 0 && x.dday <= 7)
    .sort((a, b) => a.dday - b.dday);

  const opening = allRaces
    .filter(x => x.status === "접수전" && x.regStart)
    .map(x => ({ ...x, dday: daysBetween(x.regStart) }))
    .filter(x => x.dday >= 0 && x.dday <= 14)
    .sort((a, b) => a.dday - b.dday);

  const closingEl = document.getElementById("closing-list");
  const openingEl = document.getElementById("opening-list");

  closingEl.innerHTML = closing.length
    ? closing.map(x => `
      <a class="urgency-item" href="race.html?id=${x.id}">
        <div><div class="urgency-name">${x.name}</div><div class="urgency-sub">${x.date} · ${x.region} · ~${x.regEnd} 마감</div></div>
        <span class="dday-badge dday-close">${fmtDday(x.dday)}</span>
      </a>`).join("")
    : `<div class="urgency-empty">해당 대회 없음</div>`;

  openingEl.innerHTML = opening.length
    ? opening.map(x => `
      <a class="urgency-item" href="race.html?id=${x.id}">
        <div><div class="urgency-name">${x.name}</div><div class="urgency-sub">${x.date} · ${x.region} · ${x.regStart}${x.regStartTime ? " " + x.regStartTime : ""} 시작</div></div>
        <span class="dday-badge dday-open">${fmtDday(x.dday)}</span>
      </a>`).join("")
    : `<div class="urgency-empty">해당 대회 없음</div>`;
}

function renderStats() {
  const counts = { total: allRaces.length, 접수중: 0, 접수전: 0, 접수마감: 0 };
  allRaces.forEach(x => { if (counts[x.status] !== undefined) counts[x.status]++; });
  document.getElementById("stats-row").innerHTML = `
    <div class="stat-card"><div class="stat-label">전체</div><div class="stat-value">${counts.total}</div></div>
    <div class="stat-card"><div class="stat-label">접수중</div><div class="stat-value" style="color:var(--success)">${counts.접수중}</div></div>
    <div class="stat-card"><div class="stat-label">접수전</div><div class="stat-value">${counts.접수전}</div></div>
    <div class="stat-card"><div class="stat-label">접수마감</div><div class="stat-value">${counts.접수마감}</div></div>
  `;
}

function populateRegionFilter() {
  const regions = [...new Set(allRaces.map(x => x.region))].sort();
  const sel = document.getElementById("f-region");
  regions.forEach(r => {
    const o = document.createElement("option");
    o.value = r; o.textContent = r;
    sel.appendChild(o);
  });
}

function statusClass(status) {
  return "status-" + status.replace(/\s/g, ".");
}

function getFiltered() {
  const q = document.getElementById("f-search").value.trim().toLowerCase();
  const region = document.getElementById("f-region").value;
  const status = document.getElementById("f-status").value;
  const tier = document.getElementById("f-tier").value;
  const favOnly = document.getElementById("f-fav-only").classList.contains("active");
  const favs = getFavorites();
  return allRaces.filter(x =>
    (!q || x.name.toLowerCase().includes(q)) &&
    (!region || x.region === region) &&
    (!status || x.status === status) &&
    (!tier || x.tier === tier) &&
    (!favOnly || favs.includes(x.id))
  );
}

function renderList() {
  const filtered = getFiltered();
  document.getElementById("f-count").textContent = `${filtered.length}개 중 ${Math.min(visibleCount, filtered.length)}개 표시`;

  const listEl = document.getElementById("race-list");
  listEl.innerHTML = filtered.slice(0, visibleCount).map(x => `
    <a class="race-item" href="race.html?id=${x.id}">
      <div>
        <div class="race-name">${x.tier === "Tier1" ? '<span class="tier1-badge">Tier1</span>' : ""}${x.name}</div>
        <div class="race-meta">${x.date} · ${x.region} · ${x.distances}</div>
        ${x.competitivenessNote ? `<div class="competitiveness-note">🔥 ${x.competitivenessNote}</div>` : ""}
      </div>
      <div class="race-item-right">
        ${favButton(x.id)}
        <span class="status-badge ${statusClass(x.status)}">${x.status}</span>
      </div>
    </a>
  `).join("");

  document.getElementById("load-more").hidden = filtered.length <= visibleCount;
}

function handleFavClick(e) {
  const muteBtn = e.target.closest(".mute-btn");
  if (muteBtn) {
    e.preventDefault();
    e.stopPropagation();
    toggleMute(Number(muteBtn.dataset.muteId));
    renderFavorites();
    return;
  }
  const btn = e.target.closest(".fav-btn");
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  toggleFavorite(Number(btn.dataset.id));
  renderFavorites();
  renderList();
}

function attachEvents() {
  ["f-search", "f-region", "f-status", "f-tier"].forEach(id => {
    document.getElementById(id).addEventListener("input", () => {
      visibleCount = PAGE_SIZE;
      renderList();
    });
  });
  document.getElementById("f-fav-only").addEventListener("click", () => {
    const btn = document.getElementById("f-fav-only");
    const active = btn.classList.toggle("active");
    btn.setAttribute("aria-pressed", active);
    visibleCount = PAGE_SIZE;
    renderList();
  });
  document.getElementById("load-more").addEventListener("click", () => {
    visibleCount += PAGE_SIZE;
    renderList();
  });
  document.getElementById("race-list").addEventListener("click", handleFavClick);
  document.getElementById("favorites-list").addEventListener("click", handleFavClick);
}

const NOTICE_KEY = "runraider_notice_hide_until";
function initNoticePopup() {
  const popup = document.getElementById("notice-popup");
  if (!popup) return;
  const hideUntil = localStorage.getItem(NOTICE_KEY);
  const today = new Date().toDateString();
  if (hideUntil === today) return;

  popup.hidden = false;
  document.getElementById("notice-popup-close").addEventListener("click", () => {
    popup.hidden = true;
  });
  document.getElementById("notice-popup-hide-today").addEventListener("click", () => {
    localStorage.setItem(NOTICE_KEY, today);
    popup.hidden = true;
  });
}
initNoticePopup();

const VAPID_PUBLIC_KEY = "BGBv9EIIeo-zhHz6Ow2tfsu7LpQ7NAZ0CiW82q2KwIkveDYkA_41m_D9GC_TiCOPoIK4Dqi1k2XKO4YTGvC4rZw";

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  return Uint8Array.from([...raw].map(c => c.charCodeAt(0)));
}

async function enablePushNotifications() {
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    alert("이 브라우저는 알림 기능을 지원하지 않아요.");
    return;
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") return;

  const reg = await navigator.serviceWorker.register("sw.js");
  const sub = await reg.pushManager.subscribe({
    userVisibleOnly: true,
    applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY)
  });

  await fetch("/.netlify/functions/subscribe", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub, favoriteIds: getFavorites(), mutedIds: getMuted() })
  });

  const btn = document.getElementById("f-notify-btn");
  if (btn) { btn.textContent = "🔔 알림 켜짐"; btn.classList.add("active"); }
}

document.getElementById("f-notify-btn")?.addEventListener("click", enablePushNotifications);

fetch("data.json")
  .then(r => r.json())
  .then(payload => {
    const now = new Date();
    TODAY = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    allRaces = payload.races;
    document.getElementById("last-verified").textContent = payload.generatedAt;
    renderUrgency();
    renderStats();
    renderFavorites();
    renderRecommendations();
    populateRegionFilter();
    attachEvents();
    renderList();
  })
  .catch(err => {
    document.getElementById("race-list").innerHTML =
      `<div style="padding:20px;color:var(--muted);">데이터를 불러오지 못했습니다. data.json 파일이 같은 폴더에 있는지 확인하세요.</div>`;
    console.error(err);
  });
