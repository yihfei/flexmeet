import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.url(),
  PORT: z.coerce.number().int().positive().default(3000),
  // Only needed when the frontend is served from a different origin (e.g. Vite dev without proxy).
  CORS_ORIGIN: z.string().optional(),
  // Folder with the built web app (apps/web/dist). Set in the production image, where this
  // server also serves the site; unset in dev, where Vite serves it.
  WEB_DIST: z.string().optional(),
});

export const env = envSchema.parse(process.env);
