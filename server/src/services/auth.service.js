/*
========================================================================
MODULE: services/auth.service.js

RESPONSIBILITY
  Owns the actual business logic of authentication: registering a user,
  verifying credentials, issuing a token pair, rotating refresh tokens,
  and revoking sessions. Controllers call these functions; controllers
  never talk to repositories or models directly.

WHY A SERVICE LAYER BETWEEN CONTROLLERS AND REPOSITORIES
  The controller's job (see controllers/auth.controller.js) is
  translating HTTP <-> domain calls: read req.body, call a service,
  shape a response. If business rules (uniqueness checks, password
  comparison, token issuance policy) lived in the controller instead,
  two problems appear:
    1. That logic becomes impossible to reuse from anywhere that isn't
       an HTTP request — a future CLI seed script or a background job
       that needs to "log in as user X" would have no clean entry point.
    2. Testing business logic would require mocking Express's req/res
       objects, when the logic itself has nothing to do with HTTP.
  This is the same Single Responsibility split as a backend "service
  layer" in any layered architecture: Controller (HTTP) -> Service
  (business rules) -> Repository (data access) -> Model/DB.

REFRESH TOKEN ROTATION (the actual security-relevant design decision)
  On every `/refresh` call, the OLD refresh token is revoked and a
  BRAND NEW one is issued (not just a new access token off the same
  refresh token). This is called refresh token rotation. Why it matters:
  if a refresh token is ever stolen and used by an attacker, the
  legitimate user's NEXT refresh attempt will fail (their token was
  already revoked by the attacker's use) — which is a detectable signal
  of compromise, versus a static refresh token that would silently work
  for both parties until it naturally expired.

INTERVIEW QUESTIONS
  Q: Why generate a generic "Invalid credentials" message for both
     "email not found" and "password wrong" in `login`, instead of
     telling the user specifically which one failed?
  A: To avoid user enumeration — a distinct "no account with that
     email" message lets an attacker probe which emails have accounts
     at all, before even attempting a password. Same response for both
     failure modes closes that side channel.

  Q: Why does `register` check for an existing email in the SERVICE,
     when MongoDB's unique index would also reject a duplicate insert?
  A: Defense in depth again, but also UX: letting MongoDB's unique-index
     violation bubble up as a raw duplicate-key error would require the
     controller to parse a MongoDB-specific error code (11000) to turn
     it into a friendly message. Checking explicitly here lets us throw
     our own clear `ApiError.conflict(...)` instead. The index remains
     the real, race-condition-proof guarantee; this check is a friendlier
     fast path for the common case.
========================================================================
*/

import ms from "../utils/ms.js";
import { env } from "../config/env.js";
import { ApiError } from "../utils/ApiError.js";
import { signAccessToken, signRefreshToken, verifyRefreshToken } from "../utils/tokens.js";
import * as userRepo from "../repositories/user.repository.js";
import * as refreshTokenRepo from "../repositories/refreshToken.repository.js";

async function issueTokenPair(user) {
  const accessToken = signAccessToken(user);
  const refreshToken = signRefreshToken(user);

  await refreshTokenRepo.storeRefreshToken({
    token: refreshToken,
    userId: user.id,
    expiresAt: new Date(Date.now() + ms(env.jwt.refreshExpiresIn)),
  });

  return { accessToken, refreshToken };
}

export async function register({ name, email, password }) {
  const existing = await userRepo.findByEmail(email);
  if (existing) {
    throw ApiError.conflict("An account with this email already exists");
  }

  // .create() triggers the User model's pre-save hook, which hashes
  // `password` before it's ever written to MongoDB — this service layer
  // never sees or handles a raw hash, by design (see models/User.js).
  const user = await userRepo.createUser({ name, email, password });

  const tokens = await issueTokenPair(user);
  return { user, ...tokens };
}

export async function login({ email, password }) {
  const user = await userRepo.findByEmailWithPassword(email);

  // Same generic error for "no such user" and "wrong password" —
  // see docblock above (prevents user enumeration).
  if (!user) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const passwordMatches = await user.comparePassword(password);
  if (!passwordMatches) {
    throw ApiError.unauthorized("Invalid email or password");
  }

  const tokens = await issueTokenPair(user);
  return { user, ...tokens };
}

export async function refresh(oldRefreshToken) {
  if (!oldRefreshToken) {
    throw ApiError.unauthorized("Missing refresh token");
  }

  let payload;
  try {
    payload = verifyRefreshToken(oldRefreshToken);
  } catch {
    throw ApiError.unauthorized("Invalid or expired refresh token");
  }

  const stored = await refreshTokenRepo.findRefreshToken(oldRefreshToken);
  if (!stored) {
    // Signature was valid but we have no matching, non-revoked record —
    // it was already rotated/revoked (e.g. reused after logout, or a
    // stolen-and-already-used token). Treat as compromised: refuse.
    throw ApiError.unauthorized("Refresh token has been revoked");
  }

  const user = await userRepo.findById(payload.sub);
  if (!user) {
    throw ApiError.unauthorized("User no longer exists");
  }

  // Rotation: burn the old token, issue a fresh pair. See docblock above.
  await refreshTokenRepo.revokeRefreshToken(oldRefreshToken);
  return issueTokenPair(user);
}

export async function logout(refreshToken) {
  if (refreshToken) {
    await refreshTokenRepo.revokeRefreshToken(refreshToken);
  }
}

/*
========================================================================
SUMMARY

Node.js concepts: async/await composition across repository calls,
  throwing domain-specific errors that bubble up to asyncHandler.
MongoDB concepts: indirectly, via the repository layer's queries.
SOLID: SRP (business rules live here, not in the controller or
  repository); Dependency Inversion (depends on repository function
  signatures, not Mongoose models).
Design patterns: Service Layer pattern; refresh token rotation is a
  security pattern, not a GoF pattern, but interview-relevant on its own.
Interview questions: see above (generic error messages to prevent
  enumeration, why rotation matters, service vs controller boundary).
Common mistakes: reusing the same refresh token across multiple
  refreshes instead of rotating it; giving distinct error messages for
  "wrong email" vs "wrong password"; putting this logic directly in the
  controller.
Best practices: one narrow, named service function per use case
  (register/login/refresh/logout), each independently testable without
  an HTTP request in sight.
========================================================================
*/
