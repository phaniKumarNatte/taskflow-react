# context/

React Context providers for genuinely CLIENT-side state — state with no server "source of truth" to cache/refetch (currently: `AuthContext`, the current authenticated user + session actions).

**Why this folder exists:** Context solves prop drilling — making a value available to any descendant without threading it through every intermediate component. It is deliberately NOT used here for server data (task lists, project data) — that's React Query's job (see `services/README.md`). Mixing the two responsibilities throws away caching/refetch/dedup React Query provides for free.

**Why files belong here:** a file belongs here if it's a `createContext` + Provider pair for state that is inherently client-only (auth session, theme, a global UI toggle). It should NOT be used to cache data that actually lives in the database.

**How this scales:** additional Contexts (Theme, maybe a global UI-preferences context for Settings) get their own file here, each paired with a custom hook in `hooks/` (e.g. `useTheme`) the same way `AuthContext` pairs with `useAuth`. If a context's consumers start re-rendering too often, see `AuthContext.jsx`'s docblock on splitting contexts for the same reasoning.
