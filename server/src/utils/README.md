# utils/

Small, dependency-free (or near-dependency-free) helpers used across multiple layers: `ApiError`, `asyncHandler`, JWT signing/verification, duration parsing.

**Why this folder exists:** these are cross-cutting building blocks that don't belong to any one feature or architectural layer (not a model, not a service, not middleware) — they're plumbing that every layer might reach for.

**Why files belong here:** a file belongs here if it's a small, focused, mostly-pure function or class with no knowledge of Express's req/res, no direct database access, and no business rules specific to one feature. If a helper starts needing feature-specific knowledge, it has outgrown this folder.

**How this scales:** keep this folder deliberately boring and small. A utils folder that accumulates unrelated, growing logic over time ("utils.js" as a junk drawer) is a common anti-pattern — the fix, when a "util" grows real responsibility, is to promote it into its own properly-layered module (a service, a dedicated middleware) rather than letting it stay here indefinitely.
