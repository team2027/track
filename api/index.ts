import { Hono } from "hono";
import { cors } from "hono/cors";

type Env = {
  POSTHOG_API_KEY: string;
};

const app = new Hono<{ Bindings: Env }>();

app.use("/*", cors());

function detectIsAI(accept: string): boolean {
  const wantsMarkdown = accept.includes("text/markdown");
  const wantsPlainText = accept.includes("text/plain") && !accept.startsWith("text/html");
  return wantsMarkdown || wantsPlainText;
}

function detectAgentType(userAgent: string, isAI: boolean): string {
  if (!isAI) return "human";
  const ua = userAgent.toLowerCase();
  if (ua.includes("claude-code") || ua.includes("claudecode")) return "claude-code";
  if (ua.includes("cursor")) return "cursor";
  if (ua.includes("windsurf")) return "windsurf";
  if (ua.includes("opencode")) return "opencode";
  if (ua.includes("aider")) return "aider";
  if (ua.includes("continue")) return "continue";
  if (ua.includes("copilot")) return "copilot";
  if (ua.includes("cline")) return "cline";
  return "unknown-ai";
}

app.post("/track", async (c) => {
  const body = await c.req.json();

  const accept = body.accept_header || body.accept || "";
  const userAgent = body.user_agent || body.ua || "";
  const isAI = body.is_ai !== undefined ? Boolean(body.is_ai) : detectIsAI(accept);
  const agentType = body.agent_type || detectAgentType(userAgent, isAI);
  const host = body.host || "unknown";
  const path = body.path || "/";

  const distinctId = isAI ? `${host}:${agentType}` : `${host}:human`;

  const event = {
    api_key: c.env.POSTHOG_API_KEY,
    event: isAI ? "ai_docs_visit" : "docs_visit",
    distinct_id: distinctId,
    timestamp: new Date().toISOString(),
    properties: {
      host,
      path,
      agent_type: agentType,
      is_ai: isAI,
      country: body.country || "unknown",
      user_agent: isAI ? userAgent.slice(0, 500) : "",
    },
  };

  const response = await fetch("https://us.i.posthog.com/i/v0/e/", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(event),
  });

  if (!response.ok) {
    console.error("posthog error:", await response.text());
    return c.json({ error: "failed to track" }, 500);
  }

  return c.json({ ok: true });
});

app.get("/health", (c) => c.json({ ok: true }));

export default app;
