/*
========================================================================
MODULE: routes/index.js

RESPONSIBILITY
  The single place that aggregates every feature's router and mounts it
  under its base path. app.js imports only this file — it never imports
  individual feature routers directly.

WHY THIS INDIRECTION
  As more features are added (projects, tasks, comments, notifications —
  see the project roadmap), app.js would otherwise accumulate a growing,
  unstructured list of `app.use("/api/x", xRoutes)` calls. Centralizing
  that list here means app.js stays a stable, short file, and the "map
  of the whole API's URL space" lives in exactly one place a new
  contributor can read top-to-bottom.
========================================================================
*/

import { Router } from "express";
import authRoutes from "./auth.routes.js";

const router = Router();

router.use("/auth", authRoutes);

export default router;

/*
========================================================================
SUMMARY

Node.js concepts: Express Router composition (routers can mount other
  routers, forming a tree that mirrors the URL structure).
SOLID: SRP (this file's only job is aggregating feature routers) and
  Open/Closed (adding a new feature means adding one line here, not
  modifying app.js).
Design patterns: Facade — this module presents one unified router to
  app.js, hiding the fact that multiple feature routers exist behind it.
Interview questions: Why not just mount every feature router directly
  in app.js? Scales poorly past a handful of features; this file is the
  Facade that keeps app.js's job to "configure the Express app," not
  "know about every feature."
Best practices: as new features are added, they get their own
  routes/<feature>.routes.js and one new line here — never inline route
  definitions in app.js.
========================================================================
*/
