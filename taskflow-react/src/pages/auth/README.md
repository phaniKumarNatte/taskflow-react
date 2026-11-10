# pages/auth/

The unauthenticated-facing pages: `LoginPage`, `RegisterPage`. Grouped in their own subfolder because they're the one set of pages explicitly rendered OUTSIDE `ProtectedRoute` (see `App.jsx`).

**Why this folder exists:** as more pages accumulate (`pages/projects/`, `pages/tasks/`, `pages/admin/`), grouping by feature rather than dumping every page flat into `pages/` keeps related pages (and any page-local components, like `RegisterPage.jsx`'s local `Field` helper) discoverable together.

**Why files belong here:** a file belongs here if it's a top-level routed page for the auth feature specifically. Each page should stay a thin coordinator — see `LoginPage.jsx`'s docblock for the full "why this component should only coordinate UI" argument.

**How this scales:** the same feature-folder convention (`pages/<feature>/`) applies to every future feature area, mirroring the backend's one-folder-per-concern layering, just organized by USER-FACING feature instead of architectural layer (which makes sense for pages, since that's how a contributor thinks about "where's the Login page" vs. "where's the auth service").
