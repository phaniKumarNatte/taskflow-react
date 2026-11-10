# config/

Holds everything about *how this process is configured*, and nothing about *what it does*.

**Why this folder exists:** every other folder (models, services, controllers) needs to read configuration (a DB URI, a JWT secret, the client origin for CORS) without knowing *where that configuration comes from*. If `process.env.X` were read inline wherever it's needed, changing the config source later (env vars → a secrets manager) would mean hunting through the whole codebase. `config/` is the one place that translates "raw environment" into a validated, typed object (`env.js`) and the one place that owns the database connection lifecycle (`db.js`).

**Why files belong here:** a file belongs in `config/` if its job is "prepare something the rest of the app depends on but shouldn't have to think about" — reading env vars, opening a DB connection, (later) configuring a logger or a cache client. It does NOT belong here if it contains business logic or HTTP handling — those go in `services/`/`controllers/`.

**How this scales:** large Node codebases typically grow this folder into `config/index.js` re-exporting multiple sub-configs (`config/db.js`, `config/redis.js`, `config/mail.js`, `config/logger.js`) as more infrastructure concerns appear — each new one following the same "validate once, export once" shape already established by `env.js`.
