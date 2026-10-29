/* Service Worker - notifications and public static assets only. */
const CACHE_NAME = "nathramos-static-v2";
const DEFAULT_URL = "/pt-BR/notificacoes";
self.addEventListener("install", (event) => {
  event.waitUntil(self.skipWaiting());
});
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter(
              (key) =>
                key.startsWith("nathramos-static-") && key !== CACHE_NAME,
            )
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});
// Never cache authenticated HTML, API responses or RSC payloads.
self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  if (
    request.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.pathname.startsWith("/_next/static/")
  )
    return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async (cache) => {
      const cached = await cache.match(request);
      if (cached) return cached;
      const response = await fetch(request);
      if (response.ok) await cache.put(request, response.clone());
      return response;
    }),
  );
});
function localUrl(value) {
  try {
    const url = new URL(
      typeof value === "string" ? value : DEFAULT_URL,
      self.location.origin,
    );
    return url.origin === self.location.origin && /^https?:$/.test(url.protocol)
      ? url.href
      : new URL(DEFAULT_URL, self.location.origin).href;
  } catch {
    return new URL(DEFAULT_URL, self.location.origin).href;
  }
}
self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data?.json() || {};
  } catch {
    data = { body: event.data?.text() || "" };
  }
  if (!data || typeof data !== "object") data = {};
  const tag = data.tag || data.notification_id;
  const options = {
    body:
      typeof data.body === "string"
        ? data.body
        : "Você tem uma nova notificação.",
    icon: "/icons-pwa/icon-192.png",
    badge: "/icons-pwa/icon-48.png",
    data: {
      url: localUrl(data.url),
      notification_id: data.notification_id,
      type: data.type,
    },
    ...(tag ? { tag: String(tag), renotify: true } : {}),
    vibrate: [100, 50, 100],
  };
  // Display is the primary task. A failed page update must not suppress the alert.
  event.waitUntil(
    self.registration
      .showNotification(
        typeof data.title === "string" ? data.title : "Nath Ramos",
        options,
      )
      .then(async () => {
        try {
          const clients = await self.clients.matchAll({
            type: "window",
            includeUncontrolled: true,
          });
          for (const client of clients)
            client.postMessage({
              type: "notification:received",
              notification_id: data.notification_id,
            });
        } catch {
          /* Notification was already displayed. */
        }
      }),
  );
});
self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = localUrl(event.notification.data?.url);
  event.waitUntil(
    (async () => {
      const clients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of clients) {
        if (
          new URL(client.url).origin !== self.location.origin ||
          !("focus" in client)
        )
          continue;
        try {
          const destination =
            "navigate" in client ? await client.navigate(url) : client;
          if (destination) return await destination.focus();
        } catch {
          /* Try another window or open a new one. */
        }
      }
      return self.clients.openWindow(url);
    })(),
  );
});
