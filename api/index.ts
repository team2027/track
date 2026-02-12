import { Hono } from "hono";
import { cors } from "hono/cors";
import { classify, isPageView } from "./detect";
import { generateEventId, writeRawEvent, writeVisit, type Env } from "./db";
import { runQuery, QUERIES } from "./queries";

const TEST_HOSTS = ["localhost", "test.com", "example.com"];

function isTestHost(host: string): boolean {
  return TEST_HOSTS.some(
    (t) => host === t || host.startsWith(`${t}:`) || host.endsWith(`.${t}`)
  );
}

function getRootDomain(host: string): string {
  const withoutPort = host.split(":")[0];
  const parts = withoutPort.split(".");
  if (parts.length <= 2) return withoutPort;
  return parts.slice(-2).join(".");
}

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors());

app.post("/track", async (c) => {
  const body = await c.req.json();

  const accept = body.accept_header || body.accept || "";
  const userAgent = body.user_agent || body.ua || "";
  const host = body.host || "unknown";
  const path = body.path || "/";
  const country = body.country || "unknown";

  if (!isPageView(accept)) {
    return c.json({ ok: true, skipped: "not-page-view" });
  }

  const { category, agent, filtered } = classify(userAgent, accept, host);
  const eventId = generateEventId();

  writeRawEvent(c.env.RAW_EVENTS, eventId, host, path, userAgent, accept, country);
  writeVisit(c.env.VISITS, eventId, host, path, category, agent, country, filtered);

  return c.json({ ok: true, category, agent, filtered: filtered || undefined });
});

app.get("/detect", (c) => {
  const userAgent = c.req.header("user-agent") || "";
  const accept = c.req.header("accept") || "";
  const host = c.req.header("host") || "unknown";
  const full = c.req.query("full") !== undefined;

  const { category, agent, filtered } = classify(userAgent, accept, host);

  const response: Record<string, unknown> = {
    category,
    agent,
    filtered: filtered || undefined,
    headers: { user_agent: userAgent, accept },
  };

  if (full) {
    response.ip = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown";
    response.country = c.req.header("cf-ipcountry") || "unknown";
    const allHeaders: Record<string, string> = {};
    c.req.raw.headers.forEach((value, key) => {
      allHeaders[key] = value;
    });
    response.all_headers = allHeaders;
  }

  return c.json(response);
});

app.get("/query", async (c) => {
  const apiSecret = c.env.API_SECRET;
  const authHeader = c.req.header("x-api-secret");

  if (apiSecret && authHeader !== apiSecret) {
    return c.json({ error: "unauthorized" }, 401);
  }

  const accountId = c.env.CF_ACCOUNT_ID;
  const apiToken = c.env.CF_API_TOKEN;

  if (!accountId || !apiToken) {
    return c.json({ error: "missing CF_ACCOUNT_ID or CF_API_TOKEN" }, 500);
  }

  const queryName = c.req.query("q") || "default";
  const host = c.req.query("host");

  const result = await runQuery(accountId, apiToken, queryName, host);
  if (result.error) {
    return c.json({ error: result.error, allowed: Object.keys(QUERIES) }, 400);
  }
  return c.json(result);
});

app.get("/stats", async (c) => {
  const accountId = c.env.CF_ACCOUNT_ID;
  const apiToken = c.env.CF_API_TOKEN;

  if (!accountId || !apiToken) {
    return c.json({ error: "missing CF_ACCOUNT_ID or CF_API_TOKEN" }, 500);
  }

  const [result24h, result7d] = await Promise.all([
    runQuery(accountId, apiToken, "sites-24h"),
    runQuery(accountId, apiToken, "sites"),
  ]);

  function processStats(rows: Record<string, string | number>[]): { sites: number; ai: number; human: number } {
    const rootDomains = new Set<string>();
    let ai = 0;
    let human = 0;

    for (const row of rows) {
      const host = String(row.host ?? "");
      if (isTestHost(host)) continue;

      rootDomains.add(getRootDomain(host));
      const visits = Number(row.visits ?? 0);
      if (row.category === "coding-agent") {
        ai += visits;
      } else if (row.category === "human") {
        human += visits;
      }
    }

    return { sites: rootDomains.size, ai, human };
  }

  const stats24h = processStats((result24h.data as Record<string, string | number>[]) ?? []);
  const stats7d = processStats((result7d.data as Record<string, string | number>[]) ?? []);

  return c.json({
    "24h": stats24h,
    "7d": stats7d,
  });
});

app.get("/health", (c) => c.json({ ok: true }));

export default app;
