/**
 * All SPA page handlers
 */
const Pages = (() => {
  function registerAll() {
    Router.register("#/dashboard", dashboardPage);
    Router.register("#/students", studentsPage, { principalOnly: true });
    Router.register("#/enquiries", enquiriesPage, { principalOnly: true });
    Router.register("#/fees", feesPage, { principalOnly: true });
    Router.register("#/pending", pendingPage, { principalOnly: true });
    Router.register("#/reminders", remindersPage, { principalOnly: true });
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
            <h2>Dashboard</h2>
            <p class="page-sub">${UI.esc(AppCache.get().academicYear || "")}</p>
          </div>
        </div>
        <div class="quick-actions" aria-label="Quick actions">
          <a class="qa-item qa-dark" href="#/fees"><span class="qa-ico">₹</span><span>Collect</span></a>
          <a class="qa-item" href="#/attendance"><span class="qa-ico">✓</span><span>Attend</span></a>
          <a class="qa-item" href="#/students"><span class="qa-ico">+</span><span>Admit</span></a>
          <a class="qa-item qa-accent" href="#/reminders"><span class="qa-ico">!</span><span>Remind${d.reminderCount ? ` (${d.reminderCount})` : ""}</span></a>
        </div>
        <div class="grid grid-4 stats-row">
          <div class="stat"><div class="label">Students</div><div class="value">${d.totalStudents}</div></div>
          <div class="stat"><div class="label">Fee today</div><div class="value ok">${UI.money(d.fees.today)}</div></div>
          <div class="stat"><div class="label">Pending</div><div class="value accent">${UI.money(d.fees.pendingTotal)}</div></div>
          <div class="stat"><div class="label">Attendance</div><div class="value">${d.attendanceToday.percent != null ? d.attendanceToday.percent + "%" : "—"}</div></div>
        </div>
        <div class="grid grid-2" style="margin-top:1rem">
          <div class="card">
            <h3>Class-wise enrollment</h3>
            <div class="chart-bars">
              ${classes
                .map(
                  (c) => `<div class="bar-wrap"><div class="bar" style="height:${Math.round((d.enrollmentByClass[c] / max) * 100)}%"></div><div class="lbl">${UI.esc(c)}<br>${d.enrollmentByClass[c]}</div></div>`
                )
                .join("")}
            </div>
          </div>
          <div class="card">
            <h3>Top defaulters</h3>
            <div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Class</th><th>Balance</th></tr></thead>
            <tbody>${(d.fees.topDefaulters || [])
              .map((x) => `<tr><td>${UI.esc(x.name)}</td><td>${UI.esc(x.className)}</td><td>${UI.money(x.balance)}</td></tr>`)
              .join("") || `<tr><td colspan="3" class="empty">None</td></tr>`}</tbody></table></div>
            <p style="margin-top:0.75rem;color:var(--muted);font-size:0.85rem">This month expenses: ${UI.money(d.expenseMonth)} · Collection this month: ${UI.money(d.fees.month)}</p>
          </div>
        </div>
        <div class="grid grid-2">
          <div class="card"><h3>Open enquiries</h3>
            ${(d.enquiries || []).map((e) => `<div class="check-item"><span>${UI.esc(e.name)} · ${UI.esc(e.classSought)}</span><a class="btn btn-sm btn-ghost" href="#/enquiries">Open</a></div>`).join("") || "<p class='empty'>No open enquiries</p>"}
          </div>
          <div class="card"><h3>Alerts</h3>
            ${(d.lowStock || []).map((i) => `<div class="check-item"><span class="badge badge-warn">Low stock</span> ${UI.esc(i.name)} (${i.qty})</div>`).join("")}
            ${(d.birthdays || []).map((b) => `<div class="check-item"><span class="badge badge-info">Birthday</span> ${UI.esc(b.name)}</div>`).join("")}
            ${!(d.lowStock || []).length && !(d.birthdays || []).length ? "<p class='empty'>No alerts</p>" : ""}
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
          <div><h2>Students</h2><p>Admissions and profiles</p></div>
          <button class="btn" id="btn-add-student">+ New admission</button>
        </div>
        <div class="toolbar">
          <input name="q" placeholder="Search name / admission / phone" value="${UI.esc(q)}" />
          <select name="className"><option value="">All classes</option>${UI.classOptions(className)}</select>
          <button class="btn btn-ghost" id="btn-search">Search</button>
        </div>
        <div class="card table-wrap"><table class="data">
          <thead><tr><th>Adm No</th><th>Name</th><th>Class</th><th>Parent</th><th>Phone</th><th>Status</th><th></th></tr></thead>
          <tbody>${list
            .map(
              (s) => `<tr>
              <td>${UI.esc(s.admissionNo)}</td><td>${UI.esc(s.name)}</td><td>${UI.esc(s.className)}-${UI.esc(s.section || "A")}</td>
              <td>${UI.esc(s.parentName)}</td><td>${UI.esc(s.phone)}</td>
              <td><span class="badge ${s.status === "Active" ? "badge-ok" : "badge-warn"}">${UI.esc(s.status || "Active")}</span></td>
              <td><button class="btn btn-sm btn-ghost" data-view="${s.id}">View</button>
                  <button class="btn btn-sm" data-fee="${s.id}">Fee</button></td></tr>`
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
    await UI.modal({
      title: existing ? "Edit student" : "New admission",
      submitLabel: "Save",
      body: `
        <div class="form-grid">
          <div class="form-row"><label>Name</label><input name="name" value="${UI.esc(s.name || "")}" required></div>
          <div class="form-row"><label>Class</label><select name="className">${UI.classOptions(s.className || "1")}</select></div>
          <div class="form-row"><label>Parent / Guardian</label><input name="parentName" value="${UI.esc(s.parentName || "")}"></div>
          <div class="form-row"><label>Phone</label><input name="phone" value="${UI.esc(s.phone || "")}"></div>
          <div class="form-row"><label>Annual fee</label><input name="annualFee" type="number" value="${s.annualFee || CONFIG.classFees[s.className || "1"] || 20000}"></div>
          <div class="form-row"><label>Concession</label><input name="concession" type="number" value="${s.concession || 0}"></div>
          <div class="form-row"><label>Concession reason</label><input name="concessionReason" value="${UI.esc(s.concessionReason || "")}"></div>
          <div class="form-row"><label>Pay-by date</label><input name="payByDate" type="date" value="${UI.esc(s.payByDate || "")}"></div>
          <div class="form-row"><label>Gender</label><select name="gender"><option value="">—</option><option ${s.gender==="M"?"selected":""}>M</option><option ${s.gender==="F"?"selected":""}>F</option></select></div>
          <div class="form-row"><label>DOB</label><input name="dob" type="date" value="${UI.esc(s.dob || "")}"></div>
          <div class="form-row" style="grid-column:1/-1"><label>Address</label><input name="address" value="${UI.esc(s.address || "")}"></div>
          <div class="form-row" style="grid-column:1/-1"><label>Sibling group ID (optional)</label><input name="siblingGroupId" value="${UI.esc(s.siblingGroupId || "")}" placeholder="Same ID links siblings"></div>
        </div>
        <h4 style="margin:1rem 0 0.5rem">Services</h4>
        ${services
          .map(
            (svc) =>
              `<label class="check-item"><input type="checkbox" name="svc_${svc.id}" data-cost="${svc.cost}" data-name="${UI.esc(svc.name)}" checked> ${UI.esc(svc.name)} — ${UI.money(svc.cost)}</label>`
          )
          .join("")}
        <h4 style="margin:1rem 0 0.5rem">Installments (optional)</h4>
        <div class="form-grid">
          <div class="form-row"><label>Term 1 due</label><input name="inst1date" type="date"><input name="inst1amt" type="number" placeholder="Amount" style="margin-top:0.35rem"></div>
          <div class="form-row"><label>Term 2 due</label><input name="inst2date" type="date"><input name="inst2amt" type="number" placeholder="Amount" style="margin-top:0.35rem"></div>
          <div class="form-row"><label>Term 3 due</label><input name="inst3date" type="date"><input name="inst3amt" type="number" placeholder="Amount" style="margin-top:0.35rem"></div>
        </div>`,
      onSubmit: async (backdrop) => {
        const f = (n) => UI.formVal(backdrop, n);
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
          name: f("name"),
          className: f("className"),
          parentName: f("parentName"),
          phone: f("phone"),
          annualFee: Number(f("annualFee")),
          concession: Number(f("concession")),
          concessionReason: f("concessionReason"),
          payByDate: f("payByDate"),
          gender: f("gender"),
          dob: f("dob"),
          address: f("address"),
          siblingGroupId: f("siblingGroupId"),
          services: opted,
          installments
        };
        if (!payload.name) throw new Error("Name required");
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
        <p>Annual fee ${UI.money(s.annualFee)} · Concession ${UI.money(s.concession)} · Paid ${UI.money(s.paidTotal)} · <strong>Balance ${UI.money(s.balance)}</strong></p>
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
      title: "Collect fee — " + s.name,
      submitLabel: "Collect & print",
      body: `
        <p>Balance: <strong class="badge badge-danger">${UI.money(s.balance)}</strong></p>
        <div class="form-grid">
          <div class="form-row"><label>Amount</label><input name="amount" type="number" value="${s.balance}"></div>
          <div class="form-row"><label>Mode</label>
            <select name="mode"><option>Cash</option><option>UPI</option><option>Cheque</option><option>Other</option></select></div>
          <div class="form-row"><label>Reference</label><input name="reference"></div>
          <div class="form-row"><label>Notes</label><input name="notes"></div>
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
        printReceipt(receipt);
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

  function printReceipt(r) {
    ReceiptPdf.open(r);
  }

  function viewReceipt(r) {
    ReceiptPdf.open(r);
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
    // Desktop / browsers without file share: download PDF, open WhatsApp with caption
    UI.toast("PDF downloaded — attach it in WhatsApp", "ok");
    window.open(UI.waLink(phone, text), "_blank", "noopener");
  }

  async function enquiriesPage(root) {
    const list = await Api.call("enquiries.list", {});
    root.innerHTML = `
      <div class="page-header"><div><h2>Enquiries</h2><p>Pre-admission tracking</p></div>
        <button class="btn" id="btn-enq">+ Enquiry</button></div>
      <div class="card table-wrap"><table class="data">
        <thead><tr><th>Name</th><th>Phone</th><th>Class</th><th>Follow-up</th><th>Status</th><th></th></tr></thead>
        <tbody>${list
          .map(
            (e) => `<tr><td>${UI.esc(e.name)}</td><td>${UI.esc(e.phone)}</td><td>${UI.esc(e.classSought)}</td>
            <td>${UI.esc(e.followUpDate)}</td><td>${UI.esc(e.status)}</td>
            <td>${e.status === "Open" ? `<button class="btn btn-sm" data-convert="${e.id}">Admit</button>` : ""}</td></tr>`
          )
          .join("")}</tbody></table></div>`;
    root.querySelector("#btn-enq").onclick = async () => {
      await UI.modal({
        title: "New enquiry",
        body: `<div class="form-grid">
          <div class="form-row"><label>Name</label><input name="name"></div>
          <div class="form-row"><label>Phone</label><input name="phone"></div>
          <div class="form-row"><label>Class sought</label><select name="classSought">${UI.classOptions("1")}</select></div>
          <div class="form-row"><label>Follow-up</label><input name="followUpDate" type="date"></div>
          <div class="form-row" style="grid-column:1/-1"><label>Notes</label><input name="notes"></div></div>`,
        onSubmit: async (b) => {
          await Api.call("enquiries.create", {
            name: UI.formVal(b, "name"),
            phone: UI.formVal(b, "phone"),
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
        UI.toast("Converted to admission", "ok");
        enquiriesPage(root);
      };
    });
  }

  async function feesPage(root) {
    const [pending, payments, students] = await Api.callAll([
      { action: "fees.pending" },
      { action: "fees.list" },
      { action: "students.list", payload: { includeAllStatuses: true } }
    ]);
    const byId = {};
    (students || []).forEach((s) => {
      byId[s.id] = s;
    });
    const allReceipts = (payments || [])
      .slice()
      .reverse()
      .map((p) => ({ ...p, student: byId[p.studentId] || {} }));

    let tab = "collect";
    let q = "";
    const isCancelled = (p) => {
      const v = p && p.cancelled;
      return v === true || v === "TRUE" || v === "true" || v === "Y" || v === 1 || v === "1";
    };

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
      const receipts = allReceipts.filter((p) =>
        matchesQ(p.student.name, p.student.admissionNo, p.receiptNo, p.student.className)
      );
      const receiptById = Object.fromEntries(allReceipts.map((p) => [p.id, p]));

      const collectHtml = `
        <div class="card table-wrap"><table class="data">
          <thead><tr><th>Student</th><th>Class</th><th>Balance</th><th></th></tr></thead>
          <tbody>${
            pendingFiltered.length
              ? pendingFiltered
                  .map(
                    (s) => `<tr>
                <td>${UI.esc(s.name)}</td><td>${UI.esc(s.className)}</td><td>${UI.money(s.balance)}</td>
                <td><button class="btn btn-sm" data-fee="${s.id}">Collect</button></td></tr>`
                  )
                  .join("")
              : `<tr><td colspan="4" class="empty">No matching students with balance</td></tr>`
          }</tbody></table></div>`;

      const receiptsHtml = `
        <div class="card table-wrap"><table class="data">
          <thead><tr><th>Receipt</th><th>Student</th><th>Amount</th><th>Mode</th><th>Date</th><th></th></tr></thead>
          <tbody>${
            receipts.length
              ? receipts
                  .map(
                    (p) => `<tr class="${isCancelled(p) ? "row-muted" : ""}">
                <td>${UI.esc(p.receiptNo)}</td>
                <td>${UI.esc(p.student.name || "—")}${
                      p.student.className
                        ? `<div class="cell-sub">${UI.esc(p.student.className)}</div>`
                        : ""
                    }</td>
                <td>${UI.money(p.amount)}</td>
                <td>${UI.esc(p.mode)}${
                      p.chequeStatus ? `<div class="cell-sub">${UI.esc(p.chequeStatus)}</div>` : ""
                    }</td>
                <td>${UI.esc(String(p.createdAt || "").slice(0, 10))}</td>
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
              : `<tr><td colspan="6" class="empty">No matching receipts</td></tr>`
          }</tbody></table></div>`;

      root.innerHTML = `
        <div class="page-header"><div><h2>Fee collection</h2><p>Part-payments and receipts</p></div></div>
        <div class="tabs" role="tablist">
          <button type="button" role="tab" data-tab="collect" class="${tab === "collect" ? "active" : ""}" aria-selected="${
            tab === "collect"
          }">Quick collect (${pendingFiltered.length})</button>
          <button type="button" role="tab" data-tab="receipts" class="${tab === "receipts" ? "active" : ""}" aria-selected="${
            tab === "receipts"
          }">Recent receipts (${receipts.length})</button>
        </div>
        <div class="toolbar">
          <input name="q" type="search" placeholder="Search student name / admission / receipt" value="${UI.esc(
            q
          )}" autocomplete="off" />
        </div>
        <div id="fees-panel">${tab === "receipts" ? receiptsHtml : collectHtml}</div>`;

      root.querySelectorAll("[data-tab]").forEach((btn) => {
        btn.onclick = () => render({ tab: btn.dataset.tab });
      });

      const searchInput = root.querySelector("[name=q]");
      let searchTimer;
      searchInput.oninput = () => {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(() => render({ q: searchInput.value, keepFocus: true }), 180);
      };
      searchInput.onkeydown = (ev) => {
        if (ev.key === "Enter") {
          clearTimeout(searchTimer);
          render({ q: searchInput.value, keepFocus: true });
        }
      };
      if (keepFocus) {
        searchInput.focus();
        const len = searchInput.value.length;
        try {
          searchInput.setSelectionRange(len, len);
        } catch (_) {}
      }

      root.querySelectorAll("[data-fee]").forEach((b) => {
        b.onclick = () => openCollectFee(b.dataset.fee, () => feesPage(root));
      });
      root.querySelectorAll("[data-view]").forEach((b) => {
        b.onclick = () => viewReceipt(receiptById[b.dataset.view]);
      });
      root.querySelectorAll("[data-share]").forEach((b) => {
        b.onclick = () => shareReceipt(receiptById[b.dataset.share]);
      });
      root.querySelectorAll("[data-cancel]").forEach((b) => {
        b.onclick = async () => {
          const reason = prompt("Cancel reason?");
          if (!reason) return;
          await Api.call("fees.cancel", { id: b.dataset.cancel, reason });
          feesPage(root);
        };
      });
      root.querySelectorAll("[data-cheque]").forEach((b) => {
        b.onclick = async () => {
          const status = prompt("Status: Pending / Cleared / Bounced", "Cleared");
          if (!status) return;
          await Api.call("cheque.updateStatus", { id: b.dataset.cheque, chequeStatus: status });
          UI.toast("Cheque updated", "ok");
          feesPage(root);
        };
      });
    };

    render();
  }

  async function pendingPage(root) {
    const className = "";
    const list = await Api.call("fees.pending", { className });
    root.innerHTML = `
      <div class="page-header"><div><h2>Pending fees</h2><p>Defaulters</p></div>
        <button class="btn btn-ghost" id="export">Export CSV</button></div>
      <div class="card table-wrap"><table class="data">
        <thead><tr><th>Name</th><th>Class</th><th>Phone</th><th>Pay by</th><th>Balance</th><th></th></tr></thead>
        <tbody>${list
          .map(
            (s) => `<tr><td>${UI.esc(s.name)}</td><td>${UI.esc(s.className)}</td><td>${UI.esc(s.phone)}</td>
            <td>${UI.esc(s.payByDate)}</td><td>${UI.money(s.balance)}</td>
            <td><button class="btn btn-sm" data-fee="${s.id}">Collect</button>
            <a class="btn btn-sm btn-ghost" target="_blank" href="${UI.waLink(
              s.phone,
              UI.fillTemplate(CONFIG.whatsappTemplates.feeReminder, {
                parentName: s.parentName,
                studentName: s.name,
                class: s.className,
                balance: s.balance,
                schoolName: AppCache.school().name
              })
            )}">WhatsApp</a></td></tr>`
          )
          .join("")}</tbody></table></div>`;
    root.querySelector("#export").onclick = () => {
      UI.downloadCsv("pending_fees.csv", [
        ["Name", "Class", "Phone", "Balance"],
        ...list.map((s) => [s.name, s.className, s.phone, s.balance])
      ]);
    };
    root.querySelectorAll("[data-fee]").forEach((b) => {
      b.onclick = () => openCollectFee(b.dataset.fee, () => pendingPage(root));
    });
  }

  async function remindersPage(root) {
    const list = await Api.call("reminders.queue", {});
    let idx = 0;
    const render = () => {
      const cur = list[idx];
      root.innerHTML = `
        <div class="page-header"><div><h2>Reminder queue</h2><p>Due / overdue fee follow-ups</p></div></div>
        <div class="card">
          ${
            cur
              ? `<h3>${UI.esc(cur.name)} · ${UI.esc(cur.className)}</h3>
            <p>Balance ${UI.money(cur.balance)}</p>
            <p>${(cur.reasons || []).map((r) => `<span class="badge badge-warn">${UI.esc(r)}</span> `).join("")}</p>
            <div class="toolbar">
              <a class="btn" id="wa" target="_blank" href="${UI.waLink(
                cur.phone,
                UI.fillTemplate(CONFIG.whatsappTemplates.feeReminder, {
                  parentName: cur.parentName,
                  studentName: cur.name,
                  class: cur.className,
                  balance: cur.balance,
                  schoolName: AppCache.school().name
                })
              )}">WhatsApp parent</a>
              <button class="btn btn-ghost" id="next">Next parent →</button>
            </div>
            <p style="color:var(--muted)">${idx + 1} of ${list.length}</p>`
              : `<p class="empty">Queue empty</p>`
          }
        </div>
        <div class="card table-wrap"><table class="data"><thead><tr><th>#</th><th>Name</th><th>Balance</th><th>Why</th></tr></thead>
        <tbody>${list
          .map(
            (x, i) =>
              `<tr ${i === idx ? 'style="background:#e5f3fb"' : ""}><td>${i + 1}</td><td>${UI.esc(x.name)}</td><td>${UI.money(x.balance)}</td><td>${UI.esc((x.reasons || []).join("; "))}</td></tr>`
          )
          .join("")}</tbody></table></div>`;
      const next = root.querySelector("#next");
      if (next)
        next.onclick = async () => {
          const msg = UI.fillTemplate(CONFIG.whatsappTemplates.feeReminder, {
            parentName: cur.parentName,
            studentName: cur.name,
            class: cur.className,
            balance: cur.balance,
            schoolName: AppCache.school().name
          });
          await Api.call("whatsapp.log", { type: "feeReminder", studentId: cur.studentId, phone: cur.phone, message: msg });
          idx++;
          render();
        };
      const wa = root.querySelector("#wa");
      if (wa)
        wa.onclick = async () => {
          await Api.call("whatsapp.log", {
            type: "feeReminder",
            studentId: cur.studentId,
            phone: cur.phone,
            message: "fee reminder"
          });
        };
    };
    render();
  }

  async function attendancePage(root) {
    const user = AppCache.user();
    const defaultClass = user.role === "Teacher" ? (user.classAssigned || "1").split("-")[0] : "1";
    let className = defaultClass;
    let date = new Date().toISOString().slice(0, 10);

    const render = async () => {
      const data = await Api.call("attendance.get", { className, date });
      const absent = new Set((data.record && data.record.absentIds) || []);
      const leave = new Set((data.record && data.record.leaveIds) || []);
      // offline draft
      try {
        const draft = JSON.parse(localStorage.getItem("svs_att_draft_" + className + "_" + date) || "null");
        if (draft && !data.record) {
          (draft.absentIds || []).forEach((id) => absent.add(id));
          (draft.leaveIds || []).forEach((id) => leave.add(id));
        }
      } catch (e) {}

      root.innerHTML = `
        <div class="page-header"><div><h2>Attendance</h2><p>Default present — mark absentees</p></div></div>
        <div class="toolbar">
          <select id="cls" ${user.role === "Teacher" ? "disabled" : ""}>${UI.classOptions(className)}</select>
          <input type="date" id="dt" value="${date}">
          <button class="btn" id="save">Save class</button>
          <button class="btn btn-ghost" id="msg-abs">Message absentees</button>
        </div>
        <div class="card">
          <div class="form-row"><label>Substitute / note</label><input id="notes" value="${UI.esc((data.record && data.record.notes) || "")}" placeholder="Teacher leave / substitute"></div>
          <div class="check-list" id="list">
            ${data.students
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
              .join("")}
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
    root.innerHTML = `
      <div class="page-header"><div><h2>WhatsApp</h2><p>Click-to-send with templates</p></div></div>
      <div class="card">
        <div class="form-row"><label>Template</label>
          <select id="tpl">${Object.keys(templates)
            .map((k) => `<option value="${k}">${k}</option>`)
            .join("")}</select></div>
        <div class="form-row"><label>Custom message body</label><textarea id="customMsg" placeholder="Used for event/complaint/custom"></textarea></div>
        <div class="table-wrap"><table class="data"><thead><tr><th>Student</th><th>Balance</th><th></th></tr></thead>
        <tbody>${pending
          .map(
            (s) => `<tr><td>${UI.esc(s.name)} (${UI.esc(s.className)})</td><td>${UI.money(s.balance)}</td>
            <td><button class="btn btn-sm" data-id="${s.id}" data-phone="${UI.esc(s.phone)}" data-name="${UI.esc(s.name)}" data-parent="${UI.esc(s.parentName)}" data-class="${UI.esc(s.className)}" data-bal="${s.balance}">Send</button></td></tr>`
          )
          .join("")}</tbody></table></div>
      </div>`;
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
        UI.toast("Logged", "ok");
      };
    });
  }

  async function expensesPage(root) {
    const list = await Api.call("expenses.list", {});
    root.innerHTML = `
      <div class="page-header"><div><h2>Expenses</h2></div><button class="btn" id="add">+ Expense</button></div>
      <div class="card table-wrap"><table class="data"><thead><tr><th>Date</th><th>Category</th><th>Amount</th><th>Mode</th><th>Notes</th></tr></thead>
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
        title: "Add expense",
        body: `<div class="form-grid">
          <div class="form-row"><label>Date</label><input name="date" type="date" value="${new Date().toISOString().slice(0, 10)}"></div>
          <div class="form-row"><label>Category</label><select name="category"><option>Utilities</option><option>Maintenance</option><option>Supplies</option><option>Transport</option><option>Events</option><option>Other</option></select></div>
          <div class="form-row"><label>Amount</label><input name="amount" type="number"></div>
          <div class="form-row"><label>Mode</label><select name="mode"><option>Cash</option><option>UPI</option><option>Bank</option></select></div>
          <div class="form-row" style="grid-column:1/-1"><label>Notes</label><input name="notes"></div></div>`,
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
      <div class="page-header"><div><h2>Staff & salary</h2></div><button class="btn" id="add">+ Staff</button></div>
      <div class="card table-wrap"><table class="data"><thead><tr><th>Name</th><th>Role</th><th>Phone</th><th>Salary</th><th></th></tr></thead>
      <tbody>${list
        .map(
          (s) =>
            `<tr><td>${UI.esc(s.name)}</td><td>${UI.esc(s.role)}</td><td>${UI.esc(s.phone)}</td><td>${UI.money(s.salary)}</td>
            <td><button class="btn btn-sm" data-pay="${s.id}">Pay salary</button></td></tr>`
        )
        .join("")}</tbody></table></div>`;
    root.querySelector("#add").onclick = async () => {
      await UI.modal({
        title: "Add staff",
        body: `<div class="form-grid">
          <div class="form-row"><label>Name</label><input name="name"></div>
          <div class="form-row"><label>Role</label><input name="role" value="Teacher"></div>
          <div class="form-row"><label>Phone</label><input name="phone"></div>
          <div class="form-row"><label>Salary</label><input name="salary" type="number"></div></div>`,
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
        UI.toast("Salary recorded as expense", "ok");
      };
    });
  }

  async function stockPage(root) {
    const list = await Api.call("stock.list", {});
    root.innerHTML = `
      <div class="page-header"><div><h2>Stock</h2></div><button class="btn" id="add">+ Item</button></div>
      <div class="card table-wrap"><table class="data"><thead><tr><th>Item</th><th>Category</th><th>Qty</th><th></th></tr></thead>
      <tbody>${list
        .map(
          (i) =>
            `<tr><td>${UI.esc(i.name)}</td><td>${UI.esc(i.category)}</td>
            <td>${i.qty <= i.reorderLevel ? `<span class="badge badge-warn">${i.qty}</span>` : i.qty}</td>
            <td><button class="btn btn-sm btn-ghost" data-in="${i.id}">+ Purchase</button>
                <button class="btn btn-sm btn-ghost" data-out="${i.id}">Issue</button></td></tr>`
        )
        .join("")}</tbody></table></div>`;
    root.querySelector("#add").onclick = async () => {
      await UI.modal({
        title: "Stock item",
        body: `<div class="form-grid">
          <div class="form-row"><label>Name</label><input name="name"></div>
          <div class="form-row"><label>Category</label><select name="category"><option>Books</option><option>Uniform</option></select></div>
          <div class="form-row"><label>Opening qty</label><input name="openingQty" type="number" value="0"></div>
          <div class="form-row"><label>Reorder level</label><input name="reorderLevel" type="number" value="5"></div></div>`,
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
      <div class="page-header"><div><h2>Transport routes</h2></div><button class="btn" id="add">+ Route</button></div>
      <div class="card table-wrap"><table class="data"><thead><tr><th>Route</th><th>Fee</th></tr></thead>
      <tbody>${list.map((r) => `<tr><td>${UI.esc(r.name)}</td><td>${UI.money(r.fee)}</td></tr>`).join("")}</tbody></table></div>`;
    root.querySelector("#add").onclick = async () => {
      await UI.modal({
        title: "Route",
        body: `<div class="form-row"><label>Name</label><input name="name"></div><div class="form-row"><label>Fee</label><input name="fee" type="number"></div>`,
        onSubmit: async (b) => {
          await Api.call("routes.save", { name: UI.formVal(b, "name"), fee: Number(UI.formVal(b, "fee")) });
          transportPage(root);
          return true;
        }
      });
    };
  }

  async function examsPage(root) {
    const exams = await Api.call("exams.list", {});
    let className = AppCache.user().role === "Teacher" ? (AppCache.user().classAssigned || "1").split("-")[0] : "1";
    let subject = (CONFIG.subjectsByClass[className] || ["English"])[0];
    let examId = exams[0] && exams[0].id;

    const render = async () => {
      const data = await Api.call("marks.get", { className, subject, examId });
      const exam = exams.find((e) => e.id === examId) || exams[0];
      const markMap = {};
      (data.marks || []).forEach((m) => {
        markMap[m.studentId] = m.marks;
      });
      root.innerHTML = `
        <div class="page-header"><div><h2>Exams & marks</h2></div></div>
        <div class="toolbar">
          <select id="cls">${UI.classOptions(className)}</select>
          <select id="subj">${(CONFIG.subjectsByClass[className] || [])
            .map((s) => `<option ${s === subject ? "selected" : ""}>${s}</option>`)
            .join("")}</select>
          <select id="ex">${exams.map((e) => `<option value="${e.id}" ${e.id === examId ? "selected" : ""}>${UI.esc(e.name)}</option>`).join("")}</select>
          <button class="btn" id="save">Save marks</button>
        </div>
        <div class="card table-wrap"><table class="data"><thead><tr><th>Student</th><th>Marks / ${exam ? exam.maxMarks : ""}</th></tr></thead>
        <tbody>${data.students
          .map(
            (s) =>
              `<tr><td>${UI.esc(s.name)}</td><td><input data-id="${s.id}" type="number" value="${markMap[s.id] != null ? markMap[s.id] : ""}" style="width:100px;min-height:40px"></td></tr>`
          )
          .join("")}</tbody></table></div>`;
      root.querySelector("#cls").onchange = (e) => {
        className = e.target.value;
        subject = (CONFIG.subjectsByClass[className] || ["English"])[0];
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
        const entries = [...root.querySelectorAll("input[data-id]")].map((el) => ({
          studentId: el.dataset.id,
          marks: el.value === "" ? "" : Number(el.value)
        }));
        await Api.call("marks.save", {
          className,
          subject,
          examId,
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
    let className = "1";
    const render = async () => {
      const data = await Api.call("reportcards.get", { className });
      root.innerHTML = `
        <div class="page-header"><div><h2>Report cards</h2></div>
          <div class="toolbar"><select id="cls">${UI.classOptions(className)}</select>
          <button class="btn" id="print">Print class</button></div></div>
        <div id="cards">${data.cards
          .map((c) => reportCardHtml(c, data))
          .join("")}</div>`;
      root.querySelector("#cls").onchange = (e) => {
        className = e.target.value;
        render();
      };
      root.querySelector("#print").onclick = () => UI.printHtml(root.querySelector("#cards").innerHTML);
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
        <div class="page-header"><div><h2>Timetable</h2></div>
          <div class="toolbar"><select id="cls">${UI.classOptions(className)}</select>
          ${Auth.isPrincipal() ? `<button class="btn" id="add">Add slot</button>` : ""}</div></div>
        <div class="card table-wrap"><table class="data"><thead><tr><th>Day</th><th>Period</th><th>Subject</th></tr></thead>
        <tbody>${rows
          .map((r) => `<tr><td>${UI.esc(r.day)}</td><td>${UI.esc(r.period)}</td><td>${UI.esc(r.subject)}</td></tr>`)
          .join("") || `<tr><td colspan="3" class="empty">No slots</td></tr>`}</tbody></table></div>`;
      root.querySelector("#cls").onchange = (e) => {
        className = e.target.value;
        render();
      };
      const add = root.querySelector("#add");
      if (add)
        add.onclick = async () => {
          await UI.modal({
            title: "Timetable slot",
            body: `<div class="form-grid">
              <div class="form-row"><label>Day</label><select name="day">${days.map((d) => `<option>${d}</option>`).join("")}</select></div>
              <div class="form-row"><label>Period</label><input name="period" value="1"></div>
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
      <div class="page-header"><div><h2>Notices</h2></div>
        ${Auth.isPrincipal() || AppCache.user().role === "Teacher" ? `<button class="btn" id="add">+ Notice</button>` : ""}</div>
      ${(list || [])
        .map(
          (n) =>
            `<div class="card"><h3>${UI.esc(n.title)}</h3><p style="color:var(--muted);font-size:0.85rem">${UI.esc(n.date)} · ${UI.esc(n.className)}</p><p>${UI.esc(n.body)}</p></div>`
        )
        .join("") || `<div class="card empty">No notices</div>`}`;
    const add = root.querySelector("#add");
    if (add)
      add.onclick = async () => {
        await UI.modal({
          title: "Notice",
          body: `<div class="form-row"><label>Title</label><input name="title"></div>
            <div class="form-row"><label>Class</label><select name="className"><option>All</option>${UI.classOptions()}</select></div>
            <div class="form-row"><label>Body</label><textarea name="body"></textarea></div>`,
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

  async function certificatesPage(root) {
    const students = await Api.call("students.list", {});
    root.innerHTML = `
      <div class="page-header"><div><h2>Certificates</h2><p>Bonafide, TC, ID — numbered series</p></div></div>
      <div class="card">
        <div class="form-grid">
          <div class="form-row"><label>Student</label><select id="stu">${students
            .map((s) => `<option value="${s.id}">${UI.esc(s.name)} (${UI.esc(s.className)})</option>`)
            .join("")}</select></div>
          <div class="form-row"><label>Type</label><select id="type"><option>Bonafide</option><option>TC</option><option>ID</option></select></div>
        </div>
        <button class="btn" id="issue">Issue & print</button>
      </div>`;
    root.querySelector("#issue").onclick = async () => {
      const cert = await Api.call("certificates.issue", {
        studentId: root.querySelector("#stu").value,
        type: root.querySelector("#type").value
      });
      const s = cert.student;
      const school = cert.school || AppCache.school();
      UI.printHtml(`
        <div class="print-doc">
          <div class="print-header"><img src="${CONFIG.school.logo}"><div>
            <h2>${UI.esc(school.name)}</h2><div>${UI.esc(school.address || "")}</div>
            <div>${UI.esc(cert.type)} Certificate · ${UI.esc(cert.certNo)}</div></div></div>
          <p style="margin-top:2rem;line-height:1.7">This is to certify that <strong>${UI.esc(s.name)}</strong>,
          Admission No. <strong>${UI.esc(s.admissionNo)}</strong>, is / was a bonafide student of class
          <strong>${UI.esc(s.className)}</strong> at ${UI.esc(school.name)}.</p>
          <p>Issued on ${UI.esc(cert.issueDate)}</p>
          <p style="margin-top:3rem">Principal</p>
          <div class="ribbon">${UI.esc(school.motto || "")}</div>
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
      <div class="page-header"><div><h2>Finance</h2><p>Reports, YoY, projections</p></div>
        <button class="btn btn-ghost" id="export">Export summary CSV</button></div>
      <div class="grid grid-4">
        <div class="stat"><div class="label">Income</div><div class="value ok">${UI.money(reports.income)}</div></div>
        <div class="stat"><div class="label">Expenses</div><div class="value">${UI.money(reports.expenses)}</div></div>
        <div class="stat"><div class="label">Surplus</div><div class="value">${UI.money(reports.surplus)}</div></div>
        <div class="stat"><div class="label">Collection efficiency</div><div class="value">${reports.receivables.efficiency}%</div></div>
      </div>
      <div class="grid grid-2" style="margin-top:1rem">
        <div class="card"><h3>Year vs previous average</h3>
          <p>Collection vs avg: <strong>${UI.money(yoy.aheadBehind.collection)}</strong></p>
          <p>Expenses vs avg: <strong>${UI.money(yoy.aheadBehind.expenses)}</strong></p>
          <p style="color:var(--muted);font-size:0.85rem">Avg previous collection ${UI.money(yoy.averagePrevious.feeCollected)}</p>
        </div>
        <div class="card"><h3>Projections</h3>
          <p>Expected year-end collection: <strong>${UI.money(proj.expectedYearEndCollection)}</strong></p>
          <p>Expected pending: ${UI.money(proj.expectedPending)}</p>
          <p>Expense forecast: ${UI.money(proj.expenseForecast)}</p>
          <p>Projected surplus: <strong>${UI.money(proj.projectedSurplus)}</strong></p>
          <p style="color:var(--muted);font-size:0.8rem">${UI.esc(proj.note)}</p>
        </div>
      </div>
      <div class="card"><h3>Income by mode</h3>
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
      <div class="page-header"><div><h2>Import</h2><p>CSV students & year summaries</p></div></div>
      <div class="grid grid-2">
        <div class="card">
          <h3>Students CSV</h3>
          <p style="font-size:0.85rem;color:var(--muted)">Headers: name,parentName,phone,className,annualFee,previousBalance</p>
          <textarea id="stuCsv" rows="8" placeholder="name,parentName,phone,className,annualFee,previousBalance&#10;Riya,Suresh,9876501234,3,22000,0"></textarea>
          <button class="btn" id="impStu" style="margin-top:0.75rem">Import students</button>
        </div>
        <div class="card">
          <h3>Year summary CSV</h3>
          <p style="font-size:0.85rem;color:var(--muted)">Headers: academicYear,month,feeCollected,expenses,enrollment,pendingBalance</p>
          <textarea id="yrCsv" rows="8" placeholder="academicYear,month,feeCollected,expenses,enrollment,pendingBalance&#10;2023-24,YEAR,4000000,3000000,220,250000"></textarea>
          <button class="btn" id="impYr" style="margin-top:0.75rem">Import year data</button>
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
      UI.toast("Imported " + res.imported + " students", "ok");
    };
    root.querySelector("#impYr").onclick = async () => {
      const rows = parse(root.querySelector("#yrCsv").value);
      await Api.call("import.yearSummary", { rows });
      UI.toast("Year summary imported", "ok");
    };
  }

  async function settingsPage(root) {
    const [modules, services] = await Api.callAll([
      { action: "modules.get" },
      { action: "services.list", payload: { includeInactive: true } }
    ]);
    root.innerHTML = `
      <div class="page-header"><div><h2>Settings</h2><p>Modules & services</p></div>
        <button class="btn btn-ghost" id="backup">Backup now</button></div>
      <div class="card"><h3>Modules</h3>
        ${Object.keys(modules)
          .map(
            (k) =>
              `<label class="switch"><span>${k}</span><input type="checkbox" data-mod="${k}" ${modules[k] ? "checked" : ""}></label>`
          )
          .join("")}
        <button class="btn" id="saveMod" style="margin-top:1rem">Save modules</button>
      </div>
      <div class="card"><h3>Services catalog</h3>
        <div class="table-wrap"><table class="data"><thead><tr><th>Name</th><th>Cost</th><th>Type</th><th>Active</th></tr></thead>
        <tbody>${services
          .map(
            (s) =>
              `<tr><td>${UI.esc(s.name)}</td><td>${UI.money(s.cost)}</td><td>${UI.esc(s.billingType)}</td>
              <td>${s.active !== false && s.active !== "FALSE" ? "Yes" : "No"}</td></tr>`
          )
          .join("")}</tbody></table></div>
        <button class="btn" id="addSvc" style="margin-top:0.75rem">+ Service</button>
      </div>
      ${Api.useDemo() ? `<div class="card"><button class="btn btn-accent" id="resetDemo">Reset demo data</button></div>` : ""}`;
    root.querySelector("#saveMod").onclick = async () => {
      const m = {};
      root.querySelectorAll("[data-mod]").forEach((el) => (m[el.dataset.mod] = el.checked));
      await Api.call("modules.save", { modules: m });
      const boot = await Api.call("bootstrap", {});
      AppCache.set(boot);
      Router.renderNav();
      UI.toast("Modules saved", "ok");
    };
    root.querySelector("#addSvc").onclick = async () => {
      await UI.modal({
        title: "Service",
        body: `<div class="form-grid">
          <div class="form-row"><label>Name</label><input name="name"></div>
          <div class="form-row"><label>Cost</label><input name="cost" type="number"></div>
          <div class="form-row"><label>Billing</label><select name="billingType"><option>annual</option><option>one-time</option></select></div></div>`,
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
      <div class="page-header"><div><h2>Users</h2></div><button class="btn" id="add">+ User</button></div>
      <div class="card table-wrap"><table class="data"><thead><tr><th>Username</th><th>Name</th><th>Role</th><th>Class</th><th></th></tr></thead>
      <tbody>${list
        .map(
          (u) =>
            `<tr><td>${UI.esc(u.username)}</td><td>${UI.esc(u.displayName)}</td><td>${UI.esc(u.role)}</td><td>${UI.esc(u.classAssigned)}</td>
            <td><button class="btn btn-sm btn-ghost" data-reset="${u.id}">Reset password</button>
            ${u.active === false ? "" : `<button class="btn btn-sm btn-ghost" data-dis="${u.id}">Disable</button>`}</td></tr>`
        )
        .join("")}</tbody></table></div>`;
    root.querySelector("#add").onclick = async () => {
      await UI.modal({
        title: "Create user",
        body: `<div class="form-grid">
          <div class="form-row"><label>Username</label><input name="username"></div>
          <div class="form-row"><label>Password</label><input name="password" value="ChangeMe@123"></div>
          <div class="form-row"><label>Display name</label><input name="displayName"></div>
          <div class="form-row"><label>Role</label><select name="role"><option>Teacher</option><option>Principal</option></select></div>
          <div class="form-row"><label>Class assigned</label><input name="classAssigned" placeholder="1"></div></div>`,
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
        const pw = prompt("New password", "ChangeMe@123");
        if (!pw) return;
        await Api.call("users.resetPassword", { id: b.dataset.reset, password: pw });
        UI.toast("Password reset", "ok");
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
      <div class="page-header"><div><h2>Promotion & year close</h2></div></div>
      <div class="grid grid-2">
        <div class="card">
          <h3>Bulk promote</h3>
          <p>Moves Active students to next class for the next academic year. Class 10 → Passed out.</p>
          <button class="btn" id="promote">Run promotion</button>
        </div>
        <div class="card">
          <h3>Close academic year</h3>
          <p>Archives finance totals into YearSummary and opens the next year.</p>
          <button class="btn btn-dark" id="close">Close year</button>
        </div>
      </div>`;
    root.querySelector("#promote").onclick = async () => {
      if (!confirm("Promote all active students?")) return;
      const r = await Api.call("promote.run", {});
      UI.toast("Promoted → " + r.nextYear + " (" + r.results.length + ")", "ok");
    };
    root.querySelector("#close").onclick = async () => {
      if (!confirm("Close current academic year?")) return;
      const r = await Api.call("year.close", {});
      const boot = await Api.call("bootstrap", {});
      AppCache.set(boot);
      UI.toast("Closed " + r.closed + " · Opened " + r.opened, "ok");
    };
  }

  return { registerAll };
})();
