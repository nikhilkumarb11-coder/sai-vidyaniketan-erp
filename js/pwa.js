const PWA = (() => {
  let deferredPrompt = null;

  function base() {
    const b = (CONFIG.basePath || "").replace(/\/$/, "");
    // When opened from file:// or local root without basePath match, still register relative sw
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

  async function register() {
    if (!("serviceWorker" in navigator)) return;
    try {
      const swUrl = "sw.js";
      await navigator.serviceWorker.register(swUrl, { scope: "./" });
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
      UI.toast("App installed", "ok");
    });

    document.querySelectorAll(".install-btn").forEach((btn) => {
      btn.addEventListener("click", async () => {
        if (deferredPrompt) {
          deferredPrompt.prompt();
          const choice = await deferredPrompt.userChoice;
          deferredPrompt = null;
          showInstallButtons(false);
          if (choice.outcome === "accepted") UI.toast("Installing…", "ok");
          return;
        }
        // iOS / unsupported browsers
        const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
        UI.toast(
          isiOS
            ? "Tap Share → Add to Home Screen to install"
            : "Use your browser menu → Install app / Add to Home Screen",
          ""
        );
      });
    });

    // Show manual hint button on iOS even without beforeinstallprompt
    if (!isStandalone() && /iphone|ipad|ipod/i.test(navigator.userAgent)) {
      showInstallButtons(true);
    }
  }

  function start() {
    register();
    wireInstall();
  }

  return { start, base };
})();
