/*
========================================================================
MODULE: services/auth.service.js

RESPONSIBILITY
  The only module allowed to know the actual auth API endpoints and
  request/response shapes. AuthContext (and eventually React Query
  hooks) call these functions; they never call `httpClient` or
  hardcode a URL string themselves.

WHY THIS EXTRA LAYER ON TOP OF httpClient
  `httpClient.js` knows HOW to make an authenticated request (headers,
  refresh-on-401). This module knows WHAT requests the auth feature
  needs to make and what shape their responses have. Splitting these
  means a change to the backend's response envelope (e.g.
  `data.data.user` becoming `data.user`) is a one-line fix here, not a
  hunt through every component that ever called login.

BACKEND SERVICE LAYER COMPARISON
  This is the frontend mirror of `server/src/services/auth.service.js`
  — same name, same idea, applied on the other side of the wire: a
  layer whose whole job is "here's how to accomplish this use case,"
  hiding the transport details (Axios vs. fetch, REST vs. GraphQL) from
  every caller above it.

INTERVIEW QUESTIONS
  Q: Why not just call these functions directly from a React Query
     `useMutation` inline, skipping this file?
  A: You could inline `httpClient.post('/auth/login', ...)` inside a
     `useMutation` call — plenty of codebases do. Extracting it here
     means the exact same function is reusable from anywhere (not just
     one component's mutation), and a unit test can call `login(...)`
     without any React involved at all.
========================================================================
*/

import { httpClient } from "./httpClient.js";

export async function login({ email, password }) {
  const { data } = await httpClient.post("/auth/login", { email, password });
  return data.data; // { user, accessToken }
}

export async function register({ name, email, password }) {
  const { data } = await httpClient.post("/auth/register", { name, email, password });
  return data.data;
}

export async function refresh() {
  const { data } = await httpClient.post("/auth/refresh");
  return data.data;
}

export async function logout() {
  await httpClient.post("/auth/logout");
}

/*
========================================================================
SUMMARY

React/frontend concepts: n/a directly — this file is intentionally
  framework-agnostic, called BY React code (AuthContext) rather than
  containing any itself.
SOLID: SRP (only knows auth endpoints/shapes) and Dependency Inversion
  (AuthContext depends on these named functions, not on httpClient or
  raw URLs).
Design patterns: Service Layer / Facade over the raw HTTP client.
Interview questions: see above.
Common mistakes: scattering `httpClient.post('/auth/...')` calls across
  multiple components instead of centralizing them here — the first
  symptom is usually a backend response-shape change requiring edits in
  several unrelated files.
Best practices: return already-unwrapped, UI-friendly data from service
  functions (`data.data`, not the raw Axios response) so callers never
  need to know the transport envelope.
========================================================================
*/
