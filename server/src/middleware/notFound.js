/*
========================================================================
MODULE: middleware/notFound.js

RESPONSIBILITY
  Catch any request that didn't match a registered route, and turn it
  into the same ApiError shape everything else uses — rather than
  letting Express fall through to its own bare default 404 HTML page.

WHY THIS MUST BE REGISTERED AFTER ALL ROUTES, BEFORE THE ERROR HANDLER
  Express tries middleware/routes in registration order and stops at the
  first one that sends a response. If every real route is registered
  first, reaching this middleware means none of them matched — so it's
  safe to treat that as "unknown endpoint." It forwards to
  `next(err)` rather than responding directly so the request still goes
  through the same centralized errorHandler as every other failure.
========================================================================
*/

import { ApiError } from "../utils/ApiError.js";

export function notFound(req, _res, next) {
  next(ApiError.notFound(`No route matches ${req.method} ${req.originalUrl}`));
}

/*
========================================================================
SUMMARY

Node.js concepts: middleware registration order determines matching
  order in Express.
SOLID: SRP.
Design patterns: Chain of Responsibility (the fallback link — reached
  only if nothing earlier in the chain handled the request).
Interview questions: Why does route/middleware ORDER matter in Express?
  Because Express has no built-in route priority system beyond
  registration order — it's a straightforward top-to-bottom chain.
Common mistakes: registering this before real routes (it would swallow
  every request); forgetting it entirely (Express's default 404 leaks a
  generic HTML page instead of a consistent JSON error shape).
Best practices: always end route registration with notFound, then
  errorHandler, in that exact order.
========================================================================
*/
