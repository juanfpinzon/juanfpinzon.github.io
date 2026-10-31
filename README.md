# Juan Fernando Pinzon's Data Science & ML Portfolio

https://juanfpinzon.github.io/

Thank you for your interest!!

## New portfolio preview (Next.js)

The `master` branch still publishes the legacy Jekyll site. The new portfolio is a
Next.js App Router + TypeScript preview built from the Day 26 contracts
(`DESIGN.md`, `docs/portfolio-content-inventory.md`, `docs/adr/portfolio-demo-architecture.md`).
It is not deployed, and it has no live demo. Since Day 28 `/procurerag` has a chat whose
server-side proxy (`POST /api/chat`, `app/api/chat/route.ts`) calls a separately running
ProcureRAG API; without one, every question ends as "Demo offline".

Requirements: Node.js 22 (see `.nvmrc`) and npm.

```bash
npm ci                          # install exactly what package-lock.json records
npm run typecheck               # route types + tsc --noEmit
npm run lint                    # ESLint (Next.js + TypeScript rules)
npm run build                   # production build; every route is prerendered
npx playwright install chromium # once, to get the test browser
npm test                        # Playwright against the production build
npm run start                   # serve the build at http://localhost:3000
```

### Server-only settings (Day 29)

The proxy reads these on every request (`lib/chat/server-config.ts`). They are given to the
running server, never as a `NEXT_PUBLIC_` variable and never in an `.env*` file in this
repository. On Vercel they are set for **Production only**, so any preview answers "Demo
offline".

| Variable | What it is |
|---|---|
| `PROCURERAG_API_URL` | the ProcureRAG API's base URL (`https://`; `http://` only on localhost) |
| `PROCURERAG_SERVICE_TOKEN` | the token the API checks (the same value as the API's) |
| `PROCURERAG_CLIENT_HASH_SECRET` | the key of the client-address HMAC, at least 32 characters |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_*`) | the quota store |
| `PROCURERAG_BUDGET_DOMAIN` | the namespace of the store's keys: one per OpenRouter key |

Every question goes through one atomic admission in the store: 54 a day in total, 10 per
client, at most 2 at once. The chat runs only while the store's kill-switch key
`procurerag-demo:<budget domain>:chat:enabled` holds exactly `true`. A missing setting, a
missing key or a broken store all answer "Demo offline", and nothing is sent upstream.
`vercel.json` pins the functions to `dub1`. The operator steps (provisioning, the kill
switch, the deployed proof, rollback) are in ProcureRAG's `docs/day-29-runbook.md`.

Locally, `npm run start` serves the site, but the chat answers "Demo offline" by design. The
per-client limit needs the client address that Vercel's proxy writes into
`x-vercel-forwarded-for`, and a local browser sends none. Day 28's local browser → API run
has therefore been replaced by the deployed proof.

### Tests and the quota store

`npm test` needs no network. Playwright starts `tests/fake-upstash-server.mjs`, a stand-in
store that admits everything, so the route tests can reach the checks they are about. The
Lua scripts' real behaviour (caps, the 2-in-flight race, lease expiry, the UTC reset) is
proven against a real Upstash database, in an isolated namespace that is cleaned up:

```bash
read -r ADMISSION_TEST_REDIS_REST_URL; read -rs ADMISSION_TEST_REDIS_REST_TOKEN
export ADMISSION_TEST_REDIS_REST_URL ADMISSION_TEST_REDIS_REST_TOKEN
npx playwright test tests/chat-admission-redis.spec.ts
```
