/**
 * HTTP entry points for Sai Vidyaniketan School ERP
 */

var ACTION_MAP = {
  login: { fn: authLogin, auth: false },
  logout: { fn: authLogout, auth: true },
  bootstrap: { fn: authBootstrap, auth: true },
  "core.sync": { fn: coreSync, auth: true },

  "settings.get": { fn: settingsGet, auth: true },
  "settings.save": { fn: settingsSave, auth: true },
  "modules.get": { fn: modulesGet, auth: true },
  "modules.save": { fn: modulesSave, auth: true },

  "users.list": { fn: usersList, auth: true },
  "users.create": { fn: usersCreate, auth: true },
  "users.update": { fn: usersUpdate, auth: true },
  "users.resetPassword": { fn: usersResetPassword, auth: true },
  "users.disable": { fn: usersDisable, auth: true },

  "services.list": { fn: servicesList, auth: true },
  "services.save": { fn: servicesSave, auth: true },

  "students.list": { fn: studentsList, auth: true },
  "students.get": { fn: studentsGet, auth: true },
  "students.create": { fn: studentsCreate, auth: true },
  "students.update": { fn: studentsUpdate, auth: true },

  "enquiries.list": { fn: enquiriesList, auth: true },
  "enquiries.create": { fn: enquiriesCreate, auth: true },
  "enquiries.update": { fn: enquiriesUpdate, auth: true },
  "enquiries.convert": { fn: enquiriesConvert, auth: true },

  "fees.collect": { fn: feesCollect, auth: true },
  "fees.list": { fn: feesList, auth: true },
  "fees.ledger": { fn: feesLedger, auth: true },
  "fees.cancel": { fn: feesCancel, auth: true },
  "fees.pending": { fn: feesPending, auth: true },

  "installments.list": { fn: installmentsList, auth: true },
  "installments.save": { fn: installmentsSave, auth: true },
  "cheque.updateStatus": { fn: chequeUpdateStatus, auth: true },
  "reminders.queue": { fn: reminderQueue, auth: true },

  "attendance.get": { fn: attendanceGet, auth: true },
  "attendance.save": { fn: attendanceSave, auth: true },
  "attendance.report": { fn: attendanceReport, auth: true },
  "staffAttendance.get": { fn: staffAttendanceGet, auth: true },
  "staffAttendance.save": { fn: staffAttendanceSave, auth: true },

  "expenses.list": { fn: expensesList, auth: true },
  "expenses.create": { fn: expensesCreate, auth: true },
  "staff.list": { fn: staffList, auth: true },
  "staff.save": { fn: staffSave, auth: true },
  "salary.pay": { fn: salaryPay, auth: true },

  "stock.list": { fn: stockList, auth: true },
  "stock.save": { fn: stockSave, auth: true },
  "stock.move": { fn: stockMove, auth: true },
  "routes.list": { fn: routesList, auth: true },
  "routes.save": { fn: routesSave, auth: true },

  "whatsapp.log": { fn: whatsappLog, auth: true },
  "messages.templates": { fn: messagesTemplates, auth: true },

  "dashboard.principal": { fn: dashboardPrincipal, auth: true },
  "dashboard.teacher": { fn: dashboardTeacher, auth: true },
  "finance.reports": { fn: financeReports, auth: true },
  "finance.yoy": { fn: financeYoy, auth: true },
  "finance.projections": { fn: financeProjections, auth: true },
  "finance.overview": { fn: financeOverview, auth: true },
  "budget.save": { fn: budgetSave, auth: true },

  "exams.list": { fn: examsList, auth: true },
  "exams.save": { fn: examsSave, auth: true },
  "marks.get": { fn: marksGet, auth: true },
  "marks.save": { fn: marksSave, auth: true },
  "reportcards.get": { fn: reportcardsGet, auth: true },

  "promote.run": { fn: promoteRun, auth: true },
  "year.close": { fn: yearClose, auth: true },

  "timetable.get": { fn: timetableGet, auth: true },
  "timetable.save": { fn: timetableSave, auth: true },
  "notices.list": { fn: noticesList, auth: true },
  "notices.create": { fn: noticesCreate, auth: true },

  "certificates.issue": { fn: certificatesIssue, auth: true },
  "certificates.list": { fn: certificatesList, auth: true },

  "import.students": { fn: importStudents, auth: true },
  "import.yearSummary": { fn: importYearSummary, auth: true },
  "backup.trigger": { fn: backupTrigger, auth: true },
  "audit.list": { fn: auditList, auth: true }
};

function doGet(e) {
  return handleRequest_(e, "GET");
}

function doPost(e) {
  return handleRequest_(e, "POST");
}

function handleRequest_(e, method) {
  beginRequest_();
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      try {
        body = JSON.parse(e.postData.contents);
      } catch (err) {
        body = {};
      }
    }
    if (e && e.parameter) {
      for (var k in e.parameter) {
        if (body[k] === undefined) body[k] = e.parameter[k];
      }
    }

    var action = body.action || (e && e.parameter && e.parameter.action);
    if (!action) {
      return jsonOut_(
        ok_({
          service: "Sai Vidyaniketan School ERP",
          method: method,
          hint: "POST JSON { action, token?, ... }"
        })
      );
    }

    var route = ACTION_MAP[action];
    if (!route) return jsonOut_(fail_("Unknown action: " + action, "NOT_FOUND"));

    var user = null;
    if (route.auth) {
      try {
        user = requireUser_(body.token);
      } catch (authErr) {
        return jsonOut_(fail_(authErr.message, "AUTH"));
      }
    }

    var result = route.fn(body, user);
    return jsonOut_(result);
  } catch (err) {
    return jsonOut_(fail_(err.message || String(err), "SERVER"));
  }
}
