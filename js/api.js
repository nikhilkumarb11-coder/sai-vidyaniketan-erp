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
    if (!CONFIG.apiUrl || CONFIG.apiUrl.indexOf("/exec") < 0) {
      throw new Error("Invalid apiUrl in config.js — use the Web app /exec URL");
    }
    const body = { ...payload, action, token: getToken() };
    let res;
    try {
      res = await fetch(CONFIG.apiUrl, {
        method: "POST",
        mode: "cors",
        redirect: "follow",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error(
        "Cannot reach Apps Script (Failed to fetch). Redeploy the Web App with access set to Anyone, then update apiUrl if it changed."
      );
    }
    const text = await res.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch (e) {
      throw new Error(
        "Apps Script returned a login/HTML page instead of JSON. In Deploy → Manage deployments, set Who has access to Anyone (not only yourself), then New version → Deploy."
      );
    }
    if (!json.ok) {
      const err = new Error(json.error || "Request failed");
      err.code = json.code;
      throw err;
    }
    return json.data;
  }

  return { getToken, setToken, clearToken, call, useDemo };
})();
