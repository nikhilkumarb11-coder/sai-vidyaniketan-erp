const Router = (() => {
  const routes = {};

  function register(path, handler, opts = {}) {
    routes[path] = { handler, ...opts };
  }

  function navItems() {
    const principal = Auth.isPrincipal();
    const m = AppCache.modules();
    const items = [];
    items.push({ path: "#/dashboard", label: "Dashboard", icon: "⌂", roles: ["Principal", "Teacher"] });
    if (principal) {
      items.push({ path: "#/students", label: "Students", icon: "👤", roles: ["Principal"] });
      items.push({ path: "#/enquiries", label: "Enquiries", icon: "✉", roles: ["Principal"] });
      items.push({ path: "#/fees", label: "Fees", icon: "₹", roles: ["Principal"] });
      items.push({ path: "#/pending", label: "Pending Fees", icon: "⚠", roles: ["Principal"] });
      items.push({ path: "#/reminders", label: "Reminders", icon: "🔔", roles: ["Principal"] });
    }
    items.push({ path: "#/attendance", label: "Attendance", icon: "✓", roles: ["Principal", "Teacher"] });
    if (principal && m.whatsapp !== false) {
      items.push({ path: "#/whatsapp", label: "WhatsApp", icon: "💬", roles: ["Principal"] });
    }
    if (principal && m.expenses !== false) {
      items.push({ path: "#/expenses", label: "Expenses", icon: "▤", roles: ["Principal"] });
    }
    if (principal && m.staff !== false) {
      items.push({ path: "#/staff", label: "Staff", icon: "👥", roles: ["Principal"] });
    }
    if (principal && m.stock !== false) {
      items.push({ path: "#/stock", label: "Stock", icon: "▣", roles: ["Principal"] });
    }
    if (principal && m.transport) {
      items.push({ path: "#/transport", label: "Transport", icon: "🚌", roles: ["Principal"] });
    }
    if (m.exams !== false) {
      items.push({ path: "#/exams", label: "Exams", icon: "📝", roles: ["Principal", "Teacher"] });
      items.push({ path: "#/reportcards", label: "Report Cards", icon: "📄", roles: ["Principal", "Teacher"] });
    }
    if (m.timetable !== false) {
      items.push({ path: "#/timetable", label: "Timetable", icon: "📅", roles: ["Principal", "Teacher"] });
    }
    items.push({ path: "#/notices", label: "Notices", icon: "📢", roles: ["Principal", "Teacher"] });
    if (principal && m.certificates !== false) {
      items.push({ path: "#/certificates", label: "Certificates", icon: "🎖", roles: ["Principal"] });
    }
    if (principal) {
      items.push({ path: "#/finance", label: "Finance", icon: "📊", roles: ["Principal"] });
      items.push({ path: "#/import", label: "Import", icon: "⇩", roles: ["Principal"] });
      items.push({ path: "#/settings", label: "Settings", icon: "⚙", roles: ["Principal"] });
      items.push({ path: "#/users", label: "Users", icon: "🔑", roles: ["Principal"] });
      items.push({ path: "#/year", label: "Year Close", icon: "🗓", roles: ["Principal"] });
    }
    const role = AppCache.user().role;
    return items.filter((i) => i.roles.includes(role));
  }

  function renderNav() {
    const items = navItems();
    const side = document.getElementById("sidebar-nav");
    const bottom = document.getElementById("bottom-nav");
    const hash = location.hash || "#/dashboard";
    side.innerHTML = items
      .map(
        (i) =>
          `<li><a href="${i.path}" class="${hash.startsWith(i.path) ? "active" : ""}">${i.label}</a></li>`
      )
      .join("");
    const mobile = items.slice(0, 5);
    bottom.innerHTML = mobile
      .map(
        (i) =>
          `<a href="${i.path}" class="${hash.startsWith(i.path) ? "active" : ""}"><span class="ico">${i.icon}</span>${i.label.split(" ")[0]}</a>`
      )
      .join("");
  }

  async function go() {
    if (!AppCache.user()) {
      App.showLogin();
      return;
    }
    App.showShell();
    renderNav();
    const hash = location.hash || "#/dashboard";
    const path = hash.split("?")[0];
    const entry = routes[path] || routes["#/dashboard"];
    const root = document.getElementById("app-content");
    root.innerHTML = `<div class="card"><p>Loading…</p></div>`;
    try {
      if (entry.principalOnly && !Auth.isPrincipal()) {
        root.innerHTML = `<div class="card"><p>You do not have access to this page.</p></div>`;
        return;
      }
      await entry.handler(root);
    } catch (e) {
      root.innerHTML = `<div class="card"><p class="badge badge-danger">${UI.esc(e.message)}</p></div>`;
      UI.toast(e.message, "error");
    }
  }

  function start() {
    window.addEventListener("hashchange", go);
  }

  return { register, go, start, renderNav, navItems };
})();
