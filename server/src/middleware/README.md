# middleware/

Cross-cutting request-pipeline concerns: authentication, authorization, validation gating, error translation, 404 fallback.

**Why this folder exists:** Express models a request as a Chain of Responsibility — each middleware decides "handle this myself" or "pass it on." Concerns that apply across many/all routes (is this request authenticated? did validation pass? what happens when something throws?) belong as middleware rather than being re-implemented inside every controller that needs them.

**Why files belong here:** a file belongs here if it's a function of shape `(req, res, next)` (or `(err, req, res, next)` for error handlers) meant to be composed into a route's or the app's middleware chain. It should be generic enough to be reused across multiple routes/features — logic specific to exactly one endpoint belongs in that endpoint's controller instead.

**How this scales:** as more cross-cutting concerns appear (request logging, rate limiting, file-upload handling via Multer, request-id tagging for tracing), each gets its own file here, composed into `app.js` (global) or individual route files (route-specific) as appropriate — the same two-tier composition already used for `authenticate`/`authorize` vs. the global `errorHandler`/`notFound`.
