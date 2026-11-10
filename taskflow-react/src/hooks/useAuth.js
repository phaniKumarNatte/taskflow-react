/*
========================================================================
REACT FEATURE: Custom Hook
HOOK: useAuth

WHY THIS HOOK EXISTS
  `useContext(AuthContext)` alone would work in any component, but this
  thin wrapper adds one guarantee: it throws a clear error if called
  outside an `<AuthProvider>`, instead of silently returning `null` and
  producing a confusing "Cannot read properties of null (reading
  'user')" crash somewhere deep in a component that assumed auth state
  would always be there.

WHICH RESPONSIBILITY IT OWNS (Single Responsibility Principle)
  This hook owns exactly one thing: "give me the current auth context,
  or fail loudly and clearly if that's not possible." It does not fetch
  data, does not manage its own state, and does not know anything about
  HOW auth state is produced (that's AuthProvider's job). This narrow
  scope is what makes it trivially reusable — any component, anywhere in
  the tree under AuthProvider, can call `useAuth()` and get the same
  contract.

BACKEND SERVICE LAYER COMPARISON
  Reaching for `useAuth()` instead of `useContext(AuthContext)` directly
  in every component is analogous to a backend never importing a
  repository or model directly from a controller — you go through a
  well-named, intention-revealing seam (`useAuth`, like `userRepo.findByEmail`)
  instead of the raw underlying primitive, so the abstraction can be
  changed or hardened in exactly one place later.

WHY THIS IMPROVES MAINTAINABILITY
  If AuthContext's shape or provider structure ever changes (e.g.
  splitting into multiple contexts for the performance reasons discussed
  in AuthContext.jsx's docblock), every component that calls `useAuth()`
  is insulated from that change as long as this hook's return shape
  stays stable — the same "insulate callers from implementation changes"
  benefit any Facade/wrapper provides.

INTERVIEW QUESTIONS
  Q: Why not just export AuthContext and call `useContext(AuthContext)`
     everywhere it's needed?
  A: You could — this pattern is a convention, not a hard requirement.
     The benefit is the guard clause (clear error on misuse) and a
     single point of change if the underlying context implementation
     evolves.

  Q: What actually happens if `useAuth()` is called outside
     `<AuthProvider>`, without this guard?
  A: `useContext` returns whatever was passed as the context's default
     value — here, `null` (see `createContext(null)` in AuthContext.jsx)
     — so every property access on it throws a generic TypeError with no
     indication of the real cause (a missing Provider higher in the
     tree).
========================================================================
*/

import { useContext } from "react";
import { AuthContext } from "../context/AuthContext.jsx";

export function useAuth() {
  const context = useContext(AuthContext);

  if (context === null) {
    throw new Error("useAuth must be used within an <AuthProvider>");
  }

  return context;
}

/*
========================================================================
SUMMARY

React concepts used: Custom Hooks (a plain function starting with `use`
  that itself calls other hooks — here, `useContext`), the Rules of
  Hooks (this only works because `useContext` is called unconditionally
  at the top of the function).
Node.js concepts: n/a.
SOLID: SRP (a single, narrow responsibility — provide validated access
  to auth context).
Design patterns: Facade (a small, intention-revealing wrapper over a
  more general React primitive).
Interview questions: see above.
Common mistakes: calling `useContext(AuthContext)` directly in
  components across the codebase instead of standardizing on this hook,
  losing the guard-clause safety net; calling this hook conditionally
  (inside an `if`) which violates the Rules of Hooks.
Best practices: always access Context through a dedicated custom hook
  rather than exporting the raw Context object for direct consumption.
========================================================================
*/
