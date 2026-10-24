const App = (() => {
  function applyTheme() {
    const t = (AppCache.get() && AppCache.get().theme) || CONFIG.theme;
    const root = document.documentElement;
    root.style.setProperty("--primary", t.primary || CONFIG.theme.primary);
    root.style.setProperty("--dark", t.dark || CONFIG.theme.dark);
    root.style.setProperty("--accent", t.accent || CONFIG.theme.accent);
    root.style.setProperty("--bg", t.background || CONFIG.theme.background);
    root.style.setProperty("--surface", t.surface || CONFIG.theme.surface);
    root.style.setProperty("--success", t.success || CONFIG.theme.success);
    root.style.setProperty("--warning", t.warning || CONFIG.theme.warning);
  }

  function showLogin() {
    document.getElementById("login-view").classList.remove("hidden");
    document.getElementById("app-view").classList.add("hidden");
    Api.warm();
  }

  function showShell() {
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
    document.querySelectorAll("[data-user-name]").forEach((el) => {
      el.textContent = AppCache.user().displayName || AppCache.user().username;
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
        UI.toast("Logged out");
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
    updateModeBadges();
    wireLogin();
    wireLogout();
    Pages.registerAll();
    Router.start();
    Api.warm();
    const session = await Auth.restore();
    if (session) {
      if (!location.hash) location.hash = "#/dashboard";
      await Router.go();
    } else {
      showLogin();
    }
  }

  return { boot, showLogin, showShell, applyTheme };
})();

document.addEventListener("DOMContentLoaded", () => App.boot());
