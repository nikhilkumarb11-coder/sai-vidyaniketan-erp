/**
 * Exams, marks, report cards, promotion, year close
 */

function examsList(payload, user) {
  return ok_(
    readAllObjects_("Exams")
      .filter(function (e) { return isTruthy_(e.active); })
      .sort(function (a, b) { return Number(a.order) - Number(b.order); })
  );
}

function examsSave(payload, user) {
  requireRole_(user, ["Principal"]);
  var data = {
    name: payload.name,
    weight: Number(payload.weight) || 0,
    maxMarks: Number(payload.maxMarks) || 100,
    order: Number(payload.order) || 1,
    active: payload.active === false ? "FALSE" : "TRUE",
    academicYear: currentAcademicYear_(),
    updatedBy: user.id
  };
  if (payload.id) return ok_(updateObjectById_("Exams", payload.id, data));
  data.createdBy = user.id;
  return ok_(appendObject_("Exams", data));
}

function marksGet(payload, user) {
  var className = payload.className;
  var subject = payload.subject;
  var examId = payload.examId;
  var students = readAllObjects_("Students").filter(function (s) {
    return s.className === className && (s.status === "Active" || !s.status);
  });
  if (user.role === "Teacher" && subject) {
    var subjects = parseJsonField_(user.subjects, []);
    if (subjects.length && subjects.indexOf(subject) < 0) {
      return fail_("Not your subject", "FORBIDDEN");
    }
  }
  var marks = readAllObjects_("Marks").filter(function (m) {
    return (
      isTruthy_(m.active) &&
      m.className === className &&
      (!subject || m.subject === subject) &&
      (!examId || m.examId === examId)
    );
  });
  return ok_({ students: students.map(sanitizeStudent_), marks: marks });
}

function marksSave(payload, user) {
  var className = payload.className;
  var subject = payload.subject;
  var examId = payload.examId;
  var examName = payload.examName;
  var maxMarks = Number(payload.maxMarks) || 100;
  var entries = payload.entries || [];

  if (user.role === "Teacher") {
    var subjects = parseJsonField_(user.subjects, []);
    if (subjects.length && subjects.indexOf(subject) < 0) {
      return fail_("Not your subject", "FORBIDDEN");
    }
  } else {
    requireRole_(user, ["Principal", "Teacher"]);
  }

  var year = currentAcademicYear_();
  var existing = readAllObjects_("Marks").filter(function (m) {
    return m.className === className && m.subject === subject && m.examId === examId;
  });
  var byStudent = {};
  existing.forEach(function (m) { byStudent[m.studentId] = m; });

  var saved = entries.map(function (e) {
    var data = {
      studentId: e.studentId,
      className: className,
      subject: subject,
      examId: examId,
      examName: examName,
      marks: e.marks === "" || e.marks == null ? "" : Number(e.marks),
      maxMarks: maxMarks,
      academicYear: year,
      active: "TRUE",
      updatedBy: user.id
    };
    if (byStudent[e.studentId]) {
      return updateObjectById_("Marks", byStudent[e.studentId].id, data);
    }
    data.createdBy = user.id;
    return appendObject_("Marks", data);
  });
  audit_(user, "marks.save", "Marks", "", { className: className, subject: subject, examId: examId });
  return ok_(saved);
}

function gradeFor_(pct, grading) {
  grading = grading || getSetting_("grading", []);
  for (var i = 0; i < grading.length; i++) {
    if (pct >= grading[i].min) return grading[i].grade;
  }
  return "F";
}

function reportcardsGet(payload, user) {
  var className = payload.className;
  var studentId = payload.studentId;
  var students = readAllObjects_("Students").filter(function (s) {
    return s.className === className && (s.status === "Active" || !s.status);
  });
  if (studentId) students = students.filter(function (s) { return s.id === studentId; });

  var exams = examsList({}, user).data || [];
  var allMarks = readAllObjects_("Marks").filter(function (m) {
    return isTruthy_(m.active) && m.className === className;
  });
  var isEarly = ["Nursery", "LKG", "UKG"].indexOf(className) >= 0;
  var subjects = {};
  allMarks.forEach(function (m) { subjects[m.subject] = true; });
  var subjectList = Object.keys(subjects);
  if (!subjectList.length) {
    // fallback from Subjects sheet
    subjectList = readAllObjects_("Subjects")
      .filter(function (s) { return s.className === className && isTruthy_(s.active); })
      .map(function (s) { return s.subjectName; });
  }

  var cards = students.map(function (stu) {
    var att = attendanceReport({ studentId: stu.id }, user).data || { percent: null };
    var rows = subjectList.map(function (subj) {
      var byExam = {};
      var total = 0, maxTotal = 0;
      exams.forEach(function (ex) {
        var m = allMarks.filter(function (x) {
          return x.studentId === stu.id && x.subject === subj && x.examId === ex.id;
        })[0];
        var marks = m && m.marks !== "" ? Number(m.marks) : null;
        byExam[ex.name] = marks;
        if (marks != null) {
          total += marks;
          maxTotal += Number(m.maxMarks || ex.maxMarks || 100);
        }
      });
      var pct = maxTotal ? Math.round((total / maxTotal) * 1000) / 10 : null;
      return {
        subject: subj,
        exams: byExam,
        total: maxTotal ? total : null,
        maxTotal: maxTotal || null,
        grade: isEarly ? skillGrade_(pct) : pct != null ? gradeFor_(pct) : ""
      };
    });
    var overallTotal = 0, overallMax = 0;
    rows.forEach(function (r) {
      if (r.total != null) {
        overallTotal += r.total;
        overallMax += r.maxTotal;
      }
    });
    var overallPct = overallMax ? Math.round((overallTotal / overallMax) * 1000) / 10 : null;
    return {
      student: sanitizeStudent_(stu),
      attendancePercent: att.percent,
      isSkillBased: isEarly,
      subjects: rows,
      summary: {
        total: overallMax ? overallTotal : null,
        max: overallMax || null,
        percent: overallPct,
        grade: isEarly ? skillGrade_(overallPct) : overallPct != null ? gradeFor_(overallPct) : "",
        result: overallPct == null ? "" : overallPct >= 35 ? "Pass" : "Fail"
      }
    };
  });

  // optional ranks
  if (!isEarly) {
    var ranked = cards.slice().filter(function (c) { return c.summary.percent != null; });
    ranked.sort(function (a, b) { return b.summary.percent - a.summary.percent; });
    ranked.forEach(function (c, i) { c.summary.rank = i + 1; });
  }

  return ok_({
    className: className,
    exams: exams,
    school: getSetting_("school", {}),
    cards: cards
  });
}

function skillGrade_(pct) {
  if (pct == null) return "";
  if (pct >= 75) return "Excellent";
  if (pct >= 50) return "Good";
  return "Needs Improvement";
}

function promoteRun(payload, user) {
  requireRole_(user, ["Principal"]);
  var year = currentAcademicYear_();
  var nextYear = payload.nextYear;
  if (!nextYear) {
    var parts = year.split("-");
    nextYear = String(Number(parts[0]) + 1) + "-" + String(Number(parts[1]) + 1).slice(-2);
  }
  var order = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  var exceptions = payload.exceptions || {}; // studentId -> detained|withdrawn|passed_out
  var students = readAllObjects_("Students").filter(function (s) {
    return (s.status === "Active" || !s.status) && s.academicYear === year;
  });
  var results = [];

  students.forEach(function (s) {
    var ex = exceptions[s.id];
    if (ex === "withdrawn") {
      updateObjectById_("Students", s.id, { status: "Withdrawn", updatedBy: user.id });
      results.push({ id: s.id, action: "withdrawn" });
      return;
    }
    if (ex === "detained") {
      var balDetained = studentBalance_(s);
      var detainedCopy = appendObject_("Students", {
        id: uid_("stu"),
        admissionNo: s.admissionNo,
        name: s.name,
        parentName: s.parentName,
        parentName2: s.parentName2,
        phone: s.phone,
        phone2: s.phone2,
        dob: s.dob,
        gender: s.gender,
        address: s.address,
        photoUrl: s.photoUrl || "",
        bloodGroup: s.bloodGroup,
        className: s.className,
        section: s.section || "A",
        admissionDate: s.admissionDate,
        annualFee: Number(s.annualFee) || 0,
        concession: Number(s.concession) || 0,
        concessionReason: s.concessionReason || "",
        previousBalance: balDetained,
        payByDate: "",
        status: "Active",
        siblingGroupId: s.siblingGroupId || "",
        academicYear: nextYear,
        active: "TRUE",
        createdBy: user.id,
        updatedBy: user.id
      });
      updateObjectById_("Students", s.id, { status: "Promoted", updatedBy: user.id });
      results.push({ id: s.id, action: "detained", newId: detainedCopy.id });
      return;
    }
    if (s.className === "10" || ex === "passed_out") {
      updateObjectById_("Students", s.id, { status: "Passed out", updatedBy: user.id });
      results.push({ id: s.id, action: "passed_out" });
      return;
    }
    var idx = order.indexOf(s.className);
    var nextClass = idx >= 0 && idx < order.length - 1 ? order[idx + 1] : s.className;
    var bal2 = studentBalance_(s);
    // Temporarily set year for create
    var created = appendObject_("Students", {
      id: uid_("stu"),
      admissionNo: s.admissionNo,
      name: s.name,
      parentName: s.parentName,
      parentName2: s.parentName2,
      phone: s.phone,
      phone2: s.phone2,
      dob: s.dob,
      gender: s.gender,
      address: s.address,
      photoUrl: s.photoUrl,
      bloodGroup: s.bloodGroup,
      className: nextClass,
      section: s.section || "A",
      admissionDate: s.admissionDate,
      annualFee: Number(s.annualFee) || 0,
      concession: Number(s.concession) || 0,
      concessionReason: s.concessionReason || "",
      previousBalance: bal2,
      payByDate: "",
      status: "Active",
      siblingGroupId: s.siblingGroupId || "",
      academicYear: nextYear,
      active: "TRUE",
      createdBy: user.id,
      updatedBy: user.id
    });
    updateObjectById_("Students", s.id, { status: "Promoted", updatedBy: user.id });
    results.push({ id: s.id, action: "promoted", to: nextClass, newId: created.id });
  });

  audit_(user, "promote.run", "Students", "", { nextYear: nextYear, count: results.length });
  return ok_({ nextYear: nextYear, results: results });
}

function yearClose(payload, user) {
  requireRole_(user, ["Principal"]);
  var year = currentAcademicYear_();
  var nextYear = payload.nextYear;
  if (!nextYear) {
    var parts = year.split("-");
    nextYear = String(Number(parts[0]) + 1) + "-" + String(Number(parts[1]) + 1).slice(-2);
  }

  var fin = financeReports({}, user).data;
  var dash = dashboardPrincipal({}, user).data;
  appendObject_("YearSummary", {
    id: uid_("ys"),
    academicYear: year,
    month: "YEAR",
    feeCollected: fin.income,
    expenses: fin.expenses,
    enrollment: dash.totalStudents,
    pendingBalance: fin.receivables.pending,
    notes: "Auto closed",
    createdBy: user.id,
    updatedBy: user.id
  });

  // month-wise snapshots
  Object.keys(fin.byMonth || {}).forEach(function (m) {
    appendObject_("YearSummary", {
      id: uid_("ys"),
      academicYear: year,
      month: m,
      feeCollected: fin.byMonth[m].income || 0,
      expenses: fin.byMonth[m].expense || 0,
      enrollment: dash.totalStudents,
      pendingBalance: 0,
      notes: "",
      createdBy: user.id,
      updatedBy: user.id
    });
  });

  var years = readAllObjects_("AcademicYears");
  years.forEach(function (y) {
    if (y.name === year) updateObjectById_("AcademicYears", y.id, { status: "closed", updatedBy: user.id });
  });
  appendObject_("AcademicYears", {
    id: uid_("yr"),
    name: nextYear,
    startDate: "",
    endDate: "",
    status: "open",
    openingCash: payload.openingCash != null ? payload.openingCash : getSetting_("openingCash", 0),
    openingBank: payload.openingBank != null ? payload.openingBank : getSetting_("openingBank", 0),
    createdBy: user.id,
    updatedBy: user.id
  });
  setSetting_("academicYear", nextYear);
  if (payload.openingCash != null) setSetting_("openingCash", payload.openingCash);
  if (payload.openingBank != null) setSetting_("openingBank", payload.openingBank);

  audit_(user, "year.close", "AcademicYears", "", { from: year, to: nextYear });
  return ok_({ closed: year, opened: nextYear });
}
