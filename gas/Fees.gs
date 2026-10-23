/**
 * Fee collection, receipts, installments, cheque status
 */

function feesCollect(payload, user) {
  requireRole_(user, ["Principal"]);
  return withLock_(function () {
    var student = findById_("Students", payload.studentId);
    if (!student) return fail_("Student not found");
    var amount = Number(payload.amount);
    if (!(amount > 0)) return fail_("Invalid amount");

    var seq = Number(getSetting_("receiptSeq", 0)) + 1;
    setSetting_("receiptSeq", seq);
    var year = currentAcademicYear_();
    var receiptNo = "R" + year.replace("-", "").slice(2) + "-" + String(seq).padStart(5, "0");

    var services = readAllObjects_("StudentServices").filter(function (x) {
      return x.studentId === student.id && isTruthy_(x.active);
    });
    var payments = readAllObjects_("FeePayments").filter(function (p) {
      return p.studentId === student.id && !isTruthy_(p.cancelled);
    });
    var balanceBefore = studentBalance_(student, payments, services);
    var balanceAfter = Math.max(0, balanceBefore - amount);

    var mode = payload.mode || "Cash";
    var chequeStatus = mode === "Cheque" ? (payload.chequeStatus || "Pending") : "";

    var row = appendObject_("FeePayments", {
      id: uid_("fee"),
      receiptNo: receiptNo,
      studentId: student.id,
      amount: amount,
      mode: mode,
      reference: payload.reference || "",
      chequeStatus: chequeStatus,
      heads: JSON.stringify(payload.heads || { Tuition: amount }),
      balanceAfter: balanceAfter,
      notes: payload.notes || "",
      cancelled: "FALSE",
      cancelReason: "",
      academicYear: year,
      active: "TRUE",
      createdBy: user.id,
      updatedBy: user.id
    });

    // Apply to installments (FIFO)
    applyPaymentToInstallments_(student.id, amount, user);

    audit_(user, "fees.collect", "FeePayments", row.id, { receiptNo: receiptNo, amount: amount });
    var out = row;
    out.student = sanitizeStudent_(student);
    out.school = getSetting_("school", {});
    return ok_(out);
  });
}

function applyPaymentToInstallments_(studentId, amount, user) {
  var left = amount;
  var inst = readAllObjects_("Installments")
    .filter(function (i) {
      return i.studentId === studentId && isTruthy_(i.active) && i.status !== "paid";
    })
    .sort(function (a, b) {
      return String(a.dueDate).localeCompare(String(b.dueDate));
    });
  for (var i = 0; i < inst.length && left > 0; i++) {
    var due = Number(inst[i].amount) - Number(inst[i].paidAmount || 0);
    var pay = Math.min(due, left);
    var paidAmount = Number(inst[i].paidAmount || 0) + pay;
    var status = paidAmount >= Number(inst[i].amount) ? "paid" : "partial";
    updateObjectById_("Installments", inst[i].id, {
      paidAmount: paidAmount,
      status: status,
      updatedBy: user.id
    });
    left -= pay;
  }
}

function feesList(payload, user) {
  requireRole_(user, ["Principal"]);
  var rows = readAllObjects_("FeePayments");
  if (payload.studentId) rows = rows.filter(function (p) { return p.studentId === payload.studentId; });
  if (payload.from) rows = rows.filter(function (p) { return String(p.createdAt).slice(0, 10) >= payload.from; });
  if (payload.to) rows = rows.filter(function (p) { return String(p.createdAt).slice(0, 10) <= payload.to; });
  return ok_(rows);
}

function feesLedger(payload, user) {
  requireRole_(user, ["Principal"]);
  return studentsGet({ id: payload.studentId }, user);
}

function feesCancel(payload, user) {
  requireRole_(user, ["Principal"]);
  var pay = findById_("FeePayments", payload.id);
  if (!pay) return fail_("Payment not found");
  if (isTruthy_(pay.cancelled)) return fail_("Already cancelled");
  var updated = updateObjectById_("FeePayments", payload.id, {
    cancelled: "TRUE",
    cancelReason: payload.reason || "",
    updatedBy: user.id
  });
  audit_(user, "fees.cancel", "FeePayments", payload.id, { reason: payload.reason });
  return ok_(updated);
}

function feesPending(payload, user) {
  requireRole_(user, ["Principal"]);
  return ok_(buildPendingList_(payload.className || ""));
}

function installmentsList(payload, user) {
  requireRole_(user, ["Principal"]);
  var rows = readAllObjects_("Installments").filter(function (i) {
    return isTruthy_(i.active);
  });
  if (payload.studentId) rows = rows.filter(function (i) { return i.studentId === payload.studentId; });
  if (payload.dueToday || payload.overdue) {
    var today = nowIso_().slice(0, 10);
    rows = rows.filter(function (i) {
      if (i.status === "paid") return false;
      if (payload.overdue) return i.dueDate && i.dueDate < today;
      return i.dueDate === today;
    });
  }
  return ok_(rows);
}

function installmentsSave(payload, user) {
  requireRole_(user, ["Principal"]);
  var year = currentAcademicYear_();
  if (payload.id) {
    return ok_(
      updateObjectById_("Installments", payload.id, {
        label: payload.label,
        dueDate: payload.dueDate,
        amount: Number(payload.amount) || 0,
        status: payload.status || "pending",
        updatedBy: user.id
      })
    );
  }
  var row = appendObject_("Installments", {
    id: uid_("ins"),
    studentId: payload.studentId,
    label: payload.label,
    dueDate: payload.dueDate,
    amount: Number(payload.amount) || 0,
    paidAmount: 0,
    status: "pending",
    academicYear: year,
    active: "TRUE",
    createdBy: user.id,
    updatedBy: user.id
  });
  return ok_(row);
}

function chequeUpdateStatus(payload, user) {
  requireRole_(user, ["Principal"]);
  var pay = findById_("FeePayments", payload.id);
  if (!pay) return fail_("Payment not found");
  var status = payload.chequeStatus;
  var patch = { chequeStatus: status, updatedBy: user.id };
  if (status === "Bounced") {
    patch.cancelled = "TRUE";
    patch.cancelReason = payload.reason || "Cheque bounced";
  }
  var updated = updateObjectById_("FeePayments", payload.id, patch);
  audit_(user, "cheque.update", "FeePayments", payload.id, { status: status });
  return ok_(updated);
}

function reminderQueue(payload, user) {
  requireRole_(user, ["Principal"]);
  var pending = feesPending({}, user).data || [];
  var today = nowIso_().slice(0, 10);
  var installments = readAllObjects_("Installments").filter(function (i) {
    return isTruthy_(i.active) && i.status !== "paid" && i.dueDate && i.dueDate <= today;
  });
  var byStudent = {};
  pending.forEach(function (p) {
    byStudent[p.id] = {
      studentId: p.id,
      name: p.name,
      className: p.className,
      phone: p.phone,
      parentName: p.parentName,
      balance: p.balance,
      payByDate: p.payByDate,
      reasons: []
    };
    if (p.payByDate && p.payByDate <= today) {
      byStudent[p.id].reasons.push("Pay-by date " + p.payByDate);
    }
    if (p.balance > 0) byStudent[p.id].reasons.push("Balance Rs." + p.balance);
  });
  installments.forEach(function (i) {
    if (!byStudent[i.studentId]) {
      var s = findById_("Students", i.studentId);
      if (!s) return;
      byStudent[i.studentId] = {
        studentId: s.id,
        name: s.name,
        className: s.className,
        phone: s.phone,
        parentName: s.parentName,
        balance: 0,
        payByDate: "",
        reasons: []
      };
    }
    byStudent[i.studentId].reasons.push(i.label + " due " + i.dueDate);
  });
  var list = Object.keys(byStudent).map(function (k) { return byStudent[k]; });
  list.sort(function (a, b) { return (b.balance || 0) - (a.balance || 0); });
  return ok_(list);
}
