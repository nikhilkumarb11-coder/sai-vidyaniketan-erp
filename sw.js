/* Sai Vidyaniketan ERP — shell cache for installable PWA */
const CACHE = "svs-erp-shell-v10";
const SHELL = [
  "./",
  "./index.html",
  "./config.js",
  "./manifest.webmanifest",
  "./css/theme.css",
  "./css/app.css",
  "./assets/logo.jpg",
  "./js/demo.js",
  "./js/ledger.js",
  "./js/core.js",
  "./js/api.js",
  "./js/cache.js",
  "./js/ui.js",
  "./js/receiptPdf.js",
  "./js/auth.js",
  "./js/router.js",
  "./js/pages.js",
  "./js/pwa.js",
  "./js/app.js"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Never cache Apps Script / API calls
  if (url.hostname.includes("script.google.com") || url.hostname.includes("googleusercontent.com")) {
    return;
  }

  // Network-first for navigations; cache fallback offline
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("./index.html", copy));
          return res;
        })
        .catch(() => caches.match("./index.html"))
    );
    return;
  }

  // Cache-first for same-origin static assets
  if (url.origin === self.location.origin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetched;
      })
    );
  }
});
