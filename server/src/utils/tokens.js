/*
========================================================================
MODULE: utils/tokens.js

RESPONSIBILITY
  Sign and verify the two JWTs this app issues: short-lived access
  tokens and long-lived refresh tokens.

WHY TWO TOKENS INSTEAD OF ONE?
  A JWT can't be revoked once issued — it's self-contained and valid
  until it expires, no matter what happens server-side (unless you build
  a blocklist, which defeats the "stateless" benefit). That creates a
  tension:
    - Long-lived tokens are convenient (user stays logged in) but
      dangerous if stolen (valid for a long time, unrevocable).
    - Short-lived tokens are safer but would force the user to log in
      again every few minutes.

  The two-token pattern resolves this:
    - ACCESS TOKEN: short-lived (15m here), sent on every API request,
      NEVER persisted server-side. If stolen, the blast radius is capped
      by its short expiry.
    - REFRESH TOKEN: long-lived (7d here), used ONLY to mint new access
      tokens, and persisted in MongoDB (see models/RefreshToken.js) so it
      CAN be revoked (logout, "log out all devices", detected theft).

  This is the same tradeoff shape as a short-lived AWS STS credential
  vs. a long-lived IAM key — narrow the window an attacker can exploit a
  leaked credential, without forcing constant re-authentication.

WHY VERIFY WITH TWO DIFFERENT SECRETS
  Using separate secrets for access vs. refresh tokens means a leaked
  access-token secret (e.g. from a misconfigured logging pipeline) can't
  be used to forge a refresh token, and vice versa. Blast-radius
  isolation, same principle as not reusing passwords across services.

INTERVIEW QUESTIONS
  Q: Why not just store the JWT itself in MongoDB and skip the
     "stateless" idea entirely?
  A: You could (and this app effectively does that for refresh tokens
     specifically, trading some statelessness for revocability). The
     access token stays fully stateless so that most requests never hit
     the database just to check auth — verifying a JWT's signature is a
     pure, fast, in-memory operation.

  Q: What actually stops someone from using a stolen refresh token
     forever?
  A: Persisting it in MongoDB with an expiry (TTL index) and a revoked
     flag means logout / password-change / "sign out all devices" can
     invalidate it immediately, unlike a pure stateless JWT.

  Q: What's inside a JWT payload here, and is it encrypted?
  A: JWTs are signed, NOT encrypted — anyone can base64-decode and read
     the payload. Never put secrets (passwords, raw PII) in a JWT
     payload; here we only put `sub` (user id) and `role`.
========================================================================
*/

import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signAccessToken(user) {
  return jwt.sign(
    { sub: user.id, role: user.role },
    env.jwt.accessSecret,
    { expiresIn: env.jwt.accessExpiresIn }
  );
}

export function signRefreshToken(user) {
  return jwt.sign(
    { sub: user.id },
    env.jwt.refreshSecret,
    { expiresIn: env.jwt.refreshExpiresIn }
  );
}

export function verifyAccessToken(token) {
  // Throws (TokenExpiredError / JsonWebTokenError) on invalid/expired
  // tokens — callers (middleware/authenticate.js) let that throw
  // propagate and translate it into a 401 via ApiError.
  return jwt.verify(token, env.jwt.accessSecret);
}

export function verifyRefreshToken(token) {
  return jwt.verify(token, env.jwt.refreshSecret);
}

/*
========================================================================
SUMMARY

Node.js concepts: HMAC-signed tokens via jsonwebtoken, throwing on
  verify failure rather than returning null (fail loudly, let the caller
  decide how to translate it).
MongoDB concepts: n/a directly (see models/RefreshToken.js for the
  persistence half of this pattern).
SOLID: SRP — this module only signs/verifies, it never touches the
  database or HTTP layer.
Design patterns: no major GoF pattern here; this is a thin, deliberately
  boring wrapper around a well-known library.
Interview questions: see above (access vs refresh, why two secrets,
  signed vs encrypted).
Common mistakes: putting sensitive data in a JWT payload; using one
  shared secret for both token types; setting refresh token expiry so
  long it's effectively permanent; storing tokens in localStorage on the
  frontend (see client's http client docs for the XSS tradeoff this
  forces).
Best practices: short access-token TTL, revocable refresh tokens,
  distinct secrets per token type.
========================================================================
*/
