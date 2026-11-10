/*
========================================================================
REACT FEATURE: Context (createContext / useContext)
COMPONENT: AuthProvider

WHY CONTEXT EXISTS
  React's default data flow is one-directional: props flow down.
  "Prop drilling" is what happens when a value (like "the current user")
  is needed by a component 5 levels deep, forcing every intermediate
  component to accept and forward a prop it never actually uses itself
  — Header, Sidebar, and Dashboard would all need to accept and pass
  along a `user` prop just so a deeply nested LogoutButton can read it.
  Context lets a Provider make a value available to ANY descendant that
  calls `useContext`, no matter how deep, without threading it through
  every layer in between.

WHY CONTEXT SHOULD NOT REPLACE REACT QUERY (an important distinction
  this codebase deliberately respects)
  Context is for CLIENT state — state that lives only in the browser and
  has no "source of truth" on a server (theme, current auth user object
  once fetched, sidebar-open/closed). React Query is for SERVER state —
  data that actually lives in a database and can go stale, be refetched,
  cached, deduplicated across components, etc. `AuthContext` here holds
  the *current authenticated user and access token*, which is genuinely
  client state derived from a login action — it does NOT try to cache or
  refetch server data the way `useQuery` would for, say, a task list.
  Mixing the two responsibilities (e.g. wrapping every API resource in
  Context) throws away everything React Query provides for free
  (caching, background refetch, retry, dedup) in exchange for hand-rolled
  useEffect/useState plumbing.

PERFORMANCE CONSIDERATIONS
  Every component that calls `useContext(AuthContext)` re-renders
  whenever the context VALUE reference changes — Context has no
  built-in mechanism to let a consumer subscribe to only part of the
  value (unlike a selector-based store). This is why `value` below is
  wrapped in `useMemo`: without it, AuthProvider re-rendering (e.g. from
  its own parent re-rendering for an unrelated reason) would create a
  brand-new object every render, and EVERY consumer of this context
  would re-render even though the actual auth data didn't change.

WHEN NOT TO USE CONTEXT
  For state that changes very frequently (e.g. mouse position, a text
  input's every keystroke) or that only a small, localized part of the
  tree needs, Context's "every consumer re-renders on any value change"
  behavior makes it a poor fit — local useState, or a dedicated state
  library with selectors (Zustand, Redux) scales better there. Auth
  state changes rarely (login/logout/refresh) — the shape of state
  Context handles well.

DESIGN PATTERN: Provider pattern (a React-specific name for Dependency
  Injection — descendants receive a dependency, "the current auth
  state," without constructing or importing it themselves).

INTERVIEW QUESTIONS
  Q: What's the actual mechanism that makes useContext trigger a
     re-render?
  A: React's Fiber reconciler walks up from the Provider whenever its
     `value` prop changes (by reference, using Object.is comparison)
     and re-renders every subscribed consumer, regardless of whether
     that consumer actually reads the specific field that changed.

  Q: How would you avoid re-rendering components that only need
     `isAuthenticated` when `user.name` changes?
  A: Split into multiple contexts (a `boolean`-only context vs. a full
     user-object context), or move to a library with fine-grained
     subscriptions. Not needed at this app's current scale, but the
     right answer once profiling shows it matters.
========================================================================
*/

import { createContext, useState, useCallback, useMemo, useEffect } from "react";
import * as authService from "../services/auth.service.js";
import { setAccessToken, setOnLogout } from "../services/httpClient.js";

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  // Distinguishes "we don't know yet" from "we checked and there's no
  // user" — without this, ProtectedRoute would flash a redirect to
  // /login on every hard page refresh before the silent-refresh attempt
  // below even resolves.
  const [isInitializing, setIsInitializing] = useState(true);

  const login = useCallback(async (credentials) => {
    const { user: loggedInUser, accessToken } = await authService.login(credentials);
    setAccessToken(accessToken);
    setUser(loggedInUser);
  }, []);

  const register = useCallback(async (details) => {
    const { user: newUser, accessToken } = await authService.register(details);
    setAccessToken(accessToken);
    setUser(newUser);
  }, []);

  const logout = useCallback(async () => {
    try {
      await authService.logout();
    } finally {
      // Clear local state even if the network call fails — a logout
      // should never leave the UI stuck in a logged-in-looking state.
      setAccessToken(null);
      setUser(null);
    }
  }, []);

  useEffect(() => {
    // Lets httpClient's response interceptor force a logout (e.g. a
    // silent refresh ultimately fails) without importing React or this
    // context directly — see httpClient.js's docblock for why that
    // decoupling matters.
    setOnLogout(() => {
      setAccessToken(null);
      setUser(null);
    });
  }, []);

  useEffect(() => {
    // On a hard page reload, all in-memory state (including the access
    // token) is gone — but the httpOnly refresh-token cookie survives
    // (it's persisted by the browser, not by JavaScript memory). This
    // attempts one silent refresh on mount to re-establish a session
    // without forcing the user to log in again after every reload.
    let cancelled = false;

    authService
      .refresh()
      .then(({ user: refreshedUser, accessToken }) => {
        if (cancelled) return;
        setAccessToken(accessToken);
        setUser(refreshedUser);
      })
      .catch(() => {
        // No valid refresh cookie (never logged in, or it expired) —
        // this is an expected, silent failure, not an error to surface.
      })
      .finally(() => {
        if (!cancelled) setIsInitializing(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  // Memoized so AuthProvider re-rendering for unrelated reasons doesn't
  // force every consumer to re-render too — see docblock above.
  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isInitializing,
      login,
      register,
      logout,
    }),
    [user, isInitializing, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/*
========================================================================
SUMMARY

React concepts used: Context (createContext/Provider), useState,
  useEffect (mount-time silent refresh + cleanup via a `cancelled` flag
  to avoid setting state on an unmounted component), useCallback
  (stable function identities so `value`'s useMemo dependency array
  is meaningful), useMemo (preventing unnecessary consumer re-renders).
Node.js concepts: n/a (client-side).
SOLID: SRP (this file only manages auth STATE and exposes actions; it
  delegates the actual HTTP work to services/auth.service.js) and
  Dependency Inversion (depends on the service layer's functions, not
  on httpClient or endpoint URLs directly).
Design patterns: Provider pattern (React's flavor of Dependency
  Injection).
Performance considerations: see docblock (useMemo on the context value,
  useCallback on the exposed actions).
Interview questions: see above (why Context vs React Query, re-render
  mechanics, prop drilling).
Common mistakes: not memoizing the context value (causes needless
  re-renders of every consumer); using Context to cache server data
  instead of client-only auth state; forgetting the isInitializing flag
  and causing a flash-redirect to /login on every page refresh.
Best practices: keep Context scoped to genuinely client-side state;
  memoize the value; expose actions (login/logout) rather than raw
  setState functions, so consumers can't put the context into an
  invalid state directly.
========================================================================
*/
