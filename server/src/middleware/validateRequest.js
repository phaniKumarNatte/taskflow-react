/*
========================================================================
MODULE: middleware/validateRequest.js

RESPONSIBILITY
  Read whatever errors express-validator's rule chains (see
  validators/auth.validator.js) accumulated on the request, and either
  let the request through (no errors) or short-circuit with a 400.

WHY THIS IS ITS OWN SMALL MIDDLEWARE INSTEAD OF INLINE IN EACH ROUTE
  Every validated route needs the exact same "if there are validation
  errors, respond 400 with details" logic. Writing it once here, and
  appending it after each validator array in routes/auth.routes.js,
  means that logic can't drift between routes and adding a new
  validated endpoint is just "add the validator array + this
  middleware," no new boilerplate.

REQUEST PIPELINE AS CHAIN OF RESPONSIBILITY (interview-relevant)
  Express middleware is a textbook Chain of Responsibility: each
  function receives (req, res, next) and decides whether to handle the
  request itself (respond) or pass it along (`next()`). This module is
  the terminal check in the validation portion of that chain — it's the
  one middleware that actually *acts* on what the validator rules
  produced.

COMPARISON TO REACT
  This plays a similar role to a form library's `onSubmit` gate that
  checks accumulated field errors before calling the "real" submit
  handler — validation rules describe *what's wrong*, a single gatekeeper
  decides *what to do about it*.

INTERVIEW QUESTIONS
  Q: Why return `ApiError.badRequest` here instead of `res.status(400).json(...)`
     directly?
  A: Consistency — every error in this app, regardless of where it's
     thrown, flows through the same shape (see utils/ApiError.js) and
     the same terminal handler (middleware/errorHandler.js). Calling
     `next(err)` here instead of writing the response directly keeps
     this middleware from needing to know the app's error-response
     format at all.
========================================================================
*/

import { validationResult } from "express-validator";
import { ApiError } from "../utils/ApiError.js";

export function validateRequest(req, _res, next) {
  const result = validationResult(req);

  if (result.isEmpty()) {
    return next();
  }

  const details = result.array().map((err) => ({
    field: err.path,
    message: err.msg,
  }));

  next(ApiError.badRequest("Validation failed", details));
}

/*
========================================================================
SUMMARY

Node.js concepts: Express middleware signature (req, res, next),
  error-forwarding via next(err).
SOLID: SRP — this middleware's only job is translating accumulated
  validation errors into one ApiError; it doesn't know or care what the
  rules were.
Design patterns: Chain of Responsibility (terminal link for the
  validation phase of the request pipeline).
Interview questions: see above.
Common mistakes: writing the 400 response directly instead of routing
  through the shared error handler, causing an inconsistent error
  response shape between "validation failed" and every other error type.
Best practices: keep this middleware generic (usable by ANY future
  validated route, not just auth) by never referencing route-specific
  logic here.
========================================================================
*/
