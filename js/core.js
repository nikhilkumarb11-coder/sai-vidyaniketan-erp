/**
 * Local-first core data: tables live in memory + IndexedDB; screens read here, sync refreshes in the background.
 */
const Core = (() => {
  const IDB_NAME = "svs_erp_core";
  const IDB_STORE = "core";
  const IDB_KEY = "snapshot";
  const PULL_EVERY_MS = 60_000;
  const FULL_RELOAD_MS = 6 * 3600_000;

  const TABS = [
    "Students",
    "StudentServices",
    "FeePayments",
    "Installments",
    "Enquiries",
    "Attendance",
    "Expenses",
    "Staff",
    "StockItems",
    "StockMovements",
    "Notices",
    "Services",
    "Classes",
    "Exams",
    "Subjects",
    "ExpenseCategories",
    "Routes",
    "Users",
    "Certificates",
    "Salaries",
    "Timetable",
    "YearSummary"
  ];

  /** Reads answered from local tables when Core is ready (no network). */
  const LOCAL_READS = new Set([
    "dashboard.principal",
    "students.list",
    "students.get",
    "fees.list",
    "fees.pending",
    "fees.ledger",
    "reminders.queue",
    "enquiries.list",
    "expenses.list",
    "staff.list",
    "stock.list",
    "routes.list",
    "exams.list",
    "notices.list",
    "services.list",
    "users.list",
    "certificates.list"
  ]);

  let tables = emptyTables();
  let serverTime = "";
  let loadedAt = 0;
  let ready = false;
  let pullTimer = null;
  let pulling = false;
  let idbDb = null;

  function emptyTables() {
    return Object.fromEntries(TABS.map((t) => [t, []]));
  }

  function isReady() {
    return ready && !!loadedAt;
  }

  function getTables() {
    return tables;
  }

  function openIdb() {
    if (!("indexedDB" in window)) return Promise.resolve(null);
    if (idbDb) return Promise.resolve(idbDb);
    return new Promise((resolve) => {
      try {
        const req = indexedDB.open(IDB_NAME, 1);
        req.onupgradeneeded = () => {
          if (!req.result.objectStoreNames.contains(IDB_STORE)) req.result.createObjectStore(IDB_STORE);
        };
        req.onsuccess = () => {
          idbDb = req.result;
          resolve(idbDb);
        };
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
  }

  async function persist() {
    const db = await openIdb();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).put({ tables, serverTime, loadedAt }, IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  async function restoreFromIdb() {
    const db = await openIdb();
    if (!db) return false;
    const snap = await new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, "readonly");
        const req = tx.objectStore(IDB_STORE).get(IDB_KEY);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => resolve(null);
      } catch (e) {
        resolve(null);
      }
    });
    if (!snap || !snap.tables) return false;
    tables = emptyTables();
    TABS.forEach((t) => {
      tables[t] = Array.isArray(snap.tables[t]) ? snap.tables[t] : [];
    });
    serverTime = snap.serverTime || "";
    loadedAt = snap.loadedAt || Date.now();
    ready = true;
    return true;
  }

  async function clear() {
    ready = false;
    tables = emptyTables();
    serverTime = "";
    loadedAt = 0;
    stopPullLoop();
    const db = await openIdb();
    if (!db) return;
    return new Promise((resolve) => {
      try {
        const tx = db.transaction(IDB_STORE, "readwrite");
        tx.objectStore(IDB_STORE).delete(IDB_KEY);
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      } catch (e) {
        resolve();
      }
    });
  }

  function hydrateFromBootstrap(boot) {
    if (!boot || !boot.tables) return false;
    tables = emptyTables();
    TABS.forEach((t) => {
      tables[t] = Array.isArray(boot.tables[t]) ? boot.tables[t].slice() : [];
    });
    serverTime = boot.serverTime || new Date().toISOString();
    loadedAt = Date.now();
    ready = true;
    persist();
    return true;
  }

  function mergeTables(deltaTables, full) {
    if (!deltaTables) return;
    if (full) {
      tables = emptyTables();
      TABS.forEach((t) => {
        tables[t] = Array.isArray(deltaTables[t]) ? deltaTables[t].slice() : [];
      });
      return;
    }
    TABS.forEach((t) => {
      const rows = deltaTables[t];
      if (!rows || !rows.length) return;
      const byId = new Map((tables[t] || []).map((r) => [String(r.id), r]));
      rows.forEach((r) => {
        if (!r || r.id == null) return;
        byId.set(String(r.id), r);
      });
      tables[t] = [...byId.values()];
    });
  }

  function upsert(tab, rows) {
    if (!rows) return;
    const list = Array.isArray(rows) ? rows : [rows];
    if (!tables[tab]) tables[tab] = [];
    const byId = new Map(tables[tab].map((r) => [String(r.id), r]));
    list.forEach((r) => {
      if (!r || r.id == null) return;
      const clean = { ...r };
      delete clean.student;
      delete clean.school;
      delete clean.optedServices;
      delete clean.balance;
      delete clean.paidTotal;
      byId.set(String(clean.id), { ...(byId.get(String(clean.id)) || {}), ...clean });
    });
    tables[tab] = [...byId.values()];
    persist();
  }

  async function pull(opts = {}) {
    if (!Api.getToken() || pulling) return;
    pulling = true;
    try {
      const forceFull = opts.full || !serverTime || Date.now() - loadedAt > FULL_RELOAD_MS;
      const delta = await Api.call(
        "core.sync",
        { since: forceFull ? "" : serverTime },
        { skipCache: true, skipCore: true }
      );
      if (!delta || !delta.tables) return;
      mergeTables(delta.tables, !!delta.full || forceFull);
      serverTime = delta.serverTime || serverTime;
      if (forceFull || delta.full) loadedAt = Date.now();
      ready = true;
      await persist();
    } catch (e) {
      // Stay on last good snapshot
    } finally {
      pulling = false;
    }
  }

  function startPullLoop() {
    stopPullLoop();
    pullTimer = setInterval(() => {
      pull().catch(() => {});
    }, PULL_EVERY_MS);
    document.addEventListener("visibilitychange", onVisible);
  }

  function stopPullLoop() {
    if (pullTimer) clearInterval(pullTimer);
    pullTimer = null;
    document.removeEventListener("visibilitychange", onVisible);
  }

  function onVisible() {
    if (document.visibilityState === "visible") pull().catch(() => {});
  }

  function canServe(action) {
    return isReady() && LOCAL_READS.has(action);
  }

  function serve(action, payload = {}) {
    const year = AppCache.get() && AppCache.get().academicYear;
    switch (action) {
      case "dashboard.principal":
        return Ledger.dashboardPrincipal(tables, year);
      case "students.list":
        return Ledger.studentsList(tables, payload);
      case "students.get":
      case "fees.ledger": {
        const s = Ledger.studentDetail(tables, payload.id || payload.studentId);
        if (!s) throw Object.assign(new Error("Student not found"), { code: "NOT_FOUND" });
        return s;
      }
      case "fees.pending":
        return Ledger.pendingList(tables, payload.className || "", year);
      case "fees.list": {
        let rows = tables.FeePayments || [];
        if (payload.studentId) rows = rows.filter((p) => p.studentId === payload.studentId);
        if (payload.from) rows = rows.filter((p) => String(p.createdAt).slice(0, 10) >= payload.from);
        if (payload.to) rows = rows.filter((p) => String(p.createdAt).slice(0, 10) <= payload.to);
        return rows.slice();
      }
      case "reminders.queue":
        return Ledger.reminderQueue(tables, year);
      case "enquiries.list":
        return (tables.Enquiries || []).slice();
      case "expenses.list":
        return Ledger.activeRows(tables.Expenses);
      case "staff.list":
        return Ledger.activeRows(tables.Staff);
      case "stock.list":
        return Ledger.activeRows(tables.StockItems);
      case "routes.list":
        return Ledger.activeRows(tables.Routes);
      case "exams.list":
        return Ledger.activeRows(tables.Exams);
      case "notices.list":
        return (tables.Notices || []).slice();
      case "services.list":
        return payload.includeInactive ? (tables.Services || []).slice() : Ledger.activeRows(tables.Services);
      case "users.list":
        return (tables.Users || []).slice();
      case "certificates.list":
        return (tables.Certificates || []).slice();
      default:
        throw new Error("Core cannot serve " + action);
    }
  }

  /** After a successful write, merge returned rows and refresh related tabs soon. */
  function applyWrite(action, data) {
    if (!data) {
      pull().catch(() => {});
      return;
    }
    if (action === "fees.collect" && data.id) {
      upsert("FeePayments", data);
      pull().catch(() => {});
      return;
    }
    if (action === "fees.cancel" || action === "cheque.updateStatus") {
      upsert("FeePayments", data);
      return;
    }
    if ((action === "students.create" || action === "students.update") && data.id) {
      upsert("Students", data);
      pull().catch(() => {});
      return;
    }
    if (action.startsWith("enquiries.") && data.id) {
      upsert("Enquiries", data);
      if (action === "enquiries.convert") pull().catch(() => {});
      return;
    }
    if (action === "expenses.create" && data.id) {
      upsert("Expenses", data);
      return;
    }
    if ((action === "staff.save" || action === "salary.pay") && data.id) {
      upsert("Staff", data);
      pull().catch(() => {});
      return;
    }
    if ((action === "stock.save" || action === "stock.move") && data.id) {
      upsert("StockItems", data);
      return;
    }
    if (action === "routes.save" && data.id) {
      upsert("Routes", data);
      return;
    }
    if (action === "services.save" && data.id) {
      upsert("Services", data);
      return;
    }
    if (action === "notices.create" && data.id) {
      upsert("Notices", data);
      return;
    }
    if (action === "exams.save" && data.id) {
      upsert("Exams", data);
      return;
    }
    if (action === "attendance.save") {
      pull().catch(() => {});
      return;
    }
    if (action.startsWith("users.") && data && data.id) {
      upsert("Users", data);
      return;
    }
    // Unknown shape: soft refresh
    pull().catch(() => {});
  }

  return {
    TABS,
    isReady,
    getTables,
    canServe,
    serve,
    hydrateFromBootstrap,
    restoreFromIdb,
    clear,
    pull,
    startPullLoop,
    stopPullLoop,
    applyWrite,
    upsert
  };
})();
