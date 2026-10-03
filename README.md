# FlexMeet

A when2meet clone. pnpm monorepo: Express + Prisma API, React + Vite web app, shared TS types.

```
apps/api         Express 5 API (Prisma 7 + Postgres)
apps/web         React 19 + Vite
packages/shared  Types/schemas used by both
```

## Development

```sh
cp .env.example .env
pnpm install
docker compose up -d          # Postgres only, on localhost:5432
pnpm dev                      # API :3000 + web :5173 (Vite proxies /api)
```

Database changes: edit `apps/api/prisma/schema.prisma`, then

```sh
pnpm --filter @flexmeet/api prisma migrate dev --name <change>
```

Checks: `pnpm typecheck`, `pnpm lint`, `pnpm test`.

## Production (Docker)

One image (root `Dockerfile`): the Express API also serves the built React site.

```sh
docker compose -f docker-compose.prod.yml up --build   # http://localhost:8080
```

- `app`: runs `prisma migrate deploy` on start, then serves `/api` and the site
- `db`: Postgres with a named volume (not exposed publicly)

## Deploying (free: Render + Neon)

1. **Neon** (database): create a project in the AWS Singapore region. Copy two connection
   strings: the **pooled** one and the **direct** one (turn off "Connection pooling" to see it).
2. **Render** (app): New → **Blueprint** → this repo. It reads `render.yaml` (one free Docker
   web service). Paste the pooled string as `DATABASE_URL` and the direct one as
   `DIRECT_DATABASE_URL`, then deploy. The first start runs all migrations on Neon.
3. Every push to `main` redeploys. Health check: `/api/health`.

Free-tier notes: the Render service sleeps after 15 idle minutes, so the first visit after that
takes about a minute. Neon's free database keeps your data (0.5 GB); Render's own free Postgres
is deleted after 30 days, which is why it isn't used.
