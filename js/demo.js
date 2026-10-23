/**
 * In-browser demo backend (localStorage) — mirrors Apps Script actions.
 */
const DemoAPI = (() => {
  const KEY = "svs_erp_demo_v1";

  function uid(p) {
    return (p || "id") + "_" + Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4);
  }
  function now() {
    return new Date().toISOString();
  }
  function today() {
    return now().slice(0, 10);
  }
  function phone(p) {
    let d = String(p || "").replace(/\D/g, "");
    if (d.length === 10) return "91" + d;
    return d;
  }

  function seed() {
    const year = CONFIG.school.academicYear;
    const adminId = uid("usr");
    const teacherId = uid("usr");
    const svcBooks = { id: uid("svc"), name: "Books", cost: 2500, costType: "fixed", billingType: "annual", classes: CONFIG.classes, active: true, academicYear: year };
    const svcUniform = { id: uid("svc"), name: "Uniform", cost: 2000, costType: "fixed", billingType: "one-time", classes: CONFIG.classes, active: true, academicYear: year };

    const students = [];
    const sample = [
      ["Aarav Sharma", "1", "9876543210", "Ravi Sharma"],
      ["Ananya Reddy", "1", "9876543211", "Suresh Reddy"],
      ["Vihaan Patel", "2", "9876543212", "Amit Patel"],
      ["Saanvi Rao", "5", "9876543213", "Kiran Rao"],
      ["Ishaan Kumar", "8", "9876543214", "Manoj Kumar"],
      ["Diya Singh", "Nursery", "9876543215", "Priya Singh"]
    ];
    sample.forEach((row, i) => {
      const fee = CONFIG.classFees[row[1]] || 20000;
      students.push({
        id: uid("stu"),
        admissionNo: "SVS26" + String(1001 + i),
        name: row[0],
        parentName: row[3],
        parentName2: "",
        phone: phone(row[2]),
        phone2: "",
        dob: "2015-06-15",
        gender: i % 2 ? "F" : "M",
        address: "Nagole, Hyderabad",
        photoUrl: "",
        bloodGroup: "O+",
        className: row[1],
        section: "A",
        admissionDate: "2026-04-10",
        annualFee: fee,
        concession: 0,
        concessionReason: "",
        previousBalance: i === 1 ? 2000 : 0,
        payByDate: "2026-06-30",
        status: "Active",
        siblingGroupId: "",
        academicYear: year,
        active: true,
        createdAt: now(),
        updatedAt: now()
      });
    });

    const studentServices = students.flatMap((s) => [
      { id: uid("ssv"), studentId: s.id, serviceId: svcBooks.id, serviceName: "Books", cost: 2500, routeId: "", academicYear: year, active: true },
      { id: uid("ssv"), studentId: s.id, serviceId: svcUniform.id, serviceName: "Uniform", cost: 2000, routeId: "", academicYear: year, active: true }
    ]);

    return {
      settings: {
        academicYear: year,
        school: { ...CONFIG.school },
        theme: { ...CONFIG.theme },
        modules: { ...CONFIG.modulesDefault },
        grading: CONFIG.grading,
        lateFine: CONFIG.lateFine,
        whatsappTemplates: { ...CONFIG.whatsappTemplates },
        receiptSeq: 0,
        certSeq: 0,
        admissionSeq: 1006,
        openingCash: 50000,
        openingBank: 120000
      },
      users: [
        {
          id: adminId,
          username: "admin",
          password: "Admin@123",
          displayName: "Principal",
          role: "Principal",
          classAssigned: "",
          subjects: [],
          active: true
        },
        {
          id: teacherId,
          username: "teacher1",
          password: "Teacher@123",
          displayName: "Class Teacher 1-A",
          role: "Teacher",
          classAssigned: "1",
          subjects: ["English", "Mathematics"],
          active: true
        }
      ],
      sessions: [],
      services: [svcBooks, svcUniform],
      students,
      studentServices,
      enquiries: [
        {
          id: uid("enq"),
          name: "Kabir Mehta",
          phone: phone("9988776655"),
          classSought: "1",
          followUpDate: today(),
          status: "Open",
          notes: "Visited campus",
          convertedStudentId: "",
          academicYear: year,
          active: true,
          createdAt: now()
        }
      ],
      feePayments: [],
      installments: [],
      attendance: [],
      staffAttendance: [],
      exams: CONFIG.exams.map((e, i) => ({
        id: uid("ex"),
        name: e.name,
        weight: e.weight,
        maxMarks: e.maxMarks,
        order: i + 1,
        active: true,
        academicYear: year
      })),
      marks: [],
      expenses: [
        {
          id: uid("exp"),
          date: today(),
          category: "Utilities",
          amount: 8500,
          mode: "UPI",
          notes: "Electricity",
          billRef: "",
          staffId: "",
          salaryMonth: "",
          academicYear: year,
          active: true,
          createdAt: now()
        }
      ],
      expenseCategories: ["Salaries", "Utilities", "Maintenance", "Supplies", "Transport", "Events", "Other"].map((name) => ({
        id: uid("cat"),
        name,
        active: true
      })),
      staff: [
        {
          id: uid("stf"),
          name: "Lakshmi Devi",
          role: "Teacher",
          phone: phone("9000000001"),
          joiningDate: "2022-06-01",
          salary: 25000,
          active: true
        }
      ],
      salaries: [],
      stockItems: [
        { id: uid("stk"), name: "Class 1 Books Set", category: "Books", unit: "set", openingQty: 40, qty: 28, reorderLevel: 10, active: true },
        { id: uid("stk"), name: "School Uniform (M)", category: "Uniform", unit: "pcs", openingQty: 50, qty: 8, reorderLevel: 10, active: true }
      ],
      stockMovements: [],
      routes: [{ id: uid("rte"), name: "Nagole Route", fee: 6000, active: true }],
      timetable: [],
      notices: [
        {
          id: uid("ntc"),
          title: "Welcome to new academic year",
          body: "School reopens as scheduled. Please complete fee payment.",
          className: "All",
          type: "notice",
          date: today(),
          academicYear: year,
          active: true
        }
      ],
      messageLog: [],
      budget: [],
      yearSummary: [
        { id: uid("ys"), academicYear: "2024-25", month: "YEAR", feeCollected: 4200000, expenses: 3100000, enrollment: 230, pendingBalance: 280000, notes: "" },
        { id: uid("ys"), academicYear: "2025-26", month: "YEAR", feeCollected: 4550000, expenses: 3300000, enrollment: 245, pendingBalance: 310000, notes: "" }
      ],
      certificates: [],
      auditLog: [],
      classes: CONFIG.classes.map((name) => ({
        id: uid("cls"),
        name,
        section: "A",
        annualFee: CONFIG.classFees[name] || 20000,
        active: true,
        academicYear: year
      }))
    };
  }

  function load() {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    const s = seed();
    save(s);
    return s;
  }

  function save(db) {
    localStorage.setItem(KEY, JSON.stringify(db));
  }

  function audit(db, user, action, entity, entityId, details) {
    db.auditLog.unshift({
      id: uid("aud"),
      userId: user ? user.id : "",
      username: user ? user.username : "",
      action,
      entity,
      entityId,
      details: details || {},
      createdAt: now()
    });
  }

  function publicUser(u) {
    if (!u) return null;
    return {
      id: u.id,
      username: u.username,
      displayName: u.displayName,
      role: u.role,
      classAssigned: u.classAssigned || "",
      subjects: u.subjects || [],
      active: u.active !== false
    };
  }

  function requireUser(db, token) {
    const session = db.sessions.find((s) => s.token === token);
    if (!session) throw Object.assign(new Error("Invalid session"), { code: "AUTH" });
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      throw Object.assign(new Error("Session expired"), { code: "AUTH" });
    }
    const user = db.users.find((u) => u.id === session.userId && u.active !== false);
    if (!user) throw Object.assign(new Error("User inactive"), { code: "AUTH" });
    return user;
  }

  function requirePrincipal(user) {
    if (user.role !== "Principal") throw Object.assign(new Error("Forbidden"), { code: "FORBIDDEN" });
  }

  function studentServices(db, studentId) {
    return db.studentServices.filter((s) => s.studentId === studentId && s.active !== false);
  }

  function studentPayments(db, studentId) {
    return db.feePayments.filter((p) => p.studentId === studentId && !p.cancelled);
  }

  function balance(db, student) {
    const fee = Number(student.annualFee) || 0;
    const concession = Number(student.concession) || 0;
    const prev = Number(student.previousBalance) || 0;
    const svc = studentServices(db, student.id).reduce((a, s) => a + (Number(s.cost) || 0), 0);
    const paid = studentPayments(db, student.id).reduce((a, p) => a + (Number(p.amount) || 0), 0);
    return Math.max(0, fee + svc - concession + prev - paid);
  }

  function ok(data) {
    return { ok: true, data };
  }
  function fail(msg, code) {
    return { ok: false, error: msg, code: code || "ERROR" };
  }

  function pendingList(db) {
    return db.students
      .filter((s) => s.status === "Active" || !s.status)
      .map((s) => ({
        id: s.id,
        admissionNo: s.admissionNo,
        name: s.name,
        className: s.className,
        section: s.section,
        phone: s.phone,
        parentName: s.parentName,
        payByDate: s.payByDate,
        balance: balance(db, s),
        annualFee: Number(s.annualFee) || 0
      }))
      .filter((s) => s.balance > 0)
      .sort((a, b) => b.balance - a.balance);
  }

  function gradeFor(pct, grading) {
    grading = grading || CONFIG.grading;
    for (const g of grading) if (pct >= g.min) return g.grade;
    return "F";
  }

  function handle(action, payload) {
    const db = load();
    try {
      const result = dispatch(db, action, payload || {});
      save(db);
      if (!result.ok) {
        const err = new Error(result.error);
        err.code = result.code;
        throw err;
      }
      return result.data;
    } catch (e) {
      save(db);
      throw e;
    }
  }

  function dispatch(db, action, p) {
    let user = null;
    const needsAuth = action !== "login";
    if (needsAuth) user = requireUser(db, p.token);

    switch (action) {
      case "login": {
        const u = db.users.find(
          (x) => x.username.toLowerCase() === String(p.username || "").toLowerCase() && x.active !== false
        );
        if (!u || u.password !== p.password) return fail("Invalid credentials", "AUTH");
        const token = uid("tok") + uid("tok");
        const expiresAt = new Date(Date.now() + 8 * 3600 * 1000).toISOString();
        db.sessions.push({ token, userId: u.id, expiresAt, createdAt: now() });
        audit(db, u, "login", "Users", u.id);
        return ok({ token, expiresAt, user: publicUser(u) });
      }
      case "logout": {
        db.sessions = db.sessions.filter((s) => s.token !== p.token);
        return ok({ loggedOut: true });
      }
      case "bootstrap":
        return ok({
          user: publicUser(user),
          academicYear: db.settings.academicYear,
          modules: db.settings.modules,
          services: db.services.filter((s) => s.active !== false),
          classes: db.classes,
          grading: db.settings.grading,
          exams: db.exams.filter((e) => e.active !== false),
          whatsappTemplates: db.settings.whatsappTemplates,
          school: db.settings.school,
          theme: db.settings.theme,
          expenseCategories: db.expenseCategories,
          subjects: []
        });

      case "settings.get":
        requirePrincipal(user);
        return ok({ ...db.settings });
      case "settings.save":
        requirePrincipal(user);
        ["school", "theme", "grading", "lateFine", "whatsappTemplates", "academicYear", "openingCash", "openingBank"].forEach((k) => {
          if (p[k] !== undefined) db.settings[k] = p[k];
        });
        return ok({ ...db.settings });
      case "modules.get":
        requirePrincipal(user);
        return ok(db.settings.modules);
      case "modules.save":
        requirePrincipal(user);
        db.settings.modules = p.modules || p;
        audit(db, user, "modules.save", "Settings", "");
        return ok(db.settings.modules);

      case "users.list":
        requirePrincipal(user);
        return ok(db.users.map(publicUser));
      case "users.create": {
        requirePrincipal(user);
        if (db.users.some((u) => u.username.toLowerCase() === String(p.username).toLowerCase())) {
          return fail("Username already exists");
        }
        const nu = {
          id: uid("usr"),
          username: p.username,
          password: p.password || "ChangeMe@123",
          displayName: p.displayName || p.username,
          role: p.role || "Teacher",
          classAssigned: p.classAssigned || "",
          subjects: p.subjects || [],
          active: true
        };
        db.users.push(nu);
        return ok(publicUser(nu));
      }
      case "users.update": {
        requirePrincipal(user);
        const u = db.users.find((x) => x.id === p.id);
        if (!u) return fail("Not found");
        Object.assign(u, {
          displayName: p.displayName ?? u.displayName,
          role: p.role ?? u.role,
          classAssigned: p.classAssigned ?? u.classAssigned,
          subjects: p.subjects ?? u.subjects,
          active: p.active !== undefined ? p.active : u.active
        });
        return ok(publicUser(u));
      }
      case "users.resetPassword": {
        requirePrincipal(user);
        const u = db.users.find((x) => x.id === p.id);
        if (!u) return fail("Not found");
        u.password = p.password || "ChangeMe@123";
        return ok(publicUser(u));
      }
      case "users.disable": {
        requirePrincipal(user);
        const u = db.users.find((x) => x.id === p.id);
        if (!u) return fail("Not found");
        u.active = false;
        return ok(publicUser(u));
      }

      case "services.list":
        return ok(p.includeInactive ? db.services : db.services.filter((s) => s.active !== false));
      case "services.save": {
        requirePrincipal(user);
        if (p.id) {
          const s = db.services.find((x) => x.id === p.id);
          Object.assign(s, {
            name: p.name,
            cost: Number(p.cost) || 0,
            costType: p.costType || "fixed",
            billingType: p.billingType || "annual",
            classes: p.classes || [],
            active: p.active !== false
          });
          return ok(s);
        }
        const ns = {
          id: uid("svc"),
          name: p.name,
          cost: Number(p.cost) || 0,
          costType: p.costType || "fixed",
          billingType: p.billingType || "annual",
          classes: p.classes || CONFIG.classes,
          active: true,
          academicYear: db.settings.academicYear
        };
        db.services.push(ns);
        return ok(ns);
      }

      case "students.list": {
        let rows = db.students.filter((s) => s.active !== false);
        if (!p.includeAllStatuses) rows = rows.filter((s) => s.status === "Active" || !s.status);
        if (p.className) rows = rows.filter((s) => s.className === p.className);
        if (p.status) rows = rows.filter((s) => s.status === p.status);
        if (p.q) {
          const q = String(p.q).toLowerCase();
          rows = rows.filter(
            (s) =>
              s.name.toLowerCase().includes(q) ||
              String(s.admissionNo).toLowerCase().includes(q) ||
              String(s.phone).includes(q)
          );
        }
        return ok(rows);
      }
      case "students.get": {
        const s = db.students.find((x) => x.id === p.id);
        if (!s) return fail("Student not found");
        const opted = studentServices(db, s.id);
        const paidTotal = studentPayments(db, s.id).reduce((a, x) => a + Number(x.amount), 0);
        return ok({ ...s, optedServices: opted, balance: balance(db, s), paidTotal });
      }
      case "students.create": {
        requirePrincipal(user);
        db.settings.admissionSeq = (db.settings.admissionSeq || 1000) + 1;
        const admissionNo = p.admissionNo || "SVS26" + String(db.settings.admissionSeq);
        const s = {
          id: uid("stu"),
          admissionNo,
          name: p.name,
          parentName: p.parentName || "",
          parentName2: p.parentName2 || "",
          phone: phone(p.phone),
          phone2: phone(p.phone2),
          dob: p.dob || "",
          gender: p.gender || "",
          address: p.address || "",
          photoUrl: p.photoUrl || "",
          bloodGroup: p.bloodGroup || "",
          className: p.className,
          section: p.section || "A",
          admissionDate: p.admissionDate || today(),
          annualFee: Number(p.annualFee) || CONFIG.classFees[p.className] || 0,
          concession: Number(p.concession) || 0,
          concessionReason: p.concessionReason || "",
          previousBalance: Number(p.previousBalance) || 0,
          payByDate: p.payByDate || "",
          status: "Active",
          siblingGroupId: p.siblingGroupId || "",
          academicYear: db.settings.academicYear,
          active: true,
          createdAt: now(),
          updatedAt: now()
        };
        db.students.push(s);
        (p.services || []).forEach((svc) => {
          db.studentServices.push({
            id: uid("ssv"),
            studentId: s.id,
            serviceId: svc.serviceId || "",
            serviceName: svc.serviceName || svc.name,
            cost: Number(svc.cost) || 0,
            routeId: svc.routeId || "",
            academicYear: db.settings.academicYear,
            active: true
          });
        });
        (p.installments || []).forEach((inst) => {
          db.installments.push({
            id: uid("ins"),
            studentId: s.id,
            label: inst.label,
            dueDate: inst.dueDate,
            amount: Number(inst.amount) || 0,
            paidAmount: 0,
            status: "pending",
            academicYear: db.settings.academicYear,
            active: true
          });
        });
        audit(db, user, "student.create", "Students", s.id);
        return dispatch(db, "students.get", { token: p.token, id: s.id });
      }
      case "students.update": {
        requirePrincipal(user);
        const s = db.students.find((x) => x.id === p.id);
        if (!s) return fail("Not found");
        Object.assign(s, {
          name: p.name ?? s.name,
          parentName: p.parentName ?? s.parentName,
          parentName2: p.parentName2 ?? s.parentName2,
          phone: p.phone != null ? phone(p.phone) : s.phone,
          phone2: p.phone2 != null ? phone(p.phone2) : s.phone2,
          dob: p.dob ?? s.dob,
          gender: p.gender ?? s.gender,
          address: p.address ?? s.address,
          bloodGroup: p.bloodGroup ?? s.bloodGroup,
          className: p.className ?? s.className,
          section: p.section ?? s.section,
          annualFee: p.annualFee != null ? Number(p.annualFee) : s.annualFee,
          concession: p.concession != null ? Number(p.concession) : s.concession,
          concessionReason: p.concessionReason ?? s.concessionReason,
          previousBalance: p.previousBalance != null ? Number(p.previousBalance) : s.previousBalance,
          payByDate: p.payByDate ?? s.payByDate,
          status: p.status ?? s.status,
          siblingGroupId: p.siblingGroupId ?? s.siblingGroupId,
          updatedAt: now()
        });
        if (p.services) {
          db.studentServices.forEach((x) => {
            if (x.studentId === s.id) x.active = false;
          });
          p.services.forEach((svc) => {
            db.studentServices.push({
              id: uid("ssv"),
              studentId: s.id,
              serviceId: svc.serviceId || "",
              serviceName: svc.serviceName || svc.name,
              cost: Number(svc.cost) || 0,
              routeId: svc.routeId || "",
              academicYear: db.settings.academicYear,
              active: true
            });
          });
        }
        return dispatch(db, "students.get", { token: p.token, id: s.id });
      }

      case "enquiries.list":
        requirePrincipal(user);
        return ok(db.enquiries.filter((e) => !p.status || e.status === p.status));
      case "enquiries.create": {
        requirePrincipal(user);
        const e = {
          id: uid("enq"),
          name: p.name,
          phone: phone(p.phone),
          classSought: p.classSought || "",
          followUpDate: p.followUpDate || "",
          status: "Open",
          notes: p.notes || "",
          convertedStudentId: "",
          academicYear: db.settings.academicYear,
          active: true,
          createdAt: now()
        };
        db.enquiries.push(e);
        return ok(e);
      }
      case "enquiries.update": {
        requirePrincipal(user);
        const e = db.enquiries.find((x) => x.id === p.id);
        Object.assign(e, p, { phone: p.phone != null ? phone(p.phone) : e.phone });
        return ok(e);
      }
      case "enquiries.convert": {
        requirePrincipal(user);
        const e = db.enquiries.find((x) => x.id === p.id);
        const created = dispatch(db, "students.create", {
          token: p.token,
          name: (p.student && p.student.name) || e.name,
          phone: (p.student && p.student.phone) || e.phone,
          className: (p.student && p.student.className) || e.classSought,
          annualFee: (p.student && p.student.annualFee) || CONFIG.classFees[e.classSought] || 20000,
          parentName: (p.student && p.student.parentName) || "",
          services: (p.student && p.student.services) || []
        });
        if (!created.ok) return created;
        e.status = "Converted";
        e.convertedStudentId = created.data.id;
        return created;
      }

      case "fees.collect": {
        requirePrincipal(user);
        const student = db.students.find((x) => x.id === p.studentId);
        if (!student) return fail("Student not found");
        const amount = Number(p.amount);
        if (!(amount > 0)) return fail("Invalid amount");
        db.settings.receiptSeq = (db.settings.receiptSeq || 0) + 1;
        const receiptNo = "R2627-" + String(db.settings.receiptSeq).padStart(5, "0");
        const balAfter = Math.max(0, balance(db, student) - amount);
        const row = {
          id: uid("fee"),
          receiptNo,
          studentId: student.id,
          amount,
          mode: p.mode || "Cash",
          reference: p.reference || "",
          chequeStatus: p.mode === "Cheque" ? p.chequeStatus || "Pending" : "",
          heads: p.heads || { Tuition: amount },
          balanceAfter: balAfter,
          notes: p.notes || "",
          cancelled: false,
          cancelReason: "",
          academicYear: db.settings.academicYear,
          active: true,
          createdAt: now(),
          createdBy: user.id
        };
        db.feePayments.push(row);
        let left = amount;
        db.installments
          .filter((i) => i.studentId === student.id && i.active !== false && i.status !== "paid")
          .sort((a, b) => String(a.dueDate).localeCompare(String(b.dueDate)))
          .forEach((inst) => {
            if (left <= 0) return;
            const due = Number(inst.amount) - Number(inst.paidAmount || 0);
            const pay = Math.min(due, left);
            inst.paidAmount = Number(inst.paidAmount || 0) + pay;
            inst.status = inst.paidAmount >= Number(inst.amount) ? "paid" : "partial";
            left -= pay;
          });
        audit(db, user, "fees.collect", "FeePayments", row.id, { receiptNo, amount });
        return ok({ ...row, student, school: db.settings.school });
      }
      case "fees.list":
        requirePrincipal(user);
        return ok(
          db.feePayments.filter((x) => !p.studentId || x.studentId === p.studentId)
        );
      case "fees.ledger":
        return dispatch(db, "students.get", p);
      case "fees.cancel": {
        requirePrincipal(user);
        const pay = db.feePayments.find((x) => x.id === p.id);
        if (!pay) return fail("Not found");
        pay.cancelled = true;
        pay.cancelReason = p.reason || "";
        return ok(pay);
      }
      case "fees.pending":
        requirePrincipal(user);
        {
          let list = pendingList(db);
          if (p.className) list = list.filter((x) => x.className === p.className);
          return ok(list);
        }

      case "installments.list": {
        requirePrincipal(user);
        let rows = db.installments.filter((i) => i.active !== false);
        if (p.studentId) rows = rows.filter((i) => i.studentId === p.studentId);
        if (p.overdue) {
          const t = today();
          rows = rows.filter((i) => i.status !== "paid" && i.dueDate && i.dueDate < t);
        }
        return ok(rows);
      }
      case "installments.save": {
        requirePrincipal(user);
        if (p.id) {
          const i = db.installments.find((x) => x.id === p.id);
          Object.assign(i, { label: p.label, dueDate: p.dueDate, amount: Number(p.amount) || 0 });
          return ok(i);
        }
        const row = {
          id: uid("ins"),
          studentId: p.studentId,
          label: p.label,
          dueDate: p.dueDate,
          amount: Number(p.amount) || 0,
          paidAmount: 0,
          status: "pending",
          academicYear: db.settings.academicYear,
          active: true
        };
        db.installments.push(row);
        return ok(row);
      }
      case "cheque.updateStatus": {
        requirePrincipal(user);
        const pay = db.feePayments.find((x) => x.id === p.id);
        pay.chequeStatus = p.chequeStatus;
        if (p.chequeStatus === "Bounced") {
          pay.cancelled = true;
          pay.cancelReason = p.reason || "Cheque bounced";
        }
        return ok(pay);
      }
      case "reminders.queue": {
        requirePrincipal(user);
        const pending = pendingList(db);
        const t = today();
        return ok(
          pending
            .filter((x) => x.balance > 0)
            .map((x) => ({
              studentId: x.id,
              name: x.name,
              className: x.className,
              phone: x.phone,
              parentName: x.parentName,
              balance: x.balance,
              payByDate: x.payByDate,
              reasons: [
                ...(x.payByDate && x.payByDate <= t ? ["Pay-by " + x.payByDate] : []),
                "Balance ₹" + x.balance
              ]
            }))
        );
      }

      case "attendance.get": {
        const className = p.className;
        const section = p.section || "A";
        const date = p.date || today();
        if (user.role === "Teacher" && user.classAssigned && user.classAssigned.split("-")[0] !== className) {
          return fail("Not your class", "FORBIDDEN");
        }
        const students = db.students.filter(
          (s) => s.className === className && (s.section || "A") === section && (s.status === "Active" || !s.status)
        );
        const record = db.attendance.find(
          (a) => a.className === className && a.section === section && a.date === date
        );
        return ok({
          className,
          section,
          date,
          students: students.map((s) => ({
            id: s.id,
            name: s.name,
            admissionNo: s.admissionNo,
            phone: s.phone,
            parentName: s.parentName
          })),
          record: record
            ? {
                id: record.id,
                absentIds: record.absentIds || [],
                leaveIds: record.leaveIds || [],
                presentCount: record.presentCount,
                totalCount: record.totalCount,
                notes: record.notes || ""
              }
            : null
        });
      }
      case "attendance.save": {
        const className = p.className;
        const section = p.section || "A";
        const date = p.date || today();
        if (user.role === "Teacher" && user.classAssigned && user.classAssigned.split("-")[0] !== className) {
          return fail("Not your class", "FORBIDDEN");
        }
        const students = db.students.filter(
          (s) => s.className === className && (s.section || "A") === section && (s.status === "Active" || !s.status)
        );
        const absentIds = p.absentIds || [];
        const leaveIds = p.leaveIds || [];
        const total = students.length;
        const present = total - absentIds.length - leaveIds.length;
        let record = db.attendance.find((a) => a.className === className && a.section === section && a.date === date);
        if (record) {
          Object.assign(record, { absentIds, leaveIds, presentCount: present, totalCount: total, notes: p.notes || "" });
        } else {
          record = {
            id: uid("att"),
            className,
            section,
            date,
            absentIds,
            leaveIds,
            presentCount: present,
            totalCount: total,
            markedBy: user.id,
            notes: p.notes || "",
            academicYear: db.settings.academicYear,
            active: true
          };
          db.attendance.push(record);
        }
        // persist draft clear hint
        try {
          localStorage.removeItem("svs_att_draft_" + className + "_" + date);
        } catch (e) {}
        return ok(record);
      }
      case "attendance.report": {
        let rows = db.attendance;
        if (p.className) rows = rows.filter((a) => a.className === p.className);
        if (p.studentId) {
          const totalDays = rows.length;
          let absent = 0,
            leave = 0;
          rows.forEach((r) => {
            if ((r.absentIds || []).includes(p.studentId)) absent++;
            if ((r.leaveIds || []).includes(p.studentId)) leave++;
          });
          const present = totalDays - absent - leave;
          return ok({
            studentId: p.studentId,
            totalDays,
            present,
            absent,
            leave,
            percent: totalDays ? Math.round((present / totalDays) * 1000) / 10 : 100
          });
        }
        return ok(rows);
      }
      case "staffAttendance.get":
        requirePrincipal(user);
        {
          const date = p.date || today();
          const record = db.staffAttendance.find((a) => a.date === date);
          return ok({ date, staff: db.staff.filter((s) => s.active !== false), record: record || null });
        }
      case "staffAttendance.save": {
        requirePrincipal(user);
        const date = p.date || today();
        let record = db.staffAttendance.find((a) => a.date === date);
        if (record) Object.assign(record, { absentIds: p.absentIds || [], leaveIds: p.leaveIds || [], notes: p.notes || "" });
        else {
          record = { id: uid("sat"), date, absentIds: p.absentIds || [], leaveIds: p.leaveIds || [], notes: p.notes || "" };
          db.staffAttendance.push(record);
        }
        return ok(record);
      }

      case "expenses.list":
        requirePrincipal(user);
        return ok(db.expenses.filter((e) => e.active !== false));
      case "expenses.create": {
        requirePrincipal(user);
        const row = {
          id: uid("exp"),
          date: p.date || today(),
          category: p.category || "Other",
          amount: Number(p.amount) || 0,
          mode: p.mode || "Cash",
          notes: p.notes || "",
          billRef: p.billRef || "",
          staffId: p.staffId || "",
          salaryMonth: p.salaryMonth || "",
          academicYear: db.settings.academicYear,
          active: true,
          createdAt: now()
        };
        db.expenses.push(row);
        return ok(row);
      }
      case "staff.list":
        requirePrincipal(user);
        return ok(db.staff.filter((s) => s.active !== false));
      case "staff.save": {
        requirePrincipal(user);
        if (p.id) {
          const s = db.staff.find((x) => x.id === p.id);
          Object.assign(s, p, { phone: p.phone != null ? phone(p.phone) : s.phone, salary: Number(p.salary) || s.salary });
          return ok(s);
        }
        const s = {
          id: uid("stf"),
          name: p.name,
          role: p.role || "Teacher",
          phone: phone(p.phone),
          joiningDate: p.joiningDate || "",
          salary: Number(p.salary) || 0,
          active: true
        };
        db.staff.push(s);
        return ok(s);
      }
      case "salary.pay": {
        requirePrincipal(user);
        const staff = db.staff.find((x) => x.id === p.staffId);
        const amount = Number(p.amount != null ? p.amount : staff.salary) || 0;
        const month = p.month || now().slice(0, 7);
        const exp = dispatch(db, "expenses.create", {
          token: p.token,
          date: p.date || today(),
          category: "Salaries",
          amount,
          mode: p.mode || "Bank",
          notes: "Salary " + month + " — " + staff.name,
          staffId: staff.id,
          salaryMonth: month
        });
        const sal = { id: uid("sal"), staffId: staff.id, month, amount, expenseId: exp.data.id, academicYear: db.settings.academicYear, active: true };
        db.salaries.push(sal);
        return ok({ salary: sal, expense: exp.data });
      }

      case "stock.list":
        requirePrincipal(user);
        return ok(db.stockItems.filter((s) => s.active !== false));
      case "stock.save": {
        requirePrincipal(user);
        if (p.id) {
          const s = db.stockItems.find((x) => x.id === p.id);
          Object.assign(s, p, { qty: Number(p.qty != null ? p.qty : s.qty), reorderLevel: Number(p.reorderLevel) || s.reorderLevel });
          return ok(s);
        }
        const s = {
          id: uid("stk"),
          name: p.name,
          category: p.category || "Books",
          unit: p.unit || "pcs",
          openingQty: Number(p.openingQty) || 0,
          qty: Number(p.qty != null ? p.qty : p.openingQty) || 0,
          reorderLevel: Number(p.reorderLevel) || 5,
          active: true
        };
        db.stockItems.push(s);
        return ok(s);
      }
      case "stock.move": {
        requirePrincipal(user);
        const item = db.stockItems.find((x) => x.id === p.itemId);
        const qty = Number(p.qty) || 0;
        const type = p.type || "purchase";
        if (type === "purchase") item.qty += qty;
        else item.qty -= qty;
        if (item.qty < 0) return fail("Insufficient stock");
        const mov = { id: uid("stm"), itemId: item.id, type, qty, studentId: p.studentId || "", notes: p.notes || "", date: p.date || today() };
        db.stockMovements.push(mov);
        return ok({ item, movement: mov });
      }
      case "routes.list":
        return ok(db.routes.filter((r) => r.active !== false));
      case "routes.save": {
        requirePrincipal(user);
        if (p.id) {
          const r = db.routes.find((x) => x.id === p.id);
          Object.assign(r, p);
          return ok(r);
        }
        const r = { id: uid("rte"), name: p.name, fee: Number(p.fee) || 0, active: true };
        db.routes.push(r);
        return ok(r);
      }

      case "whatsapp.log": {
        const row = {
          id: uid("msg"),
          type: p.type || "custom",
          studentId: p.studentId || "",
          phone: phone(p.phone),
          message: p.message || "",
          sentBy: user.id,
          sentAt: now(),
          academicYear: db.settings.academicYear,
          active: true
        };
        db.messageLog.push(row);
        return ok(row);
      }
      case "messages.templates":
        if (p.templates && user.role === "Principal") db.settings.whatsappTemplates = p.templates;
        return ok(db.settings.whatsappTemplates);

      case "dashboard.principal": {
        requirePrincipal(user);
        const year = db.settings.academicYear;
        const students = db.students.filter((s) => s.status === "Active" || !s.status);
        const byClass = {};
        students.forEach((s) => {
          byClass[s.className] = (byClass[s.className] || 0) + 1;
        });
        const t = today();
        const month = t.slice(0, 7);
        let collectedToday = 0,
          collectedMonth = 0,
          collectedYear = 0;
        db.feePayments
          .filter((pmt) => !pmt.cancelled)
          .forEach((pmt) => {
            const d = String(pmt.createdAt).slice(0, 10);
            const amt = Number(pmt.amount) || 0;
            if (pmt.academicYear === year) collectedYear += amt;
            if (d === t) collectedToday += amt;
            if (d.slice(0, 7) === month) collectedMonth += amt;
          });
        const pending = pendingList(db);
        const attRows = db.attendance.filter((a) => a.date === t);
        let present = 0,
          total = 0,
          absentees = 0;
        attRows.forEach((a) => {
          present += a.presentCount || 0;
          total += a.totalCount || 0;
          absentees += (a.absentIds || []).length;
        });
        const expenseMonth = db.expenses
          .filter((e) => String(e.date).slice(0, 7) === month)
          .reduce((a, e) => a + Number(e.amount), 0);
        return ok({
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
            pendingTotal: pending.reduce((a, x) => a + x.balance, 0),
            topDefaulters: pending.slice(0, 8)
          },
          expenseMonth,
          birthdays: students.filter((s) => s.dob && String(s.dob).slice(5, 10) === t.slice(5, 10)).slice(0, 10),
          enquiries: db.enquiries.filter((e) => e.status === "Open").slice(0, 5),
          lowStock: db.stockItems.filter((i) => i.qty <= (i.reorderLevel || 5)),
          reminderCount: pending.length
        });
      }
      case "dashboard.teacher": {
        const className = (user.classAssigned || "").split("-")[0] || p.className;
        const att = className
          ? dispatch(db, "attendance.get", { token: p.token, className, date: today() }).data
          : null;
        return ok({
          classAssigned: user.classAssigned,
          attendance: att,
          notices: db.notices.filter((n) => !n.className || n.className === "All" || n.className === className).slice(0, 10)
        });
      }

      case "finance.reports": {
        requirePrincipal(user);
        const year = db.settings.academicYear;
        const payments = db.feePayments.filter((x) => !x.cancelled && x.academicYear === year);
        const expenses = db.expenses.filter((e) => e.academicYear === year || !e.academicYear);
        let income = 0;
        const byMode = {},
          byMonth = {},
          byCategory = {};
        payments.forEach((x) => {
          const amt = Number(x.amount) || 0;
          income += amt;
          byMode[x.mode || "Other"] = (byMode[x.mode || "Other"] || 0) + amt;
          const m = String(x.createdAt).slice(0, 7);
          if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0 };
          byMonth[m].income += amt;
        });
        let expenseTotal = 0;
        expenses.forEach((e) => {
          const amt = Number(e.amount) || 0;
          expenseTotal += amt;
          byCategory[e.category || "Other"] = (byCategory[e.category || "Other"] || 0) + amt;
          const m = String(e.date).slice(0, 7);
          if (!byMonth[m]) byMonth[m] = { income: 0, expense: 0 };
          byMonth[m].expense += amt;
        });
        const pending = pendingList(db);
        const pendingTotal = pending.reduce((a, x) => a + x.balance, 0);
        const due = income + pendingTotal;
        return ok({
          income,
          expenses: expenseTotal,
          surplus: income - expenseTotal,
          byMode,
          byCategory,
          byMonth,
          receivables: {
            due,
            collected: income,
            pending: pendingTotal,
            efficiency: due ? Math.round((income / due) * 1000) / 10 : 100
          },
          aging: { d30: pendingTotal, d60: 0, d90: 0, d90plus: 0 },
          cashBookToday: payments.filter((x) => String(x.createdAt).slice(0, 10) === today()),
          openingCash: db.settings.openingCash,
          openingBank: db.settings.openingBank
        });
      }
      case "finance.yoy": {
        requirePrincipal(user);
        const current = dispatch(db, "finance.reports", p).data;
        const dash = dispatch(db, "dashboard.principal", p).data;
        const prevYears = {};
        db.yearSummary.forEach((h) => {
          if (h.academicYear === db.settings.academicYear) return;
          if (!prevYears[h.academicYear]) {
            prevYears[h.academicYear] = { feeCollected: 0, expenses: 0, enrollment: 0, pendingBalance: 0 };
          }
          const y = prevYears[h.academicYear];
          if (h.month === "YEAR") {
            y.feeCollected = Number(h.feeCollected) || 0;
            y.expenses = Number(h.expenses) || 0;
            y.enrollment = Number(h.enrollment) || 0;
            y.pendingBalance = Number(h.pendingBalance) || 0;
          }
        });
        const years = Object.keys(prevYears);
        const avg = { feeCollected: 0, expenses: 0, enrollment: 0, pendingBalance: 0 };
        years.forEach((yk) => {
          avg.feeCollected += prevYears[yk].feeCollected;
          avg.expenses += prevYears[yk].expenses;
          avg.enrollment += prevYears[yk].enrollment;
          avg.pendingBalance += prevYears[yk].pendingBalance;
        });
        if (years.length) {
          avg.feeCollected = Math.round(avg.feeCollected / years.length);
          avg.expenses = Math.round(avg.expenses / years.length);
          avg.enrollment = Math.round(avg.enrollment / years.length);
          avg.pendingBalance = Math.round(avg.pendingBalance / years.length);
        }
        return ok({
          currentYear: db.settings.academicYear,
          current: {
            feeCollected: current.income,
            expenses: current.expenses,
            pendingBalance: current.receivables.pending,
            enrollment: dash.totalStudents,
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
      case "finance.projections": {
        requirePrincipal(user);
        const yoy = dispatch(db, "finance.yoy", p).data;
        const pending = yoy.current.pendingBalance;
        const collected = yoy.current.feeCollected;
        let histRate = 0.85;
        if (yoy.averagePrevious.feeCollected) {
          const den = yoy.averagePrevious.feeCollected + yoy.averagePrevious.pendingBalance;
          if (den) histRate = yoy.averagePrevious.feeCollected / den;
        }
        const expectedYearEndCollection = collected + Math.round(pending * histRate);
        const expenseProjected = yoy.averagePrevious.expenses || yoy.current.expenses;
        return ok({
          expectedYearEndCollection,
          expectedPending: pending - Math.round(pending * histRate),
          expenseForecast: expenseProjected,
          projectedSurplus: expectedYearEndCollection - expenseProjected,
          suggestedBudget: { income: expectedYearEndCollection, expense: Math.round(expenseProjected * 1.05) },
          budget: { income: 0, expense: 0 },
          actual: { income: collected, expense: yoy.current.expenses },
          note: "Estimates based on trends and averages."
        });
      }
      case "budget.save": {
        requirePrincipal(user);
        const row = {
          id: uid("bud"),
          academicYear: db.settings.academicYear,
          category: p.category || "General",
          amount: Number(p.amount) || 0,
          type: p.type || "expense"
        };
        db.budget.push(row);
        return ok(row);
      }

      case "exams.list":
        return ok(db.exams.filter((e) => e.active !== false).sort((a, b) => a.order - b.order));
      case "exams.save": {
        requirePrincipal(user);
        if (p.id) {
          const e = db.exams.find((x) => x.id === p.id);
          Object.assign(e, p);
          return ok(e);
        }
        const e = {
          id: uid("ex"),
          name: p.name,
          weight: Number(p.weight) || 0,
          maxMarks: Number(p.maxMarks) || 100,
          order: Number(p.order) || db.exams.length + 1,
          active: true,
          academicYear: db.settings.academicYear
        };
        db.exams.push(e);
        return ok(e);
      }
      case "marks.get": {
        const students = db.students.filter((s) => s.className === p.className && (s.status === "Active" || !s.status));
        const marks = db.marks.filter(
          (m) => m.className === p.className && (!p.subject || m.subject === p.subject) && (!p.examId || m.examId === p.examId)
        );
        return ok({ students, marks });
      }
      case "marks.save": {
        if (user.role === "Teacher" && (user.subjects || []).length && !(user.subjects || []).includes(p.subject)) {
          return fail("Not your subject", "FORBIDDEN");
        }
        (p.entries || []).forEach((e) => {
          let m = db.marks.find((x) => x.studentId === e.studentId && x.subject === p.subject && x.examId === p.examId);
          if (m) {
            m.marks = e.marks === "" || e.marks == null ? "" : Number(e.marks);
            m.maxMarks = Number(p.maxMarks) || 100;
          } else {
            db.marks.push({
              id: uid("mrk"),
              studentId: e.studentId,
              className: p.className,
              subject: p.subject,
              examId: p.examId,
              examName: p.examName,
              marks: e.marks === "" || e.marks == null ? "" : Number(e.marks),
              maxMarks: Number(p.maxMarks) || 100,
              academicYear: db.settings.academicYear,
              active: true
            });
          }
        });
        return ok(true);
      }
      case "reportcards.get": {
        const className = p.className;
        let students = db.students.filter((s) => s.className === className && (s.status === "Active" || !s.status));
        if (p.studentId) students = students.filter((s) => s.id === p.studentId);
        const exams = db.exams.filter((e) => e.active !== false).sort((a, b) => a.order - b.order);
        const isEarly = ["Nursery", "LKG", "UKG"].includes(className);
        const subjectList = CONFIG.subjectsByClass[className] || ["English", "Mathematics"];
        const cards = students.map((stu) => {
          const rows = subjectList.map((subj) => {
            const byExam = {};
            let total = 0,
              maxTotal = 0;
            exams.forEach((ex) => {
              const m = db.marks.find((x) => x.studentId === stu.id && x.subject === subj && x.examId === ex.id);
              const marks = m && m.marks !== "" && m.marks != null ? Number(m.marks) : null;
              byExam[ex.name] = marks;
              if (marks != null) {
                total += marks;
                maxTotal += Number(m.maxMarks || ex.maxMarks || 100);
              }
            });
            const pct = maxTotal ? Math.round((total / maxTotal) * 1000) / 10 : null;
            let grade = "";
            if (isEarly) grade = pct == null ? "" : pct >= 75 ? "Excellent" : pct >= 50 ? "Good" : "Needs Improvement";
            else if (pct != null) grade = gradeFor(pct);
            return { subject: subj, exams: byExam, total: maxTotal ? total : null, maxTotal: maxTotal || null, grade };
          });
          let overallTotal = 0,
            overallMax = 0;
          rows.forEach((r) => {
            if (r.total != null) {
              overallTotal += r.total;
              overallMax += r.maxTotal;
            }
          });
          const overallPct = overallMax ? Math.round((overallTotal / overallMax) * 1000) / 10 : null;
          return {
            student: stu,
            attendancePercent: null,
            isSkillBased: isEarly,
            subjects: rows,
            summary: {
              total: overallMax ? overallTotal : null,
              max: overallMax || null,
              percent: overallPct,
              grade: isEarly
                ? overallPct == null
                  ? ""
                  : overallPct >= 75
                    ? "Excellent"
                    : overallPct >= 50
                      ? "Good"
                      : "Needs Improvement"
                : overallPct != null
                  ? gradeFor(overallPct)
                  : "",
              result: overallPct == null ? "" : overallPct >= 35 ? "Pass" : "Fail"
            }
          };
        });
        return ok({ className, exams, school: db.settings.school, cards });
      }

      case "promote.run": {
        requirePrincipal(user);
        const year = db.settings.academicYear;
        const parts = year.split("-");
        const nextYear = p.nextYear || `${Number(parts[0]) + 1}-${String(Number(parts[1]) + 1).slice(-2)}`;
        const order = CONFIG.classes;
        const exceptions = p.exceptions || {};
        const results = [];
        db.students
          .filter((s) => (s.status === "Active" || !s.status) && s.academicYear === year)
          .forEach((s) => {
            const ex = exceptions[s.id];
            if (ex === "withdrawn") {
              s.status = "Withdrawn";
              results.push({ id: s.id, action: "withdrawn" });
              return;
            }
            if (s.className === "10" || ex === "passed_out") {
              s.status = "Passed out";
              results.push({ id: s.id, action: "passed_out" });
              return;
            }
            if (ex === "detained") {
              results.push({ id: s.id, action: "detained" });
              return;
            }
            const idx = order.indexOf(s.className);
            const nextClass = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : s.className;
            const bal = balance(db, s);
            s.status = "Promoted";
            const ns = {
              ...s,
              id: uid("stu"),
              className: nextClass,
              previousBalance: bal,
              academicYear: nextYear,
              status: "Active",
              createdAt: now()
            };
            db.students.push(ns);
            results.push({ id: s.id, action: "promoted", to: nextClass, newId: ns.id });
          });
        return ok({ nextYear, results });
      }
      case "year.close": {
        requirePrincipal(user);
        const year = db.settings.academicYear;
        const parts = year.split("-");
        const nextYear = p.nextYear || `${Number(parts[0]) + 1}-${String(Number(parts[1]) + 1).slice(-2)}`;
        const fin = dispatch(db, "finance.reports", p).data;
        const dash = dispatch(db, "dashboard.principal", p).data;
        db.yearSummary.push({
          id: uid("ys"),
          academicYear: year,
          month: "YEAR",
          feeCollected: fin.income,
          expenses: fin.expenses,
          enrollment: dash.totalStudents,
          pendingBalance: fin.receivables.pending,
          notes: "Auto closed"
        });
        db.settings.academicYear = nextYear;
        return ok({ closed: year, opened: nextYear });
      }

      case "timetable.get":
        return ok(db.timetable.filter((t) => !p.className || t.className === p.className));
      case "timetable.save": {
        requirePrincipal(user);
        if (p.replace && p.className) {
          db.timetable = db.timetable.filter((t) => t.className !== p.className);
        }
        const saved = (p.slots || [p]).map((slot) => {
          const row = {
            id: uid("tt"),
            className: slot.className || p.className,
            section: slot.section || "A",
            day: slot.day,
            period: slot.period,
            subject: slot.subject,
            teacherId: slot.teacherId || "",
            academicYear: db.settings.academicYear,
            active: true
          };
          db.timetable.push(row);
          return row;
        });
        return ok(saved);
      }
      case "notices.list":
        return ok(
          db.notices.filter((n) => !p.className || !n.className || n.className === "All" || n.className === p.className)
        );
      case "notices.create": {
        const row = {
          id: uid("ntc"),
          title: p.title,
          body: p.body || "",
          className: p.className || "All",
          type: p.type || "notice",
          date: p.date || today(),
          academicYear: db.settings.academicYear,
          active: true
        };
        db.notices.push(row);
        return ok(row);
      }

      case "certificates.issue": {
        requirePrincipal(user);
        db.settings.certSeq = (db.settings.certSeq || 0) + 1;
        const prefix = p.type === "TC" ? "TC" : p.type === "ID" ? "ID" : "BN";
        const certNo = `${prefix}-26-${String(db.settings.certSeq).padStart(4, "0")}`;
        const student = db.students.find((x) => x.id === p.studentId);
        const row = {
          id: uid("cer"),
          certNo,
          type: p.type || "Bonafide",
          studentId: student.id,
          issueDate: p.issueDate || today(),
          data: p.data || {},
          academicYear: db.settings.academicYear,
          active: true,
          createdAt: now()
        };
        db.certificates.push(row);
        return ok({ ...row, student, school: db.settings.school });
      }
      case "certificates.list":
        requirePrincipal(user);
        return ok(db.certificates.filter((c) => !p.studentId || c.studentId === p.studentId));

      case "import.students": {
        requirePrincipal(user);
        const created = [];
        (p.rows || []).forEach((r) => {
          const res = dispatch(db, "students.create", { token: p.token, ...r });
          if (res.ok) created.push(res.data);
        });
        return ok({ imported: created.length, students: created });
      }
      case "import.yearSummary": {
        requirePrincipal(user);
        const saved = (p.rows || []).map((r) => {
          const row = {
            id: uid("ys"),
            academicYear: r.academicYear,
            month: r.month || "YEAR",
            feeCollected: Number(r.feeCollected) || 0,
            expenses: Number(r.expenses) || 0,
            enrollment: Number(r.enrollment) || 0,
            pendingBalance: Number(r.pendingBalance) || 0,
            notes: r.notes || ""
          };
          db.yearSummary.push(row);
          return row;
        });
        return ok(saved);
      }
      case "backup.trigger":
        requirePrincipal(user);
        return ok({ name: "demo_backup_" + today(), note: "Demo mode: data is in localStorage (" + KEY + ")" });
      case "audit.list":
        requirePrincipal(user);
        return ok(db.auditLog.slice(0, p.limit || 200));

      default:
        return fail("Unknown action: " + action, "NOT_FOUND");
    }
  }

  function reset() {
    localStorage.removeItem(KEY);
  }

  return { handle, reset, KEY };
})();
