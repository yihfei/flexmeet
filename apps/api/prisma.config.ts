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
    url: process.env.DATABASE_URL ?? '',
  },
});
