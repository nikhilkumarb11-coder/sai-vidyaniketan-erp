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

  function modal({ title, body, onSubmit, submitLabel = "Save" }) {
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
    });
  }

  function formVal(root, name) {
    const el = root.querySelector(`[name="${name}"]`);
    if (!el) return "";
    if (el.type === "checkbox") return el.checked;
    return el.value;
  }

  function printHtml(html) {
    const w = window.open("", "_blank");
    w.document.write(`<!doctype html><html><head><title>Print</title>
      <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Poppins:wght@400;500;600&display=swap" rel="stylesheet">
      <link rel="stylesheet" href="css/theme.css"><link rel="stylesheet" href="css/app.css">
      <style>body{background:#fff;padding:1rem}</style>
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
    pickClassWithStudents
  };
})();
