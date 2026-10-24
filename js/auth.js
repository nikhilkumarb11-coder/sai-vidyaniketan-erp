const Auth = (() => {
  async function login(username, password) {
    // Server returns bootstrap with the token when withData is set — one round trip.
    const data = await Api.call("login", { username, password, withData: true });
    Api.setToken(data.token);
    if (data.bootstrap) {
      AppCache.set(data.bootstrap);
      return data.bootstrap;
    }
    const boot = await Api.call("bootstrap", {});
    AppCache.set(boot);
    return boot;
  }

  async function logout() {
    try {
      await Api.call("logout", {});
    } catch (e) {}
    Api.clearToken();
    AppCache.clear();
  }

  async function restore() {
    if (!Api.getToken()) return null;
    try {
      const boot = await Api.call("bootstrap", {});
      AppCache.set(boot);
      return boot;
    } catch (e) {
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
