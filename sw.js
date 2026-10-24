/* Sai Vidyaniketan ERP — shell cache for installable PWA */
const CACHE = "svs-erp-shell-v14";
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

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
});

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

  const sameOrigin = url.origin === self.location.origin;
  const path = url.pathname;
  const isAppShell =
    sameOrigin &&
    (req.mode === "navigate" ||
      path.endsWith(".js") ||
      path.endsWith(".css") ||
      path.endsWith("index.html") ||
      path.endsWith("config.js") ||
      path.endsWith("sw.js") ||
      path.endsWith("manifest.webmanifest"));

  // Network-first for HTML/JS/CSS so session fixes deploy immediately
  if (isAppShell) {
    event.respondWith(
      fetch(req)
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(req).then((c) => c || caches.match("./index.html")))
    );
    return;
  }

  // Cache-first for images and other static assets
  if (sameOrigin) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const fetched = fetch(req)
          .then((res) => {
            if (res && res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || fetched;
      })
    );
  }
});
