# services/

Business logic. This is where "what counts as a valid login," "how tokens are issued and rotated," and every other domain rule actually lives.

**Why this folder exists:** controllers translate HTTP into calls and back; repositories translate calls into database queries. Neither should own decisions like "reject duplicate emails" or "rotate the refresh token on every use" — those are domain rules that don't care whether they were triggered by an HTTP request, a CLI script, or a background job. Isolating them here means they're reusable and testable independent of Express entirely.

**Why files belong here:** a file belongs here if it orchestrates one or more repositories to accomplish a use case, and may throw `ApiError`s to signal expected failure conditions (bad credentials, conflicts, not-found). It should NOT read `req`/`res` directly (that couples business logic to HTTP) and should NOT issue raw Mongoose queries (that's what `repositories/` is for).

**How this scales:** one `<feature>.service.js` per feature area (auth, projects, tasks, notifications...), each composing one or more repositories. Cross-feature orchestration (e.g. "creating a task also creates a notification") lives in whichever service initiates the action, calling into the other feature's service — services can depend on other services, but never skip down to another feature's repository directly.
