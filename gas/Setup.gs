/**
 * One-time setup: creates tabs, defaults, and first Principal account.
 * Run setup() from the Apps Script editor after binding to the school Sheet.
 */
function setup() {
  var ss = getSs_();
  Object.keys(SHEET_HEADERS).forEach(function (name) {
    var sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    var headers = SHEET_HEADERS[name];
    if (sh.getLastRow() === 0) {
      sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    } else {
      var existing = sh.getRange(1, 1, 1, Math.max(sh.getLastColumn(), headers.length)).getValues()[0];
      if (!existing[0]) sh.getRange(1, 1, 1, headers.length).setValues([headers]);
    }
  });

  // Remove default Sheet1 if empty and extra
  var sheet1 = ss.getSheetByName("Sheet1");
  if (sheet1 && ss.getSheets().length > 1) {
    try {
      ss.deleteSheet(sheet1);
    } catch (e) {}
  }

  var already = getSetting_("setupComplete", false);
  if (already === true || already === "true") {
    return "Setup already completed.";
  }

  var year = "2026-27";
  setSetting_("setupComplete", true);
  setSetting_("academicYear", year);
  setSetting_("school", {
    name: "Sai Vidyaniketan School",
    shortName: "SVS",
    address: "Jaipuri Colony, Nagole, Hyderabad-68",
    phone: "",
    email: "",
    motto: "Knowledge is Wisdom",
    logo: "assets/logo.svg",
    academicYear: year
  });
  setSetting_("theme", {
    primary: "#1F8FD0",
    dark: "#0E3A5F",
    accent: "#C62F45",
    background: "#FBF3E4",
    surface: "#FFFFFF",
    success: "#2E9E6B",
    warning: "#E0A030"
  });
  setSetting_("modules", {
    transport: false,
    stock: true,
    exams: true,
    whatsapp: true,
    expenses: true,
    staff: true,
    certificates: true,
    timetable: true
  });
  setSetting_("grading", [
    { min: 90, grade: "A+" },
    { min: 80, grade: "A" },
    { min: 70, grade: "B+" },
    { min: 60, grade: "B" },
    { min: 50, grade: "C" },
    { min: 35, grade: "D" },
    { min: 0, grade: "F" }
  ]);
  setSetting_("whatsappTemplates", {
    feeReminder:
      "Dear {parentName}, fee reminder for {studentName} ({class}). Outstanding balance: Rs.{balance}. - {schoolName}",
    absentee:
      "Dear {parentName}, {studentName} ({class}) was marked absent on {date}. - {schoolName}",
    event: "Dear Parent, {message} - {schoolName}",
    complaint: "Dear {parentName}, regarding {studentName}: {message} - {schoolName}",
    custom: "Dear {parentName}, {message} - {schoolName}"
  });
  setSetting_("lateFine", { enabled: false, type: "flat", amount: 0 });
  setSetting_("receiptSeq", 0);
  setSetting_("certSeq", 0);
  setSetting_("admissionSeq", 1000);

  appendObject_("AcademicYears", {
    id: uid_("yr"),
    name: year,
    startDate: "2026-04-01",
    endDate: "2027-03-31",
    status: "open",
    openingCash: 0,
    openingBank: 0,
    createdBy: "system",
    updatedBy: "system"
  });

  var classFees = {
    Nursery: 18000, LKG: 18000, UKG: 18000,
    "1": 20000, "2": 20000, "3": 22000, "4": 22000, "5": 24000,
    "6": 24000, "7": 26000, "8": 26000, "9": 28000, "10": 28000
  };
  var classNames = ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"];
  classNames.forEach(function (cn) {
    appendObject_("Classes", {
      id: uid_("cls"),
      name: cn,
      section: "A",
      classTeacherId: "",
      annualFee: classFees[cn] || 20000,
      active: "TRUE",
      academicYear: year,
      createdBy: "system",
      updatedBy: "system"
    });
  });

  appendObject_("Services", {
    id: uid_("svc"),
    name: "Books",
    cost: 2500,
    costType: "fixed",
    billingType: "annual",
    classes: JSON.stringify(classNames),
    active: "TRUE",
    academicYear: year,
    createdBy: "system",
    updatedBy: "system"
  });
  appendObject_("Services", {
    id: uid_("svc"),
    name: "Uniform",
    cost: 2000,
    costType: "fixed",
    billingType: "one-time",
    classes: JSON.stringify(classNames),
    active: "TRUE",
    academicYear: year,
    createdBy: "system",
    updatedBy: "system"
  });

  ["Slip Test 1", "Slip Test 2", "Final Exam"].forEach(function (name, idx) {
    var weights = [25, 25, 50];
    var maxes = [25, 25, 100];
    appendObject_("Exams", {
      id: uid_("ex"),
      name: name,
      weight: weights[idx],
      maxMarks: maxes[idx],
      order: idx + 1,
      active: "TRUE",
      academicYear: year,
      createdBy: "system",
      updatedBy: "system"
    });
  });

  ["Salaries", "Utilities", "Maintenance", "Supplies", "Transport", "Events", "Other"].forEach(function (name) {
    appendObject_("ExpenseCategories", {
      id: uid_("cat"),
      name: name,
      active: "TRUE",
      createdBy: "system",
      updatedBy: "system"
    });
  });

  appendObject_("Users", {
    id: uid_("usr"),
    username: "admin",
    passwordHash: storePassword_("Admin@123"),
    displayName: "Principal",
    role: "Principal",
    classAssigned: "",
    subjects: "[]",
    active: "TRUE",
    createdBy: "system",
    updatedBy: "system"
  });

  return "Setup complete. Login: admin / Admin@123 — change password after first login.";
}
