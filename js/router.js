const Router = (() => {
  const routes = {};
  const pageHtmlCache = new Map();

  const GROUPS = [
    {
      id: "home",
      title: "Overview",
      paths: ["#/dashboard"]
    },
    {
      id: "people",
      title: "People",
      paths: ["#/students", "#/enquiries", "#/attendance"]
    },
    {
      id: "fees",
      title: "Fees",
      paths: ["#/fees"]
    },
    {
      id: "academics",
      title: "Academics",
      paths: ["#/exams", "#/reportcards", "#/timetable", "#/notices"]
    },
    {
      id: "comms",
      title: "Communication",
      paths: ["#/whatsapp"]
    },
    {
      id: "admin",
      title: "Admin",
      paths: ["#/expenses", "#/staff", "#/stock", "#/transport", "#/certificates", "#/finance", "#/import"]
    },
    {
      id: "system",
      title: "System",
      paths: ["#/settings", "#/users", "#/year"]
    }
  ];

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
      if (m.enquiries !== false) {
        items.push({ path: "#/enquiries", label: "Enquiries", icon: "✉", roles: ["Principal"] });
      }
      items.push({ path: "#/fees", label: "Fees", icon: "₹", roles: ["Principal"] });
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
      items.push({ path: "#/reportcards", label: "Report cards", icon: "📄", roles: ["Principal", "Teacher"] });
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
      items.push({ path: "#/year", label: "Year close", icon: "🗓", roles: ["Principal"] });
    }
    const role = AppCache.user().role;
    return items.filter((i) => i.roles.includes(role));
  }

  function primaryMobile(items) {
    const preferred = ["#/dashboard", "#/students", "#/fees", "#/attendance"];
    const picked = [];
    preferred.forEach((p) => {
      const hit = items.find((i) => i.path === p);
      if (hit) picked.push(hit);
    });
    items.forEach((i) => {
      if (picked.length < 4 && !picked.includes(i)) picked.push(i);
    });
    return picked.slice(0, 4);
  }

  function closeMore() {
    const backdrop = document.getElementById("more-backdrop");
    const drawer = document.getElementById("more-drawer");
    if (!drawer) return;
    drawer.classList.remove("open");
    backdrop.classList.remove("open");
    setTimeout(() => {
      drawer.hidden = true;
      backdrop.hidden = true;
    }, 280);
  }

  function openMore() {
    const items = navItems();
    const body = document.getElementById("more-drawer-body");
    const hash = location.hash || "#/dashboard";
    const byPath = Object.fromEntries(items.map((i) => [i.path, i]));
    let html = "";
    GROUPS.forEach((g) => {
      const links = g.paths.map((p) => byPath[p]).filter(Boolean);
      if (!links.length) return;
      html += `<div class="more-group-title">${g.title}</div>`;
      links.forEach((i) => {
        html += `<a class="more-link ${hash.startsWith(i.path) ? "active" : ""}" href="${i.path}" data-more-link>
          <span class="ico">${i.icon}</span><span>${i.label}</span>
        </a>`;
      });
    });
    const grouped = new Set(GROUPS.flatMap((g) => g.paths));
    const rest = items.filter((i) => !grouped.has(i.path));
    if (rest.length) {
      html += `<div class="more-group-title">More</div>`;
      rest.forEach((i) => {
        html += `<a class="more-link ${hash.startsWith(i.path) ? "active" : ""}" href="${i.path}" data-more-link>
          <span class="ico">${i.icon}</span><span>${i.label}</span>
        </a>`;
      });
    }
    body.innerHTML = html;
    body.querySelectorAll("[data-more-link]").forEach((a) => {
      a.addEventListener("click", () => closeMore());
    });

    const backdrop = document.getElementById("more-backdrop");
    const drawer = document.getElementById("more-drawer");
    backdrop.hidden = false;
    drawer.hidden = false;
    requestAnimationFrame(() => {
      backdrop.classList.add("open");
      drawer.classList.add("open");
    });
  }

  function wireMoreOnce() {
    if (wireMoreOnce.done) return;
    wireMoreOnce.done = true;
    document.getElementById("more-close")?.addEventListener("click", closeMore);
    document.getElementById("more-backdrop")?.addEventListener("click", closeMore);
  }

  function renderNav() {
    wireMoreOnce();
    const items = navItems();
    const side = document.getElementById("sidebar-nav");
    const bottom = document.getElementById("bottom-nav");
    const hash = location.hash || "#/dashboard";

    const byPath = Object.fromEntries(items.map((i) => [i.path, i]));
    let sideHtml = "";
    GROUPS.forEach((g) => {
      const links = g.paths.map((p) => byPath[p]).filter(Boolean);
      if (!links.length) return;
      sideHtml += `<li class="nav-section">${g.title}</li>`;
      links.forEach((i) => {
        sideHtml += `<li><a href="${i.path}" class="${hash.startsWith(i.path) ? "active" : ""}">${i.label}</a></li>`;
      });
    });
    const grouped = new Set(GROUPS.flatMap((g) => g.paths));
    items
      .filter((i) => !grouped.has(i.path))
      .forEach((i) => {
        sideHtml += `<li><a href="${i.path}" class="${hash.startsWith(i.path) ? "active" : ""}">${i.label}</a></li>`;
      });
    side.innerHTML = sideHtml;

    const primary = primaryMobile(items);
    const moreActive = !primary.some((i) => hash.startsWith(i.path));
    bottom.innerHTML =
      primary
        .map(
          (i) =>
            `<a href="${i.path}" class="${hash.startsWith(i.path) ? "active" : ""}"><span class="ico">${i.icon}</span>${i.label.split(" ")[0]}</a>`
        )
        .join("") +
      `<button type="button" class="more-tab ${moreActive ? "active" : ""}" id="more-tab"><span class="ico">☰</span>More</button>`;

    document.getElementById("more-tab")?.addEventListener("click", openMore);
  }

  function skeletonHtml() {
    return `
      <div class="skeleton-page">
        <div class="skel skel-title"></div>
        <div class="grid grid-4">
          <div class="skel skel-stat"></div>
          <div class="skel skel-stat"></div>
          <div class="skel skel-stat"></div>
          <div class="skel skel-stat"></div>
        </div>
        <div class="skel skel-row"></div>
        <div class="skel skel-row"></div>
        <div class="skel skel-row"></div>
      </div>`;
  }

  async function go() {
    if (!AppCache.user()) {
      App.showLogin();
      return;
    }
    App.showShell();
    renderNav();
    closeMore();
    const hash = location.hash || "#/dashboard";
    const path = hash.split("?")[0];
    const entry = routes[path] || routes["#/dashboard"];
    const root = document.getElementById("app-content");
    const cacheKey = path;

    if (entry.principalOnly && !Auth.isPrincipal()) {
      root.innerHTML = `<div class="card"><p>You do not have access to this page.</p></div>`;
      return;
    }

    const cached = pageHtmlCache.get(cacheKey);
    if (cached) {
      root.innerHTML = cached;
      root.classList.add("is-refreshing");
    } else {
      root.classList.remove("is-refreshing");
      root.innerHTML = skeletonHtml();
    }

    try {
      await entry.handler(root);
      pageHtmlCache.set(cacheKey, root.innerHTML);
    } catch (e) {
      if (!cached) {
        root.innerHTML = `<div class="card"><p class="badge badge-danger">${UI.esc(e.message)}</p></div>`;
      } else {
        UI.toast(e.message, "error");
      }
    } finally {
      root.classList.remove("is-refreshing");
    }
  }

  function invalidatePage(path) {
    if (path) pageHtmlCache.delete(path);
    else pageHtmlCache.clear();
  }

  function start() {
    window.addEventListener("hashchange", go);
  }

  return { register, go, start, renderNav, navItems, invalidatePage, openMore, closeMore };
})();
