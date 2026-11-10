# services/

The only layer allowed to know API endpoint URLs, request/response shapes, and HTTP client configuration (`httpClient.js`, `auth.service.js`).

**Why this folder exists:** components should never call Axios (or `fetch`) directly. If they did, every component making a network call would need to know the API's base URL, how to attach auth headers, and the exact response envelope — repeated, driftable knowledge. This layer centralizes "how to talk to the backend" so components/hooks depend on named, intention-revealing functions (`login(...)`, `getTasks()`) instead of raw HTTP calls — the same Dependency Inversion argument as the backend's `repositories/` layer sitting between services and Mongoose.

**Why files belong here:** `httpClient.js` is the one configured Axios instance (interceptors for auth headers and silent token refresh) every other service file imports. Feature service files (`auth.service.js`, and later `tasks.service.js`, `projects.service.js`, ...) each own one feature's endpoints and response-shape unwrapping. These files should be framework-agnostic — no React imports, no hooks — so they're callable and testable independent of any component.

**How this scales:** one `<feature>.service.js` per feature, mirroring the backend's `routes/<feature>.routes.js`. React Query hooks (`useQuery`/`useMutation` calls, likely factored into their own `hooks/queries/<feature>.js` files in a later slice) call INTO these service functions as their `queryFn`/`mutationFn` — React Query manages the request lifecycle and cache; these files own the actual request/response contract.
