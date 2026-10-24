/**
 * School-specific configuration — the only file to edit for a new school.
 * After first launch, Principal Settings in the Sheet take precedence.
 */
const CONFIG = {
  /** Bump this whenever the phone app must drop its old cache */
  appVersion: "17",
  apiUrl: "https://script.google.com/macros/s/AKfycbwR5t_A3S-vAKmLLA-XI5S4EYCApegFuJVyQMsqD96d_M8fKPMGVhiqdhr_ptSd-DSn/exec",
  school: {
    name: "Sai Vidyaniketan School",
    shortName: "SVS",
    address: "Jaipuri Colony, Nagole, Hyderabad-68",
    phone: "",
    email: "",
    motto: "Knowledge is Wisdom",
    logo: "assets/logo.jpg",
    academicYear: "2026-27"
  },
  theme: {
    primary: "#2563EB",
    dark: "#0F172A",
    accent: "#E11D48",
    background: "#F1F5F9",
    surface: "#FFFFFF",
    success: "#059669",
    warning: "#D97706",
    headingFont: "Plus Jakarta Sans",
    bodyFont: "Plus Jakarta Sans"
  },
  /** Base path for GitHub Pages (no trailing slash). Use "" for local root hosting. */
  basePath: "/sai-vidyaniketan-erp",
  classes: ["Nursery", "LKG", "UKG", "1", "2", "3", "4", "5", "6", "7", "8", "9", "10"],
  sections: ["A"],
  subjectsByClass: {
    Nursery: ["English", "Numbers", "Rhymes", "Drawing", "EVS"],
    LKG: ["English", "Numbers", "Rhymes", "Drawing", "EVS"],
    UKG: ["English", "Numbers", "Hindi", "Drawing", "EVS"],
    "1": ["English", "Telugu", "Hindi", "Mathematics", "EVS"],
    "2": ["English", "Telugu", "Hindi", "Mathematics", "EVS"],
    "3": ["English", "Telugu", "Hindi", "Mathematics", "EVS", "Computer"],
    "4": ["English", "Telugu", "Hindi", "Mathematics", "Science", "Social", "Computer"],
    "5": ["English", "Telugu", "Hindi", "Mathematics", "Science", "Social", "Computer"],
    "6": ["English", "Telugu", "Hindi", "Mathematics", "Science", "Social", "Computer"],
    "7": ["English", "Telugu", "Hindi", "Mathematics", "Science", "Social", "Computer"],
    "8": ["English", "Telugu", "Hindi", "Mathematics", "Science", "Social", "Computer"],
    "9": ["English", "Telugu", "Hindi", "Mathematics", "Science", "Social", "Computer"],
    "10": ["English", "Telugu", "Hindi", "Mathematics", "Science", "Social", "Computer"]
  },
  classFees: {
    Nursery: 18000, LKG: 18000, UKG: 18000,
    "1": 20000, "2": 20000, "3": 22000, "4": 22000, "5": 24000,
    "6": 24000, "7": 26000, "8": 26000, "9": 28000, "10": 28000
  },
  feeHeads: ["Tuition", "Books", "Uniform"],
  lateFine: { enabled: false, type: "flat", amount: 0 },
  grading: [
    { min: 90, grade: "A+" },
    { min: 80, grade: "A" },
    { min: 70, grade: "B+" },
    { min: 60, grade: "B" },
    { min: 50, grade: "C" },
    { min: 35, grade: "D" },
    { min: 0, grade: "F" }
  ],
  exams: [
    { name: "Slip Test 1", weight: 25, maxMarks: 25 },
    { name: "Slip Test 2", weight: 25, maxMarks: 25 },
    { name: "Final Exam", weight: 50, maxMarks: 100 }
  ],
  whatsappTemplates: {
    feeReminder:
      "Dear {parentName}, fee reminder for {studentName} ({class}). Outstanding balance: Rs.{balance}. Kindly pay at the earliest. - {schoolName}",
    feeReceipt:
      "Dear {parentName}, fee receipt {receiptNo} for {studentName} ({class}). Amount paid: Rs.{amount} on {date}. Mode: {mode}. Balance: Rs.{balance}. - {schoolName}",
    absentee:
      "Dear {parentName}, {studentName} ({class}) was marked absent on {date}. Please contact the school if needed. - {schoolName}",
    event: "Dear Parent, {message} - {schoolName}",
    complaint: "Dear {parentName}, regarding {studentName}: {message} - {schoolName}",
    custom: "Dear {parentName}, {message} - {schoolName}"
  },
  receipt: {
    header: "Fee Receipt",
    footer: "Knowledge is Wisdom",
    signatureLabel: "Authorized Signatory"
  },
  reportCard: {
    footerText: "Knowledge is Wisdom",
    remarksLabels: ["Class Teacher", "Principal"]
  },
  modulesDefault: {
    enquiries: true,
    transport: false,
    stock: true,
    exams: true,
    whatsapp: true,
    expenses: true,
    staff: true,
    certificates: true,
    timetable: true
  },
  /** When true (or apiUrl is placeholder), use in-browser demo store */
  demoMode: false
};
