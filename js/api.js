const Api = (() => {
  const TOKEN_KEY = "svs_token";
  const IDB_NAME = "svs_erp_reads";
  const IDB_STORE = "reads";
  const cache = new Map();
  const READ_TTL_MS = 90000; // reuse list/dashboard responses for 90s
  const IDB_MAX_AGE_MS = 6 * 3600_000; // survive refresh; refresh in background after READ_TTL
  const WARM_EVERY_MS = 120_000;
  let lastWarm = 0;
  let idbReady = null;

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

  /** After a write, drop only related cached reads (not the whole Map). */
  const MUTATION_PREFIXES = {
    "fees.collect": ["fees.", "dashboard.", "reminders.", "students.get", "finance."],
    "fees.cancel": ["fees.", "dashboard.", "reminders.", "students.get", "finance."],
    "fees.list": [],
    "cheque.updateStatus": ["fees.", "dashboard.", "reminders."],
    "installments.save": ["fees.", "reminders.", "students.get", "dashboard."],
    "students.create": ["students.", "dashboard.", "fees.pending", "reminders."],
    "students.update": ["students.", "dashboard.", "fees.pending", "reminders."],
    "enquiries.create": ["enquiries."],
    "enquiries.update": ["enquiries."],
    "enquiries.convert": ["enquiries.", "students.", "dashboard.", "fees."],
    "attendance.save": ["attendance.", "dashboard."],
    "staffAttendance.save": ["attendance.", "dashboard.", "staff."],
    "expenses.create": ["expenses.", "dashboard.", "finance."],
    "staff.save": ["staff."],
    "salary.pay": ["staff.", "expenses.", "finance.", "dashboard."],
    "stock.save": ["stock."],
    "stock.move": ["stock."],
    "routes.save": ["routes.", "services."],
    "exams.save": ["exams.", "marks.", "reportcards."],
    "marks.save": ["marks.", "reportcards."],
    "timetable.save": ["timetable."],
    "notices.create": ["notices.", "dashboard."],
    "certificates.issue": ["certificates."],
    "whatsapp.log": ["reminders."],
    "modules.save": ["modules.", "bootstrap"],
    "settings.save": ["settings.", "bootstrap"],
    "services.save": ["services.", "bootstrap"],
    "users.create": ["users."],
    "users.update": ["users."],
    "users.resetPassword": ["users."],
    "users.disable": ["users."],
    "import.students": ["students.", "dashboard.", "fees."],
    "import.yearSummary": ["finance.", "dashboard."],
    "promote.run": ["students.", "dashboard.", "fees.", "bootstrap"],
    "year.close": ["students.", "dashboard.", "fees.", "finance.", "bootstrap"],
    "budget.save": ["finance."],
    "backup.trigger": []
  };

  function getToken() {
    let t = localStorage.getItem(TOKEN_KEY) || "";
    if (!t) {
      t = sessionStorage.getItem(TOKEN_KEY) || "";
      if (t) {
        localStorage.setItem(TOKEN_KEY, t);
        sessionStorage.removeItem(TOKEN_KEY);
      }
    }
    return t;
  }
  function setToken(t) {
    if (t) localStorage.setItem(TOKEN_KEY, t);
    else localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
  }
  function clearToken() {
    localStorage.removeItem(TOKEN_KEY);
    sessionStorage.removeItem(TOKEN_KEY);
    cache.clear();
    idbClear().catch(() => {});
  }

  function useDemo() {
    return (
      CONFIG.demoMode === true ||
      !CONFIG.apiUrl ||
      CONFIG.apiUrl.indexOf("PASTE_") === 0
    );
  }

  /**
   * Wakes the Apps Script runtime with a cheap GET so the next login/API call skips most of the cold start.
   */
  function warm() {
    if (useDemo()) return;
    if (!CONFIG.apiUrl || CONFIG.apiUrl.indexOf("/exec") < 0) return;
    if (Date.now() - lastWarm < WARM_EVERY_MS) return;
    lastWarm = Date.now();
    fetch(CONFIG.apiUrl, { method: "GET", mode: "no-cors", cache: "no-store" }).catch(() => {});
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
    idbDeletePrefixes(list).catch(() => {});
  }

  function invalidateForMutation(action) {
    const mapped = MUTATION_PREFIXES[action];
    if (mapped) {
      if (mapped.length) invalidatePrefix(mapped);
    } else {
      const domain = String(action).split(".")[0] + ".";
      invalidatePrefix([domain, "dashboard.", "bootstrap"]);
    }
    if (typeof Router !== "undefined" && Router.invalidatePage) Router.invalidatePage();
  }

  function openIdb() {
    if (!("indexedDB" in window)) return Promise.resolve(null);
    if (!idbReady) {
      idbReady = new Promise((resolve) => {
        try {
          const req = indexedDB.open(IDB_NAME, 1);
          req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(IDB_STORE)) db.createObjectStore(IDB_STORE);
          };
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        } catch (e) {
          resolve(null);
        }
      });
    }
    return idbReady;
  }

  async function idbGet(key) {
    const db = await openIdb();
    if (!db) return null;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(key);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  async function idbSet(key, value) {
    const db = await openIdb();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put(value, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  async function idbClear() {
    const db = await openIdb();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).clear();
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  async function idbDeletePrefixes(prefixes) {
    const db = await openIdb();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, "readwrite");
        const store = tx.objectStore(IDB_STORE);
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) return;
          if (prefixes.some((p) => String(cursor.key).startsWith(p))) cursor.delete();
          cursor.continue();
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  function remember(key, data) {
    const entry = { at: Date.now(), data };
    cache.set(key, entry);
    idbSet(key, entry).catch(() => {});
    return data;
  }

  function refreshInBackground(action, payload, key) {
    remoteCall(action, payload)
      .then((data) => remember(key, data))
      .catch(() => {});
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
    // Phase B: hot reads come from the on-device core store (instant).
    if (!opts.skipCore && typeof Core !== "undefined" && Core.canServe(action)) {
      try {
        return Core.serve(action, payload);
      } catch (e) {
        if (e && e.code === "NOT_FOUND") throw e;
        // Fall through to network if local serve fails unexpectedly
      }
    }

    if (useDemo()) {
      const data = await DemoAPI.handle(action, { ...payload, token: getToken() });
      if (READ_ACTIONS.has(action)) remember(cacheKey(action, payload), data);
      else if (action !== "login" && action !== "core.sync") {
        invalidateForMutation(action);
        if (typeof Core !== "undefined") Core.applyWrite(action, data);
      }
      return data;
    }

    const skipCache = opts.skipCache === true;
    const key = cacheKey(action, payload);

    if (!skipCache && READ_ACTIONS.has(action)) {
      const hit = cache.get(key);
      if (hit && Date.now() - hit.at < READ_TTL_MS) return hit.data;

      const stored = await idbGet(key);
      if (stored && stored.data !== undefined && Date.now() - stored.at < IDB_MAX_AGE_MS) {
        cache.set(key, stored);
        if (Date.now() - stored.at >= READ_TTL_MS) refreshInBackground(action, payload, key);
        return stored.data;
      }
    }

    const data = await remoteCall(action, payload);

    if (READ_ACTIONS.has(action)) {
      remember(key, data);
    } else if (action !== "login" && action !== "core.sync") {
      invalidateForMutation(action);
      if (typeof Core !== "undefined") Core.applyWrite(action, data);
    }
    return data;
  }

  /** Fire multiple reads in parallel (one GAS hit each, but overlapping wait time). */
  function callAll(requests) {
    return Promise.all(requests.map((r) => call(r.action, r.payload || {}, r.opts || {})));
  }

  return {
    getToken,
    setToken,
    clearToken,
    call,
    callAll,
    useDemo,
    warm,
    invalidateAll,
    invalidatePrefix,
    invalidateForMutation
  };
})();
