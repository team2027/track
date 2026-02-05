# 2027-track

Track AI coding agents (Claude Code, Codex, OpenCode) visiting your documentation.

## Installation

```bash
npm install 2027-track
```

## Usage with Next.js

```ts
// middleware.ts
import { withAIAnalytics } from "2027-track/next";

export default withAIAnalytics();

// Or wrap your existing middleware:
export default withAIAnalytics(yourExistingMiddleware);
```

## Usage (generic)

```ts
import { trackVisit } from "2027-track";

await trackVisit({
  host: "docs.example.com",
  path: "/api/getting-started",
  userAgent: request.headers.get("user-agent"),
  accept: request.headers.get("accept"),
  country: "US", // optional
});
```

## Configuration

### Kill switch

Set `AI_ANALYTICS_ENDPOINT=""` to disable tracking entirely.

### Custom endpoint

Set `AI_ANALYTICS_ENDPOINT` to your own endpoint URL.

## Privacy

- Events are sent **server-side** from Vercel Edge (or your server)
- Visitor IP addresses **never reach** the analytics endpoint
- Only headers (user-agent, accept) and page info (host, path) are sent

## Detection

| Agent | Signal |
|-------|--------|
| Claude Code | `axios` user-agent + `text/markdown` accept |
| OpenCode | `text/markdown` accept with `q=` weights |
| Codex | `ChatGPT-User` user-agent |

Dashboard: https://ai-docs-analytics.vercel.app
