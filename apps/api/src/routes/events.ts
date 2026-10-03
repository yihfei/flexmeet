import { Router } from 'express';
import { z } from 'zod';
import { createEventSchema, joinEventSchema, updateAvailabilitySchema } from '@flexmeet/shared';
import { createEventWithUniqueSlug } from '../lib/create-event.js';
import { toEventResponse, toParticipantResponse } from '../lib/event-response.js';
import { prisma } from '../lib/prisma.js';
import { checkSlotsForEvent } from '../lib/validate-slots.js';

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
  const event = await prisma.event.findUnique({
    where: { slug: req.params.slug },
    include: { participants: { orderBy: { createdAt: 'asc' } } },
  });
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  res.json(toEventResponse(event, event.participants));
});

// Adds a participant by name. If the name is already taken in this event, returns that participant.
eventsRouter.post('/:slug/participants', async (req, res) => {
  const result = joinEventSchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid name', details: z.flattenError(result.error) });
    return;
  }

  const event = await prisma.event.findUnique({ where: { slug: req.params.slug } });
  if (!event) {
    res.status(404).json({ error: 'Event not found' });
    return;
  }

  const participant = await prisma.participant.upsert({
    where: { eventId_name: { eventId: event.id, name: result.data.name } },
    create: { eventId: event.id, name: result.data.name },
    update: {},
  });
  res.json(toParticipantResponse(participant));
});

// Replaces the participant's availability with the given slots.
eventsRouter.put('/:slug/participants/:id/availability', async (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id)) {
    res.status(404).json({ error: 'Participant not found' });
    return;
  }

  const result = updateAvailabilitySchema.safeParse(req.body);
  if (!result.success) {
    res.status(400).json({ error: 'Invalid availability', details: z.flattenError(result.error) });
    return;
  }

  // Matching on the slug too means a participant id from another event is a 404.
  const participant = await prisma.participant.findFirst({
    where: { id, event: { slug: req.params.slug } },
    include: { event: true },
  });
  if (!participant) {
    res.status(404).json({ error: 'Participant not found' });
    return;
  }

  const check = checkSlotsForEvent(participant.event, result.data.slots);
  if (!check.ok) {
    res
      .status(400)
      .json({ error: 'Some slots are not part of this event', invalid: check.invalid });
    return;
  }

  const updated = await prisma.participant.update({
    where: { id },
    data: { slots: check.slots },
  });
  res.json(toParticipantResponse(updated));
});
