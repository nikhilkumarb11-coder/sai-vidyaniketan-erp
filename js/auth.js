const Auth = (() => {
  async function adoptSession(data) {
    Api.setToken(data.token);
    let boot = data.bootstrap;
    if (!boot) boot = await Api.call("bootstrap", {}, { skipCore: true, skipCache: true });
    AppCache.set(boot);
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
    AppCache.clear();
  }

  async function restore() {
    if (!Api.getToken()) return null;
    try {
      // Paint from last device snapshot first, then refresh.
      await Core.restoreFromIdb();
      if (Core.isReady()) Core.startPullLoop();
      const boot = await Api.call("bootstrap", {}, { skipCore: true, skipCache: true });
      AppCache.set(boot);
      if (boot.tables) Core.hydrateFromBootstrap(boot);
      else await Core.pull({ full: !Core.isReady() });
      Core.startPullLoop();
      return boot;
    } catch (e) {
      Core.stopPullLoop();
      await Core.clear();
      Api.clearToken();
      AppCache.clear();
      return null;
    }
  }

  function isPrincipal() {
    const u = AppCache.user();
    return u && u.role === "Principal";
  }

  return { login, logout, restore, isPrincipal };
})();
