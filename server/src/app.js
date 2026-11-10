/*
========================================================================
MODULE: app.js

RESPONSIBILITY
  Configure the Express application: global middleware (parsing, CORS,
  logging), mount the API's routes, and register the fallback/error
  handlers LAST. Deliberately does NOT start listening on a port or
  connect to MongoDB — see server.js for why that split exists.

WHY app.js AND server.js ARE SEPARATE FILES
  `app.js` exports a configured Express app object but never calls
  `.listen()`. `server.js` imports it, connects to MongoDB, and THEN
  calls `.listen()`. This split exists for one concrete reason: testing.
  An integration test (e.g. with `supertest`) needs an Express app to
  send fake requests to, but does NOT want a real network port bound —
  binding a port per test file causes port conflicts and slows tests
  down. Importing `app.js` alone gives a test everything it needs
  without ever touching a socket.

MIDDLEWARE ORDER MATTERS — READ TOP TO BOTTOM AS THE ACTUAL PIPELINE
  1. cors — must run before routes so preflight/cross-origin requests
     from the Vite dev server are allowed at all.
  2. express.json() — parses a JSON body into `req.body` BEFORE any
     route/validator that reads it runs.
  3. cookieParser() — parses the `Cookie` header into `req.cookies`
     BEFORE the refresh-token route reads it.
  4. routes — the actual feature logic.
  5. notFound — reached only if no route matched.
  6. errorHandler — reached only via next(err); MUST be last (Express
     identifies it by its 4-argument arity, see that file's docblock).

  Moving any of these out of order breaks something specific: routes
  before body-parsing would see `req.body` as undefined; errorHandler
  before routes would never receive any of their errors.

WHY `cors({ origin: env.clientOrigin, credentials: true })` SPECIFICALLY
  `credentials: true` is required for the browser to send/receive the
  httpOnly refresh-token cookie on cross-origin requests (the Vite dev
  server on :5173 calling this API on :5000 counts as cross-origin).
  Browsers refuse to combine `credentials: true` with a wildcard `*`
  origin — the origin must be an explicit, known value, which is why
  CLIENT_ORIGIN is required config rather than "just allow everything."
========================================================================
*/

import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import { env } from "./config/env.js";
import routes from "./routes/index.js";
import { notFound } from "./middleware/notFound.js";
import { errorHandler } from "./middleware/errorHandler.js";

export const app = express();

app.use(cors({ origin: env.clientOrigin, credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use("/api", routes);

app.use(notFound);
app.use(errorHandler);

/*
========================================================================
SUMMARY

Node.js concepts: Express middleware pipeline and its order-dependence,
  separating "app configuration" from "process/network lifecycle" for
  testability.
SOLID: SRP (this file's only job is wiring middleware and routes; no
  business logic, no server-lifecycle concerns).
Design patterns: this file is essentially a Composition Root for the
  HTTP layer — the one place that assembles all the independently
  authored middleware/routes into a working pipeline.
Interview questions: see above (why split app.js/server.js, why
  middleware order matters, why CORS credentials requires an explicit
  origin).
Common mistakes: registering errorHandler before routes; forgetting
  cookie-parser and then wondering why req.cookies is always undefined;
  using `origin: "*"` with `credentials: true` (browsers reject this
  combination outright).
Best practices: keep app.js free of I/O side effects (no DB connect, no
  listen) so it can be imported safely by tests.
========================================================================
*/
