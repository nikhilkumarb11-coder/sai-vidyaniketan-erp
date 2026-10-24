/**
 * Local-first core sync (Phase B): devices keep these tabs and refresh with core.sync deltas.
 * Stamps (Script Property mod_<Tab>) skip unchanged tabs without opening the sheet.
 */

var CORE_TABS = [
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

var CORE_SYNC_OVERLAP_MS = 60 * 1000;
var CORE_FULL_CACHE_CHUNK = 90000;
var CORE_FULL_CACHE_MAX_CHUNKS = 80;

function publicCoreRow_(tab, row) {
  if (tab === "Users") return publicUser_(row);
  var o = {};
  for (var k in row) {
    if (k === "_row" || k === "passwordHash") continue;
    o[k] = row[k];
  }
  return o;
}

function coreTabRows_(tab) {
  return readAllObjects_(tab).map(function (r) {
    return publicCoreRow_(tab, r);
  });
}

/** Full core tables for bootstrap / first sync. Cached until any mod_ stamp changes. */
function buildCoreTables_() {
  var key = coreFullCacheKey_();
  var hit = coreFullCacheGet_(key);
  if (hit) return hit;
  var tables = {};
  for (var i = 0; i < CORE_TABS.length; i++) {
    tables[CORE_TABS[i]] = coreTabRows_(CORE_TABS[i]);
  }
  coreFullCachePut_(key, tables);
  return tables;
}

function coreFullCacheKey_() {
  var props = PropertiesService.getScriptProperties().getProperties();
  var sig = CORE_TABS.map(function (t) {
    return props["mod_" + t] || "";
  }).join("|");
  var digest = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, sig);
  return "core_" + Utilities.base64EncodeWebSafe(digest).replace(/=+$/, "");
}

function coreFullCacheGet_(key) {
  try {
    var cache = CacheService.getScriptCache();
    var n = Number(cache.get(key) || 0);
    if (!n) return null;
    var keys = [];
    for (var i = 0; i < n; i++) keys.push(key + "_" + i);
    var parts = cache.getAll(keys);
    var json = "";
    for (var j = 0; j < n; j++) {
      if (parts[keys[j]] == null) return null;
      json += parts[keys[j]];
    }
    return JSON.parse(json);
  } catch (e) {
    return null;
  }
}

function coreFullCachePut_(key, tables) {
  try {
    var json = JSON.stringify(tables);
    var n = Math.ceil(json.length / CORE_FULL_CACHE_CHUNK);
    if (n > CORE_FULL_CACHE_MAX_CHUNKS) return;
    var values = {};
    for (var i = 0; i < n; i++) {
      values[key + "_" + i] = json.slice(i * CORE_FULL_CACHE_CHUNK, (i + 1) * CORE_FULL_CACHE_CHUNK);
    }
    var cache = CacheService.getScriptCache();
    var previous = cache.get("core:last");
    if (previous && previous !== key) {
      var oldN = Number(cache.get(previous) || 0);
      var drop = [previous];
      for (var d = 0; d < oldN; d++) drop.push(previous + "_" + d);
      cache.removeAll(drop);
    }
    cache.putAll(values, 21600);
    cache.put(key, String(n), 21600);
    cache.put("core:last", key, 21600);
  } catch (e) {}
}

/**
 * core.sync { since? } — empty since = full snapshot; otherwise only tabs whose mod_ stamp
 * is at/after since (with overlap), and only rows with updatedAt/createdAt in that window.
 */
function coreSync(payload, user) {
  var since = payload && payload.since ? String(payload.since) : "";
  var serverTime = nowIso_();
  if (!since) {
    return ok_({ serverTime: serverTime, full: true, tables: buildCoreTables_() });
  }

  var sinceMs = new Date(since).getTime();
  var cutoff = isNaN(sinceMs)
    ? since
    : new Date(sinceMs - CORE_SYNC_OVERLAP_MS).toISOString();
  var props = PropertiesService.getScriptProperties().getProperties();
  var tables = {};
  var missing = {};

  CORE_TABS.forEach(function (tab) {
    var stamp = props["mod_" + tab];
    if (!stamp) {
      missing["mod_" + tab] = cutoff;
      stamp = cutoff;
    }
    if (stamp < cutoff) {
      tables[tab] = [];
      return;
    }
    tables[tab] = readAllObjects_(tab)
      .filter(function (r) {
        var at = String(r.updatedAt || r.createdAt || "");
        return at >= cutoff;
      })
      .map(function (r) {
        return publicCoreRow_(tab, r);
      });
  });

  if (Object.keys(missing).length) {
    PropertiesService.getScriptProperties().setProperties(missing);
  }
  return ok_({ serverTime: serverTime, full: false, tables: tables });
}
