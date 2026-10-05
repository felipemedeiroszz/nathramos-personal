/* Service Worker - Nath Ramos Personal Trainer */

const CACHE_NAME = "nathramos-static-v1";
const PRECACHE_URLS = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k))
        )
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  if (url.pathname.startsWith("/api/")) return;
  if (url.pathname.startsWith("/dashboard")) {
    event.respondWith(
      caches.match(req).then((cached) => cached || fetch(req).catch(() => cached))
    );
    return;
  }
  event.respondWith(
    caches.match(req).then((cached) => {
      const networkFetch = fetch(req)
        .then((res) => {
          const copy = res.clone();
          if (res.ok && req.method === "GET") {
            caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || networkFetch;
    })
  );
});

self.addEventListener("push", (event) => {
  try {
    const data = event.data?.json() ?? {
      title: "Nath Ramos",
      body: "Você tem uma nova notificação.",
      url: "/dashboard",
    };
    const title = data.title ?? "Nath Ramos";
    const options = {
      body: data.body ?? "",
      icon: "/icons-pwa/icon-192.png",
      badge: "/icons-pwa/icon-48.png",
      data: { url: data.url ?? "/dashboard", notification_id: data.notification_id, type: data.type },
      tag: data.tag ?? data.notification_id ?? undefined,
      renotify: true,
      vibrate: [100, 50, 100],
    };
    event.waitUntil(self.registration.showNotification(title, options));
  } catch (err) {
    console.error("[SW] push error", err);
  }
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url ?? "/dashboard";
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client && client.url && new URL(client.url).origin === self.location.origin) {
          client.focus();
          if ("navigate" in client) return client.navigate(url);
        }
      }
      if ("openWindow" in self.clients) return self.clients.openWindow(url);
    })
  );
});
