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
- API routes live under `/api`. The browser only talks to one origin (the Vite proxy in dev, nginx in prod), so CORS is off unless `CORS_ORIGIN` is set.
- Env is validated with zod in `apps/api/src/env.ts`. The root `.env` is shared by the API, Prisma and compose.
- `createApp()` (in `app.ts`) is kept separate from `listen()` (in `index.ts`) so tests can use supertest with a mocked prisma.

## Non-obvious decisions
- **Prisma is pinned to 7.10.** npm's `latest` tag points to an 8.0 release candidate. Prisma 7 needs the `@prisma/adapter-pg` driver adapter, generates the client into `apps/api/src/generated/` (gitignored, created by postinstall), and reads its settings from `prisma.config.ts`, which loads the root `.env` itself.
- **TypeScript is pinned to 6.0.** typescript-eslint doesn't support TS 7 yet.
- **`prisma` is in `dependencies`, not devDependencies.** The API container runs `prisma migrate deploy` when it starts.
- **Dockerfiles build from the repo root** (they need the lockfile, `tsconfig.base.json` and `packages/shared`). Any new root file the build needs must be copied in both Dockerfiles.
- **`docker-compose.prod.yml` sets `name: flexmeet-prod`** so it never replaces the dev db container or volume.
- **Production shape:** nginx (`web`) serves the SPA, with a fallback to index.html, and proxies `/api` to `api:3000`. The db isn't published to the host. The target is self-hosted containers (VPS/Fly/Railway), not BaaS.
