/* Sai Vidyaniketan ERP — shell cache for installable PWA */
const CACHE = "svs-erp-shell-v16";
const BUILD = "16";
const SHELL = [
  "./",
  "./index.html",
  "./config.js?v=" + BUILD,
  "./manifest.webmanifest",
  "./css/theme.css?v=" + BUILD,
  "./css/app.css?v=" + BUILD,
  "./assets/logo.jpg",
  "./js/demo.js?v=" + BUILD,
  "./js/ledger.js?v=" + BUILD,
  "./js/core.js?v=" + BUILD,
  "./js/api.js?v=" + BUILD,
  "./js/cache.js?v=" + BUILD,
  "./js/ui.js?v=" + BUILD,
  "./js/receiptPdf.js?v=" + BUILD,
  "./js/auth.js?v=" + BUILD,
  "./js/router.js?v=" + BUILD,
  "./js/pages.js?v=" + BUILD,
  "./js/pwa.js?v=" + BUILD,
  "./js/app.js?v=" + BUILD
];

self.addEventListener("message", (event) => {
  if (event.data && event.data.type === "SKIP_WAITING") self.skipWaiting();
  if (event.data && event.data.type === "GET_BUILD") {
    event.source && event.source.postMessage({ type: "BUILD", build: BUILD });
  }
});

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) =>
        Promise.all(
          SHELL.map((url) =>
            cache.add(url).catch(() => cache.add(url.split("?")[0]).catch(() => {}))
          )
        )
      )
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
      .then(() =>
        self.clients.matchAll({ type: "window" }).then((clients) => {
          clients.forEach((c) => c.postMessage({ type: "SW_ACTIVATED", build: BUILD }));
        })
      )
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

  // Network-first for HTML/JS/CSS so phone apps pick up wording / fixes
  if (isAppShell) {
    event.respondWith(
      fetch(req, { cache: "no-store" })
        .then((res) => {
          if (res && res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
          }
          return res;
        })
        .catch(() =>
          caches.match(req).then((c) => c || caches.match("./index.html") || caches.match("./"))
        )
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
