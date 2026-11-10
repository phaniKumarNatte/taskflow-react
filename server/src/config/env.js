/*
========================================================================
MODULE: config/env.js

RESPONSIBILITY
  The single place in the entire backend allowed to read `process.env`
  directly. Everything else imports the typed `env` object from here.

WHY THIS EXISTS (Dependency Inversion Principle)
  Without this file, `process.env.JWT_ACCESS_SECRET` would be scattered
  across controllers, services, and middleware. That creates two problems:
    1. A typo in an env var name (`JWT_ACESS_SECRET`) silently becomes
       `undefined` at the point of use, far from where you'd notice it.
    2. Every module becomes coupled to *how* config is sourced (env vars)
       instead of *that* config exists. Swapping to a secrets manager
       (AWS Secrets Manager, Vault) later means touching one file, not
       fifty.

  This mirrors the Repository pattern used for MongoDB (see
  repositories/README.md): high-level modules (services, controllers)
  depend on an abstraction (`env`), not on the concrete source
  (environment variables). That's the "D" in SOLID — Dependency
  Inversion Principle.

FAIL FAST PRINCIPLE
  We validate required vars at import time (module load = server boot),
  not lazily when a request happens to need them. An interview-relevant
  distinction: this is the same reasoning behind why you'd want a
  misconfigured React app to throw at build time (PropTypes / TypeScript)
  rather than render `undefined` silently in production.

INTERVIEW QUESTIONS
  Q: Why not just call `process.env.X` everywhere it's needed?
  A: Testability (you can't easily mock `process.env` per-test without a
     seam), single point of validation, and decoupling config source from
     config consumers.

  Q: What's the tradeoff of failing fast on missing env vars?
  A: A misconfigured deploy crashes immediately and loudly instead of
     serving broken responses. That's almost always the right tradeoff in
     a server process — a crashed pod gets restarted and alerts someone;
     a "half-working" server serves corrupted behavior silently.
========================================================================
*/

import dotenv from "dotenv";

// Loads variables from a local .env file into process.env. In real
// deployments (Docker, Render, Railway, etc.) this is a no-op because the
// platform injects env vars directly — dotenv only matters for local dev.
dotenv.config();

const REQUIRED_VARS = [
  "MONGO_URI",
  "JWT_ACCESS_SECRET",
  "JWT_REFRESH_SECRET",
];

const missing = REQUIRED_VARS.filter((key) => !process.env[key]);

if (missing.length > 0) {
  // Thrown, not logged-and-continued: an uncaught throw during module
  // load stops `node src/server.js` before it ever calls `app.listen`.
  throw new Error(
    `Missing required environment variables: ${missing.join(", ")}. ` +
      "Copy server/.env.example to server/.env and fill in real values."
  );
}

export const env = {
  nodeEnv: process.env.NODE_ENV || "development",
  port: Number(process.env.PORT) || 5000,
  clientOrigin: process.env.CLIENT_ORIGIN || "http://localhost:5173",

  mongoUri: process.env.MONGO_URI,

  jwt: {
    accessSecret: process.env.JWT_ACCESS_SECRET,
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m",
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d",
  },
};

export const isProduction = env.nodeEnv === "production";

/*
========================================================================
SUMMARY

Node.js concepts: process.env, module-load-time execution (runs once,
  cached by Node's module system — re-importing this file elsewhere does
  NOT re-run the validation, it returns the same evaluated module).
SOLID: Dependency Inversion Principle (consumers depend on `env`, not
  process.env directly).
Design patterns: this is effectively a Singleton — one evaluated config
  object shared across the whole process via ES module caching.
Interview questions: see above.
Common mistakes: reading process.env inline in business logic; forgetting
  that changing .env requires a process restart (Node reads env vars once
  at startup, not per-request).
Best practices: fail fast on missing required config; never commit .env.
========================================================================
*/
