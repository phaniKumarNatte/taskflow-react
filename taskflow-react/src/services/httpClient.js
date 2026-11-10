/*
========================================================================
MODULE: services/httpClient.js

RESPONSIBILITY
  A single configured Axios instance every service module imports,
  instead of each service configuring its own base URL, headers, and
  error/retry behavior independently.

WHY A SERVICE LAYER EXISTS — COMPONENTS SHOULD NOT CALL AXIOS DIRECTLY
  If a component called `axios.get('/api/tasks')` directly, three
  problems appear:
    1. Every component would need to know the API's base URL, and how
       to attach the access token — repeated, driftable configuration.
    2. Swapping HTTP libraries (Axios → fetch, or adding a GraphQL
       client later) would mean touching every component that ever made
       a request.
    3. Testing a component would require mocking Axios/network calls
       directly inside a UI test, instead of mocking one small service
       function.
  This is the Dependency Inversion Principle applied to the frontend:
  components and hooks depend on service *functions* (`login(...)`,
  `getTasks()`), not on Axios's API directly. It's the same shape as the
  backend's repository layer sitting between services and Mongoose.

INTERCEPTORS AS THE AXIOS EQUIVALENT OF EXPRESS MIDDLEWARE
  Axios interceptors run for EVERY request/response that passes through
  this instance, without each call site opting in — structurally the
  same idea as an Express middleware chain running for every matched
  route. Here:
    - The REQUEST interceptor attaches `Authorization: Bearer <token>`
      automatically, so no service function needs to remember to do it.
    - The RESPONSE interceptor catches a 401 (expired access token),
      attempts exactly one silent refresh via `/api/auth/refresh` (whose
      httpOnly cookie is sent automatically by the browser — no code
      here even sees the refresh token, by design; see the backend
      controller's docblock), and retries the original request ONCE with
      the new access token. If the refresh itself fails, the user is
      genuinely logged out.

WHY `withCredentials: true`
  This tells Axios to send/receive cookies on cross-origin requests
  (the Vite dev server and this API are different origins). Without it,
  the browser would never attach the httpOnly refresh-token cookie to
  the `/api/auth/refresh` call, and refresh would silently fail.

INTERVIEW QUESTIONS
  Q: Where is the access token actually stored on the frontend, and why
     not localStorage?
  A: In memory only (held by AuthContext's React state, see that
     file). localStorage is readable by ANY JavaScript running on the
     page — including an XSS payload — so a stolen access token there
     is trivially exfiltrated. In-memory storage means the token
     disappears on a full page reload (mitigated by the silent-refresh-
     on-401 flow re-establishing it from the httpOnly cookie) and is
     never exposed to a malicious script that isn't already running
     with full page access anyway.

  Q: Why guard against retrying the SAME request infinitely on repeated
     401s?
  A: Without the `_retry` flag below, a request that fails even after a
     successful-looking refresh (e.g. the new token is somehow also
     rejected) would loop: 401 → refresh → retry → 401 → refresh →
     retry... forever. Marking the original request as already-retried
     caps it at exactly one refresh attempt per request.
========================================================================
*/

import axios from "axios";

const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export const httpClient = axios.create({
  baseURL: BASE_URL,
  withCredentials: true, // sends the httpOnly refresh-token cookie automatically
});

// In-memory only — see docblock above for why this is never persisted
// to localStorage/sessionStorage. AuthContext is the source of truth
// for React re-renders; this module-level variable is what the
// interceptors read synchronously without needing to be inside a
// component.
let accessToken = null;
let onLogout = null;

export function setAccessToken(token) {
  accessToken = token;
}

// Lets AuthContext register a callback so the interceptor can force a
// logout (clear state, redirect) if silent refresh ultimately fails —
// the interceptor itself has no knowledge of React state or routing.
export function setOnLogout(callback) {
  onLogout = callback;
}

httpClient.interceptors.request.use((config) => {
  if (accessToken) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

httpClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;
    const isUnauthorized = error.response?.status === 401;
    const isRefreshCall = originalRequest?.url?.includes("/auth/refresh");

    if (isUnauthorized && !isRefreshCall && !originalRequest._retry) {
      originalRequest._retry = true; // caps retries at exactly one — see docblock

      try {
        const { data } = await httpClient.post("/auth/refresh");
        setAccessToken(data.data.accessToken);
        originalRequest.headers.Authorization = `Bearer ${data.data.accessToken}`;
        return httpClient(originalRequest);
      } catch (refreshError) {
        setAccessToken(null);
        onLogout?.();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

/*
========================================================================
SUMMARY

React/frontend concepts: none directly (this file is framework-agnostic
  on purpose — it doesn't import React), but it's the seam every hook/
  service depends on.
Node.js concepts: n/a (client-side module).
SOLID: Dependency Inversion (all services depend on this module, not on
  Axios directly, and this module knows nothing about the components
  that use it — decoupled in both directions).
Design patterns: Adapter (wraps Axios's API behind this app's own
  conventions) combined with an Interceptor pattern (request/response
  interceptors as composable, transparent hooks into every call).
Interview questions: see above (why in-memory tokens, why the _retry
  guard, interceptors vs. Express middleware).
Common mistakes: storing the access token in localStorage; forgetting
  withCredentials, which silently breaks the cookie-based refresh flow;
  missing the _retry guard, causing infinite refresh loops on a
  genuinely-expired session.
Best practices: one Axios instance per API, configured once; keep this
  file free of React/UI concerns entirely.
========================================================================
*/
