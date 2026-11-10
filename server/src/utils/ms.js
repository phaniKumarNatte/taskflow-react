/*
========================================================================
MODULE: utils/ms.js

RESPONSIBILITY
  Convert a short duration string like "15m" or "7d" (the same format
  jsonwebtoken's `expiresIn` option accepts) into a millisecond count, so
  we can compute a concrete `expiresAt` Date for MongoDB's TTL index
  (see models/RefreshToken.js) using the SAME config value that also
  drives the JWT's own expiry.

WHY NOT JUST HARDCODE THE MILLISECONDS SEPARATELY
  If `JWT_REFRESH_EXPIRES_IN` and the value used to compute `expiresAt`
  were two independent numbers, changing one in `.env` without
  remembering the other would silently desync the JWT's own `exp` claim
  from the database record's TTL — the token might still be valid per
  its signature but already deleted from the revocation-check
  collection, or vice versa. Deriving both from one source value
  eliminates that class of bug entirely (a single source of truth).

  No SOLID principle is significantly demonstrated here — this is a
  small, dependency-free utility function, not an abstraction boundary.
========================================================================
*/

const UNIT_MS = {
  s: 1000,
  m: 60 * 1000,
  h: 60 * 60 * 1000,
  d: 24 * 60 * 60 * 1000,
};

export default function ms(duration) {
  const match = /^(\d+)([smhd])$/.exec(duration.trim());
  if (!match) {
    throw new Error(`Unsupported duration format: "${duration}" (expected e.g. "15m", "7d")`);
  }

  const [, amount, unit] = match;
  return Number(amount) * UNIT_MS[unit];
}

/*
========================================================================
SUMMARY

Node.js concepts: regex-based parsing, plain utility functions with no
  side effects.
SOLID: no principle significantly demonstrated here.
Interview questions: Why derive expiresAt from the same env string
  instead of a second config value? Single source of truth — prevents
  the JWT's expiry and the database TTL from silently drifting apart.
Common mistakes: hardcoding a duplicate expiry value instead of
  deriving it from the one already used to sign the token.
Best practices: one canonical source for any value used in two places.
========================================================================
*/
