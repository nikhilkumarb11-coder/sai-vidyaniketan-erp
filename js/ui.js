const UI = (() => {
  function toast(msg, type = "") {
    const el = document.createElement("div");
    el.className = "toast " + type;
    el.textContent = msg;
    document.getElementById("toasts").appendChild(el);
    setTimeout(() => el.remove(), 3200);
  }

  function money(n) {
    const v = Number(n) || 0;
    return "₹" + v.toLocaleString("en-IN");
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function modal({ title, body, onSubmit, submitLabel = "Save", onReady }) {
    return new Promise((resolve) => {
      const backdrop = document.createElement("div");
      backdrop.className = "modal-backdrop";
      backdrop.innerHTML = `
        <div class="modal" role="dialog" aria-modal="true">
          <h3>${esc(title)}</h3>
          <div class="modal-body">${body}</div>
          <div class="modal-actions">
            <button type="button" class="btn btn-ghost" data-cancel>Cancel</button>
            <button type="button" class="btn btn-dark" data-ok>${esc(submitLabel)}</button>
          </div>
        </div>`;
      document.body.appendChild(backdrop);
      const close = (val) => {
        backdrop.remove();
        resolve(val);
      };
      backdrop.addEventListener("click", (ev) => {
        if (ev.target === backdrop) close(null);
      });
      backdrop.querySelector("[data-cancel]").onclick = () => close(null);
      backdrop.querySelector("[data-ok]").onclick = async () => {
        const okBtn = backdrop.querySelector("[data-ok]");
        if (onSubmit) {
          try {
            okBtn.disabled = true;
            const result = await onSubmit(backdrop);
            close(result);
          } catch (e) {
            okBtn.disabled = false;
            toast(e.message, "error");
          }
        } else close(true);
      };
      if (typeof onReady === "function") {
        try {
          onReady(backdrop);
        } catch (e) {}
      }
    });
  }

  function ageFromDob(dob) {
    if (!dob) return "";
    const d = new Date(String(dob).slice(0, 10) + "T12:00:00");
    if (Number.isNaN(d.getTime())) return "";
    const now = new Date();
    let years = now.getFullYear() - d.getFullYear();
    const m = now.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < d.getDate())) years -= 1;
    if (years < 0) return "";
    return years + (years === 1 ? " year" : " years");
  }

  function digitsOnly(s, max) {
    const d = String(s || "").replace(/\D/g, "");
    return max ? d.slice(0, max) : d;
  }

  function formVal(root, name) {
    const el = root.querySelector(`[name="${name}"]`);
    if (!el) return "";
    if (el.type === "checkbox") return el.checked;
    return el.value;
  }

  function printHtml(html) {
    const build =
      (typeof CONFIG !== "undefined" && CONFIG.appVersion) ||
      (typeof window !== "undefined" && window.__SVS_BUILD__) ||
      "29";
    const w = window.open("", "_blank");
    w.document.write(`<!doctype html><html><head><title>Print</title>
      <meta name="viewport" content="width=device-width, initial-scale=1" />
      <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="css/theme.css?v=${build}"><link rel="stylesheet" href="css/app.css?v=${build}">
      <style>
        body{background:#fff;padding:0.75rem;font-family:inherit}
        .print-doc{box-shadow:none;border:none;max-width:none;margin:0 0 1.25rem;page-break-after:always}
        .print-doc .table-wrap{overflow:visible;border:1px solid #cbd5e1}
        .print-doc table.data,.print-doc table.data.keep-table{display:table;width:100%;min-width:0;border-collapse:collapse}
        .print-doc table.data thead{display:table-header-group}
        .print-doc table.data tbody tr{display:table-row;background:transparent;border:none;box-shadow:none;margin:0;padding:0}
        .print-doc table.data th,.print-doc table.data td{display:table-cell;text-align:left;padding:0.35rem 0.45rem;border:1px solid #e2e8f0;white-space:nowrap}
        .print-doc table.data td::before{content:none!important;display:none!important}
        .print-header{display:flex;align-items:center;gap:0.75rem}
        .print-header h2,.print-header > div > div{text-align:left}
        @media print{body{padding:0}.print-doc{page-break-after:always}}
      </style>
      </head><body>${html}</body></html>`);
    w.document.close();
    setTimeout(() => w.print(), 400);
  }

  function downloadCsv(filename, rows) {
    const csv = rows
      .map((r) =>
        r
          .map((c) => {
            const s = String(c == null ? "" : c);
            return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
          })
          .join(",")
      )
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
  }

  function normalizeClass(c) {
    return String(c == null ? "" : c)
      .trim()
      .replace(/^class\s+/i, "")
      .replace(/\s+/g, " ")
      .toLowerCase();
  }

  function classMatch(a, b) {
    return normalizeClass(a) === normalizeClass(b);
  }

  function classOptions(selected) {
    return CONFIG.classes
      .map((c) => `<option value="${c}" ${classMatch(c, selected) ? "selected" : ""}>${c}</option>`)
      .join("");
  }

  /** Prefer a class that actually has active students. */
  function pickClassWithStudents(students, preferred) {
    const active = (students || []).filter((s) => s.status === "Active" || !s.status);
    if (preferred && active.some((s) => classMatch(s.className, preferred))) {
      const hit = active.find((s) => classMatch(s.className, preferred));
      return hit.className;
    }
    const first = active[0];
    return first ? first.className : preferred || (CONFIG.classes && CONFIG.classes[0]) || "1";
  }

  function waLink(phone, text) {
    let d = String(phone || "").replace(/\D/g, "");
    if (d.length === 10) d = "91" + d;
    return `https://wa.me/${d}?text=${encodeURIComponent(text || "")}`;
  }

  function fillTemplate(tpl, vars) {
    return String(tpl || "").replace(/\{(\w+)\}/g, (_, k) => (vars[k] != null ? vars[k] : ""));
  }

  return {
    toast,
    money,
    esc,
    modal,
    formVal,
    printHtml,
    downloadCsv,
    classOptions,
    waLink,
    fillTemplate,
    normalizeClass,
    classMatch,
    pickClassWithStudents,
    ageFromDob,
    digitsOnly
  };
})();
