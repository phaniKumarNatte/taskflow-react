/*
========================================================================
MODEL: RefreshToken

RESPONSIBILITY
  Persist issued refresh tokens so they can be looked up and revoked,
  giving us the "revocable" half of the access/refresh token pattern
  described in utils/tokens.js.

WHY STORE THE TOKEN AT ALL — ISN'T A JWT SUPPOSED TO BE STATELESS?
  Pure stateless JWTs can't be revoked before their natural expiry. That
  is unacceptable for a long-lived refresh token: if a user logs out, or
  a token is suspected stolen, we need an immediate "invalidate this
  now" switch. Persisting the token (or a reference to it) trades some
  of the "stateless" benefit for that control — a deliberate,
  well-known compromise, not an oversight.

REFERENCE TO User (`ref: "User"`)
  `user: { type: Schema.Types.ObjectId, ref: "User" }` stores just the
  related user's `_id`, not a copy of the user document. This is
  MongoDB's answer to a SQL foreign key: no join at the storage engine
  level (MongoDB doesn't do joins the way SQL does), but Mongoose can
  perform `.populate('user')` to fetch the related document in a
  second, app-level query. We reference rather than embed here because
  a user's refresh tokens are numerous, independently expiring, and
  queried/deleted on their own — embedding an array of tokens inside the
  User document would make that document grow unboundedly and would
  require rewriting the whole User doc just to revoke one token.

TTL INDEX (`expires`)
  `expiresAt: { type: Date, expires: 0 }` creates a TTL (Time-To-Live)
  index. MongoDB runs a background task (roughly every 60s) that deletes
  documents whose `expiresAt` has passed — automatic garbage collection
  at the database layer, so expired refresh tokens don't need a manual
  cleanup cron job. `expires: 0` means "delete exactly at the timestamp
  stored in the field" (as opposed to N seconds after a fixed field).

WHY A SEPARATE COLLECTION INSTEAD OF AN ARRAY ON User
  Embedding `refreshTokens: [...]` on User is tempting but has real
  costs: MongoDB documents have a 16MB size cap (not a concern here
  practically, but the design smell matters), every login would need to
  read-modify-write the entire User document, and a TTL index can only
  be set on a top-level field of a *document*, not an item inside an
  array — so automatic expiry cleanup wouldn't work the same way. A
  separate collection scoped to "one document per issued token" is the
  natural fit for something with its own independent lifecycle.

INTERVIEW QUESTIONS
  Q: What's the difference between `ref` + `populate()` and a SQL JOIN?
  A: A JOIN happens in one query at the database engine. `populate()` is
     Mongoose performing a *second* query (`User.find({_id: {$in: [...]}})`)
     and stitching the results together in the app layer. It looks like a
     join but costs an extra round trip — relevant when reasoning about
     N+1 query problems.

  Q: Why store a hash of the refresh token instead of the raw token?
  A: (Production hardening beyond this slice's scope, but worth naming:)
     if the database were ever read by an attacker, raw refresh tokens
     stored in plaintext are immediately usable. Hashing them (like
     passwords, though a fast hash suffices since these are already
     high-entropy random-ish JWTs) means a DB leak alone doesn't hand
     out valid sessions. This app stores the raw token for clarity in
     this teaching slice — see the file's final comment for what a
     hardened version would add.

  Q: Why not just decode the JWT's own `exp` claim instead of storing a
     separate `expiresAt`?
  A: We need `expiresAt` as a real, indexable field for MongoDB's TTL
     index to act on. A JWT's `exp` claim is a number sealed inside a
     signed string — meaningless to a MongoDB index until an app
     decodes it. Storing it as a native `Date` bridges the JWT world
     and the database world.
========================================================================
*/

import mongoose from "mongoose";

const { Schema } = mongoose;

const refreshTokenSchema = new Schema({
  token: {
    type: String,
    required: true,
    unique: true, // one document per issued token; also speeds up lookup-by-token
  },
  user: {
    type: Schema.Types.ObjectId,
    ref: "User", // enables .populate('user') — see docblock
    required: true,
    index: true, // most queries are "all tokens for user X" (logout-all-devices)
  },
  expiresAt: {
    type: Date,
    required: true,
    expires: 0, // TTL index — MongoDB auto-deletes once this timestamp passes
  },
  revoked: {
    type: Boolean,
    default: false,
  },
});

export const RefreshToken = mongoose.model("RefreshToken", refreshTokenSchema);

/*
========================================================================
SUMMARY

MongoDB concepts: references vs. embedding, ObjectId, TTL indexes,
  populate() as an app-level join.
Mongoose concepts: Schema.Types.ObjectId + ref, per-field index options.
SOLID: SRP — this model's only job is representing one issued refresh
  token's lifecycle (issued, optionally revoked, auto-expired).
Design patterns: same Repository-over-Model layering as User (see
  repositories/refreshToken.repository.js) so services never issue raw
  Mongoose queries directly.
Interview questions: see above (embedding vs. referencing, TTL indexes,
  populate as a second query not a join, stateless vs. revocable
  tokens).
Common mistakes: embedding tokens on the User document (unbounded growth,
  no TTL support on array items); forgetting to index the `user` field
  (every "log out all devices" query would collection-scan); relying on
  a JWT's own `exp` for anything the database needs to act on.
Best practices: TTL index for automatic cleanup of time-bound data;
  reference (not embed) one-to-many relationships where the "many" side
  has its own independent lifecycle. A production hardening beyond this
  teaching slice: store a hash of the token (bcrypt/sha256) instead of
  the raw value, the same defense-in-depth reasoning as password
  hashing.
========================================================================
*/
