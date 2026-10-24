/**
 * Students, enquiries, services, settings, modules
 */

function settingsGet(payload, user) {
  requireRole_(user, ["Principal"]);
  return ok_({
    school: getSetting_("school", {}),
    theme: getSetting_("theme", {}),
    modules: getSetting_("modules", {}),
    grading: getSetting_("grading", []),
    lateFine: getSetting_("lateFine", {}),
    whatsappTemplates: getSetting_("whatsappTemplates", {}),
    academicYear: currentAcademicYear_(),
    openingCash: getSetting_("openingCash", 0),
    openingBank: getSetting_("openingBank", 0)
  });
}

function settingsSave(payload, user) {
  requireRole_(user, ["Principal"]);
  var keys = ["school", "theme", "grading", "lateFine", "whatsappTemplates", "academicYear", "openingCash", "openingBank"];
  keys.forEach(function (k) {
    if (payload[k] !== undefined) setSetting_(k, payload[k]);
  });
  cacheRemove_("bootstrap");
  audit_(user, "settings.save", "Settings", "", {});
  return settingsGet(payload, user);
}

function modulesGet(payload, user) {
  requireRole_(user, ["Principal"]);
  return ok_(getSetting_("modules", {}));
}

function modulesSave(payload, user) {
  requireRole_(user, ["Principal"]);
  setSetting_("modules", payload.modules || payload);
  cacheRemove_("bootstrap");
  audit_(user, "modules.save", "Settings", "", payload.modules || payload);
  return ok_(getSetting_("modules", {}));
}

function servicesList(payload, user) {
  var rows = readAllObjects_("Services");
  if (payload && payload.includeInactive) return ok_(rows);
  return ok_(rows.filter(function (s) { return isTruthy_(s.active); }));
}

function servicesSave(payload, user) {
  requireRole_(user, ["Principal"]);
  var year = currentAcademicYear_();
  var data = {
    name: payload.name,
    cost: Number(payload.cost) || 0,
    costType: payload.costType || "fixed",
    billingType: payload.billingType || "annual",
    classes: JSON.stringify(payload.classes || []),
    active: payload.active === false ? "FALSE" : "TRUE",
    academicYear: year,
    updatedBy: user.id
  };
  var row;
  if (payload.id) {
    row = updateObjectById_("Services", payload.id, data);
    audit_(user, "services.update", "Services", payload.id, data);
  } else {
    data.createdBy = user.id;
    row = appendObject_("Services", data);
    audit_(user, "services.create", "Services", row.id, data);
  }
  return ok_(row);
}

function studentsList(payload, user) {
  var rows = readAllObjects_("Students").filter(function (s) {
    return isTruthy_(s.active) !== false;
  });
  var year = currentAcademicYear_();
  rows = rows.filter(function (s) {
    return !s.academicYear || s.academicYear === year || payload.allYears;
  });
  if (payload.className) {
    rows = rows.filter(function (s) { return classMatch_(s.className, payload.className); });
  }
  if (payload.status) {
    rows = rows.filter(function (s) { return s.status === payload.status; });
  } else if (!payload.includeAllStatuses) {
    rows = rows.filter(function (s) { return s.status === "Active" || !s.status; });
  }
  if (payload.q) {
    var q = String(payload.q).toLowerCase();
    rows = rows.filter(function (s) {
      return (
        String(s.name).toLowerCase().indexOf(q) >= 0 ||
        String(s.admissionNo).toLowerCase().indexOf(q) >= 0 ||
        String(s.phone).indexOf(q) >= 0 ||
        String(s.parentName).toLowerCase().indexOf(q) >= 0
      );
    });
  }
  // Teachers can view student list
  return ok_(rows.map(sanitizeStudent_));
}

function sanitizeStudent_(s) {
  var copy = {};
  for (var k in s) if (k !== "_row") copy[k] = s[k];
  copy.services = parseJsonField_(s.services, null);
  return copy;
}

function studentsGet(payload, user) {
  var s = findById_("Students", payload.id);
  if (!s) return fail_("Student not found");
  var services = readAllObjects_("StudentServices").filter(function (x) {
    return x.studentId === s.id && isTruthy_(x.active);
  });
  var payments = readAllObjects_("FeePayments").filter(function (p) {
    return p.studentId === s.id && !isTruthy_(p.cancelled);
  });
  var balance = studentBalance_(s, payments, services);
  var out = sanitizeStudent_(s);
  out.optedServices = services;
  out.balance = balance;
  out.paidTotal = payments.reduce(function (a, p) { return a + Number(p.amount || 0); }, 0);
  return ok_(out);
}

function studentBalance_(student, payments, services) {
  payments = payments || readAllObjects_("FeePayments").filter(function (p) {
    return p.studentId === student.id && !isTruthy_(p.cancelled);
  });
  services = services || readAllObjects_("StudentServices").filter(function (x) {
    return x.studentId === student.id && isTruthy_(x.active);
  });
  var fee = Number(student.annualFee || 0);
  var concession = Number(student.concession || 0);
  var prev = Number(student.previousBalance || 0);
  var svc = services.reduce(function (a, s) { return a + Number(s.cost || 0); }, 0);
  var paid = payments.reduce(function (a, p) { return a + Number(p.amount || 0); }, 0);
  return Math.max(0, fee + svc - concession + prev - paid);
}

function studentsCreate(payload, user) {
  requireRole_(user, ["Principal"]);
  var year = currentAcademicYear_();
  var seq = nextSequence_("admissionSeq");
  var admissionNo = payload.admissionNo || ("SVS" + year.slice(2, 4) + String(seq).padStart(4, "0"));
  var row = appendObject_("Students", {
    id: uid_("stu"),
    admissionNo: admissionNo,
    name: payload.name,
    parentName: payload.parentName || "",
    parentName2: payload.parentName2 || "",
    phone: normalizePhone_(payload.phone),
    phone2: normalizePhone_(payload.phone2),
    dob: payload.dob || "",
    gender: payload.gender || "",
    address: payload.address || "",
    photoUrl: payload.photoUrl || "",
    bloodGroup: payload.bloodGroup || "",
    className: payload.className,
    section: payload.section || "A",
    admissionDate: payload.admissionDate || nowIso_().slice(0, 10),
    annualFee: Number(payload.annualFee) || 0,
    concession: Number(payload.concession) || 0,
    concessionReason: payload.concessionReason || "",
    previousBalance: Number(payload.previousBalance) || 0,
    payByDate: payload.payByDate || "",
    status: "Active",
    siblingGroupId: payload.siblingGroupId || "",
    academicYear: year,
    active: "TRUE",
    createdBy: user.id,
    updatedBy: user.id
  });
  (payload.services || []).forEach(function (svc) {
    appendObject_("StudentServices", {
      id: uid_("ssv"),
      studentId: row.id,
      serviceId: svc.serviceId || "",
      serviceName: svc.serviceName || svc.name,
      cost: Number(svc.cost) || 0,
      routeId: svc.routeId || "",
      academicYear: year,
      active: "TRUE",
      createdBy: user.id,
      updatedBy: user.id
    });
  });
  // Optional installments
  (payload.installments || []).forEach(function (inst) {
    appendObject_("Installments", {
      id: uid_("ins"),
      studentId: row.id,
      label: inst.label,
      dueDate: inst.dueDate,
      amount: Number(inst.amount) || 0,
      paidAmount: 0,
      status: "pending",
      academicYear: year,
      active: "TRUE",
      createdBy: user.id,
      updatedBy: user.id
    });
  });
  audit_(user, "student.create", "Students", row.id, { admissionNo: admissionNo });
  return studentsGet({ id: row.id }, user);
}

function studentsUpdate(payload, user) {
  requireRole_(user, ["Principal"]);
  var patch = {
    name: payload.name,
    parentName: payload.parentName,
    parentName2: payload.parentName2,
    phone: normalizePhone_(payload.phone),
    phone2: normalizePhone_(payload.phone2),
    dob: payload.dob,
    gender: payload.gender,
    address: payload.address,
    photoUrl: payload.photoUrl,
    bloodGroup: payload.bloodGroup,
    className: payload.className,
    section: payload.section,
    annualFee: Number(payload.annualFee) || 0,
    concession: Number(payload.concession) || 0,
    concessionReason: payload.concessionReason || "",
    previousBalance: Number(payload.previousBalance) || 0,
    payByDate: payload.payByDate || "",
    status: payload.status || "Active",
    siblingGroupId: payload.siblingGroupId || "",
    updatedBy: user.id
  };
  updateObjectById_("Students", payload.id, patch);
  if (payload.services) {
    var existing = readAllObjects_("StudentServices").filter(function (x) {
      return x.studentId === payload.id;
    });
    existing.forEach(function (x) {
      updateObjectById_("StudentServices", x.id, { active: "FALSE", updatedBy: user.id });
    });
    var year = currentAcademicYear_();
    payload.services.forEach(function (svc) {
      appendObject_("StudentServices", {
        id: uid_("ssv"),
        studentId: payload.id,
        serviceId: svc.serviceId || "",
        serviceName: svc.serviceName || svc.name,
        cost: Number(svc.cost) || 0,
        routeId: svc.routeId || "",
        academicYear: year,
        active: "TRUE",
        createdBy: user.id,
        updatedBy: user.id
      });
    });
  }
  audit_(user, "student.update", "Students", payload.id, patch);
  return studentsGet({ id: payload.id }, user);
}

function enquiriesList(payload, user) {
  requireRole_(user, ["Principal"]);
  var rows = readAllObjects_("Enquiries").filter(function (e) {
    return isTruthy_(e.active) !== false;
  });
  if (payload.status) rows = rows.filter(function (e) { return e.status === payload.status; });
  return ok_(rows);
}

function enquiriesCreate(payload, user) {
  requireRole_(user, ["Principal"]);
  var row = appendObject_("Enquiries", {
    id: uid_("enq"),
    name: payload.name,
    phone: normalizePhone_(payload.phone),
    classSought: payload.classSought || "",
    followUpDate: payload.followUpDate || "",
    status: payload.status || "Open",
    notes: payload.notes || "",
    convertedStudentId: "",
    academicYear: currentAcademicYear_(),
    active: "TRUE",
    createdBy: user.id,
    updatedBy: user.id
  });
  audit_(user, "enquiry.create", "Enquiries", row.id, {});
  return ok_(row);
}

function enquiriesUpdate(payload, user) {
  requireRole_(user, ["Principal"]);
  var row = updateObjectById_("Enquiries", payload.id, {
    name: payload.name,
    phone: normalizePhone_(payload.phone),
    classSought: payload.classSought,
    followUpDate: payload.followUpDate,
    status: payload.status,
    notes: payload.notes || "",
    updatedBy: user.id
  });
  return ok_(row);
}

function enquiriesConvert(payload, user) {
  requireRole_(user, ["Principal"]);
  var enq = findById_("Enquiries", payload.id);
  if (!enq) return fail_("Enquiry not found");
  var studentPayload = payload.student || {};
  studentPayload.name = studentPayload.name || enq.name;
  studentPayload.phone = studentPayload.phone || enq.phone;
  studentPayload.className = studentPayload.className || enq.classSought;
  var created = studentsCreate(studentPayload, user);
  if (!created.ok) return created;
  updateObjectById_("Enquiries", enq.id, {
    status: "Converted",
    convertedStudentId: created.data.id,
    updatedBy: user.id
  });
  return created;
}
