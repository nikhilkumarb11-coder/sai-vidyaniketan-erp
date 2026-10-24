const PWA = (() => {
  let deferredPrompt = null;
  const BUILD = String((typeof CONFIG !== "undefined" && CONFIG.appVersion) || "34");

  function base() {
    const b = (CONFIG.basePath || "").replace(/\/$/, "");
    return b && location.pathname.indexOf(b) === 0 ? b : "";
  }

  function showInstallButtons(show) {
    document.querySelectorAll(".install-btn").forEach((btn) => {
      btn.classList.toggle("hidden", !show);
    });
  }

  function isStandalone() {
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      window.navigator.standalone === true
    );
  }

  async function clearSiteCaches() {
    if (!window.caches) return;
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }

  async function unregisterWorkers() {
    if (!("serviceWorker" in navigator)) return;
    const regs = await navigator.serviceWorker.getRegistrations();
    await Promise.all(regs.map((r) => r.unregister()));
  }

  /**
   * One-time migration when app version changes.
   * Never loops: sessionStorage blocks a second reload for the same BUILD.
   */
  async function migrateBuild() {
    const KEY = "svs_app_build";
    let seen = "";
    try {
      seen = localStorage.getItem(KEY) || "";
    } catch (e) {}
    if (seen === BUILD) return false;

    try {
      await unregisterWorkers();
      await clearSiteCaches();
    } catch (e) {}

    try {
      localStorage.setItem(KEY, BUILD);
      localStorage.setItem("svs_html_build", BUILD);
    } catch (e) {}

    try {
      if (sessionStorage.getItem("svs_build_reloaded") === BUILD) return false;
      sessionStorage.setItem("svs_build_reloaded", BUILD);
      sessionStorage.setItem("svs_html_reloaded", BUILD);
    } catch (e) {
      // If storage is blocked, skip reload to avoid an infinite loop
      return false;
    }

    location.reload();
    return true;
  }

  async function register() {
    if (!("serviceWorker" in navigator)) return;
    try {
      // Only reload on SW update if this page was already controlled.
      // First install must NOT reload — that caused continuous reload loops.
      const hadController = !!navigator.serviceWorker.controller;

      const reg = await navigator.serviceWorker.register("./sw.js", {
        scope: "./",
        updateViaCache: "none"
      });

      const wake = (worker) => {
        if (worker) worker.postMessage({ type: "SKIP_WAITING" });
      };
      if (reg.waiting) wake(reg.waiting);
      if (reg.installing) {
        reg.installing.addEventListener("statechange", () => {
          if (reg.waiting) wake(reg.waiting);
        });
      }
      reg.addEventListener("updatefound", () => {
        const w = reg.installing;
        if (!w) return;
        w.addEventListener("statechange", () => {
          if (reg.waiting) wake(reg.waiting);
        });
      });
      reg.update().catch(() => {});

      setInterval(() => reg.update().catch(() => {}), 60 * 1000);
      document.addEventListener("visibilitychange", () => {
        if (document.visibilityState === "visible") reg.update().catch(() => {});
      });

      if (hadController) {
        navigator.serviceWorker.addEventListener("controllerchange", () => {
          if (register._reloaded) return;
          register._reloaded = true;
          location.reload();
        });
      }
    } catch (e) {
      console.warn("SW register failed", e);
    }
  }

  function wireInstall() {
    window.addEventListener("beforeinstallprompt", (e) => {
      e.preventDefault();
      deferredPrompt = e;
      if (!isStandalone()) showInstallButtons(true);
    });

    window.addEventListener("appinstalled", () => {
      deferredPrompt = null;
      showInstallButtons(false);
      UI.toast("App added to home screen", "ok");
    });

    document.querySelectorAll(".install-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          deferredPrompt = null;
          showInstallButtons(false);
          if (choice.outcome === "accepted") UI.toast("Adding…", "ok");
          return;
        }
        const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        UI.toast(
          isiOS
            ? "Tap Share → Add to Home Screen"
            : "Use browser menu → Install app / Add to Home Screen",
          ""
        );
      });
    });

    if (!isStandalone() && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
      showInstallButtons(true);
    }
  }

  async function start() {
    const reloading = await migrateBuild();
    if (reloading) return;
    wireInstall();
    register();
  }

  return { start, base, BUILD };
})();
