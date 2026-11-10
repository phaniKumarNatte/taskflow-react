/*
========================================================================
MODULE: validators/auth.validator.js

RESPONSIBILITY
  Declare the *shape* of valid input for each auth endpoint, using
  express-validator's chainable rule builders. These are Express
  middleware — they run before the controller and populate an internal
  "validation errors" bag on the request.

WHY VALIDATE HERE, SEPARATE FROM THE CONTROLLER
  Three reasons, mirroring why the frontend extracts validation out of
  components (see the React LoginPage's docblock):
    1. SRP — the controller's job is "orchestrate the request," not
       "know every rule for what a valid email looks like."
    2. Reuse — "is this a valid email" and "is this password long
       enough" are needed by both register and (partially) login;
       defining the rule once avoids drift between two hand-written
       copies.
    3. Testability — these rules can be reasoned about and unit-tested
       independently of any controller logic.

WHY THIS RUNS AS MIDDLEWARE, NOT AS A FUNCTION CALLED INSIDE THE
CONTROLLER
  Express's request pipeline is a **Chain of Responsibility**: each
  middleware gets a chance to inspect/reject the request before it
  reaches the route handler. Modeling validation as middleware means the
  controller only ever runs once input is already known-valid — it
  never needs its own defensive `if (!email) ...` checks. The actual
  rejection (formatting and sending the 400) happens in
  middleware/validateRequest.js, which reads the errors these rules
  attach and is shared across every route in the app, not just auth.

INTERVIEW QUESTIONS
  Q: Why not validate with a raw `if` block at the top of the
     controller?
  A: You could for one endpoint; it stops scaling once multiple routes
     need overlapping rules; you also lose composability — express-
     validator rules are functions that can be chained/reused across
     route arrays.

  Q: Registration validates password length here — should ALL business
     rules (e.g. "email must not already be registered") live here too?
  A: No — "is this a well-formed request" belongs in validation;
     "is this allowed given current data" (uniqueness, business rules)
     belongs in the service layer, which has to query the database
     anyway. Validators should never need to hit the DB.
========================================================================
*/

import { body } from "express-validator";

export const registerValidator = [
  body("name").trim().notEmpty().withMessage("Name is required"),
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password")
    .isLength({ min: 8 })
    .withMessage("Password must be at least 8 characters"),
];

export const loginValidator = [
  body("email").trim().isEmail().withMessage("A valid email is required").normalizeEmail(),
  body("password").notEmpty().withMessage("Password is required"),
];

/*
========================================================================
SUMMARY

Node.js concepts: middleware arrays (Express accepts an array of
  middleware in place of a single function for a route).
SOLID: SRP (validators only describe shape, never touch the DB) and
  Open/Closed (adding a new rule to a chain doesn't require modifying
  the controller).
Design patterns: Chain of Responsibility (each validator middleware runs
  in sequence, and validateRequest.js is the terminal link that acts on
  accumulated errors).
Interview questions: see above.
Common mistakes: mixing "is this well-formed" checks with "is this
  allowed" business rules in the same layer; duplicating validation
  logic between frontend and backend without keeping them intentionally
  in sync (the frontend check is for UX responsiveness; THIS check is
  the actual security boundary — client-side validation can always be
  bypassed).
Best practices: never trust client-side validation alone; keep
  validators declarative and free of side effects/DB calls.
========================================================================
*/
