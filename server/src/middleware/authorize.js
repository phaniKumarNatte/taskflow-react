/*
========================================================================
MODULE: middleware/authorize.js

RESPONSIBILITY
  Given an already-authenticated request (`req.user` set by
  authenticate.js), reject it with 403 unless the user's role is in an
  allowed list.

WHY THIS IS A SEPARATE MIDDLEWARE FROM authenticate.js
  Authentication ("who are you") and authorization ("what are you
  allowed to do") are different concerns that vary independently: some
  routes need only "logged in" (authenticate alone), others need
  "logged in AND admin" (authenticate + authorize("admin")). Merging
  them into one middleware would force every route to accept the same
  role-check logic, or force that logic to become configurable/
  parameterized in a messier way than just composing two middleware.

DESIGN PATTERN: this is a **middleware factory** — `authorize(...roles)`
  is a function that RETURNS a middleware, closing over the `roles`
  array. This is the same higher-order-function shape as
  `asyncHandler(fn)`, applied to configuration instead of error-
  wrapping. It's also conceptually a Strategy pattern: which roles are
  acceptable is a strategy supplied at route-registration time, and the
  middleware itself doesn't hardcode any specific role.

INTERVIEW QUESTIONS
  Q: Why does this middleware assume `req.user` already exists — is
     that safe?
  A: Only because Express route registration guarantees `authenticate`
     runs first in the chain (`router.get("/admin", authenticate,
     authorize("admin"), handler)`). This middleware doesn't
     re-verify identity — it TRUSTS the chain's ordering. That coupling
     is intentional and documented, not accidental.

  Q: How would you extend this for fine-grained permissions instead of
     coarse roles (e.g. "can edit this specific project")?
  A: Role checks like this handle coarse, resource-independent
     authorization well. Resource-specific checks ("is this user a
     member of THIS project") typically move into the service/
     controller layer, where the specific resource has already been
     fetched — middleware alone can't know that without an extra query
     per request.
========================================================================
*/

import { ApiError } from "../utils/ApiError.js";

export function authorize(...allowedRoles) {
  return function authorizeMiddleware(req, _res, next) {
    if (!req.user) {
      // Defensive guard against a mis-ordered route registration
      // (authorize used without authenticate first) — fails safe rather
      // than crashing on `req.user.role` of undefined.
      return next(ApiError.unauthorized());
    }

    if (!allowedRoles.includes(req.user.role)) {
      return next(ApiError.forbidden("You do not have permission to perform this action"));
    }

    next();
  };
}

/*
========================================================================
SUMMARY

Node.js concepts: closures (the returned middleware closes over
  `allowedRoles`), variadic parameters (`...allowedRoles`).
SOLID: SRP (only decides "is this role allowed," nothing else) and
  Open/Closed (new role-gated routes are added by composing
  `authorize("newRole")`, without modifying this file).
Design patterns: middleware factory / Strategy pattern (the allowed
  roles are a strategy supplied per-route).
Interview questions: see above (401 vs 403, why this trusts req.user's
  presence, coarse vs fine-grained authorization).
Common mistakes: using this middleware on a route without authenticate
  first (req.user would be undefined); using 401 instead of 403 for a
  logged-in-but-not-allowed case.
Best practices: keep authentication and authorization as independently
  composable middleware; express allowed roles declaratively at the
  route definition, not as an if/else buried in the controller.
========================================================================
*/
