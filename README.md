# Juan Fernando Pinzon's Data Science & ML Portfolio

https://juanfpinzon.github.io/

Thank you for your interest!!

## New portfolio preview (Next.js)

The `master` branch still publishes the legacy Jekyll site. The new portfolio is a
Next.js App Router + TypeScript preview built from the Day 26 contracts
(`DESIGN.md`, `docs/portfolio-content-inventory.md`, `docs/adr/portfolio-demo-architecture.md`).
It is not deployed, and it has no live demo.

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
