/*
========================================================================
COMPONENT: ProtectedRoute

RESPONSIBILITY
  Guard an entire subtree of routes: render the child route (via
  `<Outlet />`) only if the user is authenticated; otherwise redirect to
  /login. Renders nothing (a loading state) while auth status is still
  being determined on initial page load.

SOLID
  ✓ Single Responsibility Principle — this component's only job is the
    authenticated/not-authenticated branch. It doesn't know what pages
    it's protecting; it just decides whether to render `<Outlet />` or
    redirect.

DEPENDENCIES
  useAuth (for isAuthenticated / isInitializing), React Router's
  `<Navigate>` and `<Outlet>`.

WHY THIS COMPONENT EXISTS — CLIENT-SIDE ROUTE GUARDS VS. THE REAL
SECURITY BOUNDARY
  This component is a UX convenience, NOT a security boundary. It stops
  a logged-out user from *seeing* a protected page's UI flash briefly,
  and redirects them to login — but any determined user can still call
  the API directly, bypassing React entirely. The actual security check
  is the backend's `authenticate` middleware (see
  server/src/middleware/authenticate.js), which the API enforces
  regardless of what the frontend does. This is a genuinely important
  interview distinction: client-side route guards are about UX, server-
  side auth checks are about security.

WHY CHECK `isInitializing` BEFORE `isAuthenticated`
  On a hard page reload, AuthContext hasn't yet resolved its silent
  refresh attempt (see AuthContext.jsx) — `isAuthenticated` would
  momentarily read `false` even for a genuinely logged-in user. Without
  this check, every page refresh on a protected route would flash-
  redirect to /login before the refresh call even resolves. Rendering a
  neutral loading state during `isInitializing` avoids that flash
  entirely.

COMPOUND-COMPONENT-STYLE COMPOSITION VIA <Outlet />
  This component doesn't take a `children` prop and doesn't know which
  page it's guarding — instead, React Router's nested-route convention
  lets THIS component be the parent route element, and whatever child
  route matched renders wherever `<Outlet />` appears. This keeps
  ProtectedRoute reusable across many different protected pages without
  ever importing them.

INTERVIEW QUESTIONS
  Q: Why use `<Navigate replace />` instead of `useNavigate()` inside a
     useEffect?
  A: `<Navigate>` is declarative — it's a component whose entire job is
     "render me and a redirect happens," matching React's render-as-a-
     function-of-state philosophy. Triggering navigation as a side
     effect (imperatively, in a useEffect) works but is more code for
     the same outcome, and risks an extra render of the "wrong" page
     before the effect fires. `replace` avoids adding the redirected-
     from URL to browser history, so the back button doesn't return the
     user to a redirect loop.

  Q: Could this same pattern gate routes by ROLE instead of just
     "logged in"?
  A: Yes — a variant would accept an `allowedRoles` prop and check
     `user.role` in addition to `isAuthenticated`, mirroring the
     backend's `authorize(...)` middleware. Not needed for this Auth
     slice since there's only one protected page so far.

========================================================================
*/

import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../hooks/useAuth.js";

export function ProtectedRoute() {
  const { isAuthenticated, isInitializing } = useAuth();

  if (isInitializing) {
    // Deliberately minimal — this is a brief flash during the silent-
    // refresh check on page load, not a page users linger on.
    return (
      <div className="flex h-screen items-center justify-center text-slate-500">
        Loading…
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <Outlet />;
}

/*
========================================================================
SUMMARY

React concepts used: React Router's nested routes (<Outlet />),
  declarative redirects (<Navigate replace />), conditional rendering
  based on custom hook state.
Node.js concepts: n/a.
SOLID: SRP — see above.
Design patterns: Compound Component pattern (this component cooperates
  with React Router's route tree rather than taking explicit children),
  Guard pattern (a common name for this exact shape regardless of
  framework).
Interview questions: see above (client vs. server security boundary,
  Navigate vs. useNavigate, isInitializing flash prevention).
Common mistakes: treating a client-side route guard as an actual
  security measure; forgetting the isInitializing check and causing a
  flash-redirect on every page refresh; using useNavigate + useEffect
  where a declarative <Navigate> is simpler and more idiomatic.
Best practices: keep this component generic and reusable — no
  page-specific knowledge, just the auth-gate decision.
========================================================================
*/
