# The whole app in one image: the Express API also serves the built React site.
# Build from the repo root: docker build -t flexmeet .
FROM node:22-alpine AS base
RUN corepack enable
WORKDIR /repo

FROM base AS build
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/
COPY apps/web/package.json apps/web/
COPY packages/shared/package.json packages/shared/
# postinstall runs `prisma generate`, so the schema + config must be present
COPY apps/api/prisma apps/api/prisma
COPY apps/api/prisma.config.ts apps/api/
RUN pnpm install --frozen-lockfile --filter @flexmeet/api... --filter @flexmeet/web...
COPY packages/shared packages/shared
COPY apps/api apps/api
COPY apps/web apps/web
RUN pnpm --filter @flexmeet/web build && pnpm --filter @flexmeet/api build
# Standalone prod-only node_modules for the runtime image (keeps prisma CLI for migrations),
# plus the built site for Express to serve.
RUN pnpm --filter @flexmeet/api deploy --prod --legacy /out \
  && cp -r apps/api/dist /out/dist \
  && cp -r apps/api/prisma /out/prisma \
  && cp apps/api/prisma.config.ts /out/ \
  && cp -r apps/web/dist /out/web

FROM node:22-alpine AS runtime
ENV NODE_ENV=production
ENV WEB_DIST=/app/web
WORKDIR /app
COPY --from=build /out .
USER node
EXPOSE 3000
# Apply pending migrations on start, then run the server (on $PORT, 3000 by default).
CMD ["sh", "-c", "./node_modules/.bin/prisma migrate deploy && node dist/index.js"]
