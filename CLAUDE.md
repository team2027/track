# track

AI agent tracking suite. Public repo: github.com/team2027/track

## structure

- `dashboard/` → Next.js + Convex analytics dashboard, deployed on Vercel (basePath: `/app`)
- `api/` → Hono analytics API on Cloudflare Workers
- `packages/middleware/` → npm package `2027-track` (published to npm)
- `workers/tracker/` → Cloudflare Workers tracker
- `eval/` → eval results data (harness code lives in arena repo)

## build

```bash
cd dashboard && npm run build    # next.js build (vercel build: npx convex deploy --cmd 'npm run build')
cd api && npm run dev            # wrangler dev
cd packages/middleware && npm run build  # tsup (cjs + esm + dts)
```

no tests. verify with `npm run build`.

## architecture notes

- convex analytics action `analytics.query` enforces auth and filters by allowed hosts
- dashboard uses `useAction(api.analytics.query)` instead of direct worker calls
- dashboard middleware uses `convexAuthNextjsMiddleware()` with basePath matcher fix
- api uses Cloudflare Analytics Engine (not D1) — queries via `CF_API_TOKEN`
- `2027-track` npm package has exports for next, vercel, cloudflare, express

## git hygiene

- always `git fetch && git pull` before starting work
- if >3 hours passed since last message in conversation, fetch and pull before doing anything
- commit and push after completing major changes — don't let work sit uncommitted
- never deploy manually — all repos auto-deploy on push (Vercel for dashboard, Cloudflare for api/workers)
