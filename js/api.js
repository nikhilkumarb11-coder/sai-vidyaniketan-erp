const Api = (() => {
  const TOKEN_KEY = "svs_token";

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }
  function setToken(t) {
    sessionStorage.setItem(TOKEN_KEY, t || "");
  }
  function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
  }

  function useDemo() {
    return (
      CONFIG.demoMode === true ||
      !CONFIG.apiUrl ||
      CONFIG.apiUrl.indexOf("PASTE_") === 0
    );
  }

  async function call(action, payload = {}) {
    if (useDemo()) {
      return DemoAPI.handle(action, { ...payload, token: getToken() });
    }
    const body = { ...payload, action, token: getToken() };
    const res = await fetch(CONFIG.apiUrl, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(body)
    });
    const json = await res.json();
    if (!json.ok) {
      const err = new Error(json.error || "Request failed");
      err.code = json.code;
      throw err;
    }
    return json.data;
  }

  return { getToken, setToken, clearToken, call, useDemo };
})();
