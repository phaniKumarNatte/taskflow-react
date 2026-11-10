/*
========================================================================
MODULE: config/db.js

RESPONSIBILITY
  Open (and report on) the single Mongoose connection this process uses.

WHY A DEDICATED CONNECTION MODULE?
  Mongoose maintains an internal connection pool per `mongoose.connect()`
  call. Calling `connect()` more than once, or scattering it across
  multiple files, risks duplicate connections and makes it unclear which
  module "owns" the database lifecycle. Centralizing it here means
  server.js has exactly one thing to await before it starts accepting
  requests.

MONGOOSE INTERNALS (interview-relevant)
  `mongoose.connect()` returns a promise that resolves once the initial
  connection handshake succeeds. Under the hood, Mongoose uses the
  official MongoDB Node.js driver and layers schema validation / casting
  / middleware (hooks) on top of it. The connection itself is pooled —
  by default the driver keeps up to 100 sockets open and reuses them
  across queries, which is why a single `connect()` call is enough for
  an entire app instead of connecting per-request.

WHY CONNECT BEFORE `app.listen`, NOT LAZILY ON FIRST REQUEST
  If the first HTTP request had to wait for a cold Mongo connection, the
  first user of a freshly-deployed server would eat that latency (and if
  the DB is unreachable, they'd get a confusing timeout instead of the
  server failing to boot at all). We prefer "crash on boot if the DB is
  unreachable" over "silently serve broken requests" — same fail-fast
  reasoning as config/env.js.

INTERVIEW QUESTIONS
  Q: What happens if MongoDB goes down *after* the server already booted?
  A: Mongoose buffers operations by default (bufferCommands: true) for a
     short window and retries; sustained outages surface as timeouts on
     in-flight queries. Production systems typically add health checks
     and listen for the 'disconnected'/'reconnected' connection events
     (wired below) to log and alert.

  Q: Why is this a plain async function instead of a class / singleton
     object?
  A: Mongoose's default connection (`mongoose.connection`) is *already*
     a singleton maintained by the driver — wrapping it in another
     singleton class would just add indirection with no benefit. No
     SOLID principle is significantly demonstrated here beyond SRP (this
     file's only job is "connect to Mongo and log lifecycle events").
========================================================================
*/

import mongoose from "mongoose";
import { env } from "./env.js";

export async function connectDB() {
  mongoose.connection.on("connected", () => {
    console.log(`[mongo] connected -> ${mongoose.connection.name}`);
  });

  mongoose.connection.on("error", (err) => {
    console.error("[mongo] connection error:", err.message);
  });

  mongoose.connection.on("disconnected", () => {
    console.warn("[mongo] disconnected");
  });

  await mongoose.connect(env.mongoUri);
}

/*
========================================================================
SUMMARY

MongoDB concepts: connection pooling, driver-level buffering, connection
  lifecycle events.
Node.js concepts: async/await at module boundaries, event listeners on
  Node's EventEmitter-based APIs (mongoose.connection extends EventEmitter).
SOLID: SRP — this module's only responsibility is the DB connection
  lifecycle. No other principle is significantly demonstrated here.
Interview questions: see above.
Common mistakes: calling mongoose.connect() in multiple places; awaiting
  the connection inside a request handler instead of at boot; not
  handling the 'error' event (an unhandled 'error' event on an
  EventEmitter throws and can crash the process).
Best practices: connect once at boot, before app.listen; centralize
  connection-lifecycle logging in one place.
========================================================================
*/
