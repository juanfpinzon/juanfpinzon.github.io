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

### Run the chat against a local ProcureRAG API

The proxy needs two **server-only** settings, given to the running server (never a
`NEXT_PUBLIC_` variable, never an `.env*` file in this repository). Use the same service
token the ProcureRAG API was started with (see its README, "Run the API"):

```bash
# in a shell where PROCURERAG_SERVICE_TOKEN is already exported
PROCURERAG_API_URL=http://127.0.0.1:8000 npm run start -- --hostname 127.0.0.1 --port 3000
```

The API URL must be `https://`, except `http://localhost` or `http://127.0.0.1` for local
runs. If either setting is missing, the chat answers "Demo offline" and the rest of the
site is unaffected.
