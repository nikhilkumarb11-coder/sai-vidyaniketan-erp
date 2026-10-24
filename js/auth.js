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

  /** Load token + profile from localStorage into memory (sync, before any network). */
  function hydrateFromStorage() {
    const cached = readPersistedSession();
    if (cached && cached.user && Api.getToken()) {
      AppCache.set(cached);
      return cached;
    }
    return null;
  }

  function hasLocalSession() {
    return !!(Api.getToken() && (AppCache.user() || (readPersistedSession() && readPersistedSession().user)));
  }

  function isAuthError(e) {
    if (!e) return false;
    if (e.code === "AUTH") return true;
    const msg = String(e.message || e || "").toLowerCase();
    // Strict: only clear session for real auth failures (not network / HTML / CORS)
    return (
      msg === "invalid session" ||
      msg === "session expired" ||
      msg === "not authenticated" ||
      msg.indexOf("invalid session") === 0 ||
      msg.indexOf("session expired") === 0 ||
      msg.indexOf("not authenticated") === 0 ||
      msg.indexOf("user inactive") >= 0
    );
  }

  function forceLocalLogout() {
    Core.stopPullLoop();
    Core.clear().catch(() => {});
    Api.clearToken();
    clearPersistedSession();
    AppCache.clear();
  }

  function refreshBootstrapInBackground() {
    Api.call("bootstrap", {}, { skipCore: true, skipCache: true })
      .then((boot) => {
        AppCache.set(boot);
        persistSession(boot);
        if (boot.tables) Core.hydrateFromBootstrap(boot);
        else Core.pull({ full: !Core.isReady() }).catch(() => {});
      })
      .catch((e) => {
        // Only kick to login when the server says the session is truly dead
        if (isAuthError(e)) {
          forceLocalLogout();
          if (typeof App !== "undefined" && App.showLogin) {
            App.showLogin();
            if (typeof UI !== "undefined") UI.toast("Session expired — please sign in again", "error");
          }
        }
      });
  }

  async function adoptSession(data) {
    if (!data || !data.token) throw new Error("Login did not return a session token");
    Api.setToken(data.token);

    // Persist immediately so a refresh mid-load still stays signed in
    const early = data.bootstrap || {
      user: data.user,
      school: CONFIG.school,
      modules: CONFIG.modulesDefault,
      academicYear: CONFIG.school.academicYear,
      theme: CONFIG.theme,
      classFees: CONFIG.classFees,
      subjectsByClass: CONFIG.subjectsByClass,
      whatsappTemplates: CONFIG.whatsappTemplates,
      grading: CONFIG.grading
    };
    if (early.user) {
      AppCache.set(early);
      persistSession(early);
    }

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
    forceLocalLogout();
  }

  /**
   * Refresh must NOT send the user to login.
   * Use local session first; sync bootstrap in the background.
   */
  async function restore() {
    if (!Api.getToken()) return null;

    hydrateFromStorage();

    try {
      await Core.restoreFromIdb();
    } catch (e) {}

    // Fast path: local profile exists → stay in the app, sync later
    if (AppCache.user()) {
      Core.startPullLoop();
      refreshBootstrapInBackground();
      return AppCache.get();
    }

    // No local profile yet (first load after update) — need one network bootstrap
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
        forceLocalLogout();
        return null;
      }
      // Keep token; next visit can hydrate after a successful login/bootstrap
      return null;
    }
  }

  function isPrincipal() {
    const u = AppCache.user();
    return u && u.role === "Principal";
  }

  return {
    login,
    logout,
    restore,
    isPrincipal,
    hydrateFromStorage,
    hasLocalSession,
    persistSession
  };
})();
