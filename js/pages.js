/**
 * All SPA page handlers
 */
const Pages = (() => {
  function registerAll() {
    Router.register("#/dashboard", dashboardPage);
    Router.register("#/students", studentsPage, { principalOnly: true });
    Router.register("#/enquiries", enquiriesPage, { principalOnly: true });
    Router.register("#/fees", feesPage, { principalOnly: true });
    Router.register("#/pending", (root) => feesPage(root, { tab: "pending" }), { principalOnly: true });
    Router.register("#/reminders", (root) => feesPage(root, { tab: "reminders" }), { principalOnly: true });
    Router.register("#/attendance", attendancePage);
    Router.register("#/whatsapp", whatsappPage, { principalOnly: true });
    Router.register("#/expenses", expensesPage, { principalOnly: true });
    Router.register("#/staff", staffPage, { principalOnly: true });
    Router.register("#/stock", stockPage, { principalOnly: true });
    Router.register("#/transport", transportPage, { principalOnly: true });
    Router.register("#/exams", examsPage);
    Router.register("#/reportcards", reportCardsPage);
    Router.register("#/timetable", timetablePage);
    Router.register("#/notices", noticesPage);
    Router.register("#/certificates", certificatesPage, { principalOnly: true });
    Router.register("#/finance", financePage, { principalOnly: true });
    Router.register("#/import", importPage, { principalOnly: true });
    Router.register("#/settings", settingsPage, { principalOnly: true });
    Router.register("#/users", usersPage, { principalOnly: true });
    Router.register("#/year", yearPage, { principalOnly: true });
  }

  async function dashboardPage(root) {
    if (Auth.isPrincipal()) {
      const d = await Api.call("dashboard.principal", {});
      const classes = Object.keys(d.enrollmentByClass || {});
      const max = Math.max(1, ...classes.map((c) => d.enrollmentByClass[c]));
      root.innerHTML = `
        <div class="page-header page-header-compact">
          <div>
            <h2>Home</h2>
            <p class="page-sub">${UI.esc(AppCache.get().academicYear || "")}</p>
          </div>
        </div>
        <div class="quick-actions" aria-label="Quick actions">
          <a class="qa-item qa-dark" href="#/fees"><span class="qa-ico">₹</span><span>Take fee</span></a>
          <a class="qa-item" href="#/attendance"><span class="qa-ico">✓</span><span>Attendance</span></a>
          <a class="qa-item" href="#/students"><span class="qa-ico">+</span><span>New student</span></a>
          <a class="qa-item qa-accent" href="#/reminders"><span class="qa-ico">!</span><span>Remind${d.reminderCount ? ` (${d.reminderCount})` : ""}</span></a>
        </div>
        <div class="grid grid-4 stats-row">
          <div class="stat"><div class="label">Students</div><div class="value">${d.totalStudents}</div></div>
          <div class="stat"><div class="label">Fees today</div><div class="value ok">${UI.money(d.fees.today)}</div></div>
          <div class="stat"><div class="label">Fees due</div><div class="value accent">${UI.money(d.fees.pendingTotal)}</div></div>
          <div class="stat"><div class="label">Present today</div><div class="value">${d.attendanceToday.percent != null ? d.attendanceToday.percent + "%" : "—"}</div></div>
        </div>
        <div class="grid grid-2" style="margin-top:1rem">
          <div class="card">
            <h3>Students in each class</h3>
            <div class="chart-bars">
              ${classes
                .map((c) => {
                  const n = d.enrollmentByClass[c];
                  const h = Math.max(8, Math.round((n / max) * 100));
                  return `<div class="bar-wrap"><div class="bar" style="height:${h}%"><span class="bar-count">${n}</span></div><div class="lbl">${UI.esc(c)}</div></div>`;
                })
                .join("")}
            </div>
          </div>
          <div class="card">
            <h3>Highest fees still due</h3>
            <div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Class</th><th>Amount due</th></tr></thead>
            <tbody>${(d.fees.topDefaulters || [])
              .map((x) => `<tr><td>${UI.esc(x.name)}</td><td>${UI.esc(x.className)}</td><td>${UI.money(x.balance)}</td></tr>`)
              .join("") || `<tr><td colspan="3" class="empty">None</td></tr>`}</tbody></table></div>
            <p style="margin-top:0.75rem;color:var(--muted);font-size:0.85rem">Spent this month: ${UI.money(d.expenseMonth)} · Fees collected this month: ${UI.money(d.fees.month)}</p>
          </div>
        </div>
        <div class="grid grid-2">
          ${
            AppCache.isModuleOn("enquiries")
              ? `<div class="card"><h3>Admission calls to follow</h3>
            ${(d.enquiries || []).map((e) => `<div class="check-item"><span>${UI.esc(e.name)} · ${UI.esc(e.classSought)}</span><a class="btn btn-sm btn-ghost" href="#/enquiries">Open</a></div>`).join("") || "<p class='empty'>No open calls</p>"}
          </div>`
              : ""
          }
          <div class="card"><h3>Reminders</h3>
            ${(d.lowStock || []).map((i) => `<div class="check-item"><span class="badge badge-warn">Low in store</span> ${UI.esc(i.name)} (${i.qty})</div>`).join("")}
            ${(d.birthdays || []).map((b) => `<div class="check-item"><span class="badge badge-info">Birthday</span> ${UI.esc(b.name)}</div>`).join("")}
            ${!(d.lowStock || []).length && !(d.birthdays || []).length ? "<p class='empty'>Nothing to show</p>" : ""}
          </div>
        </div>`;
    } else {
      const d = await Api.call("dashboard.teacher", {});
      root.innerHTML = `
        <div class="page-header page-header-compact">
          <div><h2>My class</h2><p class="page-sub">${UI.esc(d.classAssigned || "")}</p></div>
        </div>
        <div class="quick-actions quick-actions-3">
          <a class="qa-item" href="#/attendance"><span class="qa-ico">✓</span><span>Attendance</span></a>
          <a class="qa-item" href="#/exams"><span class="qa-ico">M</span><span>Marks</span></a>
          <a class="qa-item" href="#/notices"><span class="qa-ico">N</span><span>Notices</span></a>
        </div>
        <div class="card">
          <h3>Today's attendance</h3>
          ${
            d.attendance
              ? `<p>${d.attendance.students.length} students · ${d.attendance.record ? "Saved" : "Not marked yet"}</p>`
              : "<p>No class assigned</p>"
          }
        </div>
        <div class="card"><h3>Notices</h3>
          ${(d.notices || []).map((n) => `<div class="check-item"><strong>${UI.esc(n.title)}</strong><span>${UI.esc(n.date)}</span></div>`).join("") || "<p class='empty'>No notices</p>"}
        </div>`;
    }
  }

  async function studentsPage(root) {
    const render = async () => {
      const q = root.querySelector("[name=q]")?.value || "";
      const className = root.querySelector("[name=className]")?.value || "";
      const list = await Api.call("students.list", { q, className, includeAllStatuses: true });
      root.innerHTML = `
        <div class="page-header">
          <div><h2>Students</h2><p>Add students and see their details</p></div>
          <button class="btn" id="btn-add-student">+ Add student</button>
        </div>
        <div class="toolbar">
          <input name="q" placeholder="Search by name, admission no. or phone" value="${UI.esc(q)}" />
          <select name="className"><option value="">All classes</option>${UI.classOptions(className)}</select>
          <button class="btn btn-ghost" id="btn-search">Find</button>
        </div>
        <div class="card table-wrap"><table class="data">
          <thead><tr><th>Adm. no.</th><th>Name</th><th>Class</th><th>Parent</th><th>Phone</th><th>Status</th><th></th></tr></thead>
          <tbody>${list
            .map(
              (s) => `<tr>
              <td data-label="Adm. no.">${UI.esc(s.admissionNo)}</td>
              <td data-label="Name">${UI.esc(s.name)}</td>
              <td data-label="Class">${UI.esc(s.className)}-${UI.esc(s.section || "A")}</td>
              <td data-label="Parent">${UI.esc(s.parentName)}</td>
              <td data-label="Phone">${UI.esc(s.phone)}</td>
              <td data-label="Status"><span class="badge ${s.status === "Active" ? "badge-ok" : "badge-warn"}">${UI.esc(s.status || "Active")}</span></td>
              <td class="row-actions"><button class="btn btn-sm btn-ghost" data-view="${s.id}">View</button>
                  <button class="btn btn-sm" data-fee="${s.id}">Take fee</button></td></tr>`
            )
            .join("")}</tbody></table></div>`;
      root.querySelector("#btn-search").onclick = render;
      root.querySelector("#btn-add-student").onclick = () => openStudentForm(null, render);
      root.querySelectorAll("[data-view]").forEach((btn) => {
        btn.onclick = () => openStudentView(btn.dataset.view, render);
      });
      root.querySelectorAll("[data-fee]").forEach((btn) => {
        btn.onclick = () => openCollectFee(btn.dataset.fee, render);
      });
    };
    await render();
  }

  async function openStudentForm(existing, onDone) {
    const services = await Api.call("services.list", {});
    const s = existing || {};
    const fees = AppCache.classFees();
    const defaultClass = s.className || "1";
    await UI.modal({
      title: existing ? "Edit student" : "Add student",
      submitLabel: "Save",
      body: `
        <div class="form-grid">
          <div class="form-row"><label>Student name *</label><input name="name" value="${UI.esc(s.name || "")}" required maxlength="80"></div>
          <div class="form-row"><label>Class *</label><select name="className">${UI.classOptions(defaultClass)}</select></div>
          <div class="form-row"><label>Parent / guardian *</label><input name="parentName" value="${UI.esc(s.parentName || "")}" maxlength="80"></div>
          <div class="form-row"><label>Mobile number * (10 digits)</label>
            <input name="phone" inputmode="numeric" maxlength="10" pattern="[0-9]{10}" value="${UI.esc(UI.digitsOnly(s.phone || "", 10))}" placeholder="10-digit mobile">
          </div>
          <div class="form-row"><label>Yearly fee *</label><input name="annualFee" type="number" min="0" step="1" value="${s.annualFee != null ? s.annualFee : fees[defaultClass] || 20000}"></div>
          <div class="form-row"><label>Fee discount</label><input name="concession" type="number" min="0" step="1" value="${s.concession || 0}"></div>
          <div class="form-row"><label>Discount reason</label><input name="concessionReason" value="${UI.esc(s.concessionReason || "")}"></div>
          <div class="form-row"><label>Pay by date</label><input name="payByDate" type="date" value="${UI.esc(s.payByDate || "")}"></div>
          <div class="form-row"><label>Gender</label><select name="gender"><option value="">—</option><option value="M" ${s.gender==="M"?"selected":""}>Boy</option><option value="F" ${s.gender==="F"?"selected":""}>Girl</option></select></div>
          <div class="form-row"><label>Date of birth</label><input name="dob" type="date" value="${UI.esc(s.dob || "")}" max="${new Date().toISOString().slice(0, 10)}">
            <div class="field-hint" data-age>${s.dob ? "Age: " + UI.ageFromDob(s.dob) : "Age shows after you pick DOB"}</div>
          </div>
          <div class="form-row" style="grid-column:1/-1"><label>Address</label><input name="address" value="${UI.esc(s.address || "")}"></div>
          <div class="form-row" style="grid-column:1/-1"><label>Sibling code (optional)</label><input name="siblingGroupId" value="${UI.esc(s.siblingGroupId || "")}" placeholder="Same code for brothers / sisters"></div>
        </div>
        <h4 style="margin:1rem 0 0.5rem">Extra services</h4>
        ${services
          .map(
            (svc) =>
              `<label class="check-item"><input type="checkbox" name="svc_${svc.id}" data-cost="${svc.cost}" data-name="${UI.esc(svc.name)}" checked> ${UI.esc(svc.name)} — ${UI.money(svc.cost)}</label>`
          )
          .join("")}
        <h4 style="margin:1rem 0 0.5rem">Fee terms (optional)</h4>
        <div class="form-grid">
          <div class="form-row"><label>Term 1 due date</label><input name="inst1date" type="date"><input name="inst1amt" type="number" min="0" placeholder="Amount" style="margin-top:0.35rem"></div>
          <div class="form-row"><label>Term 2 due date</label><input name="inst2date" type="date"><input name="inst2amt" type="number" min="0" placeholder="Amount" style="margin-top:0.35rem"></div>
          <div class="form-row"><label>Term 3 due date</label><input name="inst3date" type="date"><input name="inst3amt" type="number" min="0" placeholder="Amount" style="margin-top:0.35rem"></div>
        </div>`,
      onReady: (backdrop) => {
        const phone = backdrop.querySelector("[name=phone]");
        const dob = backdrop.querySelector("[name=dob]");
        const ageEl = backdrop.querySelector("[data-age]");
        const classSel = backdrop.querySelector("[name=className]");
        const feeInput = backdrop.querySelector("[name=annualFee]");
        phone.addEventListener("input", () => {
          phone.value = UI.digitsOnly(phone.value, 10);
        });
        const syncAge = () => {
          const a = UI.ageFromDob(dob.value);
          ageEl.textContent = a ? "Age: " + a : "Age appears after DOB";
        };
        dob.addEventListener("change", syncAge);
        dob.addEventListener("input", syncAge);
        if (!existing) {
          classSel.addEventListener("change", () => {
            const map = AppCache.classFees();
            if (map[classSel.value] != null) feeInput.value = map[classSel.value];
          });
        }
      },
      onSubmit: async (backdrop) => {
        const f = (n) => UI.formVal(backdrop, n);
        const phone = UI.digitsOnly(f("phone"), 10);
        const name = f("name").trim();
        const parentName = f("parentName").trim();
        const annualFee = Number(f("annualFee"));
        const concession = Number(f("concession") || 0);
        if (!name) throw new Error("Name is required");
        if (!parentName) throw new Error("Parent / guardian is required");
        if (!/^\d{10}$/.test(phone)) throw new Error("Phone must be exactly 10 digits");
        if (!(annualFee >= 0)) throw new Error("Annual fee must be 0 or more");
        if (concession < 0) throw new Error("Concession cannot be negative");
        if (concession > annualFee) throw new Error("Concession cannot exceed annual fee");
        if (f("dob")) {
          const dob = new Date(f("dob") + "T12:00:00");
          if (dob > new Date()) throw new Error("Date of birth cannot be in the future");
        }
        const opted = [];
        backdrop.querySelectorAll("[name^=svc_]:checked").forEach((el) => {
          opted.push({ serviceId: el.name.replace("svc_", ""), serviceName: el.dataset.name, cost: Number(el.dataset.cost) });
        });
        const installments = [];
        for (let i = 1; i <= 3; i++) {
          const d = f("inst" + i + "date");
          const a = Number(f("inst" + i + "amt"));
          if (d && a) installments.push({ label: "Term " + i, dueDate: d, amount: a });
        }
        const payload = {
          name,
          className: f("className"),
          parentName,
          phone,
          annualFee,
          concession,
          concessionReason: f("concessionReason"),
          payByDate: f("payByDate"),
          gender: f("gender"),
          dob: f("dob"),
          address: f("address"),
          siblingGroupId: f("siblingGroupId"),
          services: opted,
          installments
        };
        if (existing) await Api.call("students.update", { id: existing.id, ...payload });
        else await Api.call("students.create", payload);
        UI.toast("Student saved", "ok");
        onDone();
        return true;
      }
    });
  }

  async function openStudentView(id, onDone) {
    const s = await Api.call("students.get", { id });
    await UI.modal({
      title: s.name,
      submitLabel: "Edit",
      body: `
        <p><strong>${UI.esc(s.admissionNo)}</strong> · ${UI.esc(s.className)}-${UI.esc(s.section || "A")} · ${UI.esc(s.status)}</p>
        <p>Parent: ${UI.esc(s.parentName)} · ${UI.esc(s.phone)}</p>
        <p>Yearly fee ${UI.money(s.annualFee)} · Discount ${UI.money(s.concession)} · Paid ${UI.money(s.paidTotal)} · <strong>Due ${UI.money(s.balance)}</strong></p>
        <p>Services: ${(s.optedServices || []).map((x) => x.serviceName + " (" + UI.money(x.cost) + ")").join(", ") || "—"}</p>`,
      onSubmit: async () => {
        await openStudentForm(s, onDone);
        return true;
      }
    });
  }

  async function openCollectFee(studentId, onDone) {
    const s = await Api.call("students.get", { id: studentId });
    await UI.modal({
      title: "Take fee — " + s.name,
      submitLabel: "Save & print receipt",
      body: `
        <p>Amount due: <strong class="badge badge-danger">${UI.money(s.balance)}</strong></p>
        <div class="form-grid">
          <div class="form-row"><label>Amount paid</label><input name="amount" type="number" value="${s.balance}"></div>
          <div class="form-row"><label>Paid by</label>
            <select name="mode"><option>Cash</option><option>UPI</option><option>Cheque</option><option>Other</option></select></div>
          <div class="form-row"><label>UPI / cheque no. (if any)</label><input name="reference"></div>
          <div class="form-row"><label>Note</label><input name="notes"></div>
        </div>`,
      onSubmit: async (backdrop) => {
        const amount = Number(UI.formVal(backdrop, "amount"));
        const mode = UI.formVal(backdrop, "mode");
        const receipt = await Api.call("fees.collect", {
          studentId,
          amount,
          mode,
          reference: UI.formVal(backdrop, "reference"),
          notes: UI.formVal(backdrop, "notes")
        });
        await printReceipt(receipt);
        UI.toast("Receipt " + receipt.receiptNo, "ok");
        if (onDone) onDone();
        return true;
      }
    });
  }

  function receiptShareText(r) {
    const school = r.school || AppCache.school();
    const st = r.student || {};
    return UI.fillTemplate(CONFIG.whatsappTemplates.feeReceipt, {
      parentName: st.parentName || "Parent",
      studentName: st.name || "",
      class: st.className || "",
      receiptNo: r.receiptNo || "",
      amount: r.amount,
      date: String(r.createdAt || "").slice(0, 10),
      mode: r.mode || "",
      balance: r.balanceAfter,
      schoolName: school.name || CONFIG.school.name
    });
  }

  async function printReceipt(r) {
    await ReceiptPdf.open(r);
  }

  async function viewReceipt(r) {
    await ReceiptPdf.open(r);
  }

  async function shareReceipt(r) {
    const text = receiptShareText(r);
    const phone = (r.student && r.student.phone) || "";
    const result = await ReceiptPdf.share(r, text);
    if (result.aborted) return;
    if (result.shared) {
      UI.toast("Receipt PDF shared", "ok");
      return;
    }
    // Desktop: viewer opens PDF; WhatsApp caption ready — attach via Download if needed
    UI.toast("PDF opened — use Download, then attach in WhatsApp", "ok");
    window.open(UI.waLink(phone, text), "_blank", "noopener");
  }

  async function enquiriesPage(root) {
    if (!AppCache.isModuleOn("enquiries")) {
      root.innerHTML = `<div class="card"><p>Admission calls are turned off. Turn them on in Settings → Features.</p></div>`;
      return;
    }
    const list = await Api.call("enquiries.list", {});
    root.innerHTML = `
      <div class="page-header"><div><h2>Admission calls</h2><p>Parents who asked about joining</p></div>
        <button class="btn" id="btn-enq">+ Add call</button></div>
      <div class="card table-wrap"><table class="data">
        <thead><tr><th>Name</th><th>Phone</th><th>Class</th><th>Call back on</th><th>Status</th><th></th></tr></thead>
        <tbody>${list
          .map(
            (e) => `<tr><td>${UI.esc(e.name)}</td><td>${UI.esc(e.phone)}</td><td>${UI.esc(e.classSought)}</td>
            <td>${UI.esc(e.followUpDate)}</td><td>${UI.esc(e.status)}</td>
            <td>${e.status === "Open" ? `<button class="btn btn-sm" data-convert="${e.id}">Make student</button>` : ""}</td></tr>`
          )
          .join("")}</tbody></table></div>`;
    root.querySelector("#btn-enq").onclick = async () => {
      await UI.modal({
        title: "New admission call",
        body: `<div class="form-grid">
          <div class="form-row"><label>Child's name</label><input name="name"></div>
          <div class="form-row"><label>Phone (10 digits)</label><input name="phone" inputmode="numeric" maxlength="10"></div>
          <div class="form-row"><label>Class wanted</label><select name="classSought">${UI.classOptions("1")}</select></div>
          <div class="form-row"><label>Call back on</label><input name="followUpDate" type="date"></div>
          <div class="form-row" style="grid-column:1/-1"><label>Note</label><input name="notes"></div></div>`,
        onReady: (b) => {
          const phone = b.querySelector("[name=phone]");
          phone.addEventListener("input", () => {
            phone.value = UI.digitsOnly(phone.value, 10);
          });
        },
        onSubmit: async (b) => {
          const phone = UI.digitsOnly(UI.formVal(b, "phone"), 10);
          if (!UI.formVal(b, "name").trim()) throw new Error("Name is required");
          if (!/^\d{10}$/.test(phone)) throw new Error("Phone must be exactly 10 digits");
          await Api.call("enquiries.create", {
            name: UI.formVal(b, "name").trim(),
            phone,
            classSought: UI.formVal(b, "classSought"),
            followUpDate: UI.formVal(b, "followUpDate"),
            notes: UI.formVal(b, "notes")
          });
          enquiriesPage(root);
          return true;
        }
      });
    };
    root.querySelectorAll("[data-convert]").forEach((btn) => {
      btn.onclick = async () => {
        await Api.call("enquiries.convert", { id: btn.dataset.convert, student: {} });
          UI.toast("Added as student", "ok");
        enquiriesPage(root);
      };
    });
  }

  async function feesPage(root, state = {}) {
    const allowed = ["collect", "pending", "reminders", "receipts"];
    const [pending, payments, students, reminderQueue] = await Api.callAll([
      { action: "fees.pending" },
      { action: "fees.list" },
      { action: "students.list", payload: { includeAllStatuses: true } },
      { action: "reminders.queue" }
    ]);
    const byId = {};
    (students || []).forEach((s) => {
      byId[s.id] = s;
    });
    const allReceipts = (payments || [])
      .slice()
      .reverse()
      .map((p) => ({ ...p, student: byId[p.studentId] || {} }));
    const reminders = reminderQueue || [];

    let tab = allowed.includes(state.tab) ? state.tab : "collect";
    let q = "";
    let remindIdx = 0;
    const isCancelled = (p) => {
      const v = p && p.cancelled;
      return v === true || v === "TRUE" || v === "true" || v === "Y" || v === 1 || v === "1";
    };
    const feeTpl = () =>
      (AppCache.get() && AppCache.get().whatsappTemplates && AppCache.get().whatsappTemplates.feeReminder) ||
      CONFIG.whatsappTemplates.feeReminder;

    const matchesQ = (...parts) => {
      const qLower = q.trim().toLowerCase();
      return !qLower || parts.some((x) => String(x || "").toLowerCase().includes(qLower));
    };

    const render = (opts = {}) => {
      if (opts.tab) tab = opts.tab;
      if (opts.q != null) q = opts.q;
      const keepFocus = opts.keepFocus;

      const pendingFiltered = (pending || []).filter((s) =>
        matchesQ(s.name, s.admissionNo, s.className, s.phone)
      );
      const remindersFiltered = reminders.filter((s) =>
        matchesQ(s.name, s.className, s.phone, ...(s.reasons || []))
      );
      const receipts = allReceipts.filter((p) =>
        matchesQ(p.student.name, p.student.admissionNo, p.receiptNo, p.student.className)
      );
      const receiptById = Object.fromEntries(allReceipts.map((p) => [p.id, p]));

      const collectHtml = `
        <div class="card table-wrap"><table class="data">
          <thead><tr><th>Student</th><th>Class</th><th>Amount due</th><th></th></tr></thead>
          <tbody>${
            pendingFiltered.length
              ? pendingFiltered
                  .map(
                    (s) => `<tr>
                <td data-label="Student">${UI.esc(s.name)}</td>
                <td data-label="Class">${UI.esc(s.className)}</td>
                <td data-label="Amount due">${UI.money(s.balance)}</td>
                <td class="row-actions"><button class="btn btn-sm" data-fee="${s.id}">Take fee</button></td></tr>`
                  )
                  .join("")
              : `<tr><td colspan="4" class="empty">No students with fees due</td></tr>`
          }</tbody></table></div>`;

      const pendingHtml = `
        <div class="toolbar" style="margin-top:0">
          <button type="button" class="btn btn-ghost" id="export-pending">Download list</button>
        </div>
        <div class="card table-wrap"><table class="data">
          <thead><tr><th>Name</th><th>Class</th><th>Phone</th><th>Pay by</th><th>Amount due</th><th></th></tr></thead>
          <tbody>${
            pendingFiltered.length
              ? pendingFiltered
                  .map(
                    (s) => `<tr>
              <td data-label="Name">${UI.esc(s.name)}</td>
              <td data-label="Class">${UI.esc(s.className)}</td>
              <td data-label="Phone">${UI.esc(s.phone)}</td>
              <td data-label="Pay by">${UI.esc(s.payByDate || "—")}</td>
              <td data-label="Amount due">${UI.money(s.balance)}</td>
              <td class="row-actions">
                <button class="btn btn-sm" data-fee="${s.id}">Take fee</button>
                <a class="btn btn-sm btn-ghost" target="_blank" rel="noopener" href="${UI.waLink(
                  s.phone,
                  UI.fillTemplate(feeTpl(), {
                    parentName: s.parentName,
                    studentName: s.name,
                    class: s.className,
                    balance: s.balance,
                    schoolName: AppCache.school().name
                  })
                )}">WhatsApp</a>
              </td></tr>`
                  )
                  .join("")
              : `<tr><td colspan="6" class="empty">No fees due right now</td></tr>`
          }</tbody></table></div>`;

      if (remindIdx >= remindersFiltered.length) remindIdx = Math.max(0, remindersFiltered.length - 1);
      const cur = remindersFiltered[remindIdx];
      const remindersHtml = `
        <div class="card">
          ${
            cur
              ? `<h3>${UI.esc(cur.name)} · ${UI.esc(cur.className)}</h3>
            <p>Amount due ${UI.money(cur.balance)}</p>
            <p>${(cur.reasons || []).map((r) => `<span class="badge badge-warn">${UI.esc(r)}</span> `).join("")}</p>
            <div class="toolbar">
              <a class="btn" id="wa-remind" target="_blank" rel="noopener" href="${UI.waLink(
                cur.phone,
                UI.fillTemplate(feeTpl(), {
                  parentName: cur.parentName,
                  studentName: cur.name,
                  class: cur.className,
                  balance: cur.balance,
                  schoolName: AppCache.school().name
                })
              )}">Message parent</a>
              <button class="btn btn-ghost" id="next-remind">Next parent →</button>
            </div>
            <p style="color:var(--muted)">${remindIdx + 1} of ${remindersFiltered.length}</p>`
              : `<p class="empty">No parents to remind</p>`
          }
        </div>
        <div class="card table-wrap"><table class="data"><thead><tr><th>#</th><th>Name</th><th>Amount due</th><th>Reason</th></tr></thead>
        <tbody>${remindersFiltered
          .map(
            (x, i) =>
              `<tr ${i === remindIdx ? 'style="background:var(--primary-soft)"' : ""}>
                <td data-label="#">${i + 1}</td>
                <td data-label="Name">${UI.esc(x.name)}</td>
                <td data-label="Amount due">${UI.money(x.balance)}</td>
                <td data-label="Reason">${UI.esc((x.reasons || []).join("; "))}</td></tr>`
          )
          .join("") || `<tr><td colspan="4" class="empty">None</td></tr>`}</tbody></table></div>`;

      const receiptsHtml = `
        <div class="card table-wrap"><table class="data">
          <thead><tr><th>Receipt</th><th>Student</th><th>Amount</th><th>Paid by</th><th>Date</th><th></th></tr></thead>
          <tbody>${
            receipts.length
              ? receipts
                  .map(
                    (p) => `<tr class="${isCancelled(p) ? "row-muted" : ""}">
                <td data-label="Receipt">${UI.esc(p.receiptNo)}</td>
                <td data-label="Student">${UI.esc(p.student.name || "—")}${
                      p.student.className
                        ? `<div class="cell-sub">${UI.esc(p.student.className)}</div>`
                        : ""
                    }</td>
                <td data-label="Amount">${UI.money(p.amount)}</td>
                <td data-label="Paid by">${UI.esc(p.mode)}${
                      p.chequeStatus ? `<div class="cell-sub">${UI.esc(p.chequeStatus)}</div>` : ""
                    }</td>
                <td data-label="Date">${UI.esc(String(p.createdAt || "").slice(0, 10))}</td>
                <td class="row-actions">
                  <button type="button" class="btn btn-sm" data-view="${p.id}">View</button>
                  <button type="button" class="btn btn-sm btn-ghost" data-share="${p.id}">Share</button>
                  ${
                    p.mode === "Cheque" && !isCancelled(p)
                      ? `<button type="button" class="btn btn-sm btn-ghost" data-cheque="${p.id}">Cheque</button>`
                      : ""
                  }
                  ${
                    !isCancelled(p)
                      ? `<button type="button" class="btn btn-sm btn-ghost" data-cancel="${p.id}">Cancel</button>`
                      : `<span class="badge badge-danger">Cancelled</span>`
                  }
                </td></tr>`
                  )
                  .join("")
              : `<tr><td colspan="6" class="empty">No receipts found</td></tr>`
          }</tbody></table></div>`;

      const panel =
        tab === "receipts"
          ? receiptsHtml
          : tab === "pending"
            ? pendingHtml
            : tab === "reminders"
              ? remindersHtml
              : collectHtml;

      root.innerHTML = `
        <div class="page-header"><div><h2>Fees</h2><p>Take fees, see dues, remind parents, and open receipts</p></div></div>
        <div class="tabs" role="tablist">
          <button type="button" role="tab" data-tab="collect" class="${tab === "collect" ? "active" : ""}">Take fee (${pendingFiltered.length})</button>
          <button type="button" role="tab" data-tab="pending" class="${tab === "pending" ? "active" : ""}">Fees due (${pendingFiltered.length})</button>
          <button type="button" role="tab" data-tab="reminders" class="${tab === "reminders" ? "active" : ""}">Remind parents (${remindersFiltered.length})</button>
          <button type="button" role="tab" data-tab="receipts" class="${tab === "receipts" ? "active" : ""}">Receipts (${receipts.length})</button>
        </div>
        <div class="toolbar">
          <input name="q" type="search" placeholder="Search by student, admission no. or receipt" value="${UI.esc(q)}" autocomplete="off" />
        </div>
        <div id="fees-panel">${panel}</div>`;

      root.querySelectorAll("[data-tab]").forEach((btn) => {
        btn.onclick = () => render({ tab: btn.dataset.tab });
      });

      const searchInput = root.querySelector("[name=q]");
      let searchTimer;
      searchInput.oninput = () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => render({ q: searchInput.value, keepFocus: true }), 180);
      };
      if (keepFocus) {
        searchInput.focus();
        try {
          searchInput.setSelectionRange(searchInput.value.length, searchInput.value.length);
        } catch (_) {}
      }

      const reload = () => feesPage(root, { tab });
      root.querySelectorAll("[data-fee]").forEach((b) => {
        b.onclick = () => openCollectFee(b.dataset.fee, reload);
      });
      root.querySelector("#export-pending")?.addEventListener("click", () => {
        UI.downloadCsv("pending_fees.csv", [
          ["Name", "Class", "Phone", "Balance"],
          ...pendingFiltered.map((s) => [s.name, s.className, s.phone, s.balance])
        ]);
      });
      root.querySelector("#next-remind")?.addEventListener("click", async () => {
        if (!cur) return;
        const msg = UI.fillTemplate(feeTpl(), {
          parentName: cur.parentName,
          studentName: cur.name,
          class: cur.className,
          balance: cur.balance,
          schoolName: AppCache.school().name
        });
        await Api.call("whatsapp.log", {
          type: "feeReminder",
          studentId: cur.studentId,
          phone: cur.phone,
          message: msg
        });
        remindIdx++;
        render({});
      });
      root.querySelector("#wa-remind")?.addEventListener("click", async () => {
        if (!cur) return;
        await Api.call("whatsapp.log", {
          type: "feeReminder",
          studentId: cur.studentId,
          phone: cur.phone,
          message: "fee reminder"
        });
      });
      root.querySelectorAll("[data-view]").forEach((b) => {
        b.onclick = () => viewReceipt(receiptById[b.dataset.view]);
      });
      root.querySelectorAll("[data-share]").forEach((b) => {
        b.onclick = () => shareReceipt(receiptById[b.dataset.share]);
      });
      root.querySelectorAll("[data-cancel]").forEach((b) => {
        b.onclick = async () => {
          const reason = prompt("Why cancel this receipt?");
          if (!reason) return;
          await Api.call("fees.cancel", { id: b.dataset.cancel, reason });
          reload();
        };
      });
      root.querySelectorAll("[data-cheque]").forEach((b) => {
        b.onclick = async () => {
          const status = prompt("Cheque status: Pending / Cleared / Bounced", "Cleared");
          if (!status) return;
          await Api.call("cheque.updateStatus", { id: b.dataset.cheque, chequeStatus: status });
          UI.toast("Cheque status saved", "ok");
          reload();
        };
      });
    };

    render();
  }

  async function attendancePage(root) {
    const user = AppCache.user();
    const preferred = user.role === "Teacher" ? (user.classAssigned || "1").split("-")[0] : "1";
    let allStudents = [];
    try {
      allStudents = await Api.call("students.list", {});
    } catch (e) {
      allStudents = [];
    }
    let className = UI.pickClassWithStudents(allStudents, preferred);
    let date = new Date().toISOString().slice(0, 10);

    const rosterForClass = (cls) =>
      (allStudents || []).filter(
        (s) => UI.classMatch(s.className, cls) && (s.status === "Active" || !s.status)
      );

    const render = async () => {
      let data = { students: [], record: null };
      try {
        data = await Api.call("attendance.get", { className, date });
      } catch (e) {
        UI.toast(e.message || "Could not load attendance", "error");
      }
      // Fallback roster from students.list when API returns empty (class label mismatch / lag)
      let students = data.students || [];
      if (!students.length) {
        students = rosterForClass(className).map((s) => ({
          id: s.id,
          name: s.name,
          admissionNo: s.admissionNo,
          phone: s.phone,
          parentName: s.parentName
        }));
      }
      data.students = students;

      const absent = new Set((data.record && data.record.absentIds) || []);
      const leave = new Set((data.record && data.record.leaveIds) || []);
      try {
        const draft = JSON.parse(localStorage.getItem("svs_att_draft_" + className + "_" + date) || "null");
        if (draft && !data.record) {
          (draft.absentIds || []).forEach((id) => absent.add(id));
          (draft.leaveIds || []).forEach((id) => leave.add(id));
        }
      } catch (e) {}

      root.innerHTML = `
        <div class="page-header"><div><h2>Attendance</h2><p>Everyone starts as present — mark who is absent</p></div></div>
        <div class="toolbar">
          <select id="cls" ${user.role === "Teacher" ? "disabled" : ""}>${UI.classOptions(className)}</select>
          <input type="date" id="dt" value="${date}">
          <button class="btn" id="save">Save attendance</button>
          <button class="btn btn-ghost" id="msg-abs">Message absent parents</button>
        </div>
        <div class="card">
          <div class="form-row"><label>Note (optional)</label><input id="notes" value="${UI.esc((data.record && data.record.notes) || "")}" placeholder="e.g. substitute teacher today"></div>
          <div class="check-list" id="list">
            ${
              students.length
                ? students
                    .map((s) => {
                      const st = leave.has(s.id) ? "leave" : absent.has(s.id) ? "absent" : "present";
                      return `<div class="check-item" data-id="${s.id}">
                  <strong>${UI.esc(s.name)}</strong>
                  <select data-status>
                    <option value="present" ${st === "present" ? "selected" : ""}>Present</option>
                    <option value="absent" ${st === "absent" ? "selected" : ""}>Absent</option>
                    <option value="leave" ${st === "leave" ? "selected" : ""}>Leave</option>
                  </select>
                </div>`;
                    })
                    .join("")
                : `<p class="empty">No students in class ${UI.esc(className)}. Check the Students list or pick another class.</p>`
            }
          </div>
        </div>`;

      const persistDraft = () => {
        const absentIds = [],
          leaveIds = [];
        root.querySelectorAll(".check-item").forEach((row) => {
          const st = row.querySelector("[data-status]").value;
          if (st === "absent") absentIds.push(row.dataset.id);
          if (st === "leave") leaveIds.push(row.dataset.id);
        });
        localStorage.setItem(
          "svs_att_draft_" + className + "_" + date,
          JSON.stringify({ absentIds, leaveIds })
        );
      };
      root.querySelectorAll("[data-status]").forEach((el) => el.addEventListener("change", persistDraft));

      root.querySelector("#cls").onchange = (e) => {
        className = e.target.value;
        render();
      };
      root.querySelector("#dt").onchange = (e) => {
        date = e.target.value;
        render();
      };
      root.querySelector("#save").onclick = async () => {
        const absentIds = [],
          leaveIds = [];
        root.querySelectorAll(".check-item").forEach((row) => {
          const st = row.querySelector("[data-status]").value;
          if (st === "absent") absentIds.push(row.dataset.id);
          if (st === "leave") leaveIds.push(row.dataset.id);
        });
        await Api.call("attendance.save", {
          className,
          date,
          absentIds,
          leaveIds,
          notes: root.querySelector("#notes").value
        });
        UI.toast("Attendance saved", "ok");
        render();
      };
      root.querySelector("#msg-abs").onclick = () => {
        data.students
          .filter((s) => {
            const row = root.querySelector(`.check-item[data-id="${s.id}"]`);
            return row && row.querySelector("[data-status]").value === "absent";
          })
          .forEach((s) => {
            const msg = UI.fillTemplate(CONFIG.whatsappTemplates.absentee, {
              parentName: s.parentName,
              studentName: s.name,
              class: className,
              date,
              schoolName: AppCache.school().name
            });
            window.open(UI.waLink(s.phone, msg), "_blank");
            Api.call("whatsapp.log", { type: "absentee", studentId: s.id, phone: s.phone, message: msg });
          });
      };
    };
    await render();
  }

  async function whatsappPage(root) {
    const [pending, templates] = await Api.callAll([
      { action: "fees.pending" },
      { action: "messages.templates" }
    ]);
    const tplKeys = Object.keys(templates || {});
    const sample = (pending && pending[0]) || {
      parentName: "Parent",
      name: "Student",
      className: "1",
      balance: 0,
      phone: ""
    };
    const buildPreview = (key, custom) =>
      UI.fillTemplate(templates[key] || "", {
        parentName: sample.parentName || "Parent",
        studentName: sample.name || "Student",
        class: sample.className || "",
        balance: sample.balance != null ? sample.balance : 0,
        date: new Date().toISOString().slice(0, 10),
        message: custom || "(your message)",
        schoolName: AppCache.school().name,
        receiptNo: "R2627-00001",
        amount: 4000,
        mode: "Cash"
      });

    root.innerHTML = `
      <div class="page-header"><div><h2>WhatsApp</h2><p>Pick a message and send to parents</p></div></div>
      <div class="card">
        <div class="form-row"><label>Message type</label>
          <select id="tpl">${tplKeys
            .map((k) => `<option value="${k}">${UI.esc(k)}</option>`)
            .join("")}</select></div>
        <div class="form-row"><label>Message preview</label>
          <div class="tpl-preview" id="tpl-preview"></div></div>
        <div class="form-row"><label>Your own words (optional)</label>
          <textarea id="customMsg" placeholder="Add extra text for events or special notes"></textarea></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Student</th><th>Amount due</th><th></th></tr></thead>
        <tbody>${(pending || [])
          .map(
            (s) => `<tr>
            <td data-label="Student">${UI.esc(s.name)} (${UI.esc(s.className)})</td>
            <td data-label="Amount due">${UI.money(s.balance)}</td>
            <td class="row-actions"><button class="btn btn-sm" data-id="${s.id}" data-phone="${UI.esc(s.phone)}" data-name="${UI.esc(s.name)}" data-parent="${UI.esc(s.parentName)}" data-class="${UI.esc(s.className)}" data-bal="${s.balance}">Send</button></td></tr>`
          )
          .join("") || `<tr><td colspan="3" class="empty">No students with fees due</td></tr>`}</tbody></table></div>
      </div>`;

    const syncPreview = () => {
      const key = root.querySelector("#tpl").value;
      root.querySelector("#tpl-preview").textContent = buildPreview(key, root.querySelector("#customMsg").value);
    };
    root.querySelector("#tpl").onchange = syncPreview;
    root.querySelector("#customMsg").oninput = syncPreview;
    syncPreview();

    root.querySelectorAll("[data-id]").forEach((btn) => {
      btn.onclick = async () => {
        const key = root.querySelector("#tpl").value;
        const msg = UI.fillTemplate(templates[key], {
          parentName: btn.dataset.parent,
          studentName: btn.dataset.name,
          class: btn.dataset.class,
          balance: btn.dataset.bal,
          date: new Date().toISOString().slice(0, 10),
          message: root.querySelector("#customMsg").value,
          schoolName: AppCache.school().name
        });
        window.open(UI.waLink(btn.dataset.phone, msg), "_blank");
        await Api.call("whatsapp.log", { type: key, studentId: btn.dataset.id, phone: btn.dataset.phone, message: msg });
        UI.toast("Message opened", "ok");
      };
    });
  }

  async function expensesPage(root) {
    const list = await Api.call("expenses.list", {});
    root.innerHTML = `
      <div class="page-header"><div><h2>Spending</h2><p>School money spent</p></div><button class="btn" id="add">+ Add spending</button></div>
      <div class="card table-wrap"><table class="data"><thead><tr><th>Date</th><th>Type</th><th>Amount</th><th>Paid by</th><th>Note</th></tr></thead>
      <tbody>${list
        .slice()
        .reverse()
        .map(
          (e) =>
            `<tr><td>${UI.esc(e.date)}</td><td>${UI.esc(e.category)}</td><td>${UI.money(e.amount)}</td><td>${UI.esc(e.mode)}</td><td>${UI.esc(e.notes)}</td></tr>`
        )
        .join("")}</tbody></table></div>`;
    root.querySelector("#add").onclick = async () => {
      await UI.modal({
        title: "Add spending",
        body: `<div class="form-grid">
          <div class="form-row"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
          <div class="form-row"><label>Type</label><select name="category"><option>Utilities</option><option>Maintenance</option><option>Supplies</option><option>Transport</option><option>Events</option><option>Other</option></select></div>
          <div class="form-row"><label>Amount</label><input name="amount" type="number"></div>
          <div class="form-row"><label>Paid by</label><select name="mode"><option>Cash</option><option>UPI</option><option>Bank</option></select></div>
          <div class="form-row" style="grid-column:1/-1"><label>Note</label><input name="notes"></div></div>`,
        onSubmit: async (b) => {
          await Api.call("expenses.create", {
            date: UI.formVal(b, "date"),
            category: UI.formVal(b, "category"),
            amount: Number(UI.formVal(b, "amount")),
            mode: UI.formVal(b, "mode"),
            notes: UI.formVal(b, "notes")
          });
          expensesPage(root);
          return true;
        }
      });
    };
  }

  async function staffPage(root) {
    const list = await Api.call("staff.list", {});
    root.innerHTML = `
      <div class="page-header"><div><h2>Staff</h2><p>Teachers and office staff</p></div><button class="btn" id="add">+ Add staff</button></div>
      <div class="card table-wrap"><table class="data"><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Salary</th><th></th></tr></thead>
      <tbody>${list
        .map(
          (s) =>
            `<tr><td>${UI.esc(s.name)}</td><td>${UI.esc(s.role)}</td><td>${UI.esc(s.phone)}</td><td>${UI.money(s.salary)}</td>
            <td><button class="btn btn-sm" data-pay="${s.id}">Record salary</button></td></tr>`
        )
        .join("")}</tbody></table></div>`;
    root.querySelector("#add").onclick = async () => {
      await UI.modal({
        title: "Add staff member",
        body: `<div class="form-grid">
          <div class="form-row"><label>Name</label><input name="name"></div>
          <div class="form-row"><label>Role</label><input name="role" value="Teacher"></div>
          <div class="form-row"><label>Phone</label><input name="phone"></div>
          <div class="form-row"><label>Monthly salary</label><input name="salary" type="number"></div></div>`,
        onSubmit: async (b) => {
          await Api.call("staff.save", {
            name: UI.formVal(b, "name"),
            role: UI.formVal(b, "role"),
            phone: UI.formVal(b, "phone"),
            salary: Number(UI.formVal(b, "salary"))
          });
          staffPage(root);
          return true;
        }
      });
    };
    root.querySelectorAll("[data-pay]").forEach((btn) => {
      btn.onclick = async () => {
        await Api.call("salary.pay", { staffId: btn.dataset.pay });
        UI.toast("Salary saved under spending", "ok");
      };
    });
  }

  async function stockPage(root) {
    const list = await Api.call("stock.list", {});
    root.innerHTML = `
      <div class="page-header"><div><h2>School store</h2><p>Books, uniforms and supplies</p></div><button class="btn" id="add">+ Add item</button></div>
      <div class="card table-wrap"><table class="data"><thead><tr><th>Item</th><th>Type</th><th>Qty</th><th></th></tr></thead>
      <tbody>${list
        .map(
          (i) =>
            `<tr><td>${UI.esc(i.name)}</td><td>${UI.esc(i.category)}</td>
            <td>${i.qty <= i.reorderLevel ? `<span class="badge badge-warn">${i.qty}</span>` : i.qty}</td>
            <td><button class="btn btn-sm btn-ghost" data-in="${i.id}">+ Bought</button>
                <button class="btn btn-sm btn-ghost" data-out="${i.id}">Given out</button></td></tr>`
        )
        .join("")}</tbody></table></div>`;
    root.querySelector("#add").onclick = async () => {
      await UI.modal({
        title: "Add store item",
        body: `<div class="form-grid">
          <div class="form-row"><label>Item name</label><input name="name"></div>
          <div class="form-row"><label>Type</label><select name="category"><option>Books</option><option>Uniform</option></select></div>
          <div class="form-row"><label>Starting quantity</label><input name="openingQty" type="number" value="0"></div>
          <div class="form-row"><label>Warn when below</label><input name="reorderLevel" type="number" value="5"></div></div>`,
        onSubmit: async (b) => {
          await Api.call("stock.save", {
            name: UI.formVal(b, "name"),
            category: UI.formVal(b, "category"),
            openingQty: Number(UI.formVal(b, "openingQty")),
            reorderLevel: Number(UI.formVal(b, "reorderLevel"))
          });
          stockPage(root);
          return true;
        }
      });
    };
    const move = async (id, type) => {
      const qty = Number(prompt("Quantity?", "1"));
      if (!qty) return;
      await Api.call("stock.move", { itemId: id, type, qty });
      stockPage(root);
    };
    root.querySelectorAll("[data-in]").forEach((b) => (b.onclick = () => move(b.dataset.in, "purchase")));
    root.querySelectorAll("[data-out]").forEach((b) => (b.onclick = () => move(b.dataset.out, "issue")));
  }

  async function transportPage(root) {
    const list = await Api.call("routes.list", {});
    root.innerHTML = `
      <div class="page-header"><div><h2>Bus routes</h2><p>Transport fee by route</p></div><button class="btn" id="add">+ Add route</button></div>
      <div class="card table-wrap"><table class="data"><thead><tr><th>Route</th><th>Fee</th></tr></thead>
      <tbody>${list.map((r) => `<tr><td>${UI.esc(r.name)}</td><td>${UI.money(r.fee)}</td></tr>`).join("")}</tbody></table></div>`;
    root.querySelector("#add").onclick = async () => {
      await UI.modal({
        title: "Add bus route",
        body: `<div class="form-row"><label>Route name</label><input name="name"></div><div class="form-row"><label>Fee</label><input name="fee" type="number"></div>`,
        onSubmit: async (b) => {
          await Api.call("routes.save", { name: UI.formVal(b, "name"), fee: Number(UI.formVal(b, "fee")) });
          transportPage(root);
          return true;
        }
      });
    };
  }

  async function examsPage(root) {
    let exams = [];
    try {
      exams = await Api.call("exams.list", {});
    } catch (e) {
      exams = [];
    }
    let allStudents = [];
    try {
      allStudents = await Api.call("students.list", {});
    } catch (e) {
      allStudents = [];
    }
    const preferred =
      AppCache.user().role === "Teacher" ? (AppCache.user().classAssigned || "1").split("-")[0] : "1";
    let className = UI.pickClassWithStudents(allStudents, preferred);
    const subjectsFor = (cls) => {
      const map = AppCache.subjectsByClass();
      return map[cls] || map["1"] || ["English"];
    };
    let subject = subjectsFor(className)[0];
    let examId = exams[0] && exams[0].id;

    const rosterForClass = (cls) =>
      (allStudents || []).filter(
        (s) => UI.classMatch(s.className, cls) && (s.status === "Active" || !s.status)
      );

    const render = async () => {
      let data = { students: [], marks: [] };
      if (examId) {
        try {
          data = await Api.call("marks.get", { className, subject, examId });
        } catch (e) {
          UI.toast(e.message || "Could not load marks", "error");
        }
      }
      let students = data.students || [];
      if (!students.length) students = rosterForClass(className);

      const exam = exams.find((e) => e.id === examId) || exams[0];
      const markMap = {};
      (data.marks || []).forEach((m) => {
        markMap[m.studentId] = m.marks;
      });
      const subjects = subjectsFor(className);
      if (!subjects.includes(subject)) subject = subjects[0];

      root.innerHTML = `
        <div class="page-header"><div><h2>Marks</h2><p>Enter exam marks for the class</p></div></div>
        <div class="toolbar">
          <select id="cls">${UI.classOptions(className)}</select>
          <select id="subj">${subjects
            .map((s) => `<option ${s === subject ? "selected" : ""}>${UI.esc(s)}</option>`)
            .join("")}</select>
          <select id="ex">${
            exams.length
              ? exams
                  .map(
                    (e) =>
                      `<option value="${e.id}" ${e.id === examId ? "selected" : ""}>${UI.esc(e.name)}</option>`
                  )
                  .join("")
              : `<option value="">No exams added yet</option>`
          }</select>
          <button class="btn" id="save" ${!exam ? "disabled" : ""}>Save marks</button>
        </div>
        <div class="card table-wrap mobile-cards"><table class="data"><thead><tr><th>Student</th><th>Marks / ${
          exam ? exam.maxMarks : "—"
        }</th></tr></thead>
        <tbody>${
          students.length
            ? students
                .map(
                  (s) =>
                    `<tr><td data-label="Student">${UI.esc(s.name)}</td><td data-label="Marks"><input data-id="${s.id}" type="number" value="${
                      markMap[s.id] != null ? markMap[s.id] : ""
                    }" style="width:100px;min-height:40px;max-width:100%"></td></tr>`
                )
                .join("")
            : `<tr><td colspan="2" class="empty">No students in class ${UI.esc(className)}</td></tr>`
        }</tbody></table></div>
        ${!exams.length ? `<p class="empty">Ask the office to add exams in Settings, then refresh.</p>` : ""}`;
      root.querySelector("#cls").onchange = (e) => {
        className = e.target.value;
        subject = subjectsFor(className)[0];
        render();
      };
      root.querySelector("#subj").onchange = (e) => {
        subject = e.target.value;
        render();
      };
      root.querySelector("#ex").onchange = (e) => {
        examId = e.target.value;
        render();
      };
      root.querySelector("#save").onclick = async () => {
        if (!exam) {
          UI.toast("No exam selected", "error");
          return;
        }
        const entries = [...root.querySelectorAll("input[data-id]")].map((el) => ({
          studentId: el.dataset.id,
          marks: el.value === "" ? "" : Number(el.value)
        }));
        await Api.call("marks.save", {
          className,
          subject,
          examId: exam.id,
          examName: exam.name,
          maxMarks: exam.maxMarks,
          entries
        });
        UI.toast("Marks saved", "ok");
      };
    };
    await render();
  }

  async function reportCardsPage(root) {
    let allStudents = [];
    try {
      allStudents = await Api.call("students.list", {});
    } catch (e) {
      allStudents = [];
    }
    let className = UI.pickClassWithStudents(allStudents, "1");
    const render = async () => {
      let data = { cards: [], exams: [], school: AppCache.school() };
      try {
        data = await Api.call("reportcards.get", { className });
      } catch (e) {
        UI.toast(e.message || "Could not load report cards", "error");
      }
      if (!(data.cards || []).length) {
        const roster = (allStudents || []).filter(
          (s) => UI.classMatch(s.className, className) && (s.status === "Active" || !s.status)
        );
        data.cards = roster.map((s) => ({
          student: s,
          subjects: [],
          summary: { percent: null, grade: "—", result: "—", rank: null }
        }));
      }
      root.innerHTML = `
        <div class="page-header"><div><h2>Report cards</h2><p>Print mark sheets for the class</p></div>
          <div class="toolbar"><select id="cls">${UI.classOptions(className)}</select>
          <button class="btn" id="print">Print all</button></div></div>
        <div id="cards">${
          (data.cards || []).length
            ? data.cards.map((c) => reportCardHtml(c, data)).join("")
            : `<p class="empty">No students in class ${UI.esc(className)}</p>`
        }</div>`;
      root.querySelector("#cls").onchange = (e) => {
        className = e.target.value;
        render();
      };
      root.querySelector("#print").onclick = () => {
        const el = root.querySelector("#cards");
        if (el && el.querySelector(".print-doc")) UI.printHtml(el.innerHTML);
        else UI.toast("Nothing to print", "error");
      };
    };
    await render();
  }

  function reportCardHtml(c, data) {
    const school = data.school || AppCache.school();
    const examNames = (data.exams || []).map((e) => e.name);
    return `
      <div class="print-doc card" style="margin-bottom:1.5rem;page-break-after:always">
        <div class="print-header">
          <img src="${CONFIG.school.logo}" alt="">
          <div><h2>${UI.esc(school.name)}</h2><div>${UI.esc(school.address || "")}</div>
          <div>Report Card · ${UI.esc(AppCache.get().academicYear)}</div></div>
        </div>
        <p><strong>${UI.esc(c.student.name)}</strong> · Adm ${UI.esc(c.student.admissionNo)} · Class ${UI.esc(c.student.className)} · Parent ${UI.esc(c.student.parentName)}</p>
        <div class="table-wrap"><table class="data"><thead><tr><th>Subject</th>${examNames
          .map((n) => `<th>${UI.esc(n)}</th>`)
          .join("")}<th>Total</th><th>Grade</th></tr></thead>
        <tbody>${c.subjects
          .map(
            (r) =>
              `<tr><td>${UI.esc(r.subject)}</td>${examNames
                .map((n) => `<td>${r.exams[n] != null ? r.exams[n] : "—"}</td>`)
                .join("")}<td>${r.total != null ? r.total : "—"}</td><td>${UI.esc(r.grade)}</td></tr>`
          )
          .join("")}</tbody></table></div>
        <p>Overall: ${c.summary.percent != null ? c.summary.percent + "%" : "—"} · Grade ${UI.esc(c.summary.grade)} · ${UI.esc(c.summary.result)} ${c.summary.rank ? "· Rank " + c.summary.rank : ""}</p>
        <p style="margin-top:1.5rem">Class Teacher _____________ &nbsp;&nbsp; Principal _____________</p>
        <div class="ribbon">${UI.esc(school.motto || CONFIG.school.motto)}</div>
      </div>`;
  }

  async function timetablePage(root) {
    let className = "1";
    const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const render = async () => {
      const rows = await Api.call("timetable.get", { className });
      root.innerHTML = `
        <div class="page-header"><div><h2>Timetable</h2><p>Class periods for the week</p></div>
          <div class="toolbar"><select id="cls">${UI.classOptions(className)}</select>
          ${Auth.isPrincipal() ? `<button class="btn" id="add">Add period</button>` : ""}</div></div>
        <div class="card table-wrap"><table class="data"><thead><tr><th>Day</th><th>Period</th><th>Subject</th></tr></thead>
        <tbody>${rows
          .map((r) => `<tr><td>${UI.esc(r.day)}</td><td>${UI.esc(r.period)}</td><td>${UI.esc(r.subject)}</td></tr>`)
          .join("") || `<tr><td colspan="3" class="empty">No periods yet</td></tr>`}</tbody></table></div>`;
      root.querySelector("#cls").onchange = (e) => {
        className = e.target.value;
        render();
      };
      const add = root.querySelector("#add");
      if (add)
        add.onclick = async () => {
          await UI.modal({
            title: "Add period",
            body: `<div class="form-grid">
              <div class="form-row"><label>Day</label><select name="day">${days.map((d) => `<option>${d}</option>`).join("")}</select></div>
              <div class="form-row"><label>Period number</label><input name="period" value="1"></div>
              <div class="form-row"><label>Subject</label><input name="subject"></div></div>`,
            onSubmit: async (b) => {
              await Api.call("timetable.save", {
                className,
                day: UI.formVal(b, "day"),
                period: UI.formVal(b, "period"),
                subject: UI.formVal(b, "subject")
              });
              render();
              return true;
            }
          });
        };
    };
    await render();
  }

  async function noticesPage(root) {
    const list = await Api.call("notices.list", {});
    root.innerHTML = `
      <div class="page-header"><div><h2>Notices</h2><p>School announcements</p></div>
        ${Auth.isPrincipal() || AppCache.user().role === "Teacher" ? `<button class="btn" id="add">+ New notice</button>` : ""}</div>
      ${(list || [])
        .map(
          (n) =>
            `<div class="card"><h3>${UI.esc(n.title)}</h3><p style="color:var(--muted);font-size:0.85rem">${UI.esc(n.date)} · ${UI.esc(n.className)}</p><p>${UI.esc(n.body)}</p></div>`
        )
        .join("") || `<div class="card empty">No notices yet</div>`}`;
    const add = root.querySelector("#add");
    if (add)
      add.onclick = async () => {
        await UI.modal({
          title: "New notice",
          body: `<div class="form-row"><label>Title</label><input name="title"></div>
            <div class="form-row"><label>For class</label><select name="className"><option>All</option>${UI.classOptions()}</select></div>
            <div class="form-row"><label>Message</label><textarea name="body"></textarea></div>`,
          onSubmit: async (b) => {
            await Api.call("notices.create", {
              title: UI.formVal(b, "title"),
              className: UI.formVal(b, "className"),
              body: UI.formVal(b, "body")
            });
            noticesPage(root);
            return true;
          }
        });
      };
  }

  function officialDocHeader(school, titleLine) {
    return `
      <div class="print-header">
        <img src="${CONFIG.school.logo}" alt="">
        <div>
          <h2>${UI.esc(school.name || CONFIG.school.name)}</h2>
          <div>${UI.esc(school.address || CONFIG.school.address || "")}</div>
          <div>${UI.esc(titleLine)}</div>
        </div>
      </div>`;
  }

  function certificateBodyHtml(type, s, school, cert) {
    const year = AppCache.get()?.academicYear || CONFIG.school.academicYear;
    if (type === "TC") {
      return `
        <h3 style="text-align:center;margin:1.25rem 0 0.5rem">TRANSFER CERTIFICATE</h3>
        <p style="text-align:center;color:var(--muted)">No. ${UI.esc(cert.certNo)} · Issued ${UI.esc(cert.issueDate)}</p>
        <p style="margin-top:1.5rem;line-height:1.75">
          This is to certify that <strong>${UI.esc(s.name)}</strong>, Admission No. <strong>${UI.esc(s.admissionNo)}</strong>,
          son/daughter of <strong>${UI.esc(s.parentName || "—")}</strong>, was a student of class
          <strong>${UI.esc(s.className)}${s.section ? "-" + UI.esc(s.section) : ""}</strong>
          at ${UI.esc(school.name)} during the academic year ${UI.esc(year)}.
        </p>
        <p style="line-height:1.75">He/She is leaving the school with effect from the date of issue of this certificate.
          All school dues have been cleared as per records.</p>
        <p style="line-height:1.75">We wish him/her success in future studies.</p>`;
    }
    if (type === "ID") {
      return `
        <h3 style="text-align:center;margin:1.25rem 0 0.5rem">STUDENT IDENTITY CARD</h3>
        <p style="text-align:center;color:var(--muted)">ID No. ${UI.esc(cert.certNo)} · ${UI.esc(cert.issueDate)}</p>
        <div style="margin:1.5rem auto;max-width:320px;border:1px solid #cbd5e1;border-radius:12px;padding:1rem 1.1rem;line-height:1.6">
          <p><strong>Name:</strong> ${UI.esc(s.name)}</p>
          <p><strong>Admission No:</strong> ${UI.esc(s.admissionNo)}</p>
          <p><strong>Class:</strong> ${UI.esc(s.className)}${s.section ? "-" + UI.esc(s.section) : ""}</p>
          <p><strong>Parent:</strong> ${UI.esc(s.parentName || "—")}</p>
          <p><strong>Phone:</strong> ${UI.esc(s.phone || "—")}</p>
          <p><strong>Academic year:</strong> ${UI.esc(year)}</p>
        </div>
        <p style="text-align:center;font-size:0.9rem;color:var(--muted)">This card remains the property of the school.</p>`;
    }
    return `
      <h3 style="text-align:center;margin:1.25rem 0 0.5rem">BONAFIDE CERTIFICATE</h3>
      <p style="text-align:center;color:var(--muted)">No. ${UI.esc(cert.certNo)} · Issued ${UI.esc(cert.issueDate)}</p>
      <p style="margin-top:1.5rem;line-height:1.75">
        This is to certify that <strong>${UI.esc(s.name)}</strong>, Admission No. <strong>${UI.esc(s.admissionNo)}</strong>,
        son/daughter of <strong>${UI.esc(s.parentName || "—")}</strong>, is a bonafide student of class
        <strong>${UI.esc(s.className)}${s.section ? "-" + UI.esc(s.section) : ""}</strong>
        at ${UI.esc(school.name)} for the academic year ${UI.esc(year)}.
      </p>
      <p style="line-height:1.75">This certificate is issued on request for official purposes.</p>`;
  }

  async function certificatesPage(root) {
    const students = await Api.call("students.list", {});
    root.innerHTML = `
      <div class="page-header"><div><h2>Certificates</h2><p>Bonafide, transfer certificate, or student ID</p></div></div>
      <div class="card">
        <div class="form-grid">
          <div class="form-row"><label>Student</label><select id="stu">${(students || [])
            .map((s) => `<option value="${s.id}">${UI.esc(s.name)} (${UI.esc(s.className)})</option>`)
            .join("")}</select></div>
          <div class="form-row"><label>Certificate type</label><select id="type"><option value="Bonafide">Bonafide</option><option value="TC">Transfer (TC)</option><option value="ID">Student ID</option></select></div>
        </div>
        <button class="btn" id="issue">Make & print</button>
      </div>`;
    root.querySelector("#issue").onclick = async () => {
      const type = root.querySelector("#type").value;
      const cert = await Api.call("certificates.issue", {
        studentId: root.querySelector("#stu").value,
        type
      });
      const s = cert.student || {};
      const school = cert.school || AppCache.school();
      UI.printHtml(`
        <div class="print-doc">
          ${officialDocHeader(school, type + " Certificate · " + (cert.certNo || ""))}
          ${certificateBodyHtml(type, s, school, cert)}
          <p style="margin-top:3rem">Authorized Signatory / Principal</p>
          <div class="ribbon">${UI.esc(school.motto || CONFIG.school.motto || "")}</div>
        </div>`);
      UI.toast("Issued " + cert.certNo, "ok");
    };
  }

  async function financePage(root) {
    let reports, yoy, proj;
    try {
      const overview = await Api.call("finance.overview", {});
      reports = overview.reports;
      yoy = overview.yoy;
      proj = overview.projections;
    } catch (e) {
      // Fallback if older Apps Script deployment without finance.overview
      const triple = await Api.callAll([
        { action: "finance.reports" },
        { action: "finance.yoy" },
        { action: "finance.projections" }
      ]);
      reports = triple[0];
      yoy = triple[1];
      proj = triple[2];
    }
    root.innerHTML = `
      <div class="page-header"><div><h2>Accounts</h2><p>Money in, money out, and year outlook</p></div>
        <button class="btn btn-ghost" id="export">Download summary</button></div>
      <div class="grid grid-4">
        <div class="stat"><div class="label">Money in</div><div class="value ok">${UI.money(reports.income)}</div></div>
        <div class="stat"><div class="label">Money out</div><div class="value">${UI.money(reports.expenses)}</div></div>
        <div class="stat"><div class="label">Left over</div><div class="value">${UI.money(reports.surplus)}</div></div>
        <div class="stat"><div class="label">Fees collected %</div><div class="value">${reports.receivables.efficiency}%</div></div>
      </div>
      <div class="grid grid-2" style="margin-top:1rem">
        <div class="card"><h3>Compared with past years</h3>
          <p>Fees vs average: <strong>${UI.money(yoy.aheadBehind.collection)}</strong></p>
          <p>Spending vs average: <strong>${UI.money(yoy.aheadBehind.expenses)}</strong></p>
          <p style="color:var(--muted);font-size:0.85rem">Past average fees collected ${UI.money(yoy.averagePrevious.feeCollected)}</p>
        </div>
        <div class="card"><h3>Year-end outlook</h3>
          <p>Expected fees by year end: <strong>${UI.money(proj.expectedYearEndCollection)}</strong></p>
          <p>Expected still due: ${UI.money(proj.expectedPending)}</p>
          <p>Expected spending: ${UI.money(proj.expenseForecast)}</p>
          <p>Expected left over: <strong>${UI.money(proj.projectedSurplus)}</strong></p>
          <p style="color:var(--muted);font-size:0.8rem">${UI.esc(proj.note)}</p>
        </div>
      </div>
      <div class="card"><h3>Fees by payment type</h3>
        <div class="table-wrap"><table class="data"><tbody>
          ${Object.keys(reports.byMode)
            .map((k) => `<tr><td>${UI.esc(k)}</td><td>${UI.money(reports.byMode[k])}</td></tr>`)
            .join("")}
        </tbody></table></div></div>`;
    root.querySelector("#export").onclick = () => {
      UI.downloadCsv("finance_summary.csv", [
        ["Metric", "Value"],
        ["Income", reports.income],
        ["Expenses", reports.expenses],
        ["Surplus", reports.surplus],
        ["Pending", reports.receivables.pending],
        ["Projected collection", proj.expectedYearEndCollection]
      ]);
    };
  }

  async function importPage(root) {
    root.innerHTML = `
      <div class="page-header"><div><h2>Upload list</h2><p>Paste a spreadsheet list to add many rows at once</p></div></div>
      <div class="grid grid-2">
        <div class="card">
          <h3>Student list</h3>
          <p style="font-size:0.85rem;color:var(--muted)">First line must be: name,parentName,phone,className,annualFee,previousBalance</p>
          <textarea id="stuCsv" rows="8" placeholder="name,parentName,phone,className,annualFee,previousBalance&#10;Riya,Suresh,9876501234,3,22000,0"></textarea>
          <button class="btn" id="impStu" style="margin-top:0.75rem">Upload students</button>
        </div>
        <div class="card">
          <h3>Past year totals</h3>
          <p style="font-size:0.85rem;color:var(--muted)">First line must be: academicYear,month,feeCollected,expenses,enrollment,pendingBalance</p>
          <textarea id="yrCsv" rows="8" placeholder="academicYear,month,feeCollected,expenses,enrollment,pendingBalance&#10;2023-24,YEAR,4000000,3000000,220,250000"></textarea>
          <button class="btn" id="impYr" style="margin-top:0.75rem">Upload year totals</button>
        </div>
      </div>`;
    const parse = (text) => {
      const lines = text.trim().split(/\r?\n/);
      if (lines.length < 2) return [];
      const headers = lines[0].split(",").map((h) => h.trim());
      return lines.slice(1).map((line) => {
        const cols = line.split(",");
        const o = {};
        headers.forEach((h, i) => (o[h] = (cols[i] || "").trim()));
        return o;
      });
    };
    root.querySelector("#impStu").onclick = async () => {
      const rows = parse(root.querySelector("#stuCsv").value);
      const res = await Api.call("import.students", { rows });
      UI.toast("Added " + res.imported + " students", "ok");
    };
    root.querySelector("#impYr").onclick = async () => {
      const rows = parse(root.querySelector("#yrCsv").value);
      await Api.call("import.yearSummary", { rows });
      UI.toast("Year totals saved", "ok");
    };
  }

  async function settingsPage(root) {
    const [modulesRaw, services, settings] = await Api.callAll([
      { action: "modules.get" },
      { action: "services.list", payload: { includeInactive: true } },
      { action: "settings.get" }
    ]);
    const modules = { ...CONFIG.modulesDefault, ...(modulesRaw || {}) };
    const fees = { ...CONFIG.classFees, ...(settings.classFees || AppCache.classFees() || {}) };
    const subjectsMap = {
      ...CONFIG.subjectsByClass,
      ...(settings.subjectsByClass || AppCache.subjectsByClass() || {})
    };

    const moduleLabels = {
      enquiries: "Admission calls",
      whatsapp: "WhatsApp messages",
      expenses: "Spending",
      staff: "Staff",
      stock: "School store",
      transport: "Bus routes",
      exams: "Marks",
      timetable: "Timetable",
      certificates: "Certificates",
      finance: "Accounts"
    };

    root.innerHTML = `
      <div class="page-header"><div><h2>Settings</h2><p>Turn features on/off and set fees</p></div>
        <button class="btn btn-ghost" id="backup">Save backup</button></div>
      <div class="card"><h3>Features</h3>
        ${Object.keys(modules)
          .map(
            (k) =>
              `<label class="switch"><span>${UI.esc(moduleLabels[k] || k)}</span><input type="checkbox" data-mod="${k}" ${modules[k] ? "checked" : ""}></label>`
          )
          .join("")}
        <button class="btn" id="saveMod" style="margin-top:1rem">Save features</button>
      </div>
      <div class="card"><h3>Yearly fee by class</h3>
        <div class="table-wrap"><table class="data"><thead><tr><th>Class</th><th>Yearly fee (₹)</th></tr></thead>
        <tbody>${CONFIG.classes
          .map(
            (c) =>
              `<tr><td data-label="Class">${UI.esc(c)}</td>
              <td data-label="Fee"><input data-fee-class="${UI.esc(c)}" type="number" min="0" value="${fees[c] != null ? fees[c] : ""}" style="width:140px;max-width:100%;min-height:40px"></td></tr>`
          )
          .join("")}</tbody></table></div>
        <button class="btn" id="saveFees" style="margin-top:0.75rem">Save class fees</button>
      </div>
      <div class="card"><h3>Subjects for each class</h3>
        <p style="font-size:0.85rem;color:var(--muted);margin-bottom:0.75rem">Write subject names separated by commas</p>
        <div class="table-wrap"><table class="data"><thead><tr><th>Class</th><th>Subjects</th></tr></thead>
        <tbody>${CONFIG.classes
          .map((c) => {
            const list = subjectsMap[c] || [];
            return `<tr><td data-label="Class">${UI.esc(c)}</td>
              <td data-label="Subjects"><input data-subj-class="${UI.esc(c)}" value="${UI.esc(list.join(", "))}" style="width:100%;min-height:40px"></td></tr>`;
          })
          .join("")}</tbody></table></div>
        <button class="btn" id="saveSubj" style="margin-top:0.75rem">Save subjects</button>
      </div>
      <div class="card"><h3>Extra services</h3>
        <div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Cost</th><th>Type</th><th>On</th></tr></thead>
        <tbody>${(services || [])
          .map(
            (s) =>
              `<tr><td data-label="Name">${UI.esc(s.name)}</td><td data-label="Cost">${UI.money(s.cost)}</td>
              <td data-label="Type">${UI.esc(s.billingType)}</td>
              <td data-label="On">${s.active !== false && s.active !== "FALSE" ? "Yes" : "No"}</td></tr>`
          )
          .join("")}</tbody></table></div>
        <button class="btn" id="addSvc" style="margin-top:0.75rem">+ Add service</button>
      </div>
      ${Api.useDemo() ? `<div class="card"><button class="btn btn-accent" id="resetDemo">Reset demo data</button></div>` : ""}`;

    const refreshBoot = async () => {
      const boot = await Api.call("bootstrap", {});
      AppCache.set(boot);
      Router.renderNav();
    };

    root.querySelector("#saveMod").onclick = async () => {
      const m = { ...CONFIG.modulesDefault };
      root.querySelectorAll("[data-mod]").forEach((el) => (m[el.dataset.mod] = el.checked));
      await Api.call("modules.save", { modules: m });
      await refreshBoot();
      UI.toast("Features saved", "ok");
    };
    root.querySelector("#saveFees").onclick = async () => {
      const classFees = {};
      root.querySelectorAll("[data-fee-class]").forEach((el) => {
        classFees[el.dataset.feeClass] = Number(el.value) || 0;
      });
      await Api.call("settings.save", { classFees });
      await refreshBoot();
      UI.toast("Class fees saved", "ok");
    };
    root.querySelector("#saveSubj").onclick = async () => {
      const subjectsByClass = {};
      root.querySelectorAll("[data-subj-class]").forEach((el) => {
        subjectsByClass[el.dataset.subjClass] = String(el.value || "")
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean);
      });
      await Api.call("settings.save", { subjectsByClass });
      await refreshBoot();
      UI.toast("Subjects saved", "ok");
    };
    root.querySelector("#addSvc").onclick = async () => {
      await UI.modal({
        title: "Add service",
        body: `<div class="form-grid">
          <div class="form-row"><label>Name</label><input name="name"></div>
          <div class="form-row"><label>Cost</label><input name="cost" type="number"></div>
          <div class="form-row"><label>Charge type</label><select name="billingType"><option value="annual">Every year</option><option value="one-time">One time</option></select></div></div>`,
        onSubmit: async (b) => {
          await Api.call("services.save", {
            name: UI.formVal(b, "name"),
            cost: Number(UI.formVal(b, "cost")),
            billingType: UI.formVal(b, "billingType"),
            classes: CONFIG.classes
          });
          settingsPage(root);
          return true;
        }
      });
    };
    root.querySelector("#backup").onclick = async () => {
      const r = await Api.call("backup.trigger", {});
      UI.toast(r.name || "Backup done", "ok");
    };
    const reset = root.querySelector("#resetDemo");
    if (reset)
      reset.onclick = () => {
        if (confirm("Reset all demo data?")) {
          DemoAPI.reset();
          location.reload();
        }
      };
  }

  async function usersPage(root) {
    const list = await Api.call("users.list", {});
    root.innerHTML = `
      <div class="page-header"><div><h2>Logins</h2><p>Who can open this app</p></div><button class="btn" id="add">+ Add login</button></div>
      <div class="card table-wrap"><table class="data"><thead><tr><th>User name</th><th>Full name</th><th>Role</th><th>Class</th><th></th></tr></thead>
      <tbody>${list
        .map(
          (u) =>
            `<tr><td>${UI.esc(u.username)}</td><td>${UI.esc(u.displayName)}</td><td>${UI.esc(u.role)}</td><td>${UI.esc(u.classAssigned)}</td>
            <td><button class="btn btn-sm btn-ghost" data-reset="${u.id}">New password</button>
            ${u.active === false ? "" : `<button class="btn btn-sm btn-ghost" data-dis="${u.id}">Turn off</button>`}</td></tr>`
        )
        .join("")}</tbody></table></div>`;
    root.querySelector("#add").onclick = async () => {
      await UI.modal({
        title: "Add login",
        body: `<div class="form-grid">
          <div class="form-row"><label>User name</label><input name="username"></div>
          <div class="form-row"><label>Password</label><input name="password" value="ChangeMe@123"></div>
          <div class="form-row"><label>Full name</label><input name="displayName"></div>
          <div class="form-row"><label>Role</label><select name="role"><option>Teacher</option><option>Principal</option></select></div>
          <div class="form-row"><label>Class (for teachers)</label><input name="classAssigned" placeholder="1"></div></div>`,
        onSubmit: async (b) => {
          await Api.call("users.create", {
            username: UI.formVal(b, "username"),
            password: UI.formVal(b, "password"),
            displayName: UI.formVal(b, "displayName"),
            role: UI.formVal(b, "role"),
            classAssigned: UI.formVal(b, "classAssigned")
          });
          usersPage(root);
          return true;
        }
      });
    };
    root.querySelectorAll("[data-reset]").forEach((b) => {
      b.onclick = async () => {
        const pw = prompt("Enter a new password", "ChangeMe@123");
        if (!pw) return;
        await Api.call("users.resetPassword", { id: b.dataset.reset, password: pw });
        UI.toast("Password updated", "ok");
      };
    });
    root.querySelectorAll("[data-dis]").forEach((b) => {
      b.onclick = async () => {
        await Api.call("users.disable", { id: b.dataset.dis });
        usersPage(root);
      };
    });
  }

  async function yearPage(root) {
    root.innerHTML = `
      <div class="page-header"><div><h2>New school year</h2><p>Move students up and start the next year</p></div></div>
      <div class="grid grid-2">
        <div class="card">
          <h3>Move students up</h3>
          <p>All active students go to the next class. Class 10 becomes Passed out.</p>
          <button class="btn" id="promote">Move students up</button>
        </div>
        <div class="card">
          <h3>Finish this year</h3>
          <p>Saves this year’s money totals and opens the next school year.</p>
          <button class="btn btn-dark" id="close">Finish year</button>
        </div>
      </div>`;
    root.querySelector("#promote").onclick = async () => {
      if (!confirm("Move all active students to the next class?")) return;
      const r = await Api.call("promote.run", {});
      UI.toast("Moved to " + r.nextYear + " (" + r.results.length + " students)", "ok");
    };
    root.querySelector("#close").onclick = async () => {
      if (!confirm("Finish the current school year and open the next one?")) return;
      const r = await Api.call("year.close", {});
      const boot = await Api.call("bootstrap", {});
      AppCache.set(boot);
      UI.toast("Closed " + r.closed + " · Opened " + r.opened, "ok");
    };
  }

  return { registerAll };
})();
