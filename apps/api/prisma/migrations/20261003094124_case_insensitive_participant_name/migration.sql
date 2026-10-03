-- Participant names become case-insensitive, so "jo" and "Jo" are the same person.
-- Hand-edited: Prisma's generated version dropped and re-added the column, losing every name.
CREATE EXTENSION IF NOT EXISTS citext;

-- Converts in place. The existing unique index on ("eventId", "name") is rebuilt as
-- case-insensitive; this fails (and changes nothing) if an event already has "Jo" and "jo".
ALTER TABLE "Participant" ALTER COLUMN "name" TYPE CITEXT USING "name"::citext;
