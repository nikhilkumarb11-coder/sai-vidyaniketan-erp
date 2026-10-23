/**
 * Expenses, staff, stock, transport, WhatsApp, notices, timetable, certificates, import, backup
 */

function expensesList(payload, user) {
  requireRole_(user, ["Principal"]);
  var rows = readAllObjects_("Expenses").filter(function (e) { return isTruthy_(e.active) !== false; });
  if (payload.from) rows = rows.filter(function (e) { return String(e.date).slice(0, 10) >= payload.from; });
  if (payload.to) rows = rows.filter(function (e) { return String(e.date).slice(0, 10) <= payload.to; });
  if (payload.category) rows = rows.filter(function (e) { return e.category === payload.category; });
  return ok_(rows);
}

function expensesCreate(payload, user) {
  requireRole_(user, ["Principal"]);
  var row = appendObject_("Expenses", {
    id: uid_("exp"),
    date: payload.date || nowIso_().slice(0, 10),
    category: payload.category || "Other",
    amount: Number(payload.amount) || 0,
    mode: payload.mode || "Cash",
    notes: payload.notes || "",
    billRef: payload.billRef || "",
    staffId: payload.staffId || "",
    salaryMonth: payload.salaryMonth || "",
    academicYear: currentAcademicYear_(),
    active: "TRUE",
    createdBy: user.id,
    updatedBy: user.id
  });
  audit_(user, "expense.create", "Expenses", row.id, { amount: row.amount });
  return ok_(row);
}

function staffList(payload, user) {
  requireRole_(user, ["Principal"]);
  return ok_(readAllObjects_("Staff").filter(function (s) {
    return payload.includeInactive ? true : isTruthy_(s.active);
  }));
}

function staffSave(payload, user) {
  requireRole_(user, ["Principal"]);
  var data = {
    name: payload.name,
    role: payload.role || "Teacher",
    phone: normalizePhone_(payload.phone),
    joiningDate: payload.joiningDate || "",
    salary: Number(payload.salary) || 0,
    active: payload.active === false ? "FALSE" : "TRUE",
    updatedBy: user.id
  };
  var row;
  if (payload.id) {
    row = updateObjectById_("Staff", payload.id, data);
  } else {
    data.createdBy = user.id;
    row = appendObject_("Staff", data);
  }
  return ok_(row);
}

function salaryPay(payload, user) {
  requireRole_(user, ["Principal"]);
  var staff = findById_("Staff", payload.staffId);
  if (!staff) return fail_("Staff not found");
  var amount = Number(payload.amount != null ? payload.amount : staff.salary) || 0;
  var month = payload.month || nowIso_().slice(0, 7);
  var exp = expensesCreate({
    date: payload.date || nowIso_().slice(0, 10),
    category: "Salaries",
    amount: amount,
    mode: payload.mode || "Bank",
    notes: "Salary " + month + " — " + staff.name,
    staffId: staff.id,
    salaryMonth: month
  }, user);
  if (!exp.ok) return exp;
  var sal = appendObject_("Salaries", {
    id: uid_("sal"),
    staffId: staff.id,
    month: month,
    amount: amount,
    expenseId: exp.data.id,
    academicYear: currentAcademicYear_(),
    active: "TRUE",
    createdBy: user.id,
    updatedBy: user.id
  });
  return ok_({ salary: sal, expense: exp.data });
}

function stockList(payload, user) {
  requireRole_(user, ["Principal"]);
  return ok_(readAllObjects_("StockItems").filter(function (s) {
    return payload.includeInactive ? true : isTruthy_(s.active);
  }));
}

function stockSave(payload, user) {
  requireRole_(user, ["Principal"]);
  var data = {
    name: payload.name,
    category: payload.category || "Books",
    unit: payload.unit || "pcs",
    openingQty: Number(payload.openingQty) || 0,
    qty: Number(payload.qty != null ? payload.qty : payload.openingQty) || 0,
    reorderLevel: Number(payload.reorderLevel) || 5,
    active: payload.active === false ? "FALSE" : "TRUE",
    updatedBy: user.id
  };
  if (payload.id) return ok_(updateObjectById_("StockItems", payload.id, data));
  data.createdBy = user.id;
  return ok_(appendObject_("StockItems", data));
}

function stockMove(payload, user) {
  requireRole_(user, ["Principal"]);
  return withLock_(function () {
    var item = findById_("StockItems", payload.itemId);
    if (!item) return fail_("Item not found");
    var qty = Number(payload.qty) || 0;
    var type = payload.type || "purchase"; // purchase | issue | adjust
    var newQty = Number(item.qty) || 0;
    if (type === "purchase" || type === "adjust_in") newQty += qty;
    else if (type === "issue" || type === "adjust_out") newQty -= qty;
    if (newQty < 0) return fail_("Insufficient stock");
    updateObjectById_("StockItems", item.id, { qty: newQty, updatedBy: user.id });
    var mov = appendObject_("StockMovements", {
      id: uid_("stm"),
      itemId: item.id,
      type: type,
      qty: qty,
      studentId: payload.studentId || "",
      notes: payload.notes || "",
      date: payload.date || nowIso_().slice(0, 10),
      academicYear: currentAcademicYear_(),
      active: "TRUE",
      createdBy: user.id,
      updatedBy: user.id
    });
    return ok_({ item: findById_("StockItems", item.id), movement: mov });
  });
}

function routesList(payload, user) {
  return ok_(readAllObjects_("Routes").filter(function (r) { return isTruthy_(r.active); }));
}

function routesSave(payload, user) {
  requireRole_(user, ["Principal"]);
  var data = {
    name: payload.name,
    fee: Number(payload.fee) || 0,
    active: payload.active === false ? "FALSE" : "TRUE",
    updatedBy: user.id
  };
  if (payload.id) return ok_(updateObjectById_("Routes", payload.id, data));
  data.createdBy = user.id;
  return ok_(appendObject_("Routes", data));
}

function whatsappLog(payload, user) {
  var row = appendObject_("MessageLog", {
    id: uid_("msg"),
    type: payload.type || "custom",
    studentId: payload.studentId || "",
    phone: normalizePhone_(payload.phone),
    message: payload.message || "",
    sentBy: user.id,
    sentAt: nowIso_(),
    academicYear: currentAcademicYear_(),
    active: "TRUE"
  });
  return ok_(row);
}

function messagesTemplates(payload, user) {
  if (payload.templates && user.role === "Principal") {
    setSetting_("whatsappTemplates", payload.templates);
    audit_(user, "templates.save", "Settings", "", {});
  }
  return ok_(getSetting_("whatsappTemplates", {}));
}

function noticesList(payload, user) {
  var rows = readAllObjects_("Notices").filter(function (n) { return isTruthy_(n.active); });
  if (payload.className) {
    rows = rows.filter(function (n) {
      return !n.className || n.className === "All" || n.className === payload.className;
    });
  }
  return ok_(rows);
}

function noticesCreate(payload, user) {
  var row = appendObject_("Notices", {
    id: uid_("ntc"),
    title: payload.title,
    body: payload.body || "",
    className: payload.className || "All",
    type: payload.type || "notice",
    date: payload.date || nowIso_().slice(0, 10),
    academicYear: currentAcademicYear_(),
    active: "TRUE",
    createdBy: user.id,
    updatedBy: user.id
  });
  return ok_(row);
}

function timetableGet(payload, user) {
  var rows = readAllObjects_("Timetable").filter(function (t) {
    return isTruthy_(t.active) && (!payload.className || t.className === payload.className);
  });
  return ok_(rows);
}

function timetableSave(payload, user) {
  requireRole_(user, ["Principal"]);
  var year = currentAcademicYear_();
  if (payload.replace && payload.className) {
    readAllObjects_("Timetable")
      .filter(function (t) { return t.className === payload.className; })
      .forEach(function (t) {
        updateObjectById_("Timetable", t.id, { active: "FALSE", updatedBy: user.id });
      });
  }
  var saved = (payload.slots || [payload]).map(function (slot) {
    return appendObject_("Timetable", {
      id: uid_("tt"),
      className: slot.className || payload.className,
      section: slot.section || "A",
      day: slot.day,
      period: slot.period,
      subject: slot.subject,
      teacherId: slot.teacherId || "",
      academicYear: year,
      active: "TRUE",
      createdBy: user.id,
      updatedBy: user.id
    });
  });
  return ok_(saved);
}

function certificatesIssue(payload, user) {
  requireRole_(user, ["Principal"]);
  return withLock_(function () {
    var seq = Number(getSetting_("certSeq", 0)) + 1;
    setSetting_("certSeq", seq);
    var year = currentAcademicYear_();
    var prefix = payload.type === "TC" ? "TC" : payload.type === "ID" ? "ID" : "BN";
    var certNo = prefix + "-" + year.slice(2, 4) + "-" + String(seq).padStart(4, "0");
    var student = findById_("Students", payload.studentId);
    if (!student) return fail_("Student not found");
    var row = appendObject_("Certificates", {
      id: uid_("cer"),
      certNo: certNo,
      type: payload.type || "Bonafide",
      studentId: student.id,
      issueDate: payload.issueDate || nowIso_().slice(0, 10),
      data: JSON.stringify(payload.data || {}),
      academicYear: year,
      active: "TRUE",
      createdBy: user.id,
      updatedBy: user.id
    });
    audit_(user, "certificate.issue", "Certificates", row.id, { certNo: certNo });
    row.student = sanitizeStudent_(student);
    row.school = getSetting_("school", {});
    return ok_(row);
  });
}

function certificatesList(payload, user) {
  requireRole_(user, ["Principal"]);
  var rows = readAllObjects_("Certificates").filter(function (c) { return isTruthy_(c.active); });
  if (payload.studentId) rows = rows.filter(function (c) { return c.studentId === payload.studentId; });
  return ok_(rows);
}

function importStudents(payload, user) {
  requireRole_(user, ["Principal"]);
  var rows = payload.rows || [];
  var created = [];
  rows.forEach(function (r) {
    var res = studentsCreate({
      name: r.name,
      parentName: r.parentName,
      phone: r.phone,
      className: r.className,
      section: r.section || "A",
      annualFee: r.annualFee,
      concession: r.concession,
      previousBalance: r.previousBalance,
      gender: r.gender,
      admissionDate: r.admissionDate,
      services: r.services || []
    }, user);
    if (res.ok) created.push(res.data);
  });
  audit_(user, "import.students", "Students", "", { count: created.length });
  return ok_({ imported: created.length, students: created });
}

function importYearSummary(payload, user) {
  requireRole_(user, ["Principal"]);
  var rows = payload.rows || [];
  var saved = rows.map(function (r) {
    return appendObject_("YearSummary", {
      id: uid_("ys"),
      academicYear: r.academicYear,
      month: r.month || "YEAR",
      feeCollected: Number(r.feeCollected) || 0,
      expenses: Number(r.expenses) || 0,
      enrollment: Number(r.enrollment) || 0,
      pendingBalance: Number(r.pendingBalance) || 0,
      notes: r.notes || "",
      createdBy: user.id,
      updatedBy: user.id
    });
  });
  return ok_(saved);
}

function backupTrigger(payload, user) {
  requireRole_(user, ["Principal"]);
  var ss = getSs_();
  var name = ss.getName() + "_backup_" + nowIso_().slice(0, 10);
  var copy = ss.copy(name);
  audit_(user, "backup", "Spreadsheet", copy.getId(), { name: name });
  return ok_({ fileId: copy.getId(), name: name, url: copy.getUrl() });
}

function auditList(payload, user) {
  requireRole_(user, ["Principal"]);
  var rows = readAllObjects_("AuditLog");
  rows.sort(function (a, b) { return String(b.createdAt).localeCompare(String(a.createdAt)); });
  return ok_(rows.slice(0, payload.limit || 200));
}
