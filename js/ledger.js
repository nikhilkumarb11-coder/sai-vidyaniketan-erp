/**
 * Fee/dashboard maths over cached core tables (mirrors gas/Finance.gs + Students.gs).
 */
const Ledger = (() => {
  function truthy(v) {
    return v === true || v === "TRUE" || v === "true" || v === "Y" || v === 1 || v === "1";
  }

  function normalizeClass(c) {
    return String(c == null ? "" : c)
      .trim()
      .replace(/^class\s+/i, "")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function classMatch(a, b) {
    return normalizeClass(a) === normalizeClass(b);
  }

  function num(v) {
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  }

  function yearOf(tables, settingsYear) {
    return settingsYear || (AppCache.get() && AppCache.get().academicYear) || CONFIG.school.academicYear;
  }

  function studentBalance(student, payments, services) {
    const fee = num(student.annualFee);
    const concession = num(student.concession);
    const prev = num(student.previousBalance);
    const svc = (services || []).reduce((a, s) => a + num(s.cost), 0);
    const paid = (payments || []).reduce((a, p) => a + num(p.amount), 0);
    return Math.max(0, fee + svc - concession + prev - paid);
  }

  function pendingList(tables, className, academicYear) {
    const year = yearOf(tables, academicYear);
    const students = (tables.Students || []).filter(
      (s) =>
        (s.status === "Active" || !s.status) &&
        truthy(s.active) !== false &&
        (!s.academicYear || s.academicYear === year)
    );
    const filtered = className ? students.filter((s) => classMatch(s.className, className)) : students;
    const paidBy = {};
    (tables.FeePayments || []).forEach((p) => {
      if (truthy(p.cancelled)) return;
      paidBy[p.studentId] = (paidBy[p.studentId] || 0) + num(p.amount);
    });
    const svcBy = {};
    (tables.StudentServices || []).forEach((x) => {
      if (!truthy(x.active)) return;
      (svcBy[x.studentId] || (svcBy[x.studentId] = [])).push(x);
    });
    return filtered
      .map((s) => {
        const services = svcBy[s.id] || [];
        const paid = paidBy[s.id] || 0;
        const fee = num(s.annualFee);
        const concession = num(s.concession);
        const prev = num(s.previousBalance);
        const svc = services.reduce((a, x) => a + num(x.cost), 0);
        const balance = Math.max(0, fee + svc - concession + prev - paid);
        return {
          id: s.id,
          admissionNo: s.admissionNo,
          name: s.name,
          className: s.className,
          section: s.section,
          phone: s.phone,
          parentName: s.parentName,
          payByDate: s.payByDate,
          balance,
          annualFee: fee
        };
      })
      .filter((s) => s.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }

  function reminderQueue(tables, academicYear) {
    const pending = pendingList(tables, "", academicYear);
    const today = new Date().toISOString().slice(0, 10);
    const byStudent = {};
    pending.forEach((p) => {
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
      if (p.payByDate && p.payByDate <= today) byStudent[p.id].reasons.push("Pay-by date " + p.payByDate);
      if (p.balance > 0) byStudent[p.id].reasons.push("Balance Rs." + p.balance);
    });
    (tables.Installments || [])
      .filter((i) => truthy(i.active) && i.status !== "paid" && i.dueDate && i.dueDate <= today)
      .forEach((i) => {
        if (!byStudent[i.studentId]) {
          const s = (tables.Students || []).find((x) => x.id === i.studentId);
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
        byStudent[i.studentId].reasons.push((i.label || "Installment") + " due " + i.dueDate);
      });
    return Object.values(byStudent);
  }

  function studentDetail(tables, id) {
    const s = (tables.Students || []).find((x) => x.id === id);
    if (!s) return null;
    const services = (tables.StudentServices || []).filter((x) => x.studentId === id && truthy(x.active));
    const payments = (tables.FeePayments || []).filter((p) => p.studentId === id && !truthy(p.cancelled));
    const out = { ...s };
    out.optedServices = services;
    out.balance = studentBalance(s, payments, services);
    out.paidTotal = payments.reduce((a, p) => a + num(p.amount), 0);
    return out;
  }

  function studentsList(tables, payload = {}) {
    const year = yearOf(tables);
    let rows = (tables.Students || []).filter((s) => truthy(s.active) !== false);
    rows = rows.filter((s) => !s.academicYear || s.academicYear === year || payload.allYears);
    if (payload.className) rows = rows.filter((s) => classMatch(s.className, payload.className));
    if (payload.status) rows = rows.filter((s) => s.status === payload.status);
    else if (!payload.includeAllStatuses) rows = rows.filter((s) => s.status === "Active" || !s.status);
    if (payload.q) {
      const q = String(payload.q).toLowerCase();
      rows = rows.filter(
        (s) =>
          String(s.name).toLowerCase().includes(q) ||
          String(s.admissionNo).toLowerCase().includes(q) ||
          String(s.phone).includes(q) ||
          String(s.parentName).toLowerCase().includes(q)
      );
    }
    return rows;
  }

  function dashboardPrincipal(tables, academicYear) {
    const year = yearOf(tables, academicYear);
    const students = (tables.Students || []).filter(
      (s) => (s.status === "Active" || !s.status) && (!s.academicYear || s.academicYear === year)
    );
    const byClass = {};
    students.forEach((s) => {
      byClass[s.className] = (byClass[s.className] || 0) + 1;
    });
    const today = new Date().toISOString().slice(0, 10);
    const month = today.slice(0, 7);
    let collectedToday = 0,
      collectedMonth = 0,
      collectedYear = 0;
    (tables.FeePayments || []).forEach((p) => {
      if (truthy(p.cancelled)) return;
      const d = String(p.createdAt).slice(0, 10);
      const amt = num(p.amount);
      if (p.academicYear === year || !p.academicYear) collectedYear += amt;
      if (d === today) collectedToday += amt;
      if (d.slice(0, 7) === month) collectedMonth += amt;
    });
    const pending = pendingList(tables, "", year);
    const pendingTotal = pending.reduce((a, p) => a + p.balance, 0);
    let present = 0,
      total = 0,
      absentees = 0;
    (tables.Attendance || []).forEach((a) => {
      if (String(a.date).slice(0, 10) !== today) return;
      present += num(a.presentCount);
      total += num(a.totalCount);
      try {
        absentees += (typeof a.absentIds === "string" ? JSON.parse(a.absentIds || "[]") : a.absentIds || []).length;
      } catch (e) {}
    });
    let expenseMonth = 0;
    (tables.Expenses || []).forEach((e) => {
      if (truthy(e.active) === false) return;
      if (String(e.date).slice(0, 7) === month) expenseMonth += num(e.amount);
    });
    const todayMD = today.slice(5, 10);
    const birthdays = students.filter((s) => s.dob && String(s.dob).slice(5, 10) === todayMD).slice(0, 10);
    const enquiries = (tables.Enquiries || []).filter((e) => e.status === "Open").slice(0, 5);
    const lowStock = (tables.StockItems || []).filter((i) => truthy(i.active) && num(i.qty) <= num(i.reorderLevel || 5));
    return {
      totalStudents: students.length,
      enrollmentByClass: byClass,
      attendanceToday: {
        present,
        total,
        percent: total ? Math.round((present / total) * 100) : null,
        absentees
      },
      fees: {
        today: collectedToday,
        month: collectedMonth,
        year: collectedYear,
        pendingTotal,
        topDefaulters: pending.slice(0, 8)
      },
      expenseMonth,
      birthdays,
      enquiries,
      lowStock,
      reminderCount: pending.length
    };
  }

  function activeRows(rows) {
    return (rows || []).filter((r) => truthy(r.active) !== false);
  }

  return {
    truthy,
    num,
    studentBalance,
    pendingList,
    reminderQueue,
    studentDetail,
    studentsList,
    dashboardPrincipal,
    activeRows
  };
})();
