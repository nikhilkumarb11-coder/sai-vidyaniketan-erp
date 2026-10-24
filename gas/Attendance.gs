/**
 * Student & staff attendance
 */

function attendanceGet(payload, user) {
  var className = payload.className;
  var section = payload.section || "A";
  var date = payload.date || nowIso_().slice(0, 10);

  if (user.role === "Teacher") {
    if (user.classAssigned && user.classAssigned !== className && user.classAssigned !== className + "-" + section) {
      // allow if classAssigned matches "1" or "1-A"
      var assigned = String(user.classAssigned);
      if (assigned !== className && assigned !== className + "-" + section && assigned.indexOf(className) !== 0) {
        return fail_("Not your class", "FORBIDDEN");
      }
    }
  }

  var students = readAllObjects_("Students").filter(function (s) {
    return (
      classMatch_(s.className, className) &&
      String(s.section || "A") === String(section) &&
      (s.status === "Active" || !s.status)
    );
  });

  var rows = readAllObjects_("Attendance").filter(function (a) {
    return (
      classMatch_(a.className, className) &&
      String(a.section || "A") === String(section) &&
      String(a.date).slice(0, 10) === date
    );
  });
  var record = rows.length ? rows[0] : null;
  return ok_({
    className: className,
    section: section,
    date: date,
    students: students.map(function (s) {
      return { id: s.id, name: s.name, admissionNo: s.admissionNo, phone: s.phone, parentName: s.parentName };
    }),
    record: record
      ? {
          id: record.id,
          absentIds: parseJsonField_(record.absentIds, []),
          leaveIds: parseJsonField_(record.leaveIds, []),
          presentCount: Number(record.presentCount || 0),
          totalCount: Number(record.totalCount || 0),
          notes: record.notes || ""
        }
      : null
  });
}

function attendanceSave(payload, user) {
  var className = payload.className;
  var section = payload.section || "A";
  var date = payload.date || nowIso_().slice(0, 10);

  if (user.role === "Teacher") {
    var assigned = String(user.classAssigned || "");
    if (assigned && assigned !== className && assigned !== className + "-" + section) {
      return fail_("Not your class", "FORBIDDEN");
    }
  } else {
    requireRole_(user, ["Principal", "Teacher"]);
  }

  var students = readAllObjects_("Students").filter(function (s) {
    return (
      classMatch_(s.className, className) &&
      String(s.section || "A") === String(section) &&
      (s.status === "Active" || !s.status)
    );
  });
  var absentIds = payload.absentIds || [];
  var leaveIds = payload.leaveIds || [];
  var total = students.length;
  var present = total - absentIds.length - leaveIds.length;

  var existing = readAllObjects_("Attendance").filter(function (a) {
    return (
      classMatch_(a.className, className) &&
      String(a.section || "A") === String(section) &&
      String(a.date).slice(0, 10) === date
    );
  });

  var data = {
    className: className,
    section: section,
    date: date,
    absentIds: JSON.stringify(absentIds),
    leaveIds: JSON.stringify(leaveIds),
    presentCount: present,
    totalCount: total,
    markedBy: user.id,
    notes: payload.notes || "",
    academicYear: currentAcademicYear_(),
    active: "TRUE",
    updatedBy: user.id
  };

  var row;
  if (existing.length) {
    if (user.role !== "Principal" && existing[0].id) {
      // Teachers can update same day
    }
    row = updateObjectById_("Attendance", existing[0].id, data);
  } else {
    data.createdBy = user.id;
    row = appendObject_("Attendance", data);
  }
  audit_(user, "attendance.save", "Attendance", row.id, { className: className, date: date });
  return ok_(row);
}

function attendanceReport(payload, user) {
  var from = payload.from;
  var to = payload.to;
  var className = payload.className;
  var rows = readAllObjects_("Attendance");
  if (className) rows = rows.filter(function (a) { return a.className === className; });
  if (from) rows = rows.filter(function (a) { return String(a.date).slice(0, 10) >= from; });
  if (to) rows = rows.filter(function (a) { return String(a.date).slice(0, 10) <= to; });

  if (payload.studentId) {
    var sid = payload.studentId;
    var totalDays = rows.length;
    var absent = 0;
    var leave = 0;
    rows.forEach(function (r) {
      var abs = parseJsonField_(r.absentIds, []);
      var lev = parseJsonField_(r.leaveIds, []);
      if (abs.indexOf(sid) >= 0 || abs.indexOf(String(sid)) >= 0) absent++;
      if (lev.indexOf(sid) >= 0 || lev.indexOf(String(sid)) >= 0) leave++;
    });
    var present = totalDays - absent - leave;
    var pct = totalDays ? Math.round((present / totalDays) * 1000) / 10 : 100;
    return ok_({ studentId: sid, totalDays: totalDays, present: present, absent: absent, leave: leave, percent: pct });
  }

  return ok_(rows.map(function (r) {
    return {
      id: r.id,
      className: r.className,
      section: r.section,
      date: r.date,
      presentCount: Number(r.presentCount || 0),
      totalCount: Number(r.totalCount || 0),
      absentIds: parseJsonField_(r.absentIds, []),
      leaveIds: parseJsonField_(r.leaveIds, []),
      notes: r.notes
    };
  }));
}

function staffAttendanceGet(payload, user) {
  requireRole_(user, ["Principal"]);
  var date = payload.date || nowIso_().slice(0, 10);
  var staff = readAllObjects_("Staff").filter(function (s) { return isTruthy_(s.active); });
  var rows = readAllObjects_("StaffAttendance").filter(function (a) {
    return String(a.date).slice(0, 10) === date;
  });
  return ok_({
    date: date,
    staff: staff,
    record: rows[0]
      ? {
          id: rows[0].id,
          absentIds: parseJsonField_(rows[0].absentIds, []),
          leaveIds: parseJsonField_(rows[0].leaveIds, []),
          notes: rows[0].notes || ""
        }
      : null
  });
}

function staffAttendanceSave(payload, user) {
  requireRole_(user, ["Principal"]);
  var date = payload.date || nowIso_().slice(0, 10);
  var existing = readAllObjects_("StaffAttendance").filter(function (a) {
    return String(a.date).slice(0, 10) === date;
  });
  var data = {
    date: date,
    absentIds: JSON.stringify(payload.absentIds || []),
    leaveIds: JSON.stringify(payload.leaveIds || []),
    notes: payload.notes || "",
    academicYear: currentAcademicYear_(),
    active: "TRUE",
    updatedBy: user.id
  };
  var row;
  if (existing.length) row = updateObjectById_("StaffAttendance", existing[0].id, data);
  else {
    data.createdBy = user.id;
    row = appendObject_("StaffAttendance", data);
  }
  return ok_(row);
}
