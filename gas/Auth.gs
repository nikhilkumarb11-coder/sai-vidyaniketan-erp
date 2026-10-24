/**
 * Authentication & sessions
 */

var SESSION_HOURS = 8;

function sessionCacheKey_(token) {
  return "sess:" + String(token || "").slice(0, 80);
}

function putSessionCache_(token, userId, expiresAt) {
  var ttl = Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000);
  if (!(ttl > 30)) return;
  cachePut_(sessionCacheKey_(token), { userId: userId, expiresAt: expiresAt }, Math.min(ttl, 21600));
}

function clearSessionCache_(token) {
  cacheRemove_(sessionCacheKey_(token));
}

/** Drop expired Sessions rows so requireUser_ sheet fallback stays small. */
function pruneExpiredSessions_() {
  try {
    var sessions = readAllObjects_("Sessions");
    var now = Date.now();
    var dead = [];
    for (var i = 0; i < sessions.length; i++) {
      if (new Date(sessions[i].expiresAt).getTime() < now) dead.push(sessions[i]._row);
    }
    if (!dead.length) return;
    dead.sort(function (a, b) {
      return b - a;
    });
    var sh = getSheet_("Sessions");
    for (var d = 0; d < dead.length; d++) sh.deleteRow(dead[d]);
    invalidateSheetCache_("Sessions");
  } catch (e) {}
}

function authLogin(payload) {
  var username = String(payload.username || "").trim();
  var password = String(payload.password || "");
  if (!username || !password) return fail_("Username and password required", "AUTH");

  pruneExpiredSessions_();

  var users = readAllObjects_("Users");
  var user = null;
  for (var i = 0; i < users.length; i++) {
    if (String(users[i].username).toLowerCase() === username.toLowerCase()) {
      user = users[i];
      break;
    }
  }
  if (!user || !isTruthy_(user.active)) return fail_("Invalid credentials", "AUTH");
  if (!verifyPassword_(password, user.passwordHash)) return fail_("Invalid credentials", "AUTH");

  var token = Utilities.getUuid().replace(/-/g, "") + Utilities.getUuid().replace(/-/g, "");
  var expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
  appendObject_("Sessions", {
    id: uid_("ses"),
    token: token,
    userId: user.id,
    expiresAt: expires,
    createdAt: nowIso_()
  });
  putSessionCache_(token, user.id, expires);
  audit_(user, "login", "Users", user.id, {});

  var out = {
    token: token,
    expiresAt: expires,
    user: publicUser_(user)
  };
  // withData (default true from the app) returns bootstrap in the same reply — one cold start.
  if (payload.withData !== false) {
    try {
      out.bootstrap = buildBootstrap_(user);
    } catch (e) {
      console.error("bootstrap at login", e && e.stack);
    }
  }
  return ok_(out);
}

function authLogout(payload, user) {
  var token = payload.token || (user && user._token);
  clearSessionCache_(token);
  var sessions = readAllObjects_("Sessions");
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].token === token) {
      var sh = getSheet_("Sessions");
      sh.deleteRow(sessions[i]._row);
      invalidateSheetCache_("Sessions");
      break;
    }
  }
  if (user) audit_(user, "logout", "Users", user.id, {});
  return ok_({ loggedOut: true });
}

function requireUser_(token) {
  if (!token) throw new Error("Not authenticated");

  var cached = cacheGet_(sessionCacheKey_(token));
  if (cached && cached.userId) {
    if (new Date(cached.expiresAt).getTime() < Date.now()) {
      clearSessionCache_(token);
      throw new Error("Session expired");
    }
    var cachedUser = findById_("Users", cached.userId);
    if (!cachedUser || !isTruthy_(cachedUser.active)) throw new Error("User inactive");
    cachedUser._token = token;
    return cachedUser;
  }

  var sessions = readAllObjects_("Sessions");
  var session = null;
  for (var i = 0; i < sessions.length; i++) {
    if (sessions[i].token === token) {
      session = sessions[i];
      break;
    }
  }
  if (!session) throw new Error("Invalid session");
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    throw new Error("Session expired");
  }
  var user = findById_("Users", session.userId);
  if (!user || !isTruthy_(user.active)) throw new Error("User inactive");
  putSessionCache_(token, user.id, session.expiresAt);
  user._token = token;
  return user;
}

function requireRole_(user, roles) {
  var list = roles || [];
  if (list.indexOf(user.role) < 0) {
    throw new Error("Forbidden: requires " + list.join("|"));
  }
  return user;
}

function buildBootstrap_(user) {
  var modules = getSetting_("modules", {
    transport: false,
    stock: true,
    exams: true,
    whatsapp: true,
    expenses: true,
    staff: true,
    certificates: true,
    timetable: true
  });
  var services = readAllObjects_("Services").filter(function (s) {
    return isTruthy_(s.active);
  });
  var classes = readAllObjects_("Classes").filter(function (c) {
    return isTruthy_(c.active);
  });
  var grading = getSetting_("grading", []);
  var exams = readAllObjects_("Exams").filter(function (e) {
    return isTruthy_(e.active);
  });
  var templates = getSetting_("whatsappTemplates", {});
  var school = getSetting_("school", {});
  var theme = getSetting_("theme", {});

  var serverTime = nowIso_();
  return {
    user: publicUser_(user),
    academicYear: currentAcademicYear_(),
    modules: modules,
    services: services,
    classes: classes,
    grading: grading,
    exams: exams,
    whatsappTemplates: templates,
    school: school,
    theme: theme,
    expenseCategories: readAllObjects_("ExpenseCategories").filter(function (c) {
      return isTruthy_(c.active);
    }),
    subjects: readAllObjects_("Subjects").filter(function (s) {
      return isTruthy_(s.active);
    }),
    serverTime: serverTime,
    // Phase B: full core tables so the device can render without further list calls.
    tables: buildCoreTables_()
  };
}

function authBootstrap(payload, user) {
  return ok_(buildBootstrap_(user));
}

function usersList(payload, user) {
  requireRole_(user, ["Principal"]);
  return ok_(
    readAllObjects_("Users").map(function (u) {
      return publicUser_(u);
    })
  );
}

function usersCreate(payload, user) {
  requireRole_(user, ["Principal"]);
  var username = String(payload.username || "").trim();
  if (!username) return fail_("Username required");
  var existing = readAllObjects_("Users");
  for (var i = 0; i < existing.length; i++) {
    if (String(existing[i].username).toLowerCase() === username.toLowerCase()) {
      return fail_("Username already exists");
    }
  }
  var row = appendObject_("Users", {
    id: uid_("usr"),
    username: username,
    passwordHash: storePassword_(payload.password || "ChangeMe@123"),
    displayName: payload.displayName || username,
    role: payload.role || "Teacher",
    classAssigned: payload.classAssigned || "",
    subjects: JSON.stringify(payload.subjects || []),
    active: "TRUE",
    createdBy: user.id,
    updatedBy: user.id
  });
  audit_(user, "user.create", "Users", row.id, { username: username });
  return ok_(publicUser_(row));
}

function usersUpdate(payload, user) {
  requireRole_(user, ["Principal"]);
  var patch = {
    displayName: payload.displayName,
    role: payload.role,
    classAssigned: payload.classAssigned || "",
    subjects: JSON.stringify(payload.subjects || []),
    updatedBy: user.id
  };
  if (payload.active !== undefined) patch.active = payload.active ? "TRUE" : "FALSE";
  var updated = updateObjectById_("Users", payload.id, patch);
  audit_(user, "user.update", "Users", payload.id, patch);
  return ok_(publicUser_(updated));
}

function usersResetPassword(payload, user) {
  requireRole_(user, ["Principal"]);
  var updated = updateObjectById_("Users", payload.id, {
    passwordHash: storePassword_(payload.password || "ChangeMe@123"),
    updatedBy: user.id
  });
  audit_(user, "user.resetPassword", "Users", payload.id, {});
  return ok_(publicUser_(updated));
}

function usersDisable(payload, user) {
  requireRole_(user, ["Principal"]);
  var updated = updateObjectById_("Users", payload.id, { active: "FALSE", updatedBy: user.id });
  audit_(user, "user.disable", "Users", payload.id, {});
  return ok_(publicUser_(updated));
}
