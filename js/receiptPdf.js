/**
 * Branded fee-receipt PDF (no external libs).
 * Helvetica only — amounts as Rs. for font safety.
 */
const ReceiptPdf = (() => {
  let logoCache = null;

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
    const no = String(r.receiptNo || "receipt").replace(/[^\w.-]+/g, "_");
    return no + ".pdf";
  }

  function isCancelled(r) {
    const v = r && r.cancelled;
    return v === true || v === "TRUE" || v === "true" || v === "Y" || v === 1 || v === "1";
  }

  function textWidth(text, size, bold) {
    return String(text || "").length * size * (bold ? 0.55 : 0.5);
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
    const margin = 40;
    const contentW = pageW - margin * 2;

    const ink = "0.059 0.090 0.165";
    const muted = "0.392 0.455 0.545";
    const primary = "0.145 0.388 0.922";
    const soft = "0.945 0.961 0.976";
    const line = "0.886 0.910 0.941";
    const white = "1 1 1";
    const danger = "0.882 0.114 0.282";
    const success = "0.020 0.588 0.412";
    const headerMuted = "0.80 0.84 0.90";

    const ops = [];
    const fill = (rgb) => ops.push(rgb + " rg");
    const strokeCol = (rgb) => ops.push(rgb + " RG");
    const rect = (x, y, w, h) => ops.push(`${x} ${y} ${w} ${h} re`);
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
      ops.push(`${x1} ${y} m ${x2} ${y} l S`);
    };
    const textAt = (str, x, y, size, opts) => {
      opts = opts || {};
      const bold = !!opts.bold;
      const color = opts.color || ink;
      let tx = x;
      if (opts.align === "center") tx = x - textWidth(str, size, bold) / 2;
      if (opts.align === "right") tx = x - textWidth(str, size, bold);
      ops.push("BT");
      ops.push(`${bold ? "/F2" : "/F1"} ${size} Tf`);
      ops.push(`${color} rg`);
      ops.push(`1 0 0 1 ${tx.toFixed(2)} ${y.toFixed(2)} Tm`);
      ops.push(`(${escPdf(str)}) Tj`);
      ops.push("ET");
    };

    fillRect(0, 0, pageW, pageH, white);

    // Header
    const headerH = 108;
    fillRect(0, pageH - headerH, pageW, headerH, ink);
    fillRect(0, pageH - headerH - 4, pageW, 4, primary);

    const logoBox = 64;
    const logoX = margin;
    const logoY = pageH - headerH + (headerH - logoBox) / 2;
    if (logo && logo.bytes) {
      fillRect(logoX - 2, logoY - 2, logoBox + 4, logoBox + 4, white);
      const scale = Math.min(logoBox / logo.width, logoBox / logo.height);
      const dw = logo.width * scale;
      const dh = logo.height * scale;
      const ox = logoX + (logoBox - dw) / 2;
      const oy = logoY + (logoBox - dh) / 2;
      ops.push("q");
      ops.push(`${dw.toFixed(2)} 0 0 ${dh.toFixed(2)} ${ox.toFixed(2)} ${oy.toFixed(2)} cm`);
      ops.push("/Im1 Do");
      ops.push("Q");
    }

    const textLeft = logo && logo.bytes ? logoX + logoBox + 14 : margin;
    textAt(schoolName, textLeft, pageH - 42, 17, { bold: true, color: white });
    if (address) textAt(address, textLeft, pageH - 60, 9, { color: headerMuted });
    const contact = [phone, email].filter(Boolean).join("  ·  ");
    if (contact) textAt(contact, textLeft, pageH - 74, 9, { color: headerMuted });
    textAt("Official fee receipt", textLeft, pageH - 90, 8, { color: "0.65 0.70 0.78" });

    let y = pageH - headerH - 34;
    textAt(String(receiptTitle).toUpperCase(), pageW / 2, y, 15, {
      bold: true,
      align: "center",
      color: ink
    });
    y -= 15;
    if (year) {
      textAt("Academic Year " + year, pageW / 2, y, 10, { align: "center", color: muted });
      y -= 6;
    }
    y -= 16;

    if (cancelled) {
      fillRect(margin, y - 6, contentW, 26, "1 0.92 0.93");
      textAt("CANCELLED" + (r.cancelReason ? "  —  " + r.cancelReason : ""), pageW / 2, y + 2, 11, {
        bold: true,
        align: "center",
        color: danger
      });
      y -= 34;
    }

    // Meta band
    const metaH = 46;
    fillRect(margin, y - metaH + 14, contentW, metaH, soft);
    strokeRect(margin, y - metaH + 14, contentW, metaH, line, 0.6);
    const midX = pageW / 2;
    textAt("RECEIPT NO.", margin + 16, y + 4, 8, { color: muted });
    textAt(r.receiptNo || "—", margin + 16, y - 12, 13, { bold: true, color: ink });
    textAt("DATE", midX + 16, y + 4, 8, { color: muted });
    textAt(dateLabel, midX + 16, y - 12, 13, { bold: true, color: ink });
    ops.push("0.6 w");
    strokeCol(line);
    ops.push(`${midX} ${y - metaH + 22} m ${midX} ${y + 10} l S`);
    y -= metaH + 20;

    // Student
    textAt("STUDENT DETAILS", margin, y, 8, { bold: true, color: primary });
    y -= 8;
    lineH(margin, pageW - margin, y, primary, 1.2);
    y -= 22;

    const col2 = margin + contentW / 2 + 8;
    const detailRow = (l1, v1, l2, v2) => {
      textAt(l1, margin, y, 8, { color: muted });
      textAt(v1 || "—", margin, y - 13, 11, { bold: true, color: ink });
      if (l2) {
        textAt(l2, col2, y, 8, { color: muted });
        textAt(v2 || "—", col2, y - 13, 11, { bold: true, color: ink });
      }
      y -= 34;
    };
    detailRow(
      "STUDENT NAME",
      st.name || "—",
      "CLASS",
      st.className ? String(st.className) + (st.section ? "-" + st.section : "") : "—"
    );
    detailRow("ADMISSION NO.", st.admissionNo || "—", "PARENT / GUARDIAN", st.parentName || "—");

    // Payment
    textAt("PAYMENT DETAILS", margin, y, 8, { bold: true, color: primary });
    y -= 8;
    lineH(margin, pageW - margin, y, primary, 1.2);
    y -= 14;

    const boxTop = y + 8;
    const payLines = [
      ["Mode of payment", r.mode || "—"],
      ["Reference", r.reference || "—"],
      ["Balance after payment", moneyRs(r.balanceAfter)]
    ];
    if (r.chequeStatus) payLines.push(["Cheque status", r.chequeStatus]);
    const boxH = 44 + payLines.length * 18;
    fillRect(margin, boxTop - boxH, contentW, boxH, soft);
    strokeRect(margin, boxTop - boxH, contentW, boxH, line, 0.6);

    fillRect(margin + 10, y - 22, contentW - 20, 30, white);
    textAt("Amount paid", margin + 22, y - 4, 10, { color: muted });
    textAt(moneyRs(r.amount), pageW - margin - 22, y - 4, 14, {
      bold: true,
      align: "right",
      color: success
    });
    y -= 42;

    payLines.forEach(([label, value]) => {
      textAt(label, margin + 22, y, 9, { color: muted });
      textAt(String(value), pageW - margin - 22, y, 10, { bold: true, align: "right", color: ink });
      y -= 18;
    });

    y = boxTop - boxH - 20;
    if (r.notes) {
      textAt("Notes: " + String(r.notes).slice(0, 100), margin, y, 9, { color: muted });
      y -= 22;
    }

    y = Math.min(y, 168);
    textAt("Thank you for your payment.", margin, y + 14, 9, { color: muted });
    textAt("This is a computer-generated receipt.", margin, y, 8, { color: muted });

    lineH(pageW - margin - 170, pageW - margin, y + 14, ink, 0.8);
    textAt(signLabel, pageW - margin - 85, y, 9, { align: "center", color: muted });

    // Footer
    fillRect(0, 0, pageW, 36, ink);
    fillRect(0, 36, pageW, 3, primary);
    textAt(motto, pageW / 2, 14, 9, { bold: true, align: "center", color: white });

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
    const bytes = buildPdf(r, logo);
    return new Blob([bytes], { type: "application/pdf" });
  }

  function download(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  }

  async function open(r) {
    const blob = await toBlob(r);
    const name = filenameFor(r);
    const url = URL.createObjectURL(blob);
    const win = window.open(url, "_blank", "noopener");
    if (!win) {
      download(blob, name);
      if (typeof UI !== "undefined") UI.toast("PDF downloaded (popup blocked)", "ok");
    }
    setTimeout(() => URL.revokeObjectURL(url), 120_000);
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
    download(blob, filename);
    return { shared: false, downloaded: true, blob, filename };
  }

  return { open, share, toBlob, filenameFor };
})();
