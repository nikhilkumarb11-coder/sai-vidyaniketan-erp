# Product Requirements Document (PRD)
## School ERP Web App: Sai Vidyaniketan School

| | |
|---|---|
| **Version** | 1.0 (Final) |
| **Date** | 23 October 2026 |
| **School** | Sai Vidyaniketan, Jaipuri Colony, Nagole, Hyderabad-68 |
| **Motto** | Knowledge is Wisdom |
| **Scope** | Nursery to 10th class, ~250+ students |
| **Hosting** | GitHub Pages (front end) + Google Sheets (database) via Google Apps Script (API) |

---

## 1. Purpose and Goals

Build a professional, elegant, single web app that acts as the school's end-to-end ERP: student records, fee collection, attendance, exams and report cards, WhatsApp communication, expenses and full financial reporting.

**Goals**
1. Replace paper registers and scattered spreadsheets with one system.
2. Fast, lag-free and seamless for multiple simultaneous users.
3. Equally good on desktop and mobile (UI adapts automatically).
4. **Replicable for any other school** by changing only the database link and school settings in one `config.js` file, with no other tools.
5. Give the Principal complete financial visibility, including comparisons and projections.

**Non-goals (v1):** parent login portal, online payment gateway, automated bulk WhatsApp via paid API, biometric attendance.

---

## 2. Users and Roles

Single login page, individual accounts, role-based access.

| Role | Access |
|---|---|
| **Principal (Admin)** | Everything: students, fees, expenses, finance, staff, settings, modules/services, users, reports, backups |
| **Teacher** | Attendance (own class), marks entry (own subjects), view student list, notices. **No** access to fees, expenses, finance or settings |

Rules: role checks are enforced on the server (Apps Script), not just hidden in the UI. Every change is recorded in an audit log.

---

## 3. Architecture

- **Front end:** static HTML/CSS/JS hosted on GitHub Pages. Responsive layout.
- **Backend/API:** one Google Apps Script web app bound to the school's Google Sheet.
- **Database:** Google Sheet (private, owned by the school).
- **Auth:** username + password (stored as salted hashes), session token validated on every request, role verified server-side.
- **Performance design**
  - Load reference data once at login and cache it on the client.
  - Batch reads and writes; save attendance in one call per class.
  - Server-side caching (CacheService) for frequently read data.
  - Locking (LockService) to prevent two users overwriting each other, particularly for receipt numbers and fee posting.
  - Attendance stored efficiently (see data model) to keep the sheet small.
- **Setup automation:** a `setup()` function in the backend creates all tabs, headers, default settings and the first Principal account on first run.

---

## 4. Replicability: `config.js`

The only file edited to deploy for a new school. Nothing school-specific is hard-coded elsewhere.

```js
// config.js (structure)
const CONFIG = {
  apiUrl: "PASTE_APPS_SCRIPT_WEB_APP_URL",
  school: { name, shortName, address, phone, email, motto, logo: "logo.png", academicYear },
  theme: { primary, dark, accent, background, headingFont, bodyFont },
  classes: ["Nursery","LKG","UKG","1","2", ... ,"10"],
  sections: ["A"],
  subjectsByClass: { ... },
  feeHeads: ["Tuition","Books","Uniform"],
  lateFine: { enabled: false, type: "flat", amount: 0 },
  grading: [{ min: 90, grade: "A+" }, ...],
  exams: [{ name: "Slip Test 1", weight }, { name: "Slip Test 2", weight }, { name: "Final Exam", weight }],
  whatsappTemplates: { feeReminder, absentee, event, complaint },
  receipt: { header, footer, signatureLabel },
  reportCard: { footerText, remarksLabels },
  modulesDefault: { transport: false, stock: true, exams: true, ... }
};
```

`config.js` provides **defaults** for a new school. After launch, the Principal's in-app settings (stored in the Settings tab) take over.

**New-school setup steps**
1. Create a Google Sheet, open Apps Script, paste backend code, run `setup()`, deploy as Web App.
2. Copy the GitHub repo; edit `config.js` (web app link, school name, logo, colors, classes).
3. Enable GitHub Pages.
4. Log in as Principal and add teacher users.

Updating the app later means replacing app files while keeping the school's own `config.js` and `logo.png`.

---

## 5. Design and Theme (from school logo)

Logo colors: azure blue ring, cream centre, crimson lotus and ribbon, deep navy-teal outlines.

| Token | Color | Use |
|---|---|---|
| Primary | Azure `#1F8FD0` | Buttons, active items, links |
| Dark | Deep Navy `#0E3A5F` | Sidebar, headers, headings |
| Accent | Crimson `#C62F45` | Alerts, pending fees, key actions |
| Background | Cream `#FBF3E4` | Page background |
| Surface | White `#FFFFFF` | Cards, tables |
| Success / Warning | `#2E9E6B` / `#E0A030` | Paid, present / partial |

**Fonts:** Playfair Display (headings), Inter or Poppins (body, tables).
**Implementation:** colors as CSS variables read from `config.js`.

**Layouts**
- **Desktop:** navy sidebar with logo, cream workspace, white rounded cards with soft shadows.
- **Mobile:** azure top bar with logo, bottom navigation, card-style lists, large tap targets, no horizontal scrolling.
- **Login:** logo on a navy-to-azure gradient with the motto.
- **Print documents (receipts, report cards, certificates):** logo header, school address, navy headings, crimson ribbon footer with the motto.

---

## 6. Functional Requirements

### 6.1 Setup and Administration (Principal only)
- Academic year management, with year close and archive (history is never overwritten).
- Classes (Nursery to 10th), sections, subjects per class.
- Class-teacher and subject-teacher mapping.
- User management: create, disable, reset password for Principal/Teacher accounts.
- **Modules and Services settings screen**
  - On/off switches: Transport, Stock, Exams and Report Cards, WhatsApp, Expenses, Staff/Salary, Certificates, Timetable.
  - **Service catalog:** add, edit or disable any service (Books, Uniform, Transport, Lab, Sports, Diary, ID card, etc.), each with name, cost (fixed or per class), type (one-time or annual), and applicable classes.
  - Disabling a module or service hides it from menus, forms, dashboard and reports. Existing data is kept and reappears when re-enabled. Services already assigned to a student stay on that student's fee record.

### 6.2 Student Admission and Profile
- Fields: admission number (auto), student name, parent/guardian name(s), primary and secondary phone, DOB, gender, address, photo, blood group, class admitted, section, admission date.
- **Fee accepted** (annual fee agreed for the student) and any concession with reason.
- **Services opted** with cost (Books, Uniform and any enabled service; Transport with route if enabled).
- Search by name, admission number, phone; filter by class.
- Status: Active, Withdrawn, Passed out.
- Edit and view full student profile (fee ledger, attendance summary, marks, communications).
- **Enquiry tracking** before admission (name, phone, class sought, follow-up date, status) with one-click conversion to admission.
- **Year-end promotion:** bulk promote class-wise to the next class, with exceptions (detained, withdrawn, passed out after 10th). Fee dues carry over as previous balance.

### 6.3 Attendance
- Class-wise daily marking by Teacher (own class) or Principal (any class).
- Default all present; mark absentees; leave option.
- One save per class per day; editable by Principal.
- Reports: daily class summary, monthly register, student-wise attendance %, low-attendance list.
- Staff attendance (Principal).
- "Message absentees" shortcut straight to WhatsApp (see 6.6).

### 6.4 Fee Collection (Principal only)
- **Annual fee** per student = class/agreed fee + services - concessions.
- Part-payments allowed any number of times during the year; running balance maintained.
- Optional "pay by" date per student for reminders; optional late fine (off by default).
- Payment modes: Cash, UPI, Cheque, Other, with reference number.
- **Receipts:** auto-numbered, printable/PDF, with logo, student details, amount, mode, balance after payment.
- Student fee ledger; previous-year balance carried forward.
- Pending fee list (class-wise, defaulters), filter and export.
- Cancel/reverse a payment only by Principal, with reason and audit entry.

### 6.5 Exams and Report Cards
- Exams: Slip Test 1, Slip Test 2, Final Exam (names and weightage configurable).
- Marks entry by subject and class (Teacher for own subjects, Principal for all); max marks per subject/exam.
- Auto totals, percentage, grade (from grading scale), result, optional rank.
- Class-wise result sheet; subject-wise analysis.
- **Report card format (custom, designed for this app)**
  - Header: logo, school name, address, academic year.
  - Student block: name, class, admission no., parent name, attendance %.
  - Marks table: subject-wise Slip Test 1, Slip Test 2, Final Exam, total, grade.
  - Summary: overall total, percentage, grade, rank (optional), result (Pass/Promoted).
  - Remarks: teacher's and principal's remarks, signature spaces.
  - Footer: crimson ribbon with the motto.
  - **Nursery to UKG version:** skill-based grading (Excellent / Good / Needs Improvement), no marks.
- Print/PDF single card or whole class.

### 6.6 WhatsApp Communication
- Click-to-send `wa.me` links with pre-filled messages (free; no paid API in v1).
- Message types: **Fee reminder, Absentee alert, Event, Complaint, Custom.**
- Editable templates with placeholders (student name, parent name, class, balance, date).
- Select recipients by class, defaulters, absentees today, or individual.
- "Next parent" queue to send quickly one after another.
- Message log (who, what, when, by whom).
- Indian phone numbers normalized to international format automatically.

### 6.7 Expenses and Staff
- Expense entry: date, category, amount, mode, notes, optional bill photo/reference.
- Categories configurable by admin.
- Staff records (teachers and others): details, joining date, salary.
- Salary payments recorded as expenses automatically.
- Expense reports by category and period.

### 6.8 Stock: Books and Uniforms (if enabled)
- Items, opening stock, purchases, issue to student (linked to student's service), balance.
- Low-stock flag on dashboard.

### 6.9 Timetable, Notices, Certificates
- Class timetable (periods, subjects, teachers).
- Notice board and simple homework notes by class.
- Certificates (printable with logo): Bonafide, Transfer Certificate, ID card.

### 6.10 Dashboard
Role-aware. Principal sees all; Teacher sees attendance and class items only.
- Total students; **class-wise enrollment** chart.
- Today's attendance %, absentee count.
- Fee collected today / this month / this year.
- **Pending fee balance**, class-wise pending, top defaulters.
- Collection vs. expense (monthly).
- Upcoming birthdays, recent enquiries, low-stock alerts (if enabled).
- Quick actions: collect fee, mark attendance, add student, send reminders.

### 6.11 Finance and Reports (Principal only)

**Auto-generated reports**
- Income by fee head, class and payment mode.
- Expenses by category, including salaries.
- Monthly and annual Income vs. Expense (surplus/deficit).
- Fee receivables: total due, collected, pending, collection efficiency %.
- Daily cash book / collection summary.
- Defaulter aging (30/60/90+ days).

**Year-over-year comparison**
- Current year vs. **average of previous academic years**, month-wise and full year.
- Charts for collection, expenses, enrollment, pending balance; ahead/behind highlights.
- Past years' data can be entered as yearly/monthly totals or imported via CSV once, so comparisons work from day one.

**Projections**
- Expected fee income from enrollment, annual fees and historical collection pattern.
- Expected year-end collection and pending balance.
- Expense forecast from past trends.
- Projected surplus/deficit and suggested next-year budget.
- Budget vs. actual (if admin sets a budget).
- Projections are estimates based on simple trends and averages; accuracy improves with more years of data.

**Full financial report**
- Printable PDF/Excel annual report: summary, income, expenses, receivables, year comparison, projections; school logo and academic year.
- Opening balances (cash and bank) set at the start of each year.

### 6.12 Data Safety
- Scheduled automatic backup of the Sheet (Apps Script trigger to a Drive copy).
- Export of any list or report to Excel/PDF.
- Audit log viewer (Principal): who changed what and when.

---

## 7. Data Model (Google Sheet tabs)

`Settings`, `Users`, `AcademicYears`, `Classes`, `Subjects`, `Services`, `Students`, `StudentServices`, `Enquiries`, `FeePayments`, `Attendance`, `StaffAttendance`, `Exams`, `Marks`, `Expenses`, `ExpenseCategories`, `Staff`, `Salaries`, `StockItems`, `StockMovements`, `Routes` (transport), `Timetable`, `Notices`, `MessageLog`, `Budget`, `YearSummary` (historical totals), `AuditLog`.

**Design notes**
- Every row has a unique ID, academic year, created/updated by and timestamp.
- **Attendance** is stored as one row per class per date with the list of absent student IDs (rather than one row per student per day), keeping the sheet small and fast.
- Records are never hard-deleted; they are marked inactive or cancelled.
- All records are tagged with the academic year so that closing the year and promotion do not alter history.

---

## 8. Non-Functional Requirements

| Area | Requirement |
|---|---|
| Performance | Screens load from cache in under 2 s; save actions confirm in under 3 s on normal internet; supports concurrent users without data overwrites |
| Scale | 250+ students now; comfortably up to ~1,500 students and several academic years |
| Responsiveness | Fully usable on mobile (360px+), tablet and desktop |
| Security | Hashed passwords, token sessions, server-side role checks, private Sheet, session timeout, no student data exposed publicly |
| Privacy | Student and parent data limited to authorized users |
| Reliability | Backups, audit log, locking on financial writes |
| Usability | Minimal clicks for daily tasks (attendance, fee receipt); clear status colors; confirmations on destructive actions |
| Maintainability | Modular code; all school settings in `config.js` and Settings tab |
| Browser support | Latest Chrome, Edge, Safari, Firefox |

---

## 9. Phasing

| Phase | Scope |
|---|---|
| **Phase 1** | Login and roles, setup, Modules and Services settings, admissions and student profiles, enquiries, annual fee collection with receipts, class-wise attendance, `config.js` structure, theme |
| **Phase 2** | WhatsApp communication, expenses and staff/salary, stock, transport (optional), dashboard, finance reports, comparisons and projections |
| **Phase 3** | Exams and report cards, promotion and year close, timetable and notices, certificates, backup/export polish |

---

## 10. Acceptance Criteria (summary)

1. Principal and Teacher can log in with separate accounts; Teacher cannot open fee, expense, finance or settings screens (verified at the server).
2. Student admission saves name, parent, phone, class, fee, and services with cost, and appears in search immediately.
3. A fee payment generates a numbered receipt, updates the balance instantly, and two simultaneous payments never share a receipt number.
4. Attendance for a class saves in one action; absentees can be messaged via WhatsApp with one click each.
5. Toggling a module or service off hides it everywhere without deleting data; toggling on restores it.
6. Dashboard shows class-wise enrollment and pending fee balance correctly.
7. Finance reports show year-over-year comparison and projections once past data is available.
8. Changing only `config.js` (API link, name, logo, colors, classes) produces a working app for a different school.
9. UI adapts correctly between desktop and mobile with no horizontal scrolling.

---

## 11. Assumptions and Risks

- Google Apps Script and Sheets have usage quotas; at this school's scale they are sufficient, and batching keeps usage low.
- WhatsApp sending is manual click-to-send; full automation would need the paid Business API (future option).
- Free GitHub Pages serves static files only; all data operations go through Apps Script.
- Projections depend on the quality and quantity of historical data entered.
- Google account ownership and recovery of the school's Sheet must be secured by the school.

## 12. Open Items to Confirm Before/During Build

1. Subject lists per class and the grading scale (marks ranges and grades).
2. Slip test and final exam weightage, and maximum marks per subject.
3. Concession policy (sibling discount, staff-child discount) and whether late fines are used.
4. Initial service prices (books, uniform) and class-wise annual fees.
5. Past years' financial totals available for import.
6. Principal and teacher names for initial accounts.

## 13. Future Enhancements (out of scope for v1)

Parent portal and login, online fee payment, automated bulk WhatsApp/SMS via API, biometric attendance, multi-branch support.
