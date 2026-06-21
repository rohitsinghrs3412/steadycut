const CACHE_NAME = "steadycut-shell-v6";
const NOTIFICATION_ICON = "/icon-192x192.png";
const NOTIFICATION_BADGE = "/badge-96x96.png";
const PRIVATE_NAVIGATION_PREFIXES = [
  "/dashboard",
  "/check-ins",
  "/progress",
  "/habits",
  "/insights",
  "/coach",
  "/live-coach",
  "/goals",
  "/settings",
];
const APP_SHELL_URLS = [
  "/",
  "/offline",
  "/icon.svg",
  NOTIFICATION_ICON,
  NOTIFICATION_BADGE,
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL_URLS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key))
        )
      )
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      isPrivateNavigation(url.pathname)
        ? networkOnly(request, "/offline")
        : networkFirst(request, "/offline")
    );
    return;
  }

  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/_next/image") ||
    url.pathname.endsWith(".woff2") ||
    url.pathname === "/icon.svg" ||
    url.pathname === "/maskable-icon.svg" ||
    url.pathname === "/apple-touch-icon.svg" ||
    url.pathname === NOTIFICATION_ICON ||
    url.pathname === NOTIFICATION_BADGE
  ) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

self.addEventListener("push", (event) => {
  const payload = event.data?.json?.() ?? {
    title: "SteadyCut",
    body: "Time to check in.",
    url: "/dashboard",
  };

  event.waitUntil(
    self.registration.showNotification(payload.title || "SteadyCut", {
      body: payload.body || "Time to check in.",
      icon: payload.icon || NOTIFICATION_ICON,
      badge: payload.badge || NOTIFICATION_BADGE,
      vibrate: [80, 40, 80],
      data: {
        url: payload.url || "/dashboard",
      },
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL(event.notification.data?.url || "/dashboard", self.location.origin);

  event.waitUntil(
    self.clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((clients) => {
        for (const client of clients) {
          if (client.url === url.href && "focus" in client) {
            return client.focus();
          }
        }

        return self.clients.openWindow(url.href);
      })
  );
});

async function networkFirst(request, fallbackUrl) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    if (response.ok) {
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    return (await cache.match(request)) || (await cache.match(fallbackUrl));
  }
}

async function networkOnly(request, fallbackUrl) {
  try {
    return await fetch(request);
  } catch {
    const cache = await caches.open(CACHE_NAME);
    return await cache.match(fallbackUrl);
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const fetched = fetch(request)
    .then((response) => {
      if (response.ok) {
        void cache.put(request, response.clone());
      }

      return response;
    })
    .catch(() => cached);

  return cached || fetched;
}

function isPrivateNavigation(pathname) {
  return PRIVATE_NAVIGATION_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}
