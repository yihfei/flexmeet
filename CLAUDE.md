# FlexMeet

A when2meet clone that the owner builds to practise TypeScript and full-stack development. **They write the features themselves.** Help with setup, reviews, debugging and explanations. Don't implement app features (models, routes, UI) unless asked.

## Commands
- `docker compose up -d`: dev Postgres on localhost:5432
- `pnpm dev`: API :3000 (tsx watch) and web :5173 (Vite, which proxies `/api` to :3000)
- `pnpm typecheck` / `pnpm lint` / `pnpm test`: run all three before committing
- `pnpm --filter @flexmeet/api prisma migrate dev --name <change>`: after editing `apps/api/prisma/schema.prisma`
- `docker compose -f docker-compose.prod.yml up --build`: full containerised stack on :8080

## Architecture
- pnpm workspace: `apps/api` (Express 5 + Prisma), `apps/web` (React 19 + Vite), `packages/shared` (types/zod schemas)
- `@flexmeet/shared` exports TS source with no build step. Vite imports it directly, and tsup bundles it into the API (`noExternal`).
- API routes live under `/api`. The browser only talks to one origin (the Vite proxy in dev, Express itself in prod), so CORS is off unless `CORS_ORIGIN` is set.
- Env is validated with zod in `apps/api/src/env.ts`. The root `.env` is shared by the API, Prisma and compose.
- `createApp()` (in `app.ts`) is kept separate from `listen()` (in `index.ts`) so tests can use supertest with a mocked prisma.

## Non-obvious decisions
- **Prisma is pinned to 7.10.** npm's `latest` tag points to an 8.0 release candidate. Prisma 7 needs the `@prisma/adapter-pg` driver adapter, generates the client into `apps/api/src/generated/` (gitignored, created by postinstall), and reads its settings from `prisma.config.ts`, which loads the root `.env` itself.
- **TypeScript is pinned to 6.0.** typescript-eslint doesn't support TS 7 yet.
- **`prisma` is in `dependencies`, not devDependencies.** The API container runs `prisma migrate deploy` when it starts.
- **One `Dockerfile`, at the repo root** (it needs the lockfile, `tsconfig.base.json` and `packages/shared`). Any new root file the build needs must be copied in it.
- **`docker-compose.prod.yml` sets `name: flexmeet-prod`** so it never replaces the dev db container or volume.
- **Production shape:** one container. Express serves `/api` and, when `WEB_DIST` is set (it is in the image), the built SPA: `/assets` cached immutable, other paths fall back to `index.html` (no-cache). Deployed free on Render (`render.yaml`, Docker runtime) with Postgres on Neon. The target stays self-hosted containers, not BaaS.
- **Two database URLs in production.** `DATABASE_URL` is Neon's pooled URL, used by the app. `DIRECT_DATABASE_URL` is the direct one, used by `prisma migrate deploy` (via `prisma.config.ts`), because a PgBouncer-pooled connection can't hold the migration lock. Locally only `DATABASE_URL` is set.
