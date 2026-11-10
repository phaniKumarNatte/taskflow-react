/*
========================================================================
MODULE: middleware/authenticate.js

RESPONSIBILITY
  Read the access token from the `Authorization: Bearer <token>` header,
  verify it, and attach the decoded payload to `req.user` so downstream
  route handlers can trust `req.user.sub` (the user id) and
  `req.user.role` without re-verifying anything themselves.

WHY THIS IS MIDDLEWARE, NOT A FUNCTION CALLED INSIDE EACH CONTROLLER
  Any route that needs "who is making this request" would otherwise
  repeat "read header, split Bearer prefix, verify, handle failure"
  itself. As middleware, it's declared ONCE per protected route (or
  once for an entire router) and every controller downstream can assume
  `req.user` already exists — same principle as validators running
  before controllers (see validators/auth.validator.js).

COMPARISON TO REACT
  This is the backend mirror of the frontend's Axios request
  interceptor (attaches the token to outgoing requests) and
  ProtectedRoute component (gates access to a route tree based on auth
  state) — same concept, applied on opposite sides of the wire: the
  frontend decides whether to *render* a protected view, the backend
  decides whether to *execute* a protected handler. Neither trusts the
  other; the backend check is the one that actually matters for
  security, since a client-side gate can always be bypassed by calling
  the API directly.

WHY VERIFY THE ACCESS TOKEN HERE INSTEAD OF QUERYING THE DATABASE ON
EVERY REQUEST
  A JWT's signature check is a pure, synchronous-ish cryptographic
  operation — no database round trip needed to confirm "this token was
  issued by us and hasn't expired." That's the whole point of the
  short-lived, stateless access token from utils/tokens.js: most
  requests authenticate cheaply, and only the comparatively rare
  refresh-token exchange touches MongoDB.

INTERVIEW QUESTIONS
  Q: What's actually inside `req.user` here, and is it the same as a
     full User document?
  A: No — it's just the JWT payload (`{ sub, role, iat, exp }`), not a
     database-fetched document. If a handler needs fresher/fuller user
     data (e.g. profile fields), it must explicitly fetch the User by
     `req.user.sub`. Conflating "authenticated identity" with "full
     user record" is a common mistake — they're different concerns.

  Q: Why 401 (not 403) when the token is missing or invalid?
  A: 401 Unauthorized means "who you are is not established" (missing/
     bad credentials); 403 Forbidden means "we know who you are, and
     you're not allowed" (see middleware/authorize.js). Conflating the
     two is a common interview trip-up.
========================================================================
*/

import { verifyAccessToken } from "../utils/tokens.js";
import { ApiError } from "../utils/ApiError.js";

export function authenticate(req, _res, next) {
  const header = req.headers.authorization;

  if (!header?.startsWith("Bearer ")) {
    return next(ApiError.unauthorized("Missing or malformed Authorization header"));
  }

  const token = header.slice("Bearer ".length);

  try {
    // jsonwebtoken throws synchronously on expiry/tamper/invalid
    // signature — caught here and translated into our consistent
    // ApiError shape rather than leaking a jsonwebtoken-specific error.
    req.user = verifyAccessToken(token);
    next();
  } catch {
    next(ApiError.unauthorized("Invalid or expired access token"));
  }
}

/*
========================================================================
SUMMARY

Node.js concepts: reading HTTP headers, synchronous throw/catch around
  a library call, attaching data to `req` for downstream middleware.
SOLID: SRP — this middleware only establishes identity; it does not
  decide authorization (that's authorize.js, a deliberately separate
  concern — see that file).
Design patterns: Chain of Responsibility.
Interview questions: see above (401 vs 403, req.user vs full User
  document, why verification is a cheap in-memory operation).
Common mistakes: conflating authentication (who are you) with
  authorization (are you allowed); treating req.user as a full,
  fresh database record.
Best practices: keep authentication and authorization as separate
  middleware so routes can compose them independently (some routes need
  only "logged in," others need "logged in AND admin").
========================================================================
*/
