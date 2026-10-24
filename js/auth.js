const Auth = (() => {
  const SESSION_KEY = "svs_session_v1";

  function persistSession(boot) {
    if (!boot || !boot.user) return;
    try {
      localStorage.setItem(
        SESSION_KEY,
        JSON.stringify({
          user: boot.user,
          academicYear: boot.academicYear,
          modules: boot.modules,
          school: boot.school,
          theme: boot.theme,
          classFees: boot.classFees,
          subjectsByClass: boot.subjectsByClass,
          whatsappTemplates: boot.whatsappTemplates,
          grading: boot.grading,
          services: boot.services,
          savedAt: Date.now()
        })
      );
    } catch (e) {}
  }

  function readPersistedSession() {
    try {
      return JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    } catch (e) {
      return null;
    }
  }

  function clearPersistedSession() {
    try {
      localStorage.removeItem(SESSION_KEY);
    } catch (e) {}
  }

  function isAuthError(e) {
    if (!e) return false;
    if (e.code === "AUTH") return true;
    const msg = String(e.message || e || "").toLowerCase();
    return (
      msg.includes("invalid session") ||
      msg.includes("session expired") ||
      msg.includes("not authenticated") ||
      msg.includes("user inactive") ||
      msg.includes("invalid credentials")
    );
  }

  function refreshBootstrapInBackground() {
    Api.call("bootstrap", {}, { skipCore: true, skipCache: true })
      .then((boot) => {
        AppCache.set(boot);
        persistSession(boot);
        if (boot.tables) Core.hydrateFromBootstrap(boot);
        else Core.pull({ full: !Core.isReady() }).catch(() => {});
      })
      .catch(() => {});
  }

  async function adoptSession(data) {
    Api.setToken(data.token);
    let boot = data.bootstrap;
    if (!boot) boot = await Api.call("bootstrap", {}, { skipCore: true, skipCache: true });
    AppCache.set(boot);
    persistSession(boot);
    if (boot.tables) Core.hydrateFromBootstrap(boot);
    else await Core.pull({ full: true });
    Core.startPullLoop();
    return boot;
  }

  async function login(username, password) {
    const data = await Api.call("login", { username, password, withData: true }, { skipCore: true });
    return adoptSession(data);
  }

  async function logout() {
    try {
      await Api.call("logout", {}, { skipCore: true });
    } catch (e) {}
    Core.stopPullLoop();
    await Core.clear();
    Api.clearToken();
    clearPersistedSession();
    AppCache.clear();
  }

  /**
   * Keep the user signed in across refresh.
   * Only Sign out / real AUTH failures return to the login screen.
   */
  async function restore() {
    if (!Api.getToken()) return null;

    const cached = readPersistedSession();
    if (cached && cached.user) {
      AppCache.set(cached);
    }

    try {
      await Core.restoreFromIdb();
      if (Core.isReady()) Core.startPullLoop();
    } catch (e) {}

    try {
      const boot = await Api.call("bootstrap", {}, { skipCore: true, skipCache: true });
      AppCache.set(boot);
      persistSession(boot);
      if (boot.tables) Core.hydrateFromBootstrap(boot);
      else await Core.pull({ full: !Core.isReady() });
      Core.startPullLoop();
      return boot;
    } catch (e) {
      if (isAuthError(e)) {
        Core.stopPullLoop();
        await Core.clear();
        Api.clearToken();
        clearPersistedSession();
        AppCache.clear();
        return null;
      }

      // Network / Apps Script cold start — stay logged in with cached profile
      if (AppCache.user()) {
        Core.startPullLoop();
        setTimeout(refreshBootstrapInBackground, 1500);
        return AppCache.get();
      }

      // Token exists but no cache yet (first refresh after update) — one short retry
      await new Promise((r) => setTimeout(r, 1200));
      try {
        const boot = await Api.call("bootstrap", {}, { skipCore: true, skipCache: true });
        AppCache.set(boot);
        persistSession(boot);
        if (boot.tables) Core.hydrateFromBootstrap(boot);
        else await Core.pull({ full: true });
        Core.startPullLoop();
        return boot;
      } catch (e2) {
        if (isAuthError(e2)) {
          Core.stopPullLoop();
          await Core.clear();
          Api.clearToken();
          clearPersistedSession();
          AppCache.clear();
        }
        // Keep token on transient errors so the next refresh can succeed
        return null;
      }
    }
  }

  function isPrincipal() {
    const u = AppCache.user();
    return u && u.role === "Principal";
  }

  return { login, logout, restore, isPrincipal };
})();
