import { spawn } from "node:child_process";

const port = Number(process.env.AUTH_TEST_PORT || 8788);
const baseUrl = `http://127.0.0.1:${port}`;
const serverEnv = { ...process.env };

for (const key of ["SUPABASE_URL", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"]) {
  serverEnv[key] = "";
}

Object.assign(serverEnv, {
  API_PORT: String(port),
  FRONTEND_ORIGIN: "http://localhost:8080",
  NODE_ENV: "test",
  OWNER_EMAIL: "owner@example.test",
  OWNER_PASSWORD: "correct-password",
  RATE_LIMIT_LOGIN_MAX: "3",
  RATE_LIMIT_LOGIN_WINDOW_MS: "60000",
});

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

async function request(path, options = {}) {
  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const body = contentType.includes("application/json") ? await response.json() : await response.text();
  return { response, body };
}

function cookieValue(response, name) {
  const setCookie = response.headers.get("set-cookie") || "";
  return setCookie.match(new RegExp(`${name}=([^;]+)`))?.[1] || null;
}

function cookieHeader(response) {
  const session = cookieValue(response, "screenpact.sid");
  const csrf = cookieValue(response, "screenpact.csrf");
  return [session && `screenpact.sid=${session}`, csrf && `screenpact.csrf=${csrf}`].filter(Boolean).join("; ");
}

async function waitForServer(getServerOutput) {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const { response } = await request("/api/health");
      if (response.ok) return;
    } catch {
      // The child process may still be starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`API server did not become ready${getServerOutput() ? `: ${getServerOutput()}` : ""}`);
}

async function run() {
  const server = spawn(process.execPath, ["server/index.js"], {
    cwd: new URL("..", import.meta.url),
    env: serverEnv,
    stdio: ["ignore", "pipe", "pipe"],
  });

  let serverOutput = "";
  server.stdout.on("data", (chunk) => {
    serverOutput += chunk;
  });
  server.stderr.on("data", (chunk) => {
    serverOutput += chunk;
  });

  try {
    await waitForServer(() => serverOutput.trim());
    const checks = [];

    for (const path of ["/api/my-stats", "/api/profile", "/api/settings", "/api/privacy"]) {
      const { response } = await request(path);
      assert(response.status === 401, `${path} should reject unauthenticated access, got ${response.status}`);
      checks.push(`${path} auth guard`);
    }

    const invalidDeviceSync = await request("/api/usage/sync", {
      method: "POST",
      headers: { "X-Device-Token": "spdt_invalid-token" },
      body: JSON.stringify({
        date: "2026-10-20",
        totalMinutes: 60,
        topApp: { name: "Browser", minutes: 30 },
      }),
    });
    assert(invalidDeviceSync.response.status === 401, `Invalid device token should return 401, got ${invalidDeviceSync.response.status}`);
    checks.push("invalid device token rejected");

    const invalidBearerDeviceSync = await request("/api/usage/sync", {
      method: "POST",
      headers: { Authorization: "Device spdt_invalid-token" },
      body: JSON.stringify({
        date: "2026-10-20",
        totalMinutes: 60,
        topApp: { name: "Browser", minutes: 30 },
      }),
    });
    assert(invalidBearerDeviceSync.response.status === 401, `Invalid Device authorization should return 401, got ${invalidBearerDeviceSync.response.status}`);
    checks.push("invalid Device authorization rejected");

    const ownerLogin = await request("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: "owner@example.test", password: "correct-password" }),
    });
    assert(ownerLogin.response.status === 200, `Owner login should return 200, got ${ownerLogin.response.status}`);
    const ownerCookie = cookieHeader(ownerLogin.response);
    const ownerCsrf = cookieValue(ownerLogin.response, "screenpact.csrf");
    assert(ownerCookie && ownerCsrf, "Owner login should establish session and CSRF cookies");

    const csrfRejected = await request("/api/settings", {
      method: "PUT",
      headers: { Cookie: `screenpact.sid=${cookieValue(ownerLogin.response, "screenpact.sid")}` },
      body: JSON.stringify({ notifications: true, darkMode: false, dailyGoalMinutes: 180 }),
    });
    assert(csrfRejected.response.status === 403, `Cookie-authenticated mutation without CSRF should return 403, got ${csrfRejected.response.status}`);
    checks.push("cookie mutation CSRF guard");

    const ownerDevice = await request("/api/devices", {
      method: "POST",
      headers: { Cookie: ownerCookie, "X-CSRF-Token": ownerCsrf },
      body: JSON.stringify({ name: "Owner phone", platform: "android" }),
    });
    assert(ownerDevice.response.status === 201, `Expected device creation to return 201, got ${ownerDevice.response.status}`);
    const ownerDeviceId = ownerDevice.body?.device?.id;
    const ownerDeviceToken = ownerDevice.body?.deviceToken;
    assert(ownerDeviceId && ownerDeviceToken, "Device creation should return a device id and token");
    checks.push("authenticated device created");

    const otherSession = await request("/api/devices", {
      method: "GET",
      headers: { Cookie: "screenpact.sid=other-session" },
    });
    assert(otherSession.response.status === 200, `Expected second session device lookup to return 200, got ${otherSession.response.status}`);

    const crossSessionMutation = await request(`/api/devices/${ownerDeviceId}/permission`, {
      method: "POST",
      headers: { Cookie: cookieHeader(otherSession.response) || "screenpact.sid=other-session" },
      body: JSON.stringify({ status: "granted" }),
    });
    assert(crossSessionMutation.response.status === 404, `Cross-session device mutation should not reveal or mutate the device, got ${crossSessionMutation.response.status}`);
    checks.push("cross-session device access blocked");

    const ownerMutation = await request(`/api/devices/${ownerDeviceId}/permission`, {
      method: "POST",
      headers: { Cookie: ownerCookie, "X-CSRF-Token": ownerCsrf },
      body: JSON.stringify({ status: "granted" }),
    });
    assert(ownerMutation.response.status === 200, `Owner should be able to update their device, got ${ownerMutation.response.status}`);
    checks.push("device ownership preserved");

    const syncPayload = {
      date: "2026-10-20",
      totalMinutes: 1440,
      topApp: { name: "Browser", minutes: 720 },
      apps: [{ name: "Browser", minutes: 720 }],
    };
    const firstSync = await request("/api/usage/sync", {
      method: "POST",
      headers: { "X-Device-Token": ownerDeviceToken },
      body: JSON.stringify(syncPayload),
    });
    assert(firstSync.response.status === 200, `First device sync should return 200, got ${firstSync.response.status}`);

    const repeatedSync = await request("/api/usage/sync", {
      method: "POST",
      headers: { "X-Device-Token": ownerDeviceToken },
      body: JSON.stringify(syncPayload),
    });
    assert(repeatedSync.response.status === 200, `Repeated device sync should return 200, got ${repeatedSync.response.status}`);
    assert(repeatedSync.body?.date === firstSync.body?.date, "Repeated sync should preserve the synced date");
    checks.push("repeated sync accepted safely");

    const invalidPayload = await request("/api/usage/sync", {
      method: "POST",
      headers: { "X-Device-Token": ownerDeviceToken },
      body: JSON.stringify({ ...syncPayload, totalMinutes: 1441 }),
    });
    assert(invalidPayload.response.status === 400, `Out-of-range usage should return 400, got ${invalidPayload.response.status}`);
    checks.push("usage payload bounds enforced");

    const revoke = await request(`/api/devices/${ownerDeviceId}`, {
      method: "DELETE",
      headers: { Cookie: ownerCookie, "X-CSRF-Token": ownerCsrf },
    });
    assert(revoke.response.status === 200, `Owner device revoke should return 200, got ${revoke.response.status}`);

    const revokedDeviceSync = await request("/api/usage/sync", {
      method: "POST",
      headers: { "X-Device-Token": ownerDeviceToken },
      body: JSON.stringify(syncPayload),
    });
    assert(revokedDeviceSync.response.status === 401, `Revoked device token should return 401, got ${revokedDeviceSync.response.status}`);
    checks.push("revoked device token rejected");

    let rateLimited = false;
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const login = await request("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ email: "wrong@example.test", password: "wrong-password" }),
      });
      if (login.response.status === 429) {
        rateLimited = true;
        break;
      }
    }
    assert(rateLimited, "Repeated login attempts should eventually return 429");
    checks.push("login rate limit enforced");

    console.log(`[api-auth] PASS (${checks.length} checks): ${checks.join(", ")}`);
  } finally {
    server.kill();
    if (server.exitCode === null) {
      await new Promise((resolve) => server.once("exit", resolve));
    }
    if (serverOutput.includes("EADDRINUSE")) {
      throw new Error(`Authorization test port ${port} is already in use`);
    }
  }
}

run().catch((error) => {
  console.error(`[api-auth] FAIL: ${error.message}`);
  process.exit(1);
});
