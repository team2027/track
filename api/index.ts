import { Hono } from "hono";
import { cors } from "hono/cors";

interface AnalyticsEngineDataset {
  writeDataPoint(data: {
    blobs?: string[];
    doubles?: number[];
    indexes?: string[];
  }): void;
}

type Env = {
  ANALYTICS: AnalyticsEngineDataset;
  CF_ACCOUNT_ID?: string;
  CF_API_TOKEN?: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors());

// Schema:
// blob1: host
// blob2: path
// blob3: visitor_category ("bot" | "browsing-agent" | "coding-agent" | "human")
// blob4: agent_name (specific agent: "claude-code" | "codex" | "opencode" | "unknown-coding-agent" | "chatgpt-user" | "googlebot" | "browser" | etc)
// blob5: country
// blob6: user_agent (raw, for re-analysis)
// blob7: accept_header (raw, for re-analysis)
// double1: (unused)
// double2: is_filtered (1 for bots + browsing-agents, excluded from main stats)
// index1: host

const BOT_PATTERNS = [
  // search engines
  "googlebot", "bingbot", "yandexbot", "baiduspider", "duckduckbot", "slurp",
  // social
  "facebookexternalhit", "linkedinbot", "twitterbot",
  // seo
  "applebot", "semrushbot", "ahrefsbot", "mj12bot", "dotbot", "petalbot", "bytespider",
  // ai crawlers (training/indexing, NOT browsing agents)
  "gptbot", "claudebot", "anthropic-ai", "ccbot", "cohere-ai", "perplexitybot",
  // monitoring
  "pingdom", "uptimerobot", "statuscake", "site24x7", "newrelic", "datadog", "checkly", "freshping",
  // infra
  "vercel-healthcheck", "vercel-edge-functions",
  // generic http clients
  "wget", "curl", "httpie", "python-requests", "go-http-client",
  "scrapy", "httpclient", "java/", "okhttp", "axios", "node-fetch", "undici",
];

const PREVIEW_HOST_PATTERNS = [
  ".vercel.app",
  ".netlify.app",
  ".pages.dev",
  "localhost",
  "127.0.0.1",
];

// Visitor categories
type VisitorCategory = "bot" | "browsing-agent" | "coding-agent" | "human";

interface Classification {
  category: VisitorCategory;
  agent: string;
  filtered: boolean;
}

function detectBotName(ua: string): string {
  // return first matching bot pattern as the agent name
  for (const pattern of BOT_PATTERNS) {
    if (ua.includes(pattern)) {
      return pattern;
    }
  }
  return "unknown-bot";
}

function classify(userAgent: string, acceptHeader: string, host: string): Classification {
  const ua = userAgent.toLowerCase();
  const accept = acceptHeader.toLowerCase();
  const wantsMarkdown = accept.includes("text/markdown");

  // 1. Explicit coding agents (by user-agent)
  if (ua.includes("claude-code") || ua.includes("claudecode")) {
    return { category: "coding-agent", agent: "claude-code", filtered: false };
  }
  if (ua.includes("codex")) {
    return { category: "coding-agent", agent: "codex", filtered: false };
  }
  if (ua.includes("opencode")) {
    return { category: "coding-agent", agent: "opencode", filtered: false };
  }

  // 2. Browsing agents (by user-agent)
  if (ua.includes("chatgpt-user")) {
    return { category: "browsing-agent", agent: "chatgpt-user", filtered: true };
  }
  if (ua.includes("claude/1.0") || (ua.includes("claude") && ua.includes("compatible"))) {
    return { category: "browsing-agent", agent: "claude-computer-use", filtered: true };
  }
  if (ua.includes("perplexity-user")) {
    return { category: "browsing-agent", agent: "perplexity-comet", filtered: true };
  }

  // 3. Accept: text/markdown = coding agent (catches axios, node-fetch used by coding tools)
  if (wantsMarkdown) {
    return { category: "coding-agent", agent: "unknown-coding-agent", filtered: false };
  }

  // 4. Bots/crawlers (only if NOT requesting markdown)
  if (BOT_PATTERNS.some(pattern => ua.includes(pattern))) {
    return { category: "bot", agent: detectBotName(ua), filtered: true };
  }

  // 5. Filter preview hosts
  if (PREVIEW_HOST_PATTERNS.some(pattern => host.toLowerCase().includes(pattern))) {
    return { category: "human", agent: "browser", filtered: true };
  }

  // 6. Human
  return { category: "human", agent: "browser", filtered: false };
}

function isPageView(accept: string): boolean {
  const a = accept.toLowerCase();
  return a.includes("text/html") || a.includes("text/markdown") || a.includes("text/plain");
}

app.post("/track", async (c) => {
  const body = await c.req.json();

  const accept = body.accept_header || body.accept || "";
  const userAgent = body.user_agent || body.ua || "";
  const host = body.host || "unknown";
  const path = body.path || "/";
  const country = body.country || "unknown";

  // Skip non-page-view requests entirely
  if (!isPageView(accept)) {
    return c.json({ ok: true, skipped: "not-page-view" });
  }

  const { category, agent, filtered } = classify(userAgent, accept, host);

  // blob1: host
  // blob2: path
  // blob3: visitor_category
  // blob4: agent_name
  // blob5: country
  // blob6: user_agent (raw)
  // blob7: accept_header (raw)
  c.env.ANALYTICS.writeDataPoint({
    blobs: [
      host,
      path,
      category,
      agent,
      country,
      userAgent.slice(0, 500),
      accept.slice(0, 500),
    ],
    doubles: [0, filtered ? 1 : 0],
    indexes: [host],
  });

  return c.json({ ok: true, category, agent, filtered: filtered || undefined });
});

app.get("/detect", (c) => {
  const userAgent = c.req.header("user-agent") || "";
  const accept = c.req.header("accept") || "";
  const host = c.req.header("host") || "unknown";

  const { category, agent, filtered } = classify(userAgent, accept, host);

  return c.json({
    category,
    agent,
    filtered: filtered || undefined,
    headers: { user_agent: userAgent, accept },
  });
});

const ALLOWED_QUERIES: Record<string, string> = {
  // Default: visits by host and category (excluding filtered)
  default: `
    SELECT blob1 as host, blob3 as category, blob4 as agent, SUM(_sample_interval) as visits
    FROM ai_docs_visits
    WHERE timestamp > NOW() - INTERVAL '7' DAY AND double2 = 0
    GROUP BY host, category, agent
    ORDER BY visits DESC
    LIMIT 100
  `,
  // Sites: visits by host split by category
  sites: `
    SELECT blob1 as host, blob3 as category, SUM(_sample_interval) as visits
    FROM ai_docs_visits
    WHERE timestamp > NOW() - INTERVAL '7' DAY AND double2 = 0
    GROUP BY host, category
    ORDER BY visits DESC
  `,
  // Agents: coding agent breakdown
  agents: `
    SELECT blob4 as agent, SUM(_sample_interval) as visits
    FROM ai_docs_visits
    WHERE timestamp > NOW() - INTERVAL '7' DAY AND double2 = 0 AND blob3 = 'coding-agent'
    GROUP BY agent
    ORDER BY visits DESC
  `,
  // All agents: all visitor types including humans
  "all-agents": `
    SELECT blob3 as category, blob4 as agent, SUM(_sample_interval) as visits
    FROM ai_docs_visits
    WHERE timestamp > NOW() - INTERVAL '7' DAY AND double2 = 0
    GROUP BY category, agent
    ORDER BY visits DESC
  `,
  // Pages: top pages visited by coding agents
  pages: `
    SELECT blob1 as host, blob2 as path, blob4 as agent, SUM(_sample_interval) as visits
    FROM ai_docs_visits
    WHERE timestamp > NOW() - INTERVAL '7' DAY AND blob3 = 'coding-agent' AND double2 = 0
    GROUP BY host, path, agent
    ORDER BY visits DESC
    LIMIT 50
  `,
  // Feed: recent visits
  feed: `
    SELECT timestamp, blob1 as host, blob2 as path, blob3 as category, blob4 as agent
    FROM ai_docs_visits
    WHERE timestamp > NOW() - INTERVAL '1' DAY AND double2 = 0
    ORDER BY timestamp DESC
    LIMIT 50
  `,
  // Raw: see everything including filtered (for debugging)
  raw: `
    SELECT timestamp, blob1 as host, blob3 as category, blob4 as agent, double2 as filtered, SUM(_sample_interval) as count
    FROM ai_docs_visits
    WHERE timestamp > NOW() - INTERVAL '1' DAY
    GROUP BY timestamp, host, category, agent, filtered
    ORDER BY timestamp DESC
    LIMIT 100
  `,
};

app.get("/query", async (c) => {
  const accountId = c.env.CF_ACCOUNT_ID;
  const apiToken = c.env.CF_API_TOKEN;

  if (!accountId || !apiToken) {
    return c.json({ error: "missing CF_ACCOUNT_ID or CF_API_TOKEN" }, 500);
  }

  const queryName = c.req.query("q") || "default";
  const host = c.req.query("host");

  const baseSql = ALLOWED_QUERIES[queryName];
  if (!baseSql) {
    return c.json({ error: "invalid query", allowed: Object.keys(ALLOWED_QUERIES) }, 400);
  }

  let sql = baseSql;
  if (host) {
    sql = sql.replace("WHERE ", `WHERE blob1 = '${host.replace(/'/g, "''")}' AND `);
  }

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/analytics_engine/sql`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiToken}`,
        "Content-Type": "text/plain",
      },
      body: sql,
    }
  );

  const data = await response.json();
  return c.json(data);
});

app.get("/health", (c) => c.json({ ok: true }));

export default app;
