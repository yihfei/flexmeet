import path from 'node:path';
import { defineConfig } from 'prisma/config';

// Load the repo-root .env in local dev; in Docker, env vars come from the container.
try {
  process.loadEnvFile(path.resolve(import.meta.dirname, '../../.env'));
} catch {
  // no .env file — fine
}

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // Migrations need a direct connection: a pooled one (like Neon's default URL, which goes
    // through PgBouncer) can't hold the lock `migrate deploy` takes. The app itself keeps
    // using DATABASE_URL, which may be pooled. Locally there is only DATABASE_URL.
    url: process.env.DIRECT_DATABASE_URL ?? process.env.DATABASE_URL ?? '',
  },
});
