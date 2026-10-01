import { beforeEach, describe, expect, it, vi } from 'vitest';
import request from 'supertest';

const create = vi.fn();
const findUnique = vi.fn();
vi.mock('../lib/prisma.js', () => ({ prisma: { event: { create, findUnique } } }));
vi.stubEnv('DATABASE_URL', 'postgresql://test:test@localhost:5432/test');

const { createApp } = await import('../app.js');

const validBody = {
  title: 'Team lunch',
  dates: ['2026-10-03', '2026-10-05'],
  startMinute: 540,
  endMinute: 1020,
  slotMinutes: 30,
  timezone: 'Asia/Singapore',
};

const row = {
  id: 1,
  slug: 'kX3f9_aQ2bM',
  title: 'Team lunch',
  dates: [new Date('2026-10-03'), new Date('2026-10-05')],
  startMinute: 540,
  endMinute: 1020,
  slotMinutes: 30,
  durationMinutes: null,
  timezone: 'Asia/Singapore',
  createdAt: new Date('2026-10-01T12:00:00.000Z'),
  updatedAt: new Date('2026-10-01T12:00:00.000Z'),
};

beforeEach(() => {
  create.mockReset();
  findUnique.mockReset();
});

describe('POST /api/events', () => {
  it('creates an event and returns it without internal fields', async () => {
    create.mockResolvedValue(row);

    const res = await request(createApp()).post('/api/events').send(validBody);

    expect(res.status).toBe(201);
    expect(res.body.slug).toBe('kX3f9_aQ2bM');
    expect(res.body.dates).toEqual(['2026-10-03', '2026-10-05']);
    expect(res.body).not.toHaveProperty('id');
  });

  it('passes dates to Prisma as Date objects', async () => {
    create.mockResolvedValue(row);

    await request(createApp()).post('/api/events').send(validBody);

    const data = create.mock.calls[0]?.[0].data;
    expect(data.dates).toEqual([new Date('2026-10-03'), new Date('2026-10-05')]);
  });

  it('returns 400 with field errors for an invalid body', async () => {
    const res = await request(createApp())
      .post('/api/events')
      .send({ ...validBody, endMinute: 480 });

    expect(res.status).toBe(400);
    expect(res.body.details.fieldErrors.endMinute).toEqual(['End must be after start']);
    expect(create).not.toHaveBeenCalled();
  });

  it('returns 400 when there is no body', async () => {
    const res = await request(createApp()).post('/api/events');

    expect(res.status).toBe(400);
  });
});

describe('GET /api/events/:slug', () => {
  it('returns the event', async () => {
    findUnique.mockResolvedValue(row);

    const res = await request(createApp()).get('/api/events/kX3f9_aQ2bM');

    expect(res.status).toBe(200);
    expect(res.body.title).toBe('Team lunch');
    expect(findUnique).toHaveBeenCalledWith({ where: { slug: 'kX3f9_aQ2bM' } });
  });

  it('returns 404 for an unknown slug', async () => {
    findUnique.mockResolvedValue(null);

    const res = await request(createApp()).get('/api/events/nope');

    expect(res.status).toBe(404);
  });
});
