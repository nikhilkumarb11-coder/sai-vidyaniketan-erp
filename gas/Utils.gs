/**
 * Shared helpers for Sai Vidyaniketan School ERP (Apps Script)
 */

var SHEET_HEADERS = {
  Settings: ["key", "value"],
  Users: ["id", "username", "passwordHash", "displayName", "role", "classAssigned", "subjects", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Sessions: ["token", "userId", "expiresAt", "createdAt"],
  AcademicYears: ["id", "name", "startDate", "endDate", "status", "openingCash", "openingBank", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Classes: ["id", "name", "section", "classTeacherId", "annualFee", "active", "academicYear", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Subjects: ["id", "className", "subjectName", "teacherId", "active", "academicYear", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Services: ["id", "name", "cost", "costType", "billingType", "classes", "active", "academicYear", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Students: ["id", "admissionNo", "name", "parentName", "parentName2", "phone", "phone2", "dob", "gender", "address", "photoUrl", "bloodGroup", "className", "section", "admissionDate", "annualFee", "concession", "concessionReason", "previousBalance", "payByDate", "status", "siblingGroupId", "academicYear", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  StudentServices: ["id", "studentId", "serviceId", "serviceName", "cost", "routeId", "academicYear", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Enquiries: ["id", "name", "phone", "classSought", "followUpDate", "status", "notes", "convertedStudentId", "academicYear", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  FeePayments: ["id", "receiptNo", "studentId", "amount", "mode", "reference", "chequeStatus", "heads", "balanceAfter", "notes", "cancelled", "cancelReason", "academicYear", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Installments: ["id", "studentId", "label", "dueDate", "amount", "paidAmount", "status", "academicYear", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Attendance: ["id", "className", "section", "date", "absentIds", "leaveIds", "presentCount", "totalCount", "markedBy", "notes", "academicYear", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  StaffAttendance: ["id", "date", "absentIds", "leaveIds", "notes", "academicYear", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Exams: ["id", "name", "weight", "maxMarks", "order", "active", "academicYear", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Marks: ["id", "studentId", "className", "subject", "examId", "examName", "marks", "maxMarks", "academicYear", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Expenses: ["id", "date", "category", "amount", "mode", "notes", "billRef", "staffId", "salaryMonth", "academicYear", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  ExpenseCategories: ["id", "name", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Staff: ["id", "name", "role", "phone", "joiningDate", "salary", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Salaries: ["id", "staffId", "month", "amount", "expenseId", "academicYear", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  StockItems: ["id", "name", "category", "unit", "openingQty", "qty", "reorderLevel", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  StockMovements: ["id", "itemId", "type", "qty", "studentId", "notes", "date", "academicYear", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Routes: ["id", "name", "fee", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Timetable: ["id", "className", "section", "day", "period", "subject", "teacherId", "academicYear", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Notices: ["id", "title", "body", "className", "type", "date", "academicYear", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  MessageLog: ["id", "type", "studentId", "phone", "message", "sentBy", "sentAt", "academicYear", "active"],
  Budget: ["id", "academicYear", "category", "amount", "type", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  YearSummary: ["id", "academicYear", "month", "feeCollected", "expenses", "enrollment", "pendingBalance", "notes", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  Certificates: ["id", "certNo", "type", "studentId", "issueDate", "data", "academicYear", "active", "createdAt", "updatedAt", "createdBy", "updatedBy"],
  AuditLog: ["id", "userId", "username", "action", "entity", "entityId", "details", "createdAt"]
};

/** Per-request memory cache — cleared at the start of each doGet/doPost */
var REQUEST_CACHE_ = {};
var SETTINGS_MEM_ = null;
var CACHED_SHEETS_ = {
  Students: 300,
  StudentServices: 300,
  FeePayments: 180,
  Installments: 180,
  Attendance: 120,
  Users: 300,
  Services: 600,
  Settings: 600,
  Classes: 600,
  Exams: 600,
  ExpenseCategories: 600,
  Staff: 300,
  StockItems: 300,
  Enquiries: 180,
  YearSummary: 600,
  Notices: 300,
  Routes: 600,
  Subjects: 600
};

/** CacheService value cap is ~100KB; large tabs are split into chunks. */
var SHEET_CACHE_CHUNK_ = 90000;
var SHEET_CACHE_MAX_CHUNKS_ = 40;

function beginRequest_() {
  REQUEST_CACHE_ = {};
  SETTINGS_MEM_ = null;
}

function getSs_() {
  if (!REQUEST_CACHE_.__ss) {
    REQUEST_CACHE_.__ss = SpreadsheetApp.getActiveSpreadsheet();
  }
  return REQUEST_CACHE_.__ss;
}

function getSheet_(name) {
  var key = "__sh_" + name;
  if (REQUEST_CACHE_[key]) return REQUEST_CACHE_[key];
  var ss = getSs_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    var headers = SHEET_HEADERS[name];
    if (headers) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  REQUEST_CACHE_[key] = sh;
  return sh;
}

function invalidateSheetCache_(sheetName) {
  delete REQUEST_CACHE_["rows_" + sheetName];
  if (sheetName === "Settings") SETTINGS_MEM_ = null;
  try {
    sheetCacheRemove_("rows_" + sheetName);
  } catch (e) {}
}

function sheetCacheGet_(memKey) {
  var cache = CacheService.getScriptCache();
  var meta = cache.get(memKey);
  if (meta == null) return null;
  if (String(meta).indexOf("chunks:") === 0) {
    var n = Number(String(meta).slice(7));
    if (!(n > 0)) return null;
    var keys = [];
    for (var i = 0; i < n; i++) keys.push(memKey + ":" + i);
    var parts = cache.getAll(keys);
    var json = "";
    for (var j = 0; j < n; j++) {
      var part = parts[memKey + ":" + j];
      if (typeof part !== "string") return null;
      json += part;
    }
    return JSON.parse(json);
  }
  return JSON.parse(meta);
}

function sheetCachePut_(memKey, rows, ttl) {
  var json = JSON.stringify(rows);
  var cache = CacheService.getScriptCache();
  if (json.length < SHEET_CACHE_CHUNK_) {
    cache.put(memKey, json, ttl);
    return;
  }
  var n = Math.ceil(json.length / SHEET_CACHE_CHUNK_);
  if (n > SHEET_CACHE_MAX_CHUNKS_) return;
  var values = {};
  for (var i = 0; i < n; i++) {
    values[memKey + ":" + i] = json.slice(i * SHEET_CACHE_CHUNK_, (i + 1) * SHEET_CACHE_CHUNK_);
  }
  cache.putAll(values, ttl);
  cache.put(memKey, "chunks:" + n, ttl);
}

function sheetCacheRemove_(memKey) {
  var cache = CacheService.getScriptCache();
  var meta = cache.get(memKey);
  if (meta != null && String(meta).indexOf("chunks:") === 0) {
    var n = Number(String(meta).slice(7));
    var keys = [memKey];
    for (var i = 0; i < n; i++) keys.push(memKey + ":" + i);
    cache.removeAll(keys);
  } else {
    cache.remove(memKey);
  }
}

/** Bumps the tab's change stamp so core.sync can skip untouched sheets. */
function touchStamp_(sheetName) {
  try {
    PropertiesService.getScriptProperties().setProperty("mod_" + sheetName, nowIso_());
  } catch (e) {}
}

function uid_(prefix) {
  prefix = prefix || "id";
  return prefix + "_" + Utilities.getUuid().replace(/-/g, "").slice(0, 12);
}

function nowIso_() {
  return new Date().toISOString();
}

function makeSalt_() {
  return Utilities.getUuid().replace(/-/g, "");
}

function hashPassword_(password, salt) {
  var raw = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    salt + ":" + String(password),
    Utilities.Charset.UTF_8
  );
  return raw.map(function (b) {
    var v = (b < 0 ? b + 256 : b).toString(16);
    return v.length === 1 ? "0" + v : v;
  }).join("");
}

function storePassword_(password) {
  var salt = makeSalt_();
  return salt + "$" + hashPassword_(password, salt);
}

function verifyPassword_(password, stored) {
  if (!stored || stored.indexOf("$") < 0) return false;
  var parts = stored.split("$");
  return hashPassword_(password, parts[0]) === parts[1];
}

function normalizePhone_(phone) {
  var d = String(phone || "").replace(/\D/g, "");
  if (d.length === 10) return "91" + d;
  if (d.length === 12 && d.indexOf("91") === 0) return d;
  if (d.length === 11 && d.charAt(0) === "0") return "91" + d.slice(1);
  return d;
}

function rowToObject_(headers, row) {
  var o = {};
  for (var i = 0; i < headers.length; i++) {
    o[headers[i]] = row[i] === "" ? "" : row[i];
  }
  return o;
}

function objectToRow_(headers, obj) {
  return headers.map(function (h) {
    var v = obj[h];
    if (v === true) return "TRUE";
    if (v === false) return "FALSE";
    if (v === null || v === undefined) return "";
    if (typeof v === "object") return JSON.stringify(v);
    return v;
  });
}

function readAllObjects_(sheetName) {
  var memKey = "rows_" + sheetName;
  if (REQUEST_CACHE_[memKey]) return REQUEST_CACHE_[memKey];

  var ttl = CACHED_SHEETS_[sheetName];
  if (ttl) {
    try {
      var parsed = sheetCacheGet_(memKey);
      if (parsed) {
        REQUEST_CACHE_[memKey] = parsed;
        return parsed;
      }
    } catch (e) {}
  }

  var sh = getSheet_(sheetName);
  var lastRow = sh.getLastRow();
  var lastCol = sh.getLastColumn();
  if (lastRow < 2 || lastCol < 1) {
    REQUEST_CACHE_[memKey] = [];
    return REQUEST_CACHE_[memKey];
  }
  var data = sh.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = data[0];
  var out = [];
  for (var r = 1; r < data.length; r++) {
    var obj = rowToObject_(headers, data[r]);
    obj._row = r + 1;
    out.push(obj);
  }
  REQUEST_CACHE_[memKey] = out;

  if (ttl) {
    try {
      sheetCachePut_(memKey, out, ttl);
    } catch (e2) {}
  }
  return out;
}

/** Appends one or more rows with a single setValues (faster than appendRow). */
function appendObjects_(sheetName, objs) {
  if (!objs || !objs.length) return [];
  var sh = getSheet_(sheetName);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var now = nowIso_();
  var prepared = [];
  for (var i = 0; i < objs.length; i++) {
    var obj = objs[i];
    if (!obj.id) obj.id = uid_(sheetName.slice(0, 3).toLowerCase());
    if (!obj.createdAt) obj.createdAt = now;
    if (!obj.updatedAt) obj.updatedAt = obj.createdAt;
    prepared.push(obj);
  }
  var startRow = Math.max(sh.getLastRow() + 1, 2);
  var values = prepared.map(function (o) {
    return objectToRow_(headers, o);
  });
  sh.getRange(startRow, 1, values.length, headers.length).setValues(values);

  var memKey = "rows_" + sheetName;
  if (REQUEST_CACHE_[memKey]) {
    for (var r = 0; r < prepared.length; r++) {
      var copy = {};
      for (var k in prepared[r]) copy[k] = prepared[r][k];
      copy._row = startRow + r;
      REQUEST_CACHE_[memKey].push(copy);
    }
  }
  try {
    sheetCacheRemove_(memKey);
  } catch (e) {}
  if (sheetName === "Settings") SETTINGS_MEM_ = null;
  touchStamp_(sheetName);
  return prepared;
}

function appendObject_(sheetName, obj) {
  return appendObjects_(sheetName, [obj])[0];
}

function updateObjectById_(sheetName, id, patch) {
  return updateObjectsById_(sheetName, [Object.assign({ id: id }, patch)])[0];
}

/**
 * Applies several id patches. Writes each changed row once, then invalidates script cache once
 * (avoids re-reading the sheet between installment updates inside fees.collect).
 */
function updateObjectsById_(sheetName, patches) {
  if (!patches || !patches.length) return [];
  var rows = readAllObjects_(sheetName);
  var byId = {};
  for (var i = 0; i < rows.length; i++) byId[String(rows[i].id)] = rows[i];
  var sh = getSheet_(sheetName);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var now = nowIso_();
  var updated = [];
  for (var p = 0; p < patches.length; p++) {
    var patch = patches[p];
    var found = byId[String(patch.id)];
    if (!found) throw new Error(sheetName + " record not found: " + patch.id);
    var merged = {};
    for (var k in found) if (k !== "_row") merged[k] = found[k];
    for (var key in patch) {
      if (key === "id") continue;
      merged[key] = patch[key];
    }
    merged.updatedAt = now;
    sh.getRange(found._row, 1, 1, headers.length).setValues([objectToRow_(headers, merged)]);
    merged._row = found._row;
    byId[String(patch.id)] = merged;
    for (var r = 0; r < rows.length; r++) {
      if (String(rows[r].id) === String(patch.id)) {
        rows[r] = merged;
        break;
      }
    }
    var clean = {};
    for (var c in merged) if (c !== "_row") clean[c] = merged[c];
    updated.push(clean);
  }
  try {
    sheetCacheRemove_("rows_" + sheetName);
  } catch (e) {}
  if (sheetName === "Settings") SETTINGS_MEM_ = null;
  touchStamp_(sheetName);
  return updated;
}

function findById_(sheetName, id) {
  var rows = readAllObjects_(sheetName);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === String(id)) return rows[i];
  }
  return null;
}

function getSetting_(key, fallback) {
  if (!SETTINGS_MEM_) {
    SETTINGS_MEM_ = {};
    var rows = readAllObjects_("Settings");
    for (var i = 0; i < rows.length; i++) {
      var raw = rows[i].value;
      try {
        SETTINGS_MEM_[rows[i].key] = JSON.parse(raw);
      } catch (e) {
        SETTINGS_MEM_[rows[i].key] = raw;
      }
    }
  }
  if (SETTINGS_MEM_[key] === undefined) return fallback;
  return SETTINGS_MEM_[key];
}

function setSetting_(key, value) {
  var rows = readAllObjects_("Settings");
  var str = typeof value === "string" ? value : JSON.stringify(value);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key === key) {
      getSheet_("Settings").getRange(rows[i]._row, 1, 1, 2).setValues([[key, str]]);
      invalidateSheetCache_("Settings");
      touchStamp_("Settings");
      return;
    }
  }
  appendObjects_("Settings", [{ key: key, value: str }]);
}

function withLock_(fn) {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    return fn();
  } finally {
    lock.releaseLock();
  }
}

function cacheGet_(key) {
  var v = CacheService.getScriptCache().get(key);
  if (v == null) return null;
  try {
    return JSON.parse(v);
  } catch (e) {
    return v;
  }
}

function cachePut_(key, value, seconds) {
  CacheService.getScriptCache().put(key, JSON.stringify(value), seconds || 600);
}

function cacheRemove_(key) {
  CacheService.getScriptCache().remove(key);
}

function audit_(user, action, entity, entityId, details) {
  appendObject_("AuditLog", {
    id: uid_("aud"),
    userId: user ? user.id : "",
    username: user ? user.username : "",
    action: action,
    entity: entity || "",
    entityId: entityId || "",
    details: typeof details === "string" ? details : JSON.stringify(details || {}),
    createdAt: nowIso_()
  });
}

function jsonOut_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function ok_(data) {
  return { ok: true, data: data };
}

function fail_(message, code) {
  return { ok: false, error: message, code: code || "ERROR" };
}

function parseJsonField_(v, fallback) {
  if (v === "" || v == null) return fallback;
  if (typeof v === "object") return v;
  try {
    return JSON.parse(v);
  } catch (e) {
    return fallback;
  }
}

function isTruthy_(v) {
  return v === true || v === "TRUE" || v === "true" || v === "Y" || v === 1 || v === "1";
}

/** Normalize class labels so "1", " 1 ", "Class 1" match. */
function normalizeClass_(c) {
  return String(c == null ? "" : c)
    .replace(/^\s+|\s+$/g, "")
    .replace(/^class\s+/i, "")
    .replace(/\s+/g, " ")
    .toLowerCase();
}

function classMatch_(a, b) {
  return normalizeClass_(a) === normalizeClass_(b);
}

function currentAcademicYear_() {
  return getSetting_("academicYear", "2026-27");
}

function nextSequence_(key) {
  return withLock_(function () {
    var n = Number(getSetting_(key, 0)) + 1;
    setSetting_(key, n);
    return n;
  });
}

function publicUser_(u) {
  if (!u) return null;
  return {
    id: u.id,
    username: u.username,
    displayName: u.displayName,
    role: u.role,
    classAssigned: u.classAssigned || "",
    subjects: parseJsonField_(u.subjects, []),
    active: isTruthy_(u.active)
  };
}
