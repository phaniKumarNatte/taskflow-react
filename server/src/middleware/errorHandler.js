/*
========================================================================
MODULE: middleware/errorHandler.js

RESPONSIBILITY
  The single place that converts a thrown/forwarded error into an HTTP
  response, for every route in the app.

WHY EXPRESS TREATS THIS FUNCTION SPECIALLY
  Express identifies an error-handling middleware purely by ARITY — a
  function with exactly FOUR parameters `(err, req, res, next)` is
  registered as an error handler, invoked only when something upstream
  calls `next(err)` (or throws synchronously in a non-async handler).
  This is a real interview gotcha: dropping the unused `next` parameter
  (even though eslint might flag it as unused) silently turns this into
  a *regular* middleware that Express will never route errors to.

WHY ONE CENTRAL HANDLER INSTEAD OF PER-ROUTE TRY/CATCH RESPONSES
  Centralizing error-to-response translation guarantees every error in
  the app — regardless of which controller, service, or middleware
  produced it — comes back to the client in the same JSON shape. Client
  code (the React http client's response interceptor) can then handle
  errors generically instead of parsing a different shape per endpoint.

OPERATIONAL VS PROGRAMMER ERRORS, REVISITED
  This is where utils/ApiError.js's `isOperational` flag pays off:
    - `ApiError` (isOperational: true) -> we trust its statusCode and
      message are safe to send to the client as-is.
    - Anything else (a raw thrown Error, a Mongoose CastError, a bug) ->
      we don't know if its message might leak internals (a stack trace,
      a raw DB error string), so we log the real error server-side and
      respond with a generic 500 message to the client.

INTERVIEW QUESTIONS
  Q: What happens if you forget the 4th (`next`) parameter?
  A: Express registers it as normal middleware. It never receives
     errors; any thrown/forwarded error instead falls through to
     Express's own default (bare, unstyled) error handler, which in
     production would leak a stack trace to the client — a real
     security issue, not just an inconvenience.

  Q: Where does this middleware have to be registered relative to
     routes?
  A: LAST — after all routes and the notFound handler. Express matches
     middleware in registration order; an error handler declared before
     the routes that might throw would never see their errors.
========================================================================
*/

import { isProduction } from "../config/env.js";

export function errorHandler(err, _req, res, _next) {
  const isKnownError = err.isOperational === true;

  const statusCode = isKnownError ? err.statusCode : 500;
  const message = isKnownError ? err.message : "Something went wrong";

  if (!isKnownError) {
    // Unexpected errors are exactly the ones worth loud server-side
    // logging (or, in production, forwarding to an error-tracking
    // service) — they represent bugs, not routine input problems.
    console.error("[unhandled error]", err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    details: isKnownError ? err.details : undefined,
    // Stack traces are only useful to a developer and only safe to
    // expose outside production — never send them to real users.
    stack: isProduction ? undefined : err.stack,
  });
}

/*
========================================================================
SUMMARY

Node.js concepts: Express's arity-based error-middleware detection,
  centralized error-to-response translation.
SOLID: SRP — this file's only job is turning an error object into an
  HTTP response; it never decides *what* is an error, only how to
  present one.
Design patterns: Chain of Responsibility (the terminal link — nothing
  forwards past this).
Interview questions: see above.
Common mistakes: dropping the unused `next` param (breaks Express's
  error-handler detection); leaking `err.stack` or raw DB errors to
  clients in production; registering this middleware before routes.
Best practices: one error shape for the whole API; log unexpected
  errors loudly, respond to clients with only what's safe to reveal.
========================================================================
*/
