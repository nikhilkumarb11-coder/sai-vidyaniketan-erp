/**
 * Branded fee-receipt PDF + in-browser viewer (no auto-download on View).
 */
const ReceiptPdf = (() => {
  let logoCache = null;

  /** Helvetica WinAnsi widths (/1000). Fallback 600. */
  const W_REG = {
    32: 278, 33: 278, 34: 355, 35: 556, 36: 556, 37: 889, 38: 667, 39: 191, 40: 333, 41: 333,
    42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278, 48: 556, 49: 556, 50: 556, 51: 556,
    52: 556, 53: 556, 54: 556, 55: 556, 56: 556, 57: 556, 58: 278, 59: 278, 60: 584, 61: 584,
    62: 584, 63: 556, 64: 1015, 65: 667, 66: 667, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
    72: 722, 73: 278, 74: 500, 75: 667, 76: 556, 77: 833, 78: 722, 79: 778, 80: 667, 81: 778,
    82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944, 88: 667, 89: 667, 90: 611, 91: 278,
    92: 278, 93: 278, 94: 469, 95: 556, 96: 333, 97: 556, 98: 556, 99: 500, 100: 556, 101: 556,
    102: 278, 103: 556, 104: 556, 105: 222, 106: 222, 107: 500, 108: 222, 109: 833, 110: 556,
    111: 556, 112: 556, 113: 556, 114: 333, 115: 500, 116: 278, 117: 556, 118: 500, 119: 722,
    120: 500, 121: 500, 122: 500, 123: 334, 124: 260, 125: 334, 126: 584
  };
  const W_BOLD = {
    32: 278, 33: 333, 34: 474, 35: 556, 36: 556, 37: 889, 38: 722, 39: 238, 40: 333, 41: 333,
    42: 389, 43: 584, 44: 278, 45: 333, 46: 278, 47: 278, 48: 556, 49: 556, 50: 556, 51: 556,
    52: 556, 53: 556, 54: 556, 55: 556, 56: 556, 57: 556, 58: 333, 59: 333, 60: 584, 61: 584,
    62: 584, 63: 611, 64: 975, 65: 722, 66: 722, 67: 722, 68: 722, 69: 667, 70: 611, 71: 778,
    72: 722, 73: 278, 74: 556, 75: 722, 76: 611, 77: 833, 78: 722, 79: 778, 80: 667, 81: 778,
    82: 722, 83: 667, 84: 611, 85: 722, 86: 667, 87: 944, 88: 667, 89: 667, 90: 611, 91: 333,
    92: 278, 93: 333, 94: 584, 95: 556, 96: 333, 97: 556, 98: 611, 99: 556, 100: 611, 101: 556,
    102: 333, 103: 611, 104: 611, 105: 278, 106: 278, 107: 556, 108: 278, 109: 889, 110: 611,
    111: 611, 112: 611, 113: 611, 114: 389, 115: 556, 116: 333, 117: 611, 118: 556, 119: 778,
    120: 556, 121: 556, 122: 500, 123: 389, 124: 280, 125: 389, 126: 584
  };

  function escPdf(str) {
    return String(str == null ? "" : str)
      .replace(/\\/g, "\\\\")
      .replace(/\(/g, "\\(")
      .replace(/\)/g, "\\)");
  }

  function moneyRs(n) {
    const v = Number(n) || 0;
    return "Rs." + v.toLocaleString("en-IN");
  }

  function formatDate(iso) {
    const s = String(iso || "").slice(0, 10);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return s || "—";
    const d = new Date(s + "T12:00:00");
    return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
  }

  function filenameFor(r) {
    return String(r.receiptNo || "receipt").replace(/[^\w.-]+/g, "_") + ".pdf";
  }

  function isCancelled(r) {
    const v = r && r.cancelled;
    return v === true || v === "TRUE" || v === "true" || v === "Y" || v === 1 || v === "1";
  }

  function textWidth(text, size, bold) {
    const table = bold ? W_BOLD : W_REG;
    let w = 0;
    const s = String(text || "");
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      w += table[c] || 600;
    }
    return (w * size) / 1000;
  }

  function jpegSize(bytes) {
    let i = 2;
    while (i < bytes.length) {
      if (bytes[i] !== 0xff) break;
      const marker = bytes[i + 1];
      if (marker === 0xd9 || marker === 0xda) break;
      const len = (bytes[i + 2] << 8) + bytes[i + 3];
      if (marker >= 0xc0 && marker <= 0xc3) {
        return {
          height: (bytes[i + 5] << 8) + bytes[i + 6],
          width: (bytes[i + 7] << 8) + bytes[i + 8]
        };
      }
      i += 2 + len;
    }
    return { width: 120, height: 120 };
  }

  async function loadLogo() {
    if (logoCache !== null) return logoCache || null;
    const cfg = typeof CONFIG !== "undefined" ? CONFIG : {};
    const src = (cfg.school && cfg.school.logo) || "assets/logo.jpg";
    try {
      const res = await fetch(src);
      if (!res.ok) throw new Error("logo fetch failed");
      const buf = new Uint8Array(await res.arrayBuffer());
      if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error("not jpeg");
      const dim = jpegSize(buf);
      logoCache = { bytes: buf, width: dim.width, height: dim.height };
    } catch (_) {
      logoCache = false;
    }
    return logoCache || null;
  }

  function Writer() {
    this.parts = [];
    this.length = 0;
  }
  Writer.prototype.str = function (s) {
    const u = new Uint8Array(s.length);
    for (let i = 0; i < s.length; i++) u[i] = s.charCodeAt(i) & 0xff;
    this.parts.push(u);
    this.length += u.length;
  };
  Writer.prototype.bytes = function (u) {
    this.parts.push(u);
    this.length += u.length;
  };
  Writer.prototype.toUint8Array = function () {
    const out = new Uint8Array(this.length);
    let off = 0;
    this.parts.forEach((p) => {
      out.set(p, off);
      off += p.length;
    });
    return out;
  };

  function buildPdf(r, logo) {
    const school = r.school || (typeof AppCache !== "undefined" ? AppCache.school() : {}) || {};
    const st = r.student || {};
    const cfg = typeof CONFIG !== "undefined" ? CONFIG : { receipt: {}, school: {} };
    const schoolName = school.name || cfg.school.name || "School";
    const address = school.address || cfg.school.address || "";
    const phone = school.phone || cfg.school.phone || "";
    const email = school.email || cfg.school.email || "";
    const motto = school.motto || (cfg.school && cfg.school.motto) || "Knowledge is Wisdom";
    const year =
      r.academicYear ||
      (typeof AppCache !== "undefined" && AppCache.get() && AppCache.get().academicYear) ||
      (cfg.school && cfg.school.academicYear) ||
      "";
    const receiptTitle = (cfg.receipt && cfg.receipt.header) || "Fee Receipt";
    const signLabel = (cfg.receipt && cfg.receipt.signatureLabel) || "Authorized Signatory";
    const dateLabel = formatDate(r.createdAt);
    const cancelled = isCancelled(r);

    const pageW = 595;
    const pageH = 842;
    const margin = 42;
    const right = pageW - margin;
    const contentW = right - margin;
    const colGap = 24;
    const colW = (contentW - colGap) / 2;
    const col1X = margin;
    const col2X = margin + colW + colGap;

    const ink = "0.059 0.090 0.165";
    const muted = "0.392 0.455 0.545";
    const primary = "0.145 0.388 0.922";
    const soft = "0.945 0.961 0.976";
    const line = "0.886 0.910 0.941";
    const white = "1 1 1";
    const danger = "0.882 0.114 0.282";
    const success = "0.020 0.588 0.412";
    const headerMuted = "0.78 0.82 0.88";

    const ops = [];
    const fill = (rgb) => ops.push(rgb + " rg");
    const strokeCol = (rgb) => ops.push(rgb + " RG");
    const rect = (x, y, w, h) => ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    const fillRect = (x, y, w, h, rgb) => {
      fill(rgb);
      rect(x, y, w, h);
      ops.push("f");
    };
    const strokeRect = (x, y, w, h, rgb, lw) => {
      ops.push(`${lw || 1} w`);
      strokeCol(rgb);
      rect(x, y, w, h);
      ops.push("S");
    };
    const lineH = (x1, x2, y, rgb, lw) => {
      ops.push(`${lw || 0.8} w`);
      strokeCol(rgb || line);
      ops.push(`${x1.toFixed(2)} ${y.toFixed(2)} m ${x2.toFixed(2)} ${y.toFixed(2)} l S`);
    };
    const lineV = (x, y1, y2, rgb, lw) => {
      ops.push(`${lw || 0.8} w`);
      strokeCol(rgb || line);
      ops.push(`${x.toFixed(2)} ${y1.toFixed(2)} m ${x.toFixed(2)} ${y2.toFixed(2)} l S`);
    };
    const textAt = (str, x, y, size, opts) => {
      opts = opts || {};
      const bold = !!opts.bold;
      const color = opts.color || ink;
      const raw = String(str == null ? "" : str);
      let tx = x;
      if (opts.align === "center") tx = x - textWidth(raw, size, bold) / 2;
      if (opts.align === "right") tx = x - textWidth(raw, size, bold);
      ops.push("BT");
      ops.push(`${bold ? "/F2" : "/F1"} ${size} Tf`);
      ops.push(`${color} rg`);
      ops.push(`1 0 0 1 ${tx.toFixed(2)} ${y.toFixed(2)} Tm`);
      ops.push(`(${escPdf(raw)}) Tj`);
      ops.push("ET");
    };

    /** Label above value in a fixed column (left-aligned). */
    const field = (x, yLabel, label, value, valueSize) => {
      textAt(label, x, yLabel, 8, { color: muted });
      textAt(value || "—", x, yLabel - 14, valueSize || 11, { bold: true, color: ink });
    };

    fillRect(0, 0, pageW, pageH, white);

    // —— Header ——
    const headerH = 100;
    fillRect(0, pageH - headerH, pageW, headerH, ink);
    fillRect(0, pageH - headerH - 3, pageW, 3, primary);

    const logoBox = 70;
    const logoX = margin;
    const logoY = pageH - headerH + (headerH - logoBox) / 2;
    let textLeft = margin;
    if (logo && logo.bytes) {
      fillRect(logoX - 3, logoY - 3, logoBox + 6, logoBox + 6, white);
      const scale = Math.min(logoBox / logo.width, logoBox / logo.height);
      const dw = logo.width * scale;
      const dh = logo.height * scale;
      const ox = logoX + (logoBox - dw) / 2;
      const oy = logoY + (logoBox - dh) / 2;
      ops.push("q");
      ops.push(`${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${ox.toFixed(2)} ${oy.toFixed(2)} cm`);
      ops.push("/Im1 Do");
      ops.push("Q");
      textLeft = logoX + logoBox + 16;
    }

    const headerTextMax = right - textLeft;
    let nameSize = 16;
    while (nameSize > 11 && textWidth(schoolName, nameSize, true) > headerTextMax) nameSize -= 1;
    textAt(schoolName, textLeft, pageH - 38, nameSize, { bold: true, color: white });
    if (address) textAt(address, textLeft, pageH - 56, 9, { color: headerMuted });
    const contact = [phone, email].filter(Boolean).join("   |   ");
    if (contact) textAt(contact, textLeft, pageH - 70, 9, { color: headerMuted });
    textAt("Official fee receipt", textLeft, pageH - 86, 8, { color: "0.62 0.68 0.76" });

    let y = pageH - headerH - 28;

    // —— Title ——
    textAt(String(receiptTitle).toUpperCase(), pageW / 2, y, 14, {
      bold: true,
      align: "center",
      color: ink
    });
    y -= 14;
    if (year) {
      textAt("Academic Year " + year, pageW / 2, y, 10, { align: "center", color: muted });
      y -= 8;
    }
    y -= 12;

    if (cancelled) {
      fillRect(margin, y - 4, contentW, 24, "1 0.93 0.94");
      textAt("CANCELLED" + (r.cancelReason ? "  —  " + r.cancelReason : ""), pageW / 2, y + 3, 10, {
        bold: true,
        align: "center",
        color: danger
      });
      y -= 32;
    }

    // —— Receipt meta (2 equal cells) ——
    const metaH = 48;
    const metaBottom = y - metaH + 16;
    fillRect(margin, metaBottom, contentW, metaH, soft);
    strokeRect(margin, metaBottom, contentW, metaH, line, 0.7);
    lineV(pageW / 2, metaBottom + 8, metaBottom + metaH - 8, line, 0.7);
    field(margin + 16, y + 2, "RECEIPT NO.", r.receiptNo || "—", 12);
    field(pageW / 2 + 16, y + 2, "DATE", dateLabel, 12);
    y = metaBottom - 22;

    // —— Student ——
    textAt("STUDENT DETAILS", margin, y, 8, { bold: true, color: primary });
    y -= 6;
    lineH(margin, right, y, primary, 1.1);
    y -= 20;
    field(col1X, y, "STUDENT NAME", st.name || "—");
    field(
      col2X,
      y,
      "CLASS",
      st.className ? String(st.className) + (st.section ? "-" + st.section : "") : "—"
    );
    y -= 36;
    field(col1X, y, "ADMISSION NO.", st.admissionNo || "—");
    field(col2X, y, "PARENT / GUARDIAN", st.parentName || "—");
    y -= 40;

    // —— Payment ——
    textAt("PAYMENT DETAILS", margin, y, 8, { bold: true, color: primary });
    y -= 6;
    lineH(margin, right, y, primary, 1.1);
    y -= 12;

    const payRows = [
      ["Amount paid", moneyRs(r.amount), true],
      ["Mode of payment", r.mode || "—", false],
      ["Reference", r.reference || "—", false],
      ["Balance after payment", moneyRs(r.balanceAfter), false]
    ];
    if (r.chequeStatus) payRows.push(["Cheque status", r.chequeStatus, false]);

    const rowH = 26;
    const boxPad = 10;
    const boxH = boxPad * 2 + payRows.length * rowH;
    const boxBottom = y - boxH;
    fillRect(margin, boxBottom, contentW, boxH, soft);
    strokeRect(margin, boxBottom, contentW, boxH, line, 0.7);

    let rowY = y - boxPad - 8;
    payRows.forEach(([label, value, highlight], idx) => {
      if (highlight) {
        fillRect(margin + 8, rowY - 8, contentW - 16, rowH, white);
      }
      textAt(label, margin + 18, rowY, 10, { color: muted });
      textAt(String(value), right - 18, rowY, highlight ? 12 : 10, {
        bold: true,
        align: "right",
        color: highlight ? success : ink
      });
      rowY -= rowH;
      if (idx < payRows.length - 1) {
        lineH(margin + 14, right - 14, rowY + rowH - 10, line, 0.5);
      }
    });

    y = boxBottom - 18;
    if (r.notes) {
      textAt("Notes", margin, y, 8, { color: muted });
      y -= 13;
      textAt(String(r.notes).slice(0, 110), margin, y, 10, { color: ink });
      y -= 22;
    }

    // —— Signature block (fixed right column) ——
    y = Math.min(y, 150);
    const sigW = 170;
    const sigX = right - sigW;
    textAt("Thank you for your payment.", margin, y + 16, 9, { color: muted });
    textAt("This is a computer-generated receipt.", margin, y, 8, { color: muted });
    lineH(sigX, right, y + 16, ink, 0.9);
    textAt(signLabel, sigX + sigW / 2, y, 9, { align: "center", color: muted });

    // —— Footer ——
    fillRect(0, 0, pageW, 34, ink);
    fillRect(0, 34, pageW, 3, primary);
    textAt(motto, pageW / 2, 13, 9, { bold: true, align: "center", color: white });

    const stream = ops.join("\n");
    const hasLogo = !!(logo && logo.bytes);
    const pageResources = hasLogo
      ? "<< /Font << /F1 5 0 R /F2 6 0 R >> /XObject << /Im1 7 0 R >> >>"
      : "<< /Font << /F1 5 0 R /F2 6 0 R >> >>";

    const w = new Writer();
    w.str("%PDF-1.4\n");
    const offsets = [0];
    const addObj = (writeBody) => {
      offsets.push(w.length);
      const n = offsets.length - 1;
      w.str(`${n} 0 obj\n`);
      writeBody();
      w.str("\nendobj\n");
    };

    addObj(() => w.str("<< /Type /Catalog /Pages 2 0 R >>"));
    addObj(() => w.str("<< /Type /Pages /Kids [3 0 R] /Count 1 >>"));
    addObj(() =>
      w.str(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources ${pageResources} >>`
      )
    );
    addObj(() => {
      w.str(`<< /Length ${stream.length} >>\nstream\n`);
      w.str(stream);
      w.str("\nendstream");
    });
    addObj(() => w.str("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>"));
    addObj(() => w.str("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>"));
    if (hasLogo) {
      addObj(() => {
        w.str(
          `<< /Type /XObject /Subtype /Image /Width ${logo.width} /Height ${logo.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${logo.bytes.length} >>\nstream\n`
        );
        w.bytes(logo.bytes);
        w.str("\nendstream");
      });
    }

    const xref = w.length;
    w.str(`xref\n0 ${offsets.length}\n`);
    w.str("0000000000 65535 f \n");
    for (let i = 1; i < offsets.length; i++) {
      w.str(String(offsets[i]).padStart(10, "0") + " 00000 n \n");
    }
    w.str(`trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\n`);
    w.str(`startxref\n${xref}\n%%EOF`);
    return w.toUint8Array();
  }

  async function toBlob(r) {
    const logo = await loadLogo();
    return new Blob([buildPdf(r, logo)], { type: "application/pdf" });
  }

  function download(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  }

  function escHtml(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/"/g, "&quot;");
  }

  /** Open PDF in a viewer tab/modal — never auto-downloads. */
  function showViewer(blob, filename) {
    const pdfUrl = URL.createObjectURL(blob);
    const title = filename || "Receipt";

    const html = `<!doctype html>
<html><head>
<meta charset="utf-8"/>
<meta name="viewport" content="width=device-width, initial-scale=1"/>
<title>${escHtml(title)}</title>
<style>
  html,body{margin:0;height:100%;font-family:system-ui,sans-serif;background:#0f172a;color:#fff}
  .bar{display:flex;align-items:center;gap:10px;padding:10px 14px;background:#0f172a;border-bottom:1px solid #1e293b}
  .bar strong{flex:1;font-size:14px;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .bar a,.bar button{appearance:none;border:1px solid #334155;background:#1e293b;color:#fff;border-radius:8px;padding:8px 12px;font-size:13px;cursor:pointer;text-decoration:none}
  .bar a.primary,.bar button.primary{background:#2563eb;border-color:#2563eb}
  .frame{height:calc(100% - 52px);background:#64748b}
  embed,iframe{width:100%;height:100%;border:0;background:#52525b}
</style>
</head><body>
  <div class="bar">
    <strong>${escHtml(title)}</strong>
    <a class="primary" href="${pdfUrl}" download="${escHtml(filename)}">Download</a>
    <button type="button" onclick="window.print()">Print</button>
    <button type="button" onclick="window.close()">Close</button>
  </div>
  <div class="frame">
    <embed src="${pdfUrl}" type="application/pdf" />
  </div>
</body></html>`;

    const win = window.open("", "_blank");
    if (win) {
      win.document.open();
      win.document.write(html);
      win.document.close();
      win.addEventListener("beforeunload", () => URL.revokeObjectURL(pdfUrl));
      return { mode: "tab", url: pdfUrl };
    }

    // Popup blocked — in-app overlay viewer (still no download)
    let overlay = document.getElementById("pdf-viewer-overlay");
    if (overlay) overlay.remove();
    overlay = document.createElement("div");
    overlay.id = "pdf-viewer-overlay";
    overlay.style.cssText =
      "position:fixed;inset:0;z-index:9999;background:rgba(15,23,42,.72);display:flex;align-items:stretch;justify-content:center;padding:12px";
    overlay.innerHTML = `
      <div style="background:#0f172a;border-radius:12px;overflow:hidden;display:flex;flex-direction:column;width:min(920px,100%);height:min(92vh,100%);box-shadow:0 20px 60px rgba(0,0,0,.35)">
        <div style="display:flex;gap:8px;align-items:center;padding:10px 12px;border-bottom:1px solid #1e293b;color:#fff">
          <strong style="flex:1;font:600 14px system-ui">${escHtml(title)}</strong>
          <a href="${pdfUrl}" download="${escHtml(filename)}" style="color:#fff;background:#2563eb;padding:8px 12px;border-radius:8px;text-decoration:none;font:13px system-ui">Download</a>
          <button type="button" data-close style="border:1px solid #334155;background:#1e293b;color:#fff;border-radius:8px;padding:8px 12px;cursor:pointer">Close</button>
        </div>
        <embed src="${pdfUrl}" type="application/pdf" style="flex:1;width:100%;border:0;background:#64748b" />
      </div>`;
    document.body.appendChild(overlay);
    const close = () => {
      overlay.remove();
      URL.revokeObjectURL(pdfUrl);
    };
    overlay.querySelector("[data-close]").onclick = close;
    overlay.addEventListener("click", (ev) => {
      if (ev.target === overlay) close();
    });
    return { mode: "overlay", url: pdfUrl };
  }

  async function open(r) {
    const blob = await toBlob(r);
    const name = filenameFor(r);
    showViewer(blob, name);
    return { blob, filename: name };
  }

  async function share(r, text) {
    const blob = await toBlob(r);
    const filename = filenameFor(r);
    const file = new File([blob], filename, { type: "application/pdf" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: filename,
          text: text || filename
        });
        return { shared: true, blob, filename };
      }
    } catch (e) {
      if (e && e.name === "AbortError") return { shared: false, aborted: true, blob, filename };
    }
    // Share fallback: open viewer + optional WhatsApp caption (caller handles WA)
    showViewer(blob, filename);
    return { shared: false, downloaded: false, viewed: true, blob, filename };
  }

  return { open, share, toBlob, filenameFor, download };
})();
