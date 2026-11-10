/*
========================================================================
MODULE: utils/asyncHandler.js

RESPONSIBILITY
  Wrap an async Express route handler so that a rejected promise (i.e. a
  thrown error inside an `async` function) is automatically forwarded to
  `next(err)`, instead of becoming an unhandled promise rejection.

WHY THIS EXISTS — THE EXPRESS + ASYNC/AWAIT GOTCHA
  Express's error handling was designed before async/await existed. It
  auto-catches *synchronous* throws inside a route handler and routes
  them to your error middleware. But if a handler is `async` and throws
  (e.g. an awaited `await User.findById(...)` rejects), Express has no
  way to know — the rejection happens on a microtask, after Express has
  already returned control from calling your handler. Without this
  wrapper, that rejection becomes an unhandled promise rejection: no
  response is ever sent, and the request just hangs until it times out.

  This wrapper is the standard fix: it calls your handler, and if the
  returned promise rejects, it explicitly calls `next(err)` so Express's
  normal error-handling chain picks it up.

DESIGN PATTERN: Higher-Order Function / Decorator
  `asyncHandler(fn)` takes a function and returns a new function with
  added behavior (error forwarding) without modifying `fn` itself. This
  is conceptually the same shape as a React Higher-Order Component
  (`withAuth(Component)`) or a custom hook wrapping a base behavior —
  same pattern, different layer of the stack.

COMPARISON TO REACT
  This plays the same role as an Error Boundary catching a render-time
  throw, or a `.catch()` on a fetch promise in a `useEffect` — a single
  reusable seam that ensures errors from an inherently async operation
  don't silently vanish.

INTERVIEW QUESTIONS
  Q: Why not just wrap every route body in try/catch?
  A: You could, but you'd repeat the same three lines (try, catch, next)
     in every single controller. `asyncHandler` centralizes that
     boilerplate once — same reasoning as extracting a repeated
     try/catch into a custom hook on the frontend.

  Q: What does "unhandled promise rejection" actually mean in Node?
  A: A rejected promise with no `.catch()`/`await`-in-try attached to it.
     Node emits an `unhandledRejection` event on the process; depending
     on Node version/config this can print a warning or crash the
     process. In an Express handler specifically, the practical symptom
     is a hung request — the client eventually times out.
========================================================================
*/

export function asyncHandler(fn) {
  return function wrappedHandler(req, res, next) {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/*
========================================================================
SUMMARY

Node.js concepts: promise rejection propagation, event loop microtasks,
  Express's synchronous-only automatic error catching.
SOLID: no principle strongly demonstrated beyond SRP.
Design patterns: Higher-Order Function (decorator-style wrapping).
Interview questions: see above.
Common mistakes: forgetting to wrap async route handlers (silent hangs
  on error); calling next(err) AND res.send() in the same handler
  (double-response errors).
Best practices: wrap every async controller with this; never mix
  callback-style error-first patterns with async/await in the same
  handler.
========================================================================
*/
