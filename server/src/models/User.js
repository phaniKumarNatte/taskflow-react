/*
========================================================================
MODEL: User

RESPONSIBILITY
  The persisted shape of an account: identity (email), credentials
  (hashed password), and authorization (role).

WHY SCHEMA EXISTS (Mongoose over raw MongoDB driver)
  MongoDB itself is schemaless — any document can have any shape. That
  flexibility is a double-edged sword at scale: without an enforced
  shape, a typo (`emial` instead of `email`) silently creates a new
  field instead of erroring, and nothing stops a `password` field from
  ending up in plaintext by accident. Mongoose's Schema is an
  application-level contract enforced *before* a write reaches MongoDB:
  it validates types, required fields, and lets you hook logic
  (pre-save hashing, below) into the write path.

  Interview framing: MongoDB gives you flexibility; Mongoose gives you
  back some of the guarantees a relational ORM gets "for free" from a
  SQL schema, opt-in and enforced in your app tier rather than the DB
  tier.

WHY MODEL EXISTS (`mongoose.model(...)`)
  A Schema is just a blueprint (like a class definition). `model()`
  compiles that blueprint into a constructor bound to a specific
  MongoDB collection (here, `users`), giving you `User.find()`,
  `User.create()`, etc. Same relationship as a class vs. an instance —
  the model is what you actually query and construct documents from.

WHY HASH THE PASSWORD IN A PRE-SAVE HOOK, NOT IN THE CONTROLLER
  If hashing lived in the controller, every code path that creates or
  updates a user (registration, an admin "reset password" endpoint, a
  future data migration script) would have to remember to hash before
  saving — one missed call anywhere and a plaintext password lands in
  the database. Putting it in a Mongoose `pre('save')` hook makes it
  impossible to forget: it runs on every `.save()` for this model, no
  matter which code path triggered it. This is Mongoose's version of a
  database trigger, executed in the app tier.

INDEXES
  `email` is `unique: true`, which makes Mongoose create a unique index
  on that field. Two effects: (1) MongoDB rejects a second document with
  a duplicate email at the storage layer — a guarantee the app can't
  bypass, unlike a JS-level "check first" (which has a race condition
  between the check and the insert under concurrent requests), and
  (2) queries filtering by email (every login) use the index instead of
  scanning the whole collection — O(log n) instead of O(n).

SELECT: false ON password
  `select: false` means `User.find()` / `findById()` omit `password` by
  default — you have to explicitly opt in with
  `.select('+password')` (used in the repository's login lookup). This
  is a safety net: it makes "accidentally serializing the password hash
  in an API response" require a deliberate, visible extra step instead
  of being the default behavior.

INTERVIEW QUESTIONS
  Q: Why bcrypt instead of a faster hash like SHA-256 for passwords?
  A: bcrypt is deliberately slow and has a tunable cost factor (the
     "salt rounds" below). Fast hashes are a *liability* for passwords
     because they let an attacker with a stolen hash dump brute-force
     billions of guesses per second on commodity GPUs; bcrypt's
     deliberate slowness (and built-in per-hash salt) makes that
     infeasible at scale.

  Q: Why check `isModified('password')` before hashing in the pre-save
     hook?
  A: Without it, every save (even one that only updates `role` or
     `name`) would re-hash the *already-hashed* password, corrupting it
     — the user would be locked out. The hook must only hash on
     create or on an actual password change.

  Q: What does `toJSON` transform do here, and why bother if `password`
     already has `select: false`?
  A: Defense in depth. `select: false` protects queries; the `toJSON`
     transform protects the moment a document IS serialized to JSON
     (e.g. if a future code path does `.select('+password')` for a
     legitimate reason like login, then accidentally returns that same
     document object in a response). Two independent layers, so one
     mistake doesn't leak credentials.
========================================================================
*/

import mongoose from "mongoose";
import bcrypt from "bcryptjs";

const { Schema } = mongoose;

const userSchema = new Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      maxlength: 100,
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true, // creates a unique index — see docblock above
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: 8,
      select: false, // omitted from query results unless explicitly requested
    },
    // Kept intentionally small for this slice (Auth). A future
    // Roles/Permissions feature would likely replace this with a
    // reference to a separate Role collection — see models/README.md
    // for when embedding vs. referencing is the right call.
    role: {
      type: String,
      enum: ["member", "admin"],
      default: "member",
    },
  },
  {
    // Adds createdAt / updatedAt automatically, maintained by Mongoose
    // on every save — one less thing to hand-manage per write.
    timestamps: true,
  }
);

// Mongoose middleware ("hook"): runs automatically before every
// `.save()` on a User document. This is what makes hashing
// unforgettable — see docblock above for why this lives here and not
// in the controller/service.
userSchema.pre("save", async function hashPasswordIfChanged(next) {
  if (!this.isModified("password")) {
    return next();
  }

  const SALT_ROUNDS = 12; // cost factor: each +1 roughly doubles hash time
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

// Instance method: compares a plaintext candidate against this
// document's hashed password. Lives on the model (not in a service) so
// any caller with a User document — controller, service, a future admin
// script — gets the same, correct comparison logic without needing to
// know bcrypt is involved at all. This is encapsulation: the model
// owns how its own credential is verified.
userSchema.methods.comparePassword = function comparePassword(candidate) {
  return bcrypt.compare(candidate, this.password);
};

// Runs whenever a User document is converted to JSON (e.g.
// `res.json(user)`, or implicitly via JSON.stringify). Strips fields
// that should never leave the server, even if a query opted into
// `.select('+password')` upstream. Defense in depth — see docblock.
userSchema.set("toJSON", {
  transform(_doc, ret) {
    delete ret.password;
    delete ret.__v; // Mongoose's internal version key — noise to API consumers
    return ret;
  },
});

export const User = mongoose.model("User", userSchema);

/*
========================================================================
SUMMARY

MongoDB concepts: unique indexes, document validation at the app tier.
Mongoose concepts: Schema vs. Model, pre-save hooks (middleware),
  instance methods, `select: false`, `toJSON` transforms, timestamps.
SOLID: SRP (this file only defines the User shape and its own
  credential/serialization behavior) and encapsulation of
  comparePassword as an instance method rather than scattered bcrypt
  calls elsewhere.
Design patterns: Active Record-ish (the model both represents data and
  carries behavior via instance methods) — a deliberate Mongoose
  convention, contrasted with the Repository pattern layered on top in
  repositories/user.repository.js to keep query logic out of
  controllers/services.
Interview questions: see above.
Common mistakes: hashing in the controller instead of a hook (easy to
  forget on new code paths); forgetting `isModified` and double-hashing
  on unrelated updates; returning the raw Mongoose document (with
  password) directly in an API response.
Best practices: bcrypt with a meaningful cost factor, unique index for
  natural keys like email, `select: false` + toJSON transform as two
  independent layers of protection.
========================================================================
*/
