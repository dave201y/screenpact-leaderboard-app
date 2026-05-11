import "dotenv/config";
import { createHash, randomBytes, randomInt } from "node:crypto";
import cors from "cors";
import express from "express";
import session from "express-session";
import rateLimit from "express-rate-limit";
import { createSupabaseAdminClient, createSupabaseAnonClient } from "./supabase.js";
import { mockApps, mockDayMins, mockMembers, mockProfile, mockSettings } from "./mockData.js";

const app = express();
const port = Number(process.env.API_PORT || 8787);
const allowedOrigins = (process.env.FRONTEND_ORIGIN || "http://localhost:8080")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isProduction = process.env.NODE_ENV === "production";
const sessionSecret = process.env.SESSION_SECRET || "dev-change-me";
const bodyLimit = process.env.API_BODY_LIMIT || "100kb";
const ownerEmail = (process.env.OWNER_EMAIL || "").toLowerCase();
const ownerPassword = process.env.OWNER_PASSWORD || "";

// ─── REMOVED: never fall back to a hardcoded password. If OWNER_EMAIL or
// OWNER_PASSWORD are missing from .env, login will simply always fail rather
// than silently accepting a leaked credential.
if (!ownerEmail || !ownerPassword) {
  console.warn("[auth] WARNING: OWNER_EMAIL or OWNER_PASSWORD is not set in .env — login will be rejected for all requests.");
}

function isAllowedOrigin(origin) {
  if (!origin) return true;
  if (!isProduction) return true;
  if (allowedOrigins.includes(origin)) return true;

  if (
    origin === "capacitor://localhost" ||
    origin === "ionic://localhost" ||
    origin === "http://localhost" ||
    origin === "https://localhost"
  ) {
    return true;
  }

  try {
    const parsed = new URL(origin);
    const hostname = parsed.hostname.toLowerCase();
    const protocol = parsed.protocol.toLowerCase();
    const isLoopbackHost = hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
    const isCapacitorScheme = protocol === "capacitor:" || protocol === "ionic:";
    return isLoopbackHost || isCapacitorScheme;
  } catch {
    return false;
  }
}

const supabaseAdmin = createSupabaseAdminClient();
const supabaseAnon = createSupabaseAnonClient();

// ─── Session store ─────────────────────────────────────────────────────────
// Use a Supabase-backed session store when the DB is available so sessions
// survive server restarts. Falls back to the default in-memory store for
// local dev without Supabase configured.
let sessionStore;
if (supabaseAdmin) {
  // Lazy-build a minimal Supabase session store backed by a `sessions` table.
  // Run the SQL below once in your Supabase project:
  //
  //   create table if not exists sessions (
  //     sid  text primary key,
  //     sess jsonb not null,
  //     expire timestamptz not null
  //   );
  //   create index if not exists sessions_expire_idx on sessions (expire);
  //
  const Store = session.Store;
  class SupabaseSessionStore extends Store {
    async get(sid, cb) {
      try {
        const { data } = await supabaseAdmin
          .from("sessions")
          .select("sess, expire")
          .eq("sid", sid)
          .maybeSingle();
        if (!data) return cb(null, null);
        if (new Date(data.expire) < new Date()) {
          await supabaseAdmin.from("sessions").delete().eq("sid", sid);
          return cb(null, null);
        }
        return cb(null, data.sess);
      } catch (err) {
        return cb(err);
      }
    }

    async set(sid, sess, cb) {
      try {
        const ttlMs = sess.cookie?.maxAge ?? 1000 * 60 * 60 * 24 * 7;
        const expire = new Date(Date.now() + ttlMs).toISOString();
        await supabaseAdmin
          .from("sessions")
          .upsert({ sid, sess, expire }, { onConflict: "sid" });
        return cb(null);
      } catch (err) {
        return cb(err);
      }
    }

    async destroy(sid, cb) {
      try {
        await supabaseAdmin.from("sessions").delete().eq("sid", sid);
        return cb(null);
      } catch (err) {
        return cb(err);
      }
    }

    async touch(sid, sess, cb) {
      return this.set(sid, sess, cb);
    }
  }
  sessionStore = new SupabaseSessionStore();
  console.log("[session] Using Supabase-backed persistent session store.");
} else {
  console.warn("[session] Supabase not configured — using in-memory session store (sessions lost on restart).");
}
// ───────────────────────────────────────────────────────────────────────────

const loginLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_LOGIN_WINDOW_MS || 15 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_LOGIN_MAX || 10),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many login attempts, please try again later." },
});

const syncLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_SYNC_WINDOW_MS || 60 * 1000),
  max: Number(process.env.RATE_LIMIT_SYNC_MAX || 30),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Sync rate limit exceeded, please retry shortly." },
});

const privacyLimiter = rateLimit({
  windowMs: Number(process.env.RATE_LIMIT_PRIVACY_WINDOW_MS || 60 * 60 * 1000),
  max: Number(process.env.RATE_LIMIT_PRIVACY_MAX || 8),
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many privacy requests, please try again later." },
});

const mockPrivacyRequests = [];
const mockDevices = [];
const mockPairingCodes = [];

app.use(
  cors({
    origin(origin, callback) {
      if (isAllowedOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("CORS origin denied"), false);
    },
    credentials: true,
  })
);
app.use(express.json({ limit: bodyLimit }));
app.use((req, _res, next) => {
  req.requestStart = Date.now();
  next();
});
app.use((req, res, next) => {
  res.on("finish", () => {
    if (res.statusCode >= 400) {
      const durationMs = Date.now() - req.requestStart;
      console.warn(`[api] ${res.statusCode} ${req.method} ${req.originalUrl} ${durationMs}ms`);
    }
  });
  next();
});

app.use(
  session({
    name: "screenpact.sid",
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    // ── Persistent store when Supabase is available ──
    ...(sessionStore ? { store: sessionStore } : {}),
    cookie: {
      httpOnly: true,
      sameSite: "lax",
      // ── secure: true in production so the cookie is only sent over HTTPS.
      // ── In local dev (NODE_ENV !== 'production') keep it false so it works
      //    over plain http://localhost.
      secure: isProduction,
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  })
);

// Trust the first proxy hop in production (needed when behind Nginx/Cloudflare
// so that req.secure is correct and the secure cookie gets set properly).
if (isProduction) {
  app.set("trust proxy", 1);
}

async function resolveAuthenticatedUser(req) {
  if (req.session?.user?.id) {
    return req.session.user;
  }

  const deviceAuth = await resolveDeviceFromRequest(req);
  if (deviceAuth?.userId) {
    return {
      id: deviceAuth.userId,
      email: deviceAuth.email || null,
    };
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ") || !supabaseAnon) {
    return null;
  }

  const token = authHeader.slice("Bearer ".length).trim();
  if (!token) return null;

  const { data, error } = await supabaseAnon.auth.getUser(token);
  if (error || !data.user) return null;

  return { id: data.user.id, email: data.user.email };
}

async function requireAuth(req, res, next) {
  const user = await resolveAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: "Unauthorized" });
  req.authUser = user;
  return next();
}

function dateOnly(value) {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

function shiftIsoDate(isoDate, days) {
  const dt = new Date(`${isoDate}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function validateSyncPayload(payload) {
  const requestedDate = payload?.date || dateOnly(new Date());
  const syncDate = dateOnly(requestedDate);
  const totalMinutes = Number(payload?.totalMinutes);
  const topApp = payload?.topApp;
  const appSummaries = Array.isArray(payload?.apps) ? payload.apps : [];

  if (!syncDate) return { error: "date must be a valid date" };
  if (!Number.isFinite(totalMinutes) || totalMinutes < 0 || totalMinutes > 1440)
    return { error: "totalMinutes must be a non-negative number up to 1440" };
  if (!topApp || typeof topApp.name !== "string" || !topApp.name.trim())
    return { error: "topApp.name is required" };
  if (!Number.isFinite(Number(topApp.minutes)) || Number(topApp.minutes) < 0 || Number(topApp.minutes) > 1440)
    return { error: "topApp.minutes must be a non-negative number up to 1440" };

  return { syncDate, totalMinutes, topApp, appSummaries };
}

async function storeUsageSummary({ user, syncDate, totalMinutes, topApp, appSummaries }) {
  if (!supabaseAdmin) {
    return {
      source: "mock",
      synced: true,
      date: syncDate,
      stored: { totalMinutes, topApp, appsCount: appSummaries.length },
    };
  }

  const previousDate = shiftIsoDate(syncDate, -1);
  const previousUsage = await supabaseAdmin
    .from("daily_usage")
    .select("total_minutes")
    .eq("user_id", user.id)
    .eq("date", previousDate)
    .maybeSingle();

  if (previousUsage.error) throw new Error(previousUsage.error.message);

  const deltaMinutes = totalMinutes - (previousUsage.data?.total_minutes || totalMinutes);

  const upsertDaily = await supabaseAdmin
    .from("daily_usage")
    .upsert(
      {
        user_id: user.id,
        date: syncDate,
        total_minutes: Math.round(totalMinutes),
        delta_minutes: Math.round(deltaMinutes),
      },
      { onConflict: "user_id,date" }
    )
    .select("user_id, total_minutes")
    .single();

  if (upsertDaily.error) throw new Error(upsertDaily.error.message);

  const normalizedApps = (appSummaries.length ? appSummaries : [topApp])
    .filter((row) => row && typeof row.name === "string")
    .map((row) => ({
      user_id: user.id,
      date: syncDate,
      app_name: row.name.trim(),
      app_icon: typeof row.icon === "string" && row.icon.trim() ? row.icon : "📱",
      minutes: Math.max(0, Math.round(Number(row.minutes) || 0)),
      color: typeof row.color === "string" ? row.color : null,
    }));

  const wipeApps = await supabaseAdmin
    .from("app_usage")
    .delete()
    .eq("user_id", user.id)
    .eq("date", syncDate);

  if (wipeApps.error) throw new Error(wipeApps.error.message);

  if (normalizedApps.length) {
    const insertApps = await supabaseAdmin.from("app_usage").insert(normalizedApps);
    if (insertApps.error) throw new Error(insertApps.error.message);
  }

  const profileSummary = await getProfileSummary(user.id, user.email);
  const upsertLeaderboard = await supabaseAdmin
    .from("leaderboard_daily")
    .upsert(
      {
        date: syncDate,
        user_id: user.id,
        display_name: profileSummary.displayName,
        initials: profileSummary.initials,
        avatar_color: profileSummary.avatarColor,
        total_minutes: Math.round(totalMinutes),
        top_app_name: topApp.name.trim(),
        top_app_icon: typeof topApp.icon === "string" && topApp.icon.trim() ? topApp.icon : "📱",
        delta_minutes: Math.round(deltaMinutes),
        is_you: true,
      },
      { onConflict: "date,user_id" }
    );

  if (upsertLeaderboard.error) throw new Error(upsertLeaderboard.error.message);

  const rank = await calculateRankForDate(syncDate, user.id);
  const avgDailyMinutes = await updateRollingAverage(user.id);

  if (rank !== null) {
    await supabaseAdmin
      .from("daily_usage")
      .update({ rank })
      .eq("user_id", user.id)
      .eq("date", syncDate);
  }

  await supabaseAdmin
    .from("profiles")
    .upsert(
      {
        id: user.id,
        display_name: profileSummary.displayName,
        initials: profileSummary.initials,
        avatar_color: profileSummary.avatarColor,
        member_since: "April 2026",
        groups_count: 1,
        rank: rank || 0,
        avg_daily_minutes: avgDailyMinutes || 0,
      },
      { onConflict: "id" }
    );

  return {
    source: "supabase",
    synced: true,
    date: syncDate,
    stored: {
      totalMinutes: Math.round(totalMinutes),
      deltaMinutes: Math.round(deltaMinutes),
      topApp: {
        name: topApp.name.trim(),
        icon: typeof topApp.icon === "string" && topApp.icon.trim() ? topApp.icon : "📱",
        minutes: Math.max(0, Math.round(Number(topApp.minutes) || 0)),
      },
      appsCount: normalizedApps.length,
      rank,
    },
  };
}

async function getProfileSummary(userId, fallbackEmail) {
  if (!supabaseAdmin) {
    return { displayName: "You", initials: "YO", avatarColor: "purple" };
  }

  const { data } = await supabaseAdmin
    .from("profiles")
    .select("display_name, initials, avatar_color")
    .eq("id", userId)
    .maybeSingle();

  if (data) {
    return {
      displayName: data.display_name,
      initials: data.initials,
      avatarColor: data.avatar_color,
    };
  }

  const safeName = (fallbackEmail || "You").split("@")[0] || "You";
  return {
    displayName: safeName,
    initials: safeName.slice(0, 2).toUpperCase(),
    avatarColor: "purple",
  };
}

async function calculateRankForDate(isoDate, userId) {
  if (!supabaseAdmin) return null;

  const { data, error } = await supabaseAdmin
    .from("daily_usage")
    .select("user_id, total_minutes")
    .eq("date", isoDate)
    .order("total_minutes", { ascending: true });

  if (error || !data) return null;

  const idx = data.findIndex((row) => row.user_id === userId);
  return idx >= 0 ? idx + 1 : null;
}

async function updateRollingAverage(userId) {
  if (!supabaseAdmin) return null;

  const since = shiftIsoDate(dateOnly(new Date()), -29);
  const { data, error } = await supabaseAdmin
    .from("daily_usage")
    .select("total_minutes")
    .eq("user_id", userId)
    .gte("date", since);

  if (error || !data?.length) return 0;
  return Math.round(data.reduce((sum, row) => sum + row.total_minutes, 0) / data.length);
}

function toHhMm(minutes) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function normalizeDeviceName(value) {
  const base = typeof value === "string" ? value.trim() : "";
  if (!base) return "This device";
  return base.slice(0, 80);
}

function normalizePlatform(value) {
  const base = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!base) return "web";
  return base.slice(0, 30);
}

function normalizePermissionStatus(value) {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (["unknown", "requested", "granted", "denied", "restricted"].includes(raw)) {
    return raw;
  }
  return null;
}

function hashDeviceToken(token) {
  return createHash("sha256").update(String(token)).digest("hex");
}

function generateDeviceToken() {
  return `spdt_${randomBytes(24).toString("hex")}`;
}

function extractDeviceToken(req) {
  const headerToken = req.headers["x-device-token"];
  if (typeof headerToken === "string" && headerToken.trim()) {
    return headerToken.trim();
  }

  const authHeader = req.headers.authorization;
  if (typeof authHeader === "string" && authHeader.startsWith("Device ")) {
    const token = authHeader.slice("Device ".length).trim();
    return token || null;
  }

  return null;
}

async function resolveDeviceFromRequest(req) {
  const token = extractDeviceToken(req);
  if (!token) return null;

  const tokenHash = hashDeviceToken(token);

  if (!supabaseAdmin) {
    const device = mockDevices.find((row) => row.device_token_hash === tokenHash && !row.revoked_at);
    if (!device) return null;
    device.token_last_used_at = new Date().toISOString();
    return {
      deviceId: device.id,
      userId: device.user_id || null,
      ownerKey: device.owner_key,
      email: null,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("devices")
    .select("id, user_id, owner_key, revoked_at")
    .eq("device_token_hash", tokenHash)
    .is("revoked_at", null)
    .maybeSingle();

  if (error || !data) return null;

  void supabaseAdmin
    .from("devices")
    .update({ token_last_used_at: new Date().toISOString() })
    .eq("id", data.id);

  return {
    deviceId: data.id,
    userId: data.user_id,
    ownerKey: data.owner_key,
    email: null,
  };
}

function generatePairingCode() {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 6; i += 1) {
    code += alphabet[randomInt(0, alphabet.length)];
  }
  return code;
}

async function resolveDeviceOwner(req) {
  const tokenDevice = await resolveDeviceFromRequest(req);
  if (tokenDevice?.ownerKey) {
    return {
      key: tokenDevice.ownerKey,
      userId: tokenDevice.userId,
      email: tokenDevice.email || null,
      deviceId: tokenDevice.deviceId,
    };
  }

  const authUser = await resolveAuthenticatedUser(req);
  if (authUser?.id) {
    return {
      key: `user:${authUser.id}`,
      userId: authUser.id,
      email: authUser.email || null,
      deviceId: null,
    };
  }

  if (!req.session.deviceOwnerKey) {
    req.session.deviceOwnerKey = `guest:${req.sessionID}`;
  }

  return {
    key: req.session.deviceOwnerKey,
    userId: null,
    email: null,
    deviceId: null,
  };
}

// ─── Routes ────────────────────────────────────────────────────────────────

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

app.post("/api/auth/login", loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPassword = String(password);

  const establishSession = (user, mode) => {
    req.session.regenerate((err) => {
      if (err) {
        console.error("[auth] session regenerate failed", err);
        return res.status(500).json({ error: "Session error" });
      }

      req.session.user = {
        id: user.id,
        email: user.email || normalizedEmail,
      };

      req.session.save((saveErr) => {
        if (saveErr) {
          console.error("[auth] session save failed", saveErr);
          return res.status(500).json({ error: "Session save error" });
        }
        return res.json({ user: req.session.user, mode });
      });
    });
  };

  if (ownerEmail && ownerPassword && normalizedEmail === ownerEmail && normalizedPassword === ownerPassword) {
    return establishSession({ id: "00000000-0000-0000-0000-000000000001", email: ownerEmail }, "owner");
  }

  if (!supabaseAnon) {
    return res.status(503).json({ error: "Account sign in requires Supabase auth to be configured" });
  }

  const { data, error } = await supabaseAnon.auth.signInWithPassword({
    email: normalizedEmail,
    password: normalizedPassword,
  });

  if (error || !data.user) {
    return res.status(403).json({ error: error?.message || "Invalid credentials" });
  }

  return establishSession({ id: data.user.id, email: data.user.email }, "account");
});

app.post("/api/auth/signup", loginLimiter, async (req, res) => {
  const { email, password } = req.body || {};

  if (!email || !password) {
    return res.status(400).json({ error: "email and password are required" });
  }

  if (!supabaseAdmin) {
    return res.status(503).json({ error: "Account creation requires Supabase service role access" });
  }

  const normalizedEmail = String(email).trim().toLowerCase();
  const normalizedPassword = String(password);

  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email: normalizedEmail,
    password: normalizedPassword,
    email_confirm: true,
  });

  if (error || !data.user) {
    return res.status(400).json({ error: error?.message || "Could not create account" });
  }

  const profileSummary = await getProfileSummary(data.user.id, normalizedEmail);
  await supabaseAdmin.from("profiles").upsert(
    {
      id: data.user.id,
      display_name: profileSummary.displayName,
      initials: profileSummary.initials,
      avatar_color: profileSummary.avatarColor,
      member_since: "April 2026",
      groups_count: 1,
      rank: 0,
      avg_daily_minutes: 0,
    },
    { onConflict: "id" }
  );

  req.session.regenerate((err) => {
    if (err) {
      console.error("[auth] session regenerate failed", err);
      return res.status(500).json({ error: "Session error" });
    }

    req.session.user = {
      id: data.user.id,
      email: normalizedEmail,
    };

    req.session.save((saveErr) => {
      if (saveErr) {
        console.error("[auth] session save failed", saveErr);
        return res.status(500).json({ error: "Session save error" });
      }
      return res.status(201).json({ user: req.session.user, mode: "account" });
    });
  });
});

app.post("/api/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.clearCookie("screenpact.sid");
    res.json({ ok: true });
  });
});

app.get("/api/auth/session", (req, res) => {
  res.json({
    authenticated: Boolean(req.session?.user),
    user: req.session?.user || null,
  });
});

app.get("/api/devices", async (req, res) => {
  const owner = await resolveDeviceOwner(req);

  if (!supabaseAdmin) {
    const devices = mockDevices
      .filter((row) => row.owner_key === owner.key && !row.revoked_at)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .map((row) => ({
        id: row.id,
        name: row.device_name,
        platform: row.platform,
        permissionStatus: row.permission_status || "unknown",
        permissionUpdatedAt: row.permission_updated_at || null,
        createdAt: row.created_at,
        lastSyncedAt: row.last_synced_at,
      }));

    const activeCode = mockPairingCodes
      .filter((row) => row.owner_key === owner.key && !row.consumed_at && new Date(row.expires_at) > new Date())
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))[0];

    return res.json({
      source: "mock",
      devices,
      pairingCode: activeCode
        ? { code: activeCode.code, expiresAt: activeCode.expires_at }
        : null,
    });
  }

  const [devicesResult, codesResult] = await Promise.all([
    supabaseAdmin
      .from("devices")
      .select("id, device_name, platform, permission_status, permission_updated_at, created_at, last_synced_at")
      .eq("owner_key", owner.key)
      .is("revoked_at", null)
      .order("created_at", { ascending: false }),
    supabaseAdmin
      .from("device_pairing_codes")
      .select("code, expires_at, consumed_at")
      .eq("owner_key", owner.key)
      .is("consumed_at", null)
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1),
  ]);

  if (devicesResult.error || codesResult.error) {
    return res.status(500).json({
      error: devicesResult.error?.message || codesResult.error?.message || "Failed to load devices",
    });
  }

  const devices = (devicesResult.data || []).map((row) => ({
    id: row.id,
    name: row.device_name,
    platform: row.platform,
    permissionStatus: row.permission_status || "unknown",
    permissionUpdatedAt: row.permission_updated_at || null,
    createdAt: row.created_at,
    lastSyncedAt: row.last_synced_at,
  }));

  const activeCode = codesResult.data?.[0];

  return res.json({
    source: "supabase",
    devices,
    pairingCode: activeCode
      ? { code: activeCode.code, expiresAt: activeCode.expires_at }
      : null,
  });
});

app.post("/api/devices", async (req, res) => {
  const owner = await resolveDeviceOwner(req);
  const deviceName = normalizeDeviceName(req.body?.name);
  const platform = normalizePlatform(req.body?.platform);
  const deviceToken = generateDeviceToken();
  const deviceTokenHash = hashDeviceToken(deviceToken);
  const tokenIssuedAt = new Date().toISOString();

  if (!supabaseAdmin) {
    const record = {
      id: `mock-device-${Date.now()}`,
      owner_key: owner.key,
      user_id: owner.userId,
      device_name: deviceName,
      platform,
      permission_status: "unknown",
      permission_updated_at: null,
      device_token_hash: deviceTokenHash,
      token_issued_at: tokenIssuedAt,
      token_last_used_at: null,
      created_at: new Date().toISOString(),
      last_synced_at: null,
      revoked_at: null,
    };
    mockDevices.push(record);

    return res.status(201).json({
      source: "mock",
      device: {
        id: record.id,
        name: record.device_name,
        platform: record.platform,
        permissionStatus: record.permission_status,
        permissionUpdatedAt: record.permission_updated_at,
        createdAt: record.created_at,
        lastSyncedAt: record.last_synced_at,
      },
      deviceToken,
    });
  }

  const { data, error } = await supabaseAdmin
    .from("devices")
    .insert({
      owner_key: owner.key,
      user_id: owner.userId,
      device_name: deviceName,
      platform,
      device_token_hash: deviceTokenHash,
      token_issued_at: tokenIssuedAt,
    })
    .select("id, device_name, platform, permission_status, permission_updated_at, created_at, last_synced_at")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({
    source: "supabase",
    device: {
      id: data.id,
      name: data.device_name,
      platform: data.platform,
      permissionStatus: data.permission_status,
      permissionUpdatedAt: data.permission_updated_at,
      createdAt: data.created_at,
      lastSyncedAt: data.last_synced_at,
    },
    deviceToken,
  });
});

app.post("/api/devices/pairing/consume", async (req, res) => {
  const code = String(req.body?.code || "").trim().toUpperCase();
  const deviceName = normalizeDeviceName(req.body?.name);
  const platform = normalizePlatform(req.body?.platform);

  if (!code) {
    return res.status(400).json({ error: "code is required" });
  }

  const nowIso = new Date().toISOString();
  const deviceToken = generateDeviceToken();
  const deviceTokenHash = hashDeviceToken(deviceToken);

  if (!supabaseAdmin) {
    const codeIdx = mockPairingCodes.findIndex((row) => row.code === code && !row.consumed_at && new Date(row.expires_at) > new Date());
    if (codeIdx < 0) {
      return res.status(404).json({ error: "Pairing code is invalid or expired" });
    }

    mockPairingCodes[codeIdx].consumed_at = nowIso;

    const record = {
      id: `mock-device-${Date.now()}`,
      owner_key: mockPairingCodes[codeIdx].owner_key,
      user_id: mockPairingCodes[codeIdx].user_id,
      device_name: deviceName,
      platform,
      permission_status: "requested",
      permission_updated_at: nowIso,
      device_token_hash: deviceTokenHash,
      token_issued_at: nowIso,
      token_last_used_at: null,
      created_at: nowIso,
      last_synced_at: null,
      revoked_at: null,
    };
    mockDevices.push(record);

    return res.status(201).json({
      source: "mock",
      device: {
        id: record.id,
        name: record.device_name,
        platform: record.platform,
        permissionStatus: record.permission_status,
        permissionUpdatedAt: record.permission_updated_at,
      },
      deviceToken,
    });
  }

  const { data: consumedCode, error: consumeError } = await supabaseAdmin
    .from("device_pairing_codes")
    .update({ consumed_at: nowIso })
    .eq("code", code)
    .is("consumed_at", null)
    .gt("expires_at", nowIso)
    .select("owner_key, user_id")
    .maybeSingle();

  if (consumeError) {
    return res.status(500).json({ error: consumeError.message });
  }

  if (!consumedCode) {
    return res.status(404).json({ error: "Pairing code is invalid or expired" });
  }

  const { data, error } = await supabaseAdmin
    .from("devices")
    .insert({
      owner_key: consumedCode.owner_key,
      user_id: consumedCode.user_id,
      device_name: deviceName,
      platform,
      permission_status: "requested",
      permission_updated_at: nowIso,
      device_token_hash: deviceTokenHash,
      token_issued_at: nowIso,
    })
    .select("id, device_name, platform, permission_status, permission_updated_at")
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({
    source: "supabase",
    device: {
      id: data.id,
      name: data.device_name,
      platform: data.platform,
      permissionStatus: data.permission_status,
      permissionUpdatedAt: data.permission_updated_at,
    },
    deviceToken,
  });
});

app.post("/api/devices/:deviceId/permission", async (req, res) => {
  const owner = await resolveDeviceOwner(req);
  const deviceId = req.params.deviceId;
  const status = normalizePermissionStatus(req.body?.status);

  if (!deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }

  if (!status) {
    return res.status(400).json({ error: "status must be one of: unknown, requested, granted, denied, restricted" });
  }

  if (owner.deviceId && String(owner.deviceId) !== String(deviceId)) {
    return res.status(403).json({ error: "Device token cannot update another device" });
  }

  const permissionUpdatedAt = new Date().toISOString();

  if (!supabaseAdmin) {
    const idx = mockDevices.findIndex((row) => row.owner_key === owner.key && String(row.id) === String(deviceId) && !row.revoked_at);
    if (idx < 0) {
      return res.status(404).json({ error: "Device not found" });
    }

    mockDevices[idx].permission_status = status;
    mockDevices[idx].permission_updated_at = permissionUpdatedAt;

    return res.json({
      source: "mock",
      device: {
        id: mockDevices[idx].id,
        permissionStatus: mockDevices[idx].permission_status,
        permissionUpdatedAt: mockDevices[idx].permission_updated_at,
      },
    });
  }

  const { data, error } = await supabaseAdmin
    .from("devices")
    .update({ permission_status: status, permission_updated_at: permissionUpdatedAt })
    .eq("owner_key", owner.key)
    .eq("id", deviceId)
    .is("revoked_at", null)
    .select("id, permission_status, permission_updated_at")
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: "Device not found" });
  }

  return res.json({
    source: "supabase",
    device: {
      id: data.id,
      permissionStatus: data.permission_status,
      permissionUpdatedAt: data.permission_updated_at,
    },
  });
});

app.post("/api/devices/:deviceId/sync-heartbeat", async (req, res) => {
  const owner = await resolveDeviceOwner(req);
  const deviceId = req.params.deviceId;

  if (!deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }

  if (owner.deviceId && String(owner.deviceId) !== String(deviceId)) {
    return res.status(403).json({ error: "Device token cannot sync another device" });
  }

  const nowIso = new Date().toISOString();

  if (!supabaseAdmin) {
    const idx = mockDevices.findIndex((row) => row.owner_key === owner.key && String(row.id) === String(deviceId) && !row.revoked_at);
    if (idx < 0) {
      return res.status(404).json({ error: "Device not found" });
    }

    mockDevices[idx].last_synced_at = nowIso;
    return res.json({ source: "mock", ok: true, lastSyncedAt: nowIso });
  }

  const { data, error } = await supabaseAdmin
    .from("devices")
    .update({ last_synced_at: nowIso })
    .eq("owner_key", owner.key)
    .eq("id", deviceId)
    .is("revoked_at", null)
    .select("id, last_synced_at")
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: "Device not found" });
  }

  return res.json({ source: "supabase", ok: true, lastSyncedAt: data.last_synced_at });
});

app.delete("/api/devices/:deviceId", async (req, res) => {
  const owner = await resolveDeviceOwner(req);
  const deviceId = req.params.deviceId;

  if (!deviceId) {
    return res.status(400).json({ error: "deviceId is required" });
  }

  if (owner.deviceId && String(owner.deviceId) !== String(deviceId)) {
    return res.status(403).json({ error: "Device token cannot revoke another device" });
  }

  if (!supabaseAdmin) {
    const idx = mockDevices.findIndex((row) => row.owner_key === owner.key && String(row.id) === String(deviceId) && !row.revoked_at);
    if (idx < 0) {
      return res.status(404).json({ error: "Device not found" });
    }
    mockDevices[idx].revoked_at = new Date().toISOString();
    return res.json({ source: "mock", ok: true });
  }

  const { data, error } = await supabaseAdmin
    .from("devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("owner_key", owner.key)
    .eq("id", deviceId)
    .is("revoked_at", null)
    .select("id")
    .maybeSingle();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!data) {
    return res.status(404).json({ error: "Device not found" });
  }

  return res.json({ source: "supabase", ok: true });
});

app.post("/api/devices/pairing-code", async (req, res) => {
  const owner = await resolveDeviceOwner(req);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const code = generatePairingCode();

  if (!supabaseAdmin) {
    const record = {
      id: `mock-code-${Date.now()}`,
      owner_key: owner.key,
      user_id: owner.userId,
      code,
      expires_at: expiresAt,
      consumed_at: null,
      created_at: new Date().toISOString(),
    };
    mockPairingCodes.push(record);
    return res.status(201).json({
      source: "mock",
      pairingCode: {
        code,
        expiresAt,
      },
    });
  }

  const { error } = await supabaseAdmin.from("device_pairing_codes").insert({
    owner_key: owner.key,
    user_id: owner.userId,
    code,
    expires_at: expiresAt,
  });

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json({
    source: "supabase",
    pairingCode: {
      code,
      expiresAt,
    },
  });
});

app.get("/api/leaderboard", async (req, res) => {
  const date = req.query.date || new Date().toISOString().slice(0, 10);

  if (!supabaseAdmin) {
    return res.json({ source: "mock", date, members: mockMembers });
  }

  const { data, error } = await supabaseAdmin
    .from("leaderboard_daily")
    .select("display_name, initials, avatar_color, total_minutes, top_app_name, top_app_icon, delta_minutes, is_you")
    .eq("date", date)
    .order("total_minutes", { ascending: true });

  if (error) return res.status(500).json({ error: error.message });

  const members = (data || []).map((row) => ({
    name: row.display_name,
    initials: row.initials,
    avatar: row.avatar_color,
    time: row.total_minutes,
    app: row.top_app_name,
    appIcon: row.top_app_icon,
    delta: row.delta_minutes,
    you: Boolean(row.is_you),
  }));

  return res.json({ source: "supabase", date, members });
});

app.get("/api/my-stats", requireAuth, async (req, res) => {
  const userId = req.authUser.id;

  if (!supabaseAdmin) {
    const totalAppMins = mockApps.reduce((sum, appRow) => sum + appRow.mins, 0);
    const avgDay = Math.round(mockDayMins.reduce((sum, day) => sum + day, 0) / mockDayMins.length);

    return res.json({
      source: "mock",
      metrics: {
        today: "2h 38m",
        weeklyAvg: toHhMm(avgDay),
        groupRank: "#3",
        bestDay: "1h 05m",
      },
      apps: mockApps.map((row) => ({
        ...row,
        percent: Math.round((row.mins / totalAppMins) * 100),
      })),
      weekDays: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      dayMins: mockDayMins,
    });
  }

  const today = new Date().toISOString().slice(0, 10);
  const weekStart = new Date();
  weekStart.setDate(weekStart.getDate() - 6);
  const weekStartIso = weekStart.toISOString().slice(0, 10);

  const [todayUsage, appsUsage, weekUsage] = await Promise.all([
    supabaseAdmin
      .from("daily_usage")
      .select("total_minutes, delta_minutes, rank")
      .eq("user_id", userId)
      .eq("date", today)
      .maybeSingle(),
    supabaseAdmin
      .from("app_usage")
      .select("app_name, app_icon, minutes, color")
      .eq("user_id", userId)
      .eq("date", today)
      .order("minutes", { ascending: false }),
    supabaseAdmin
      .from("daily_usage")
      .select("date, total_minutes")
      .eq("user_id", userId)
      .gte("date", weekStartIso)
      .order("date", { ascending: true }),
  ]);

  if (todayUsage.error || appsUsage.error || weekUsage.error) {
    return res.status(500).json({
      error: todayUsage.error?.message || appsUsage.error?.message || weekUsage.error?.message || "Failed to load stats",
    });
  }

  const appRows = appsUsage.data || [];
  const totalAppMins = appRows.reduce((sum, row) => sum + row.minutes, 0) || 1;
  const dayRows = weekUsage.data || [];
  const dayMins = dayRows.map((row) => row.total_minutes);
  const avgDay = dayMins.length ? Math.round(dayMins.reduce((sum, x) => sum + x, 0) / dayMins.length) : 0;
  const bestDay = dayMins.length ? Math.min(...dayMins) : 0;

  return res.json({
    source: "supabase",
    metrics: {
      today: toHhMm(todayUsage.data?.total_minutes || 0),
      weeklyAvg: toHhMm(avgDay),
      groupRank: todayUsage.data?.rank ? `#${todayUsage.data.rank}` : "-",
      bestDay: toHhMm(bestDay),
    },
    apps: appRows.map((row) => ({
      name: row.app_name,
      icon: row.app_icon,
      mins: row.minutes,
      color: row.color || "hsl(0 0% 53%)",
      percent: Math.round((row.minutes / totalAppMins) * 100),
    })),
    weekDays: dayRows.map((row) => new Date(row.date).toLocaleDateString("en-US", { weekday: "short" })),
    dayMins,
  });
});

app.get("/api/profile", requireAuth, async (req, res) => {
  const userId = req.authUser.id;

  if (!supabaseAdmin) {
    return res.json({ source: "mock", ...mockProfile });
  }

  const [profileResult, achievementsResult] = await Promise.all([
    supabaseAdmin
      .from("profiles")
      .select("display_name, initials, avatar_color, member_since, groups_count, rank, avg_daily_minutes")
      .eq("id", userId)
      .maybeSingle(),
    supabaseAdmin
      .from("achievements")
      .select("icon, label, value, color")
      .eq("user_id", userId)
      .order("sort_order", { ascending: true }),
  ]);

  if (profileResult.error || achievementsResult.error) {
    return res.status(500).json({
      error: profileResult.error?.message || achievementsResult.error?.message || "Failed to load profile",
    });
  }

  const row = profileResult.data;
  if (!row) return res.status(404).json({ error: "Profile not found" });

  return res.json({
    source: "supabase",
    displayName: row.display_name,
    initials: row.initials,
    avatar: row.avatar_color,
    memberSince: row.member_since,
    groupsCount: row.groups_count,
    rank: row.rank,
    avgDailyMinutes: row.avg_daily_minutes,
    achievements: achievementsResult.data || [],
  });
});

app.get("/api/settings", requireAuth, async (req, res) => {
  const userId = req.authUser.id;

  if (!supabaseAdmin) {
    return res.json({ source: "mock", ...mockSettings });
  }

  const { data, error } = await supabaseAdmin
    .from("user_settings")
    .select("notifications, dark_mode, daily_goal_minutes")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) return res.status(500).json({ error: error.message });

  return res.json({
    source: "supabase",
    notifications: data?.notifications ?? true,
    darkMode: data?.dark_mode ?? false,
    dailyGoalMinutes: data?.daily_goal_minutes ?? 180,
  });
});

app.put("/api/settings", requireAuth, async (req, res) => {
  const userId = req.authUser.id;
  const { notifications, darkMode, dailyGoalMinutes } = req.body || {};

  if (typeof notifications !== "boolean" || typeof darkMode !== "boolean") {
    return res.status(400).json({ error: "notifications and darkMode must be boolean" });
  }

  if (!Number.isInteger(dailyGoalMinutes) || dailyGoalMinutes < 30 || dailyGoalMinutes > 960) {
    return res.status(400).json({ error: "dailyGoalMinutes must be an integer between 30 and 960" });
  }

  if (!supabaseAdmin) {
    return res.json({ source: "mock", notifications, darkMode, dailyGoalMinutes });
  }

  const { data, error } = await supabaseAdmin
    .from("user_settings")
    .upsert(
      {
        user_id: userId,
        notifications,
        dark_mode: darkMode,
        daily_goal_minutes: dailyGoalMinutes,
      },
      { onConflict: "user_id" }
    )
    .select("notifications, dark_mode, daily_goal_minutes")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.json({
    source: "supabase",
    notifications: data.notifications,
    darkMode: data.dark_mode,
    dailyGoalMinutes: data.daily_goal_minutes,
  });
});

app.get("/api/privacy", requireAuth, async (req, res) => {
  const userId = req.authUser.id;

  if (!supabaseAdmin) {
    const mine = mockPrivacyRequests
      .filter((row) => row.user_id === userId)
      .sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)))
      .slice(0, 10)
      .map((row) => ({
        id: row.id,
        type: row.type,
        status: row.status,
        note: row.note,
        createdAt: row.created_at,
        resolvedAt: row.resolved_at,
      }));

    return res.json({
      source: "mock",
      summary: {
        email: req.authUser.email || "unknown",
        memberSince: "April 2026",
        syncedDays: 0,
        lastSyncDate: null,
      },
      dataCollected: ["daily total minutes", "top app summary", "settings preferences"],
      requests: mine,
    });
  }

  const [profileResult, latestSyncResult, syncCountResult, requestsResult] = await Promise.all([
    supabaseAdmin.from("profiles").select("member_since").eq("id", userId).maybeSingle(),
    supabaseAdmin.from("daily_usage").select("date").eq("user_id", userId).order("date", { ascending: false }).limit(1),
    supabaseAdmin.from("daily_usage").select("id", { count: "exact", head: true }).eq("user_id", userId),
    supabaseAdmin
      .from("privacy_requests")
      .select("id, request_type, status, note, created_at, resolved_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(10),
  ]);

  if (profileResult.error || latestSyncResult.error || syncCountResult.error || requestsResult.error) {
    return res.status(500).json({
      error:
        profileResult.error?.message ||
        latestSyncResult.error?.message ||
        syncCountResult.error?.message ||
        requestsResult.error?.message ||
        "Failed to load privacy data",
    });
  }

  return res.json({
    source: "supabase",
    summary: {
      email: req.authUser.email || "unknown",
      memberSince: profileResult.data?.member_since || "-",
      syncedDays: syncCountResult.count || 0,
      lastSyncDate: latestSyncResult.data?.[0]?.date || null,
    },
    dataCollected: ["daily total minutes", "top app summary", "settings preferences"],
    requests: (requestsResult.data || []).map((row) => ({
      id: row.id,
      type: row.request_type,
      status: row.status,
      note: row.note,
      createdAt: row.created_at,
      resolvedAt: row.resolved_at,
    })),
  });
});

app.post("/api/privacy/request", privacyLimiter, requireAuth, async (req, res) => {
  const userId = req.authUser.id;
  const type = req.body?.type;
  const note = typeof req.body?.note === "string" ? req.body.note.trim() : "";

  if (type !== "export" && type !== "delete") {
    return res.status(400).json({ error: "type must be either export or delete" });
  }

  if (note.length > 500) {
    return res.status(400).json({ error: "note cannot exceed 500 characters" });
  }

  if (!supabaseAdmin) {
    const createdAt = new Date().toISOString();
    const record = {
      id: `mock-${Date.now()}`,
      user_id: userId,
      type,
      status: "pending",
      note,
      created_at: createdAt,
      resolved_at: null,
    };
    mockPrivacyRequests.push(record);

    return res.status(201).json({
      source: "mock",
      request: {
        id: record.id,
        type: record.type,
        status: record.status,
        note: record.note,
        createdAt: record.created_at,
      },
    });
  }

  const { data, error } = await supabaseAdmin
    .from("privacy_requests")
    .insert({
      user_id: userId,
      request_type: type,
      status: "pending",
      note,
    })
    .select("id, request_type, status, note, created_at")
    .single();

  if (error) return res.status(500).json({ error: error.message });

  return res.status(201).json({
    source: "supabase",
    request: {
      id: data.id,
      type: data.request_type,
      status: data.status,
      note: data.note,
      createdAt: data.created_at,
    },
  });
});

app.post("/api/usage/sync", syncLimiter, requireAuth, async (req, res) => {
  const validated = validateSyncPayload(req.body);
  if (validated.error) return res.status(400).json({ error: validated.error });

  try {
    const result = await storeUsageSummary({ user: req.authUser, ...validated });
    return res.json(result);
  } catch (error) {
    console.warn(`[sync] failed for ${req.authUser.id} on ${validated.syncDate}: ${error instanceof Error ? error.message : "unknown"}`);
    return res.status(500).json({ error: error instanceof Error ? error.message : "Sync failed" });
  }
});

app.post("/api/usage/sync/batch", syncLimiter, requireAuth, async (req, res) => {
  const entries = Array.isArray(req.body?.entries) ? req.body.entries : [];

  if (!entries.length) return res.status(400).json({ error: "entries array is required" });
  if (entries.length > 31) return res.status(400).json({ error: "entries cannot exceed 31 days per request" });

  const results = [];
  for (const entry of entries) {
    const validated = validateSyncPayload(entry);
    if (validated.error) {
      return res.status(400).json({ error: `Invalid entry: ${validated.error}` });
    }

    try {
      const result = await storeUsageSummary({ user: req.authUser, ...validated });
      results.push({ date: validated.syncDate, synced: true, source: result.source });
    } catch (error) {
      console.warn(`[sync-batch] failed for ${req.authUser.id} on ${validated.syncDate}: ${error instanceof Error ? error.message : "unknown"}`);
      results.push({
        date: validated.syncDate,
        synced: false,
        error: error instanceof Error ? error.message : "Sync failed",
      });
    }
  }

  const failed = results.filter((item) => !item.synced).length;
  return res.status(failed ? 207 : 200).json({
    synced: entries.length - failed,
    failed,
    results,
  });
});

app.use((err, _req, res, _next) => {
  if (err?.message === "CORS origin denied") {
    return res.status(403).json({ error: "Origin not allowed by CORS policy" });
  }
  if (err?.type === "entity.parse.failed") {
    return res.status(400).json({ error: "Invalid JSON payload" });
  }
  console.error("[api] unhandled error", err);
  return res.status(500).json({ error: "Internal server error" });
});

app.listen(port, () => {
  console.log(`API server listening on http://localhost:${port}`);
});