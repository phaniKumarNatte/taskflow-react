/*
========================================================================
MODULE: routes/auth.routes.js

RESPONSIBILITY
  Declare the URL <-> controller mapping for the auth feature, and
  compose the middleware chain each route runs through.

BACKEND ROUTING VS. REACT ROUTER (a comparison worth internalizing)
  Backend                          Frontend (React Router)
  ---------------------------------------------------------------
  URL + HTTP verb -> Controller     URL -> Component
  Express matches route, in order   React Router matches route, in order
  Middleware chain per route        (loaders/guards conceptually similar)
  Response = JSON                   Response = rendered UI

  Both answer the same underlying question — "given this URL, what
  should handle it?" — just for different audiences (an HTTP client vs.
  a browser's DOM).

WHY EACH ROUTE LISTS ITS MIDDLEWARE EXPLICITLY, RATHER THAN GLOBALLY
  `router.post("/register", registerValidator, validateRequest, register)`
  reads, left to right, as the exact chain that request travels through.
  Some routes need validation (register, login) and some don't (logout
  just reads a cookie) — keeping the chain declared per-route (rather
  than applying validators globally to the whole router) means each
  route only pays for the middleware it actually needs, and the chain is
  visible at a glance instead of requiring you to check a separate
  "which middleware applies here" mental model.
========================================================================
*/

import { Router } from "express";
import * as authController from "../controllers/auth.controller.js";
import { registerValidator, loginValidator } from "../validators/auth.validator.js";
import { validateRequest } from "../middleware/validateRequest.js";

const router = Router();

router.post("/register", registerValidator, validateRequest, authController.register);
router.post("/login", loginValidator, validateRequest, authController.login);
router.post("/refresh", authController.refresh);
router.post("/logout", authController.logout);

export default router;

/*
========================================================================
SUMMARY

Node.js concepts: Express Router as a mini, mountable sub-application
  (mounted under /api/auth in app.js).
SOLID: SRP (this file only wires URLs to handlers — no logic).
Design patterns: Chain of Responsibility, expressed explicitly per
  route.
Interview questions: How does Express decide which route handles a
  request when multiple could match? First registered, first matched —
  same top-to-bottom evaluation as middleware in general.
Common mistakes: applying validators as router-level (`router.use`)
  middleware when only some routes need them, silently over-validating
  routes like /refresh and /logout that don't take a body at all.
Best practices: keep route files declarative — no inline logic, just
  composition of already-defined middleware and controllers.
========================================================================
*/
