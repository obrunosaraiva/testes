const CACHE_NAME = "gtd-manager-v1";
const STATIC_ASSETS = [
  "/",
  "/static/style.css",
  "/js/app.js",
];

// ─── Install: cache static assets ────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// ─── Activate: clean old caches ──────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

// ─── Fetch: strategy by request type ─────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);

  // API calls: network-first, fallback to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithCache(event.request));
    return;
  }

  // Static assets: cache-first
  event.respondWith(cacheFirst(event.request));
});

async function networkFirstWithCache(request) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await cache.match(request);
    if (cached) return cached;
    // Return offline JSON for API calls
    return new Response(
      JSON.stringify({ offline: true, error: "Sem conexão. Dados podem estar desatualizados." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    // Return cached index.html for navigation requests
    if (request.mode === "navigate") {
      return caches.match("/");
    }
    return new Response("Offline", { status: 503 });
  }
}

// ─── Push notifications ───────────────────────────────────────────────────────
self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-72.png",
      tag: data.id || "gtd-notification",
      data: { action: data.action },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const action = event.notification.data?.action;
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((windowClients) => {
      if (windowClients.length > 0) {
        const client = windowClients[0];
        client.focus();
        if (action) client.postMessage({ type: "navigate", page: action });
      } else {
        clients.openWindow(action ? `/?page=${action}` : "/");
      }
    })
  );
});
