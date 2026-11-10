# repositories/

The ONLY layer allowed to import and query Mongoose models directly.

**Why this folder exists:** the Repository pattern inverts the dependency between business logic and the data-access technology. Services depend on repository *function signatures* ("find a user by email"), not on Mongoose's query API — so swapping the data layer, or writing tests that mock data access, never requires touching `services/` or `controllers/`. See `user.repository.js`'s docblock for the full Dependency Inversion argument.

**Why files belong here:** a file belongs here if its only job is translating a named, intent-revealing function (`findByEmailWithPassword`, `revokeAllUserTokens`) into a Mongoose call. It should contain NO business rules (no "is this allowed," no password comparison, no token signing) — only data access.

**How this scales:** one `<entity>.repository.js` per model, mirroring `models/`. As the app grows, this is also the natural place to introduce query result caching or pagination helpers without services ever needing to know that changed.
