/*
========================================================================
MODULE: repositories/refreshToken.repository.js

RESPONSIBILITY
  The only module allowed to query/write the RefreshToken collection.
  Same rationale as user.repository.js — see that file for the full
  Dependency Inversion / Repository pattern discussion.

WHY THESE SPECIFIC OPERATIONS
  The auth service only ever needs four things from this collection:
  store a newly issued token, look one up (to validate it during
  refresh), revoke one (logout), and revoke all of a user's tokens
  (logout-all-devices / suspected compromise). Keeping the repository's
  surface area limited to exactly what's used is deliberate — Interface
  Segregation Principle: callers depend on the narrow set of operations
  they actually need, not a fat generic CRUD interface.
========================================================================
*/

import { RefreshToken } from "../models/RefreshToken.js";

export function storeRefreshToken({ token, userId, expiresAt }) {
  return RefreshToken.create({ token, user: userId, expiresAt });
}

export function findRefreshToken(token) {
  return RefreshToken.findOne({ token, revoked: false });
}

export function revokeRefreshToken(token) {
  return RefreshToken.updateOne({ token }, { $set: { revoked: true } });
}

export function revokeAllUserTokens(userId) {
  return RefreshToken.updateMany({ user: userId }, { $set: { revoked: true } });
}

/*
========================================================================
SUMMARY

MongoDB concepts: updateOne vs updateMany, $set operator (partial
  document update — only touches the `revoked` field, leaving the rest
  of the document untouched).
SOLID: Dependency Inversion (services never touch the RefreshToken
  model directly) and Interface Segregation (the exposed surface is
  exactly the four operations callers need — no generic passthrough
  query method).
Design patterns: Repository pattern.
Interview questions: Why updateOne/updateMany instead of find + save in
  a loop? Answer: a single round trip to MongoDB that applies atomically
  per matched document, versus N round trips plus a race window between
  each read and its later write.
Common mistakes: fetching a document, mutating it in JS, then calling
  .save() for a change this simple — correct for multi-field
  conditional logic, but wasteful (extra round trip) for a flat status
  flip like `revoked: true`.
Best practices: prefer atomic update operators ($set, $inc, etc.) over
  read-modify-write when the update doesn't depend on the document's
  current in-memory state.
========================================================================
*/
