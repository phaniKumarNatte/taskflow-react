# validators/

Declarative "is this request well-formed" rules, using express-validator rule chains, run as middleware before a controller ever sees the request.

**Why this folder exists:** input shape validation ("is this an email," "is this password long enough") is a distinct concern from business rules ("is this email already registered") and from HTTP orchestration (controllers). Separating it lets the same rule be reused across routes and reasoned about independently, and keeps controllers free of defensive `if (!req.body.x)` checks.

**Why files belong here:** a file belongs here if it exports arrays of express-validator rule chains (`body(...)`, `param(...)`, `query(...)`) for one feature's endpoints. It should never query the database — "is this allowed given existing data" is a `services/` concern, not a validator's.

**How this scales:** one `<feature>.validator.js` per feature. Shared rules (e.g. "valid MongoDB ObjectId in a route param") are natural candidates to extract into a `common.validator.js` once more than one feature needs the same shape.
