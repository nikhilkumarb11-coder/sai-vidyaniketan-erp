const App = (() => {
  function applyTheme() {
    // Prefer product theme from config; ignore legacy cream school defaults from Sheet
    const t = CONFIG.theme || {};
    const root = document.documentElement;
    const primary = t.primary || "#2563EB";
    const ink = t.dark || "#0F172A";
    root.style.setProperty("--primary", primary);
    root.style.setProperty("--ink", ink);
    root.style.setProperty("--dark", ink);
    root.style.setProperty("--accent", t.accent || "#E11D48");
    root.style.setProperty("--bg", t.background || "#F1F5F9");
    root.style.setProperty("--surface", t.surface || "#FFFFFF");
    root.style.setProperty("--success", t.success || "#059669");
    root.style.setProperty("--warning", t.warning || "#D97706");
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", ink);
  }

  function showLogin() {
    try {
      document.documentElement.classList.remove("has-session");
    } catch (e) {}
    document.getElementById("login-view").classList.remove("hidden");
    document.getElementById("app-view").classList.add("hidden");
    Api.warm();
  }

  function showShell() {
    try {
      document.documentElement.classList.add("has-session");
    } catch (e) {}
    document.getElementById("login-view").classList.add("hidden");
    document.getElementById("app-view").classList.remove("hidden");
    applyTheme();
    const school = AppCache.school();
    document.querySelectorAll("[data-school-name]").forEach((el) => {
      el.textContent = school.name || CONFIG.school.name;
    });
    document.querySelectorAll("[data-school-short]").forEach((el) => {
      el.textContent = school.shortName || CONFIG.school.shortName || "SVS";
    });
    const user = AppCache.user() || {};
    document.querySelectorAll("[data-user-name]").forEach((el) => {
      el.textContent = user.displayName || user.username || "";
    });
    updateModeBadges();
  }

  function wireLogin() {
    const form = document.getElementById("login-form");
    const wake = () => Api.warm();
    form.username.addEventListener("input", wake);
    form.password.addEventListener("input", wake);
    form.username.addEventListener("focus", wake);
    form.password.addEventListener("focus", wake);
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      Api.warm();
      const username = form.username.value.trim();
      const password = form.password.value;
      const btn = form.querySelector("button[type=submit]");
      btn.disabled = true;
      try {
        await Auth.login(username, password);
        location.hash = "#/dashboard";
        await Router.go();
        UI.toast("Welcome, " + AppCache.user().displayName, "ok");
      } catch (err) {
        UI.toast(err.message || "Login failed", "error");
      } finally {
        btn.disabled = false;
      }
    });
  }

  function wireLogout() {
    document.querySelectorAll("[data-logout]").forEach((btn) => {
      btn.addEventListener("click", async () => {
        await Auth.logout();
        showLogin();
        UI.toast("You are logged out");
      });
    });
  }

  function updateModeBadges() {
    const demo = Api.useDemo();
    document.querySelectorAll("[data-demo-badge]").forEach((el) => {
      el.classList.toggle("hidden", !demo);
    });
    document.querySelectorAll("[data-live-badge]").forEach((el) => {
      el.classList.toggle("hidden", demo);
    });
  }

  async function boot() {
    applyTheme();
    document.getElementById("login-motto").textContent = CONFIG.school.motto;
    document.getElementById("login-school").textContent = CONFIG.school.name;

    // Hydrate BEFORE wiring router — refresh must never flash the login form
    Auth.hydrateFromStorage();
    const stayIn = Auth.hasLocalSession();
    if (stayIn) showShell();

    updateModeBadges();
    wireLogin();
    wireLogout();
    Pages.registerAll();
    if (typeof PWA !== "undefined") PWA.start();
    Api.warm();
    Router.start();

    if (stayIn) {
      if (!location.hash || location.hash === "#") location.hash = "#/dashboard";
      try {
        await Router.go();
      } catch (e) {}
      Auth.restore().catch(() => {});
      return;
    }

    const session = await Auth.restore();
    if (session) {
      showShell();
      if (!location.hash || location.hash === "#") location.hash = "#/dashboard";
      await Router.go();
    } else {
      showLogin();
    }
  }

  return { boot, showLogin, showShell, applyTheme };
})();

document.addEventListener("DOMContentLoaded", () => App.boot());
