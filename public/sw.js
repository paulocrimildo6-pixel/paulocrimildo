const CACHE_NAME = "lingoconversa-cache-v1";
const ASSETS_TO_CACHE = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icon-192.png",
  "/icon-512.png",
  "/icon-192.jpg",
  "/icon-512.jpg"
];

// Install Event
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log("[Service Worker] Caching core app shell");
      return cache.addAll(ASSETS_TO_CACHE);
    }).then(() => self.skipWaiting())
  );
});

// Activate Event
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(
        keyList.map((key) => {
          if (key !== CACHE_NAME) {
            console.log("[Service Worker] Removing old cache", key);
            return caches.delete(key);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch Event
self.addEventListener("fetch", (event) => {
  // Only intercept standard GET requests
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);

  // Skip hot-reloads, API calls, node_modules, and external cross-origin requests
  if (
    url.pathname.startsWith("/api") || 
    url.pathname.includes("/@vite") || 
    url.pathname.includes("/node_modules") || 
    url.hostname !== self.location.hostname
  ) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        // Serve cached asset immediately, but update in background (Stale-While-Revalidate)
        fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(event.request, networkResponse));
            }
          })
          .catch(() => {
            // Ignore background sync fetch failures (offline)
          });
        return cachedResponse;
      }

      // Try network first if not cached
      return fetch(event.request)
        .then((networkResponse) => {
          if (networkResponse.status === 200 && networkResponse.type === "basic") {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Offline fallback
          if (
            event.request.mode === "navigate" || 
            (event.request.headers.get("accept") && event.request.headers.get("accept").includes("text/html"))
          ) {
            return caches.match("/");
          }
        });
    })
  );
});
