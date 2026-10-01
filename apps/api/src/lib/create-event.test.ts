import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Prisma } from '../generated/prisma/client.js';

const create = vi.fn();
vi.mock('./prisma.js', () => ({ prisma: { event: { create } } }));

const { createEventWithUniqueSlug } = await import('./create-event.js');

const input = {
  title: 'Team lunch',
  dates: [new Date('2026-10-03')],
  startMinute: 540,
  endMinute: 1020,
  slotMinutes: 30,
  timezone: 'Asia/Singapore',
};

const slugTaken = () =>
  new Prisma.PrismaClientKnownRequestError('Unique constraint failed', {
    code: 'P2002',
    clientVersion: 'test',
  });

describe('createEventWithUniqueSlug', () => {
  beforeEach(() => {
    create.mockReset();
  });

  it('creates the event with a random URL-safe slug', async () => {
    create.mockImplementation(({ data }) => Promise.resolve({ id: 1, ...data }));

    const event = await createEventWithUniqueSlug(input);

    expect(event.slug).toMatch(/^[A-Za-z0-9_-]{11}$/);
    expect(create).toHaveBeenCalledTimes(1);
  });

  it('retries with a new slug when the slug is taken', async () => {
    create.mockRejectedValueOnce(slugTaken()).mockResolvedValueOnce({ id: 1 });

    await createEventWithUniqueSlug(input);

    expect(create).toHaveBeenCalledTimes(2);
    const firstSlug = create.mock.calls[0]?.[0].data.slug;
    const secondSlug = create.mock.calls[1]?.[0].data.slug;
    expect(secondSlug).not.toBe(firstSlug);
  });

  it('gives up after 3 attempts', async () => {
    create.mockRejectedValue(slugTaken());

    await expect(createEventWithUniqueSlug(input)).rejects.toThrow('Unique constraint failed');
    expect(create).toHaveBeenCalledTimes(3);
  });

  it('does not retry other errors', async () => {
    create.mockRejectedValue(new Error('connection lost'));

    await expect(createEventWithUniqueSlug(input)).rejects.toThrow('connection lost');
    expect(create).toHaveBeenCalledTimes(1);
  });
});
