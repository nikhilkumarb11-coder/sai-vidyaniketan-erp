/**
 * Lightweight fee-receipt PDF (no external libs).
 * Uses built-in Helvetica; amounts shown as Rs. for font compatibility.
 */
const ReceiptPdf = (() => {
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

  function filenameFor(r) {
    const no = String(r.receiptNo || "receipt").replace(/[^\w.-]+/g, "_");
    return no + ".pdf";
  }

  function build(r) {
    const school = r.school || (typeof AppCache !== "undefined" ? AppCache.school() : {}) || {};
    const st = r.student || {};
    const cfg = typeof CONFIG !== "undefined" ? CONFIG : { receipt: {}, school: {} };
    const date = String(r.createdAt || "").slice(0, 10);
    const lines = [
      { text: school.name || cfg.school.name || "School", size: 16, bold: true },
      { text: school.address || "", size: 9 },
      { text: (cfg.receipt && cfg.receipt.header) || "Fee Receipt", size: 11, bold: true },
      { text: "", size: 10 },
      { text: "Receipt No: " + (r.receiptNo || ""), size: 11 },
      { text: "Date: " + date, size: 11 },
      { text: "", size: 10 },
      {
        text:
          "Student: " +
          (st.name || "—") +
          (st.admissionNo ? " (" + st.admissionNo + ")" : "") +
          (st.className ? "  Class " + st.className : ""),
        size: 11
      },
      {
        text:
          "Amount paid: " +
          moneyRs(r.amount) +
          "    Mode: " +
          (r.mode || "") +
          (r.reference ? " (" + r.reference + ")" : ""),
        size: 11
      },
      { text: "Balance after payment: " + moneyRs(r.balanceAfter), size: 11 },
      { text: "", size: 10 }
    ];
    if (r.cancelled === true || r.cancelled === "TRUE" || r.cancelled === "true") {
      lines.push({ text: "CANCELLED" + (r.cancelReason ? " — " + r.cancelReason : ""), size: 11, bold: true });
      lines.push({ text: "", size: 10 });
    }
    if (r.notes) lines.push({ text: "Notes: " + r.notes, size: 10 });
    lines.push({ text: "", size: 10 });
    lines.push({ text: (cfg.receipt && cfg.receipt.signatureLabel) || "Authorized Signatory", size: 10 });
    lines.push({ text: "", size: 10 });
    lines.push({ text: school.motto || (cfg.school && cfg.school.motto) || "", size: 9 });

    const pageW = 595;
    const pageH = 842;
    let y = pageH - 56;
    const content = [];
    content.push("BT");
    lines.forEach((line) => {
      if (!line.text && line.text !== "") {
        y -= 14;
        return;
      }
      if (line.text === "") {
        y -= 10;
        return;
      }
      const font = line.bold ? "/F2" : "/F1";
      const size = line.size || 11;
      content.push(`${font} ${size} Tf`);
      content.push(`1 0 0 1 48 ${y} Tm`);
      content.push(`(${escPdf(line.text)}) Tj`);
      y -= size + 6;
    });
    content.push("ET");
    // Accent ribbon bar at bottom
    content.push("0.12 0.23 0.37 rg");
    content.push("48 36 499 22 re f");
    content.push("BT /F2 9 Tf 1 1 1 rg");
    content.push(`1 0 0 1 56 42 Tm (${escPdf(school.motto || (cfg.school && cfg.school.motto) || "Fee Receipt")}) Tj ET`);

    const stream = content.join("\n");
    const objects = [];
    objects.push("<< /Type /Catalog /Pages 2 0 R >>");
    objects.push("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");
    objects.push(
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageW} ${pageH}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> >>`
    );
    objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>");
    objects.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>");

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((obj, i) => {
      offsets.push(pdf.length);
      pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
    });
    const xref = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    for (let i = 1; i <= objects.length; i++) {
      pdf += String(offsets[i]).padStart(10, "0") + " 00000 n \n";
    }
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    pdf += `startxref\n${xref}\n%%EOF`;
    return pdf;
  }

  function toBlob(r) {
    const pdf = build(r);
    const bytes = new Uint8Array(pdf.length);
    for (let i = 0; i < pdf.length; i++) bytes[i] = pdf.charCodeAt(i) & 0xff;
    return new Blob([bytes], { type: "application/pdf" });
  }

  function download(blob, filename) {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 30_000);
  }

  function open(r) {
    const blob = toBlob(r);
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
    const blob = toBlob(r);
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
