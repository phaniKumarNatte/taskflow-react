/*
========================================================================
MODULE: main.jsx — the app's entry point / Composition Root

RESPONSIBILITY
  Mount React onto the DOM and establish the PROVIDER STACK every
  component in the tree renders inside of. This is the one place that
  decides what global capabilities (routing, server-state caching, auth
  context) exist at all — individual components never construct their
  own QueryClient or Router.

WHY PROVIDER ORDER MATTERS HERE
  1. QueryClientProvider (outermost, among these three) — makes React
     Query's cache available. Doesn't itself depend on routing or auth.
  2. BrowserRouter — enables React Router's hooks (useNavigate, <Link>,
     <Routes>) anywhere beneath it. AuthProvider is placed INSIDE it
     because AuthContext doesn't need routing, but keeping the router as
     the outer boundary of "things needing browser history" is the
     conventional shape.
  3. AuthProvider (innermost of the three) — needs to be above <App />
     since App's routes (ProtectedRoute, LoginPage, etc.) all call
     useAuth().

REACT QUERY: QueryClient AS A SINGLETON, CREATED ONCE
  `new QueryClient()` is created exactly once, outside the component
  tree, and passed down via QueryClientProvider — NOT created inside a
  component body (which would construct a brand-new cache, discarding
  everything previously fetched, on every re-render). This is the same
  "construct expensive/stateful things outside render" discipline as
  memoizing a context value, just for a different kind of shared state.

DEFAULT CACHE BEHAVIOR (relevant once useQuery is introduced in a later
  slice for actual server data like tasks/projects)
  - staleTime: how long fetched data is considered "fresh enough" to
    reuse without a background refetch. Default is 0 — every mount
    refetches. A later slice will likely raise this per-query for data
    that doesn't change often.
  - gcTime (formerly cacheTime): how long UNUSED query data stays in
    memory before being garbage-collected once no component is
    observing it.
  These aren't configured with non-default values yet in this Auth
  slice (no `useQuery` calls exist yet — only `useMutation`, which
  doesn't use staleTime/gcTime the same way), but the QueryClient is
  wired up now so the NEXT feature slice can start using useQuery
  immediately without touching this file again.

WHY StrictMode DOUBLE-INVOKES EFFECTS IN DEVELOPMENT (a common point of
  confusion when combined with AuthContext's mount-time refresh effect)
  React 18+'s StrictMode intentionally mounts, unmounts, and re-mounts
  components once in development ONLY, specifically to surface effects
  that aren't properly cleaned up. This is why AuthContext's silent-
  refresh effect includes a `cancelled` flag — without it, StrictMode's
  double-invocation in dev could (harmlessly, but confusingly) fire the
  refresh call twice and risk a state update after the "first" mount's
  cleanup ran.
========================================================================
*/

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'

const queryClient = new QueryClient()

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <App />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>,
)

/*
========================================================================
SUMMARY

React concepts used: StrictMode (dev-only double-invocation to surface
  effect bugs), the Provider stack pattern (composing multiple context
  providers at the app's root), createRoot (React 18+'s concurrent-
  capable root API, replacing the legacy ReactDOM.render).
Node.js concepts: n/a (client-side entry point; conceptually parallel
  to server.js being the backend's own single entry point).
SOLID: SRP — this file's only job is composing providers and mounting;
  it contains no business or routing logic itself.
Design patterns: Composition Root (the one place that wires together
  every top-level dependency the app needs) and nested Provider pattern.
Interview questions: Why create QueryClient outside the component tree
  instead of with useState? To guarantee exactly one instance for the
  app's lifetime, never reconstructed on a re-render. Why does provider
  ORDER matter? Only insofar as a provider must appear ABOVE anything
  that consumes its context — AuthProvider must wrap App since App's
  routes call useAuth().
Common mistakes: creating `new QueryClient()` inside a component body
  (resets the cache on every re-render); forgetting AuthProvider must be
  inside BrowserRouter if AuthContext ever needs routing hooks (it
  doesn't currently, but the ordering convention anticipates it).
Best practices: keep this file a pure composition root — no logic, just
  provider wiring and a single render call.
========================================================================
*/
