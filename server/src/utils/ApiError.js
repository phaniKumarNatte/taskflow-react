/*
========================================================================
MODULE: utils/ApiError.js

RESPONSIBILITY
  A single, structured error type for every "expected" failure in the
  app (bad input, unauthenticated, forbidden, not found, conflict).

WHY NOT JUST `throw new Error("Invalid credentials")`?
  A plain Error has no HTTP status code attached. Something downstream
  (the error middleware) would have to guess the right status from the
  message text, which is fragile and doesn't scale. By throwing an
  `ApiError` with an explicit `statusCode`, the error middleware becomes
  a dumb, generic translator: it just reads `err.statusCode` and
  `err.message` and doesn't need to know *why* any given error happened.

DESIGN PATTERN: this is a simple case of the Factory pattern via static
  helpers (`ApiError.badRequest(...)`, `ApiError.unauthorized(...)`) —
  callers describe *what kind* of error occurred without repeating
  `new ApiError(400, ...)` and memorizing status codes everywhere.

OPERATIONAL VS PROGRAMMER ERRORS (interview-relevant distinction)
  Node convention (from the Node docs / Joyent's error guide) splits
  errors into two categories:
    - Operational errors: expected failure modes of a running system
      (bad input, failed auth, a resource that doesn't exist). These are
      *not* bugs — they're routine and must be handled gracefully.
    - Programmer errors: bugs (calling a function with the wrong type,
      undefined is not a function). These should NOT be caught and
      "handled" — they should crash loudly so they get fixed.
  `ApiError` models operational errors specifically via `isOperational =
  true`. The global error handler (middleware/errorHandler.js) uses this
  flag to decide whether to return the error's own message to the client
  (operational) or a generic "Something went wrong" (programmer error,
  where leaking the real message/stack could expose internals).

INTERVIEW QUESTIONS
  Q: Why extend the built-in Error class instead of just using a plain
     object like { statusCode, message }?
  A: `Error` integrates with Node's stack-trace capture and with
     `instanceof` checks, and it's what `throw` / try-catch / Express's
     error-handling convention expect. A plain object thrown loses the
     stack trace, making production debugging much harder.

  Q: Why is `isOperational` useful in production?
  A: It lets the error handler distinguish "safe to show the user" from
     "unexpected bug — log it, alert on it, and hide the details."
========================================================================
*/

export class ApiError extends Error {
  constructor(statusCode, message, details = null) {
    super(message);
    this.name = "ApiError";
    this.statusCode = statusCode;
    this.details = details; // e.g. field-level validation errors
    this.isOperational = true;

    // Excludes the ApiError constructor itself from the captured stack
    // trace so it points at the code that actually threw, not here.
    Error.captureStackTrace(this, this.constructor);
  }

  static badRequest(message, details) {
    return new ApiError(400, message, details);
  }

  static unauthorized(message = "Not authenticated") {
    return new ApiError(401, message);
  }

  static forbidden(message = "Not authorized") {
    return new ApiError(403, message);
  }

  static notFound(message = "Resource not found") {
    return new ApiError(404, message);
  }

  static conflict(message) {
    return new ApiError(409, message);
  }
}

/*
========================================================================
SUMMARY

Node.js concepts: extending the built-in Error class, Error.captureStackTrace,
  operational vs programmer error convention.
SOLID: no principle strongly demonstrated beyond SRP (this class's only
  job is representing an expected HTTP-facing failure).
Design patterns: Factory (static constructor helpers), used together with
  a Chain of Responsibility-style error middleware downstream.
Interview questions: see above.
Common mistakes: throwing plain strings or plain objects instead of Error
  subclasses (loses stack traces); leaking internal error messages
  (stack traces, DB errors) to API clients in production.
Best practices: one error type for all "expected" failures; attach an
  HTTP status code at the point the error is known, not in the handler.
========================================================================
*/
