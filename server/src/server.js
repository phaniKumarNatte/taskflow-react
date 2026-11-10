/*
========================================================================
MODULE: server.js (process entry point — `npm run dev` / `npm start`
  both point here)

RESPONSIBILITY
  The only file in the backend that has side effects at the "process"
  level: connect to MongoDB, then start listening for HTTP connections.
  See app.js's docblock for why app-configuration and process-lifecycle
  are deliberately split across two files.

WHY CONNECT TO MONGO BEFORE CALLING app.listen
  If the server started accepting HTTP connections before the database
  connection resolved, the very first requests (right after a fresh
  deploy) could reach a controller that queries a not-yet-connected
  Mongoose model. Awaiting `connectDB()` first guarantees that by the
  time `app.listen` fires, every request the server accepts has a live
  database connection available to it.

STARTUP FAILURE HANDLING
  If `connectDB()` rejects (bad URI, unreachable MongoDB), we log and
  exit the process with a non-zero code rather than starting the HTTP
  server against a database that isn't there. In a real deployment,
  a non-zero exit code is what tells an orchestrator (Docker, Kubernetes,
  a process manager like PM2) that startup failed, so it can restart or
  alert instead of silently running a broken instance.

INTERVIEW QUESTIONS
  Q: Why not just put this logic directly in app.js?
  A: Because app.js is imported by tests that must NOT bind a real port
     or require a real database connection — see app.js's docblock.

  Q: What does `process.exit(1)` actually do, and is it safe here?
  A: It immediately terminates the Node process with exit code 1
     (conventionally "failure"). It's safe here specifically because
     nothing has started yet (no open server, no in-flight requests to
     interrupt) — this is the *one* place in the app where an abrupt
     exit has no cleanup cost.
========================================================================
*/

import { app } from "./app.js";
import { connectDB } from "./config/db.js";
import { env } from "./config/env.js";

async function start() {
  try {
    await connectDB();

    app.listen(env.port, () => {
      console.log(`[server] listening on http://localhost:${env.port}`);
    });
  } catch (err) {
    console.error("[server] failed to start:", err.message);
    process.exit(1);
  }
}

start();

/*
========================================================================
SUMMARY

Node.js concepts: process entry point conventions, process.exit and
  exit codes, async startup sequencing.
MongoDB concepts: connect-before-serve as a startup invariant.
SOLID: SRP — this file's only job is orchestrating startup order; all
  actual configuration lives in app.js/config/db.js.
Design patterns: none significant beyond the Composition Root already
  established in app.js — this is that root's entry point.
Interview questions: see above.
Common mistakes: calling app.listen() before the database connection
  resolves; swallowing a connectDB() rejection silently instead of
  exiting (a server that "starts" but can never serve a real request is
  worse than one that fails loudly at boot).
Best practices: fail fast and loud on startup errors; keep this file
  free of anything except sequencing connectDB() then listen().
========================================================================
*/
