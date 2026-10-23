/**
 * Dashboard, finance reports, YoY, projections
 */

function dashboardPrincipal(payload, user) {
  requireRole_(user, ["Principal"]);
  var year = currentAcademicYear_();
  var students = readAllObjects_("Students").filter(function (s) {
    return (s.status === "Active" || !s.status) && (!s.academicYear || s.academicYear === year);
  });
  var byClass = {};
  students.forEach(function (s) {
    byClass[s.className] = (byClass[s.className] || 0) + 1;
  });

  var today = nowIso_().slice(0, 10);
  var month = today.slice(0, 7);
  var payments = readAllObjects_("FeePayments").filter(function (p) {
    return !isTruthy_(p.cancelled);
  });
  var collectedToday = 0, collectedMonth = 0, collectedYear = 0;
  payments.forEach(function (p) {
    var d = String(p.createdAt).slice(0, 10);
    var amt = Number(p.amount) || 0;
    if (p.academicYear === year || !p.academicYear) collectedYear += amt;
    if (d === today) collectedToday += amt;
    if (d.slice(0, 7) === month) collectedMonth += amt;
  });

  var pending = feesPending({}, user).data || [];
  var pendingTotal = pending.reduce(function (a, p) { return a + p.balance; }, 0);

  var attRows = readAllObjects_("Attendance").filter(function (a) {
    return String(a.date).slice(0, 10) === today;
  });
  var present = 0, total = 0, absentees = 0;
  attRows.forEach(function (a) {
    present += Number(a.presentCount) || 0;
    total += Number(a.totalCount) || 0;
    absentees += parseJsonField_(a.absentIds, []).length;
  });

  var expenses = readAllObjects_("Expenses").filter(function (e) {
    return isTruthy_(e.active) !== false && String(e.date).slice(0, 7) === month;
  });
  var expenseMonth = expenses.reduce(function (a, e) { return a + (Number(e.amount) || 0); }, 0);

  var birthdays = students.filter(function (s) {
    if (!s.dob) return false;
    var dob = String(s.dob).slice(5, 10);
    return dob === today.slice(5, 10);
  }).slice(0, 10);

  var enquiries = readAllObjects_("Enquiries")
    .filter(function (e) { return e.status === "Open"; })
    .slice(0, 5);

  var lowStock = readAllObjects_("StockItems").filter(function (i) {
    return isTruthy_(i.active) && Number(i.qty) <= Number(i.reorderLevel || 5);
  });

  return ok_({
    totalStudents: students.length,
    enrollmentByClass: byClass,
    attendanceToday: { present: present, total: total, percent: total ? Math.round((present / total) * 100) : null, absentees: absentees },
    fees: {
      today: collectedToday,
      month: collectedMonth,
      year: collectedYear,
      pendingTotal: pendingTotal,
      topDefaulters: pending.slice(0, 8)
    },
    expenseMonth: expenseMonth,
    birthdays: birthdays,
    enquiries: enquiries,
    lowStock: lowStock,
    reminderCount: (reminderQueue({}, user).data || []).length
  });
}

function dashboardTeacher(payload, user) {
  requireRole_(user, ["Teacher", "Principal"]);
  var className = user.classAssigned ? String(user.classAssigned).split("-")[0] : payload.className;
  var today = nowIso_().slice(0, 10);
  var att = null;
  if (className) {
    att = attendanceGet({ className: className, date: today }, user).data;
  }
  var notices = noticesList({ className: className }, user).data || [];
  return ok_({
    classAssigned: user.classAssigned,
    attendance: att,
    notices: notices.slice(0, 10)
  });
}

function financeReports(payload, user) {
  requireRole_(user, ["Principal"]);
  var year = currentAcademicYear_();
  var payments = readAllObjects_("FeePayments").filter(function (p) {
    return !isTruthy_(p.cancelled) && (p.academicYear === year || !p.academicYear);
  });
  var expenses = readAllObjects_("Expenses").filter(function (e) {
    return isTruthy_(e.active) !== false && (e.academicYear === year || !e.academicYear);
  });

  var byMode = {};
  var byMonth = {};
  var income = 0;
  payments.forEach(function (p) {
    var amt = Number(p.amount) || 0;
    income += amt;
    byMode[p.mode || "Other"] = (byMode[p.mode || "Other"] || 0) + amt;
    var m = String(p.createdAt).slice(0, 7);
    if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0 };
    byMonth[m].income += amt;
  });

  var expenseTotal = 0;
  var byCategory = {};
  expenses.forEach(function (e) {
    var amt = Number(e.amount) || 0;
    expenseTotal += amt;
    byCategory[e.category || "Other"] = (byCategory[e.category || "Other"] || 0) + amt;
    var m = String(e.date).slice(0, 7);
    if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0 };
    byMonth[m].expense += amt;
  });

  var pending = feesPending({}, user).data || [];
  var pendingTotal = pending.reduce(function (a, p) { return a + p.balance; }, 0);
  var due = income + pendingTotal;
  var efficiency = due ? Math.round((income / due) * 1000) / 10 : 100;

  var today = nowIso_().slice(0, 10);
  var aging = { d30: 0, d60: 0, d90: 0, d90plus: 0 };
  pending.forEach(function (p) {
    var ref = p.payByDate || today;
    var days = Math.floor((Date.now() - new Date(ref).getTime()) / 86400000);
    if (days <= 30) aging.d30 += p.balance;
    else if (days <= 60) aging.d60 += p.balance;
    else if (days <= 90) aging.d90 += p.balance;
    else aging.d90plus += p.balance;
  });

  var daily = payments.filter(function (p) {
    return String(p.createdAt).slice(0, 10) === today;
  });

  return ok_({
    income: income,
    expenses: expenseTotal,
    surplus: income - expenseTotal,
    byMode: byMode,
    byCategory: byCategory,
    byMonth: byMonth,
    receivables: { due: due, collected: income, pending: pendingTotal, efficiency: efficiency },
    aging: aging,
    cashBookToday: daily,
    openingCash: getSetting_("openingCash", 0),
    openingBank: getSetting_("openingBank", 0)
  });
}

function financeYoy(payload, user) {
  requireRole_(user, ["Principal"]);
  var year = currentAcademicYear_();
  var current = financeReports({}, user).data;
  var history = readAllObjects_("YearSummary");
  var prevYears = {};
  history.forEach(function (h) {
    if (h.academicYear === year) return;
    if (!prevYears[h.academicYear]) {
      prevYears[h.academicYear] = { feeCollected: 0, expenses: 0, enrollment: 0, pendingBalance: 0, months: {} };
    }
    var y = prevYears[h.academicYear];
    y.feeCollected += Number(h.feeCollected) || 0;
    y.expenses += Number(h.expenses) || 0;
    y.enrollment = Math.max(y.enrollment, Number(h.enrollment) || 0);
    y.pendingBalance = Number(h.pendingBalance) || y.pendingBalance;
    if (h.month && h.month !== "YEAR") {
      y.months[h.month] = {
        feeCollected: Number(h.feeCollected) || 0,
        expenses: Number(h.expenses) || 0
      };
    }
  });
  var years = Object.keys(prevYears);
  var avg = { feeCollected: 0, expenses: 0, enrollment: 0, pendingBalance: 0 };
  if (years.length) {
    years.forEach(function (yk) {
      avg.feeCollected += prevYears[yk].feeCollected;
      avg.expenses += prevYears[yk].expenses;
      avg.enrollment += prevYears[yk].enrollment;
      avg.pendingBalance += prevYears[yk].pendingBalance;
    });
    avg.feeCollected = Math.round(avg.feeCollected / years.length);
    avg.expenses = Math.round(avg.expenses / years.length);
    avg.enrollment = Math.round(avg.enrollment / years.length);
    avg.pendingBalance = Math.round(avg.pendingBalance / years.length);
  }
  return ok_({
    currentYear: year,
    current: {
      feeCollected: current.income,
      expenses: current.expenses,
      pendingBalance: current.receivables.pending,
      enrollment: (dashboardPrincipal({}, user).data || {}).totalStudents || 0,
      byMonth: current.byMonth
    },
    previousYears: prevYears,
    averagePrevious: avg,
    aheadBehind: {
      collection: current.income - avg.feeCollected,
      expenses: current.expenses - avg.expenses
    }
  });
}

function financeProjections(payload, user) {
  requireRole_(user, ["Principal"]);
  var yoy = financeYoy({}, user).data;
  var pending = yoy.current.pendingBalance;
  var collected = yoy.current.feeCollected;
  var histRate = 0.85;
  if (yoy.averagePrevious.feeCollected && yoy.averagePrevious.pendingBalance + yoy.averagePrevious.feeCollected) {
    histRate = yoy.averagePrevious.feeCollected / (yoy.averagePrevious.feeCollected + yoy.averagePrevious.pendingBalance);
  }
  var expectedYearEndCollection = collected + Math.round(pending * histRate);
  var expectedPending = pending - Math.round(pending * histRate);
  var expenseForecast = yoy.averagePrevious.expenses || yoy.current.expenses;
  // scale remaining months roughly
  var month = Number(nowIso_().slice(5, 7));
  var academicMonth = month >= 4 ? month - 3 : month + 9;
  var expenseProjected = academicMonth > 0
    ? Math.round((yoy.current.expenses / academicMonth) * 12)
    : expenseForecast;

  var budgetRows = readAllObjects_("Budget").filter(function (b) {
    return b.academicYear === currentAcademicYear_();
  });
  var budgetIncome = 0, budgetExpense = 0;
  budgetRows.forEach(function (b) {
    if (b.type === "income") budgetIncome += Number(b.amount) || 0;
    else budgetExpense += Number(b.amount) || 0;
  });

  return ok_({
    expectedYearEndCollection: expectedYearEndCollection,
    expectedPending: expectedPending,
    expenseForecast: expenseProjected,
    projectedSurplus: expectedYearEndCollection - expenseProjected,
    suggestedBudget: {
      income: expectedYearEndCollection,
      expense: Math.round(expenseProjected * 1.05)
    },
    budget: { income: budgetIncome, expense: budgetExpense },
    actual: { income: collected, expense: yoy.current.expenses },
    note: "Estimates based on trends and averages; accuracy improves with more years of data."
  });
}

function budgetSave(payload, user) {
  requireRole_(user, ["Principal"]);
  var year = currentAcademicYear_();
  if (payload.replace) {
    readAllObjects_("Budget")
      .filter(function (b) { return b.academicYear === year; })
      .forEach(function (b) {
        // soft: leave rows; overwrite via new append after clear is complex — update amounts by category
      });
  }
  var row = appendObject_("Budget", {
    id: uid_("bud"),
    academicYear: year,
    category: payload.category || "General",
    amount: Number(payload.amount) || 0,
    type: payload.type || "expense",
    createdBy: user.id,
    updatedBy: user.id
  });
  return ok_(row);
}
