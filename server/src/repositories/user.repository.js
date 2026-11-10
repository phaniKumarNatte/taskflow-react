/*
========================================================================
MODULE: repositories/user.repository.js

RESPONSIBILITY
  The ONLY module allowed to issue Mongoose queries against the User
  collection. Services call these functions; they never import the
  User model directly.

WHY A REPOSITORY LAYER ON TOP OF MONGOOSE MODELS (Dependency Inversion)
  Mongoose models are already fairly ergonomic (`User.findOne(...)`), so
  it's tempting to skip this layer and call the model straight from a
  service. The cost of skipping it shows up later, not now:
    - If the database changes (Mongoose -> a raw driver, or MongoDB ->
      Postgres for this one collection), every service that called
      `User.findOne` directly has to change. With a repository, only
      this file changes — services depend on an abstraction ("find a
      user by email"), not the concrete query API. That's the "D" in
      SOLID: high-level modules (services) shouldn't depend on
      low-level modules (Mongoose); both should depend on a stable
      interface.
    - Query logic that's reused (e.g. "find by email including the
      password field") gets defined once instead of copy-pasted with
      subtle variations across controllers.
    - It's the natural seam for testing: a service's unit test can mock
      this repository's functions instead of spinning up a real
      MongoDB or deep-mocking Mongoose internals.

BACKEND SERVICE LAYER COMPARISON
  This is the same reasoning as a backend "DAO" (Data Access Object) or
  a frontend API service module (see the React app's
  src/services/*.service.js) — a dedicated layer whose only job is
  "talk to the data source," so everything above it can stay ignorant
  of *how* data is fetched.

INTERVIEW QUESTIONS
  Q: Isn't this just adding an unnecessary layer of indirection for a
     simple CRUD app?
  A: For a toy script, yes — arguably overkill. For a codebase meant to
     survive changing requirements and multiple contributors (this
     app's stated goal), the layer pays for itself the first time the
     data-access story needs to change without a service-wide rewrite.

  Q: Why does `findByEmailWithPassword` exist as a separate function
     instead of just always selecting the password field?
  A: Because `select: false` on the schema (see models/User.js) is a
     deliberate safety default — most callers should NOT get the
     password hash. Making the "give me the password too" case its own
     explicitly-named function keeps that opt-in visible at the call
     site (auth.service.js) instead of buried in a generic options
     object.
========================================================================
*/

import { User } from "../models/User.js";

export function findByEmail(email) {
  return User.findOne({ email });
}

// Used only by the login flow, which needs to compare the submitted
// password against the stored hash. See models/User.js for why
// `password` is excluded by default.
export function findByEmailWithPassword(email) {
  return User.findOne({ email }).select("+password");
}

export function findById(id) {
  return User.findById(id);
}

export function createUser({ name, email, password }) {
  // `User.create` triggers the pre-save hook in models/User.js (password
  // hashing) — the repository doesn't know or care that hashing happens;
  // that's the model's own responsibility, not this layer's.
  return User.create({ name, email, password });
}

/*
========================================================================
SUMMARY

MongoDB concepts: findOne, findById, create — all delegated to Mongoose,
  which translates them into MongoDB driver calls.
Mongoose concepts: .select('+field') to opt into a schema-excluded field.
SOLID: Dependency Inversion Principle (services depend on this module's
  function signatures, not on Mongoose directly); SRP (this file only
  talks to the User collection).
Design patterns: Repository pattern.
Interview questions: see above.
Common mistakes: services importing the Mongoose model directly
  "just this once," which quietly erodes the abstraction boundary this
  layer exists to enforce.
Best practices: name repository functions after the *query intent*
  (findByEmailWithPassword) rather than exposing a generic
  find(filter, options) that leaks Mongoose's API shape upward.
========================================================================
*/
