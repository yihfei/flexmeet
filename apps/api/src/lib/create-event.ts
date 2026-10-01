import { randomBytes } from 'node:crypto';
import { Prisma } from '../generated/prisma/client.js';
import { prisma } from './prisma.js';

const MAX_ATTEMPTS = 3;

export function generateSlug(): string {
  return randomBytes(8).toString('base64url');
}

// Creates an event with a fresh random slug, retrying if the slug is already taken.
export async function createEventWithUniqueSlug(data: Omit<Prisma.EventCreateInput, 'slug'>) {
  for (let attempt = 1; ; attempt++) {
    try {
      return await prisma.event.create({ data: { ...data, slug: generateSlug() } });
    } catch (err) {
      const isSlugTaken =
        err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002';
      if (!isSlugTaken || attempt >= MAX_ATTEMPTS) throw err;
    }
  }
}
