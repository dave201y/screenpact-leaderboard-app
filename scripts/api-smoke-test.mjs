const baseUrl = process.env.API_BASE_URL || "http://localhost:8787";

async function request(path, options = {}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetch(`${baseUrl}${path}`, {
      ...options,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
    });

    const contentType = res.headers.get("content-type") || "";
    let body = null;

    if (contentType.includes("application/json")) {
      body = await res.json();
    } else {
      body = await res.text();
    }

    return { status: res.status, body };
  } finally {
    clearTimeout(timeout);
  }
}

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function run() {
  const checks = [];

  const health = await request("/api/health", { method: "GET" });
  assert(health.status === 200, `Expected /api/health 200, got ${health.status}`);
  assert(health.body && health.body.ok === true, "Expected /api/health body.ok=true");
  checks.push("health endpoint");

  const syncUnauthorized = await request("/api/usage/sync", {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert(syncUnauthorized.status === 401, `Expected /api/usage/sync 401, got ${syncUnauthorized.status}`);
  checks.push("sync auth guard");

  const batchUnauthorized = await request("/api/usage/sync/batch", {
    method: "POST",
    body: JSON.stringify({}),
  });
  assert(batchUnauthorized.status === 401, `Expected /api/usage/sync/batch 401, got ${batchUnauthorized.status}`);
  checks.push("batch sync auth guard");

  const corsDenied = await request("/api/health", {
    method: "GET",
    headers: {
      Origin: "http://evil.example",
    },
  });
  assert(corsDenied.status === 403, `Expected disallowed origin 403, got ${corsDenied.status}`);
  checks.push("cors allowlist enforcement");

  console.log(`[api-smoke] PASS (${checks.length} checks): ${checks.join(", ")}`);
}

run().catch((error) => {
  console.error(`[api-smoke] FAIL: ${error.message}`);
  process.exit(1);
});
