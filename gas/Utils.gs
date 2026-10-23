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

function getSs_() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getSheet_(name) {
  var ss = getSs_();
  var sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    var headers = SHEET_HEADERS[name];
    if (headers) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
  }
  return sh;
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
  var sh = getSheet_(sheetName);
  var data = sh.getDataRange().getValues();
  if (data.length < 2) return [];
  var headers = data[0];
  var out = [];
  for (var r = 1; r < data.length; r++) {
    var obj = rowToObject_(headers, data[r]);
    obj._row = r + 1;
    out.push(obj);
  }
  return out;
}

function appendObject_(sheetName, obj) {
  var sh = getSheet_(sheetName);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  if (!obj.id) obj.id = uid_(sheetName.slice(0, 3).toLowerCase());
  if (!obj.createdAt) obj.createdAt = nowIso_();
  if (!obj.updatedAt) obj.updatedAt = obj.createdAt;
  sh.appendRow(objectToRow_(headers, obj));
  return obj;
}

function updateObjectById_(sheetName, id, patch) {
  var rows = readAllObjects_(sheetName);
  var found = null;
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === String(id)) {
      found = rows[i];
      break;
    }
  }
  if (!found) throw new Error(sheetName + " record not found: " + id);
  var sh = getSheet_(sheetName);
  var headers = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  var merged = {};
  for (var k in found) if (k !== "_row") merged[k] = found[k];
  for (var p in patch) merged[p] = patch[p];
  merged.updatedAt = nowIso_();
  sh.getRange(found._row, 1, 1, headers.length).setValues([objectToRow_(headers, merged)]);
  return merged;
}

function findById_(sheetName, id) {
  var rows = readAllObjects_(sheetName);
  for (var i = 0; i < rows.length; i++) {
    if (String(rows[i].id) === String(id)) return rows[i];
  }
  return null;
}

function getSetting_(key, fallback) {
  var rows = readAllObjects_("Settings");
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key === key) {
      try {
        return JSON.parse(rows[i].value);
      } catch (e) {
        return rows[i].value;
      }
    }
  }
  return fallback;
}

function setSetting_(key, value) {
  var rows = readAllObjects_("Settings");
  var str = typeof value === "string" ? value : JSON.stringify(value);
  for (var i = 0; i < rows.length; i++) {
    if (rows[i].key === key) {
      getSheet_("Settings").getRange(rows[i]._row, 1, 1, 2).setValues([[key, str]]);
      return;
    }
  }
  getSheet_("Settings").appendRow([key, str]);
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
