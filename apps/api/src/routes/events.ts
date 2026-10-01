import { Router } from 'express';
import { z } from 'zod';
import { createEventSchema } from '@flexmeet/shared';
import { createEventWithUniqueSlug } from '../lib/create-event.js';
import { toEventResponse } from '../lib/event-response.js';
import { prisma } from '../lib/prisma.js';

export const eventsRouter = Router();

eventsRouter.post('/', async (req, res) => {
  const result = createEventSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid event', details: z.flattenError(result.error) });
    return;
  }

  const event = await createEventWithUniqueSlug({
    ...result.data,
    dates: result.data.dates.map((date) => new Date(date)),
  });
  res.status(201).json(toEventResponse(event));
});

eventsRouter.get('/:slug', async (req, res) => {
  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  res.json(toEventResponse(event));
});
