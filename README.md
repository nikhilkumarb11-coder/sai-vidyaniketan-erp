# Sai Vidyaniketan School ERP

Professional school ERP for Nursery–10th: students, fees, attendance, exams, WhatsApp click-to-send, expenses, stock, finance reports, and year-end promotion.

**Stack:** GitHub Pages (static HTML/CSS/JS) + Google Apps Script + Google Sheets.

---

## Install as an app (PWA)

On phone or desktop (Chrome / Edge / Safari):

1. Open the live site over **HTTPS** (GitHub Pages).
2. Tap **Install app** (or browser menu → Install / Add to Home Screen).
3. The ERP opens fullscreen like a native app.

Service worker caches the UI shell for faster reloads. Live data still comes from Apps Script.

## Quick start (demo mode)

1. Open `index.html` in a browser (or serve the folder with any static server).
2. Sign in:
   - **Principal:** `admin` / `Admin@123`
   - **Teacher:** `teacher1` / `Teacher@123`

Demo data is stored in `localStorage` (`svs_erp_demo_v1`). Reset from **Settings → Reset demo data**.

No Google account is required for demo mode (`CONFIG.demoMode: true` in `config.js`).

---

## Production setup (new school)

### A. Google Sheet + Apps Script

1. Create a Google Spreadsheet owned by the school account.
2. **Extensions → Apps Script**. Delete the default file.
3. Copy every file from the `gas/` folder into the Apps Script project (same names: `Code.gs`, `Utils.gs`, `Auth.gs`, `CoreSync.gs`, `Setup.gs`, `Students.gs`, `Fees.gs`, `Attendance.gs`, `Ops.gs`, `Finance.gs`, `Academics.gs`, plus `appsscript.json`).
4. Select `setup` in the function dropdown and **Run**. Authorize when prompted.
5. **Deploy → New deployment → Web app**
   - Execute as: **Me**
   - Who has access: **Anyone** (anonymous)
6. Copy the web app URL.

Default Principal after setup: `admin` / `Admin@123` — change immediately.

### B. Frontend (GitHub Pages)

1. Copy this repository (or fork).
2. Edit **only** [`config.js`](config.js):
   - `apiUrl` → paste the Apps Script web app URL
   - `demoMode` → `false`
   - school name, address, logo path, colors, classes, fees, etc.
3. School logo lives at `assets/logo.jpg` (update `CONFIG.school.logo` if you change the filename).
4. Enable GitHub Pages (root or `/docs`).
5. Log in as Principal and create teacher accounts under **Users**.

Updating the app later: replace app files while keeping the school’s own `config.js` and logo.

---

## Roles

| Role | Access |
|------|--------|
| Principal | Everything (fees, finance, settings, users, …) |
| Teacher | Attendance (own class), marks (own subjects), students list, notices |

Role checks are enforced in Apps Script (and mirrored in the demo API).

---

## Modules

Toggle under **Settings**: Transport, Stock, Exams, WhatsApp, Expenses, Staff, Certificates, Timetable.

Extra capabilities included beyond the base PRD:

- Fee installment plans on admission
- Reminder queue (due / overdue)
- Cheque status (Pending / Cleared / Bounced)
- Attendance substitute note + local draft for flaky Wi‑Fi
- Sibling group ID on student profile
- CSV import (students + year summaries)
- Certificate number series (Bonafide / TC / ID)

---

## Project layout

```
config.js          # school-specific config (edit for each school)
index.html
css/               # theme + app styles
js/                # SPA (api, demo, auth, router, pages)
assets/logo.jpg
gas/               # Apps Script backend
README.md
Sai_Vidyaniketan_School_ERP_PRD.md
```

---

## Acceptance checklist (manual)

1. Principal and Teacher logins; Teacher cannot open Fees / Finance / Settings.
2. Admit a student with fee + services; search finds them.
3. Collect fee → numbered receipt; balance updates; concurrent-safe via LockService in production.
4. Mark class attendance in one save; WhatsApp absentees.
5. Toggle a module off → menu hidden; data preserved.
6. Dashboard shows enrollment and pending fees.
7. Finance shows YoY (after year summary data) and projections.
8. Changing only `config.js` retargets the app for another school.
