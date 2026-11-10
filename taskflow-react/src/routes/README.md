# routes/

Routing-specific components: currently `ProtectedRoute`, the auth-gate for nested route trees. `App.jsx` (one level up, at `src/App.jsx`) declares the actual URL map; this folder holds reusable ROUTING BEHAVIOR (guards, and later possibly role-gates, layout-route wrappers) that `App.jsx` composes into that map.

**Why this folder exists:** a route guard is a distinct concern from "what page renders at this URL" (that's `App.jsx`) and from "what does the page itself render" (that's `pages/`). Keeping guard logic in its own file/folder means it's reusable across an arbitrary, growing number of protected routes without App.jsx repeating the same conditional per page.

**Why files belong here:** a file belongs here if its job is deciding WHETHER a route's content renders (redirect vs. render `<Outlet />`), not what that content IS.

**How this scales:** a role-based variant (`AdminRoute`, or a parameterized `ProtectedRoute` accepting `allowedRoles`) would live here alongside `ProtectedRoute`, following the same pattern as the backend's `authenticate` + `authorize(...)` middleware split.
