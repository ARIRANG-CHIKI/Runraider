self.addEventListener("push", (event) => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch { data = {}; }
  const title = data.title || "런레이더";
  const options = {
    body: data.body || "찜한 대회에 새 소식이 있어요.",
    icon: "/icon-192.png",
    data: { url: data.url || "/", raceId: data.raceId || null }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data && event.notification.data.url ? event.notification.data.url : "/";
  const raceId = event.notification.data && event.notification.data.raceId;

  event.waitUntil((async () => {
    if (raceId != null) {
      try {
        const sub = await self.registration.pushManager.getSubscription();
        if (sub) {
          await fetch("/.netlify/functions/mark-seen", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ endpoint: sub.endpoint, raceId })
          });
        }
      } catch (e) {
        console.error("알림 확인 처리 실패:", e);
      }
    }
    await clients.openWindow(url);
  })());
});
