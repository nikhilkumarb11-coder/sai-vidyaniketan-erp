const Api = (() => {
  const TOKEN_KEY = "svs_token";
  const cache = new Map();
  const READ_TTL_MS = 45000; // reuse list/dashboard responses for 45s
  const READ_ACTIONS = new Set([
    "bootstrap",
    "dashboard.principal",
    "dashboard.teacher",
    "students.list",
    "students.get",
    "services.list",
    "enquiries.list",
    "fees.list",
    "fees.pending",
    "reminders.queue",
    "attendance.get",
    "attendance.report",
    "expenses.list",
    "staff.list",
    "stock.list",
    "routes.list",
    "exams.list",
    "marks.get",
    "reportcards.get",
    "timetable.get",
    "notices.list",
    "certificates.list",
    "finance.reports",
    "finance.yoy",
    "finance.projections",
    "finance.overview",
    "messages.templates",
    "modules.get",
    "settings.get",
    "users.list",
    "audit.list"
  ]);

  function getToken() {
    return sessionStorage.getItem(TOKEN_KEY) || "";
  }
  function setToken(t) {
    sessionStorage.setItem(TOKEN_KEY, t || "");
  }
  function clearToken() {
    sessionStorage.removeItem(TOKEN_KEY);
    cache.clear();
  }

  function useDemo() {
    return (
      CONFIG.demoMode === true ||
      !CONFIG.apiUrl ||
      CONFIG.apiUrl.indexOf("PASTE_") === 0
    );
  }

  function cacheKey(action, payload) {
    const copy = { ...payload };
    delete copy.token;
    return action + ":" + JSON.stringify(copy);
  }

  function invalidateAll() {
    cache.clear();
  }

  function invalidatePrefix(prefixes) {
    const list = Array.isArray(prefixes) ? prefixes : [prefixes];
    for (const key of [...cache.keys()]) {
      if (list.some((p) => key.startsWith(p))) cache.delete(key);
    }
  }

  async function remoteCall(action, payload = {}) {
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

  async function call(action, payload = {}, opts = {}) {
    if (useDemo()) {
      const data = await DemoAPI.handle(action, { ...payload, token: getToken() });
      if (!READ_ACTIONS.has(action)) invalidateAll();
      return data;
    }

    const skipCache = opts.skipCache === true;
    const key = cacheKey(action, payload);
    if (!skipCache && READ_ACTIONS.has(action)) {
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < READ_TTL_MS) return hit.data;
    }

    const data = await remoteCall(action, payload);

    if (READ_ACTIONS.has(action)) {
      cache.set(key, { at: Date.now(), data });
    } else {
      // Mutations: drop related caches so next page load is fresh
      invalidateAll();
    }
    return data;
  }

  /** Fire multiple reads in parallel (one GAS hit each, but overlapping wait time). */
  function callAll(requests) {
    return Promise.all(requests.map((r) => call(r.action, r.payload || {}, r.opts || {})));
  }

  return { getToken, setToken, clearToken, call, callAll, useDemo, invalidateAll, invalidatePrefix };
})();
