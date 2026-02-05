# AI Docs Analytics

Track AI coding agents (Claude Code, Cursor, Windsurf, etc.) visiting your documentation.

## How It Works

AI coding agents send `Accept: text/markdown` header when fetching docs - browsers never do this. We detect this signal at the edge and stream events to Tinybird for real-time analytics.

## Architecture

```
[Your Docs Site] → [CF Worker] → [Tinybird] → [Dashboard]
                   (detection)    (storage)    (visualization)
```

## Setup

### 1. Create Tinybird Workspace

1. Sign up at [tinybird.co](https://tinybird.co)
2. Create a new workspace
3. Install Tinybird CLI: `pip install tinybird-cli`
4. Authenticate: `tb auth`

### 2. Deploy Data Sources & Pipes

```bash
cd ai-docs-analytics
tb push datasources/ai_agent_events.datasource
tb push pipes/*.pipe
```

### 3. Get Your Token

```bash
tb token ls
```

Copy your admin token or create a new one with append permissions.

### 4. Deploy the Worker

See [ai-docs-tracker-cf](https://github.com/caffeinum/ai-docs-tracker-cf) repo.

Set environment variables:
- `TINYBIRD_TOKEN` - your Tinybird token
- `TINYBIRD_DATASOURCE` - `ai_agent_events` (default)
- `TRACK_ALL` - `true` to also track human visits (for comparison)

## API Endpoints

After deploying pipes, you get these endpoints:

| Endpoint | Description | Parameters |
|----------|-------------|------------|
| `/v0/pipes/events_by_site.json` | Events grouped by site | `days` (default: 7) |
| `/v0/pipes/events_timeseries.json` | Time series data | `days`, `host` |
| `/v0/pipes/top_pages.json` | Top pages by AI visits | `days`, `host`, `limit` |
| `/v0/pipes/agent_breakdown.json` | Breakdown by agent type | `days`, `host` |
| `/v0/pipes/realtime_feed.json` | Live feed of AI visits | `host`, `limit` |

Query with:
```bash
curl "https://api.tinybird.co/v0/pipes/events_by_site.json?token=YOUR_TOKEN&days=7"
```

## Event Schema

```json
{
  "ts": "2024-01-15 10:30:00",
  "host": "docs.example.com",
  "path": "/api/authentication",
  "accept": "text/markdown, text/plain",
  "ua": "...",
  "country": "US",
  "city": "San Francisco",
  "agent_type": "claude-code",
  "is_ai": 1
}
```

## Detected Agents

- `claude-code` - Anthropic's Claude Code CLI
- `cursor` - Cursor IDE
- `windsurf` - Codeium's Windsurf
- `opencode` - OpenCode CLI
- `aider` - Aider CLI
- `continue` - Continue.dev
- `copilot` - GitHub Copilot
- `unknown-ai` - AI agent (Accept header detected, unknown UA)
- `human` - Regular browser traffic
