# controllers/

Thin HTTP adapters: read `req`, call a service, shape `res`. Nothing else.

**Why this folder exists:** every request needs *something* that knows about Express's `req`/`res` objects. Keeping that "something" intentionally thin — no business rules, no data access — means the actual logic underneath is reusable outside an HTTP context and the HTTP-specific concerns (status codes, cookies, response shape) stay in exactly one place per feature.

**Why files belong here:** a file belongs here if every exported function takes `(req, res)` (wrapped in `asyncHandler`), calls into exactly one service, and formats the HTTP response. If you find yourself writing an `if` that checks a business rule (not an HTTP concern) inside a controller, that logic belongs in `services/` instead.

**How this scales:** one `<feature>.controller.js` per feature, matching `routes/<feature>.routes.js` and `services/<feature>.service.js` one-to-one. This consistent naming makes tracing a request (route → controller → service → repository → model) predictable across the whole codebase, no matter which feature you're reading.
