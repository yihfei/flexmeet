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

```sh
docker compose -f docker-compose.prod.yml up --build   # http://localhost:8080
```

- `web`: nginx serving the built SPA and proxying `/api` → `api:3000`
- `api`: runs `prisma migrate deploy` on start, then the server
- `db`: Postgres with a named volume (not exposed publicly)
