/*
========================================================================
COMPONENT: LoginPage

RESPONSIBILITY
  Only renders the login UI and coordinates submitting it. It does NOT
  know how a login request is made (that's services/auth.service.js),
  does NOT know how the resulting session is stored (that's
  AuthContext), and does NOT contain field-validation rules (those are
  utils/validators.js).

SOLID
  ✓ Single Responsibility Principle — this component's only job is
    presenting the login form and wiring user interaction to the
    (already-extracted) auth action and validators.

DEPENDENCIES
  useAuth (the login action), React Query's useMutation (request
  lifecycle: pending/error/success), React Router's useNavigate, the
  shared field validators.

WHY THIS COMPONENT SHOULD ONLY COORDINATE UI
  If this component called Axios directly, embedded its own email regex,
  and manually tracked a `isSubmitting` boolean with useState, it would
  be doing the job of four different layers at once. Every one of those
  concerns changes for a different reason (API contract changes, UX
  copy changes, validation rule changes, request-lifecycle-handling
  changes) — bundling them into one component means a change to any one
  reason risks breaking the others. Business logic belongs elsewhere so
  this component can stay simple enough to read in one pass.

========================================================================
REACT QUERY FEATURE: useMutation

SERVER STATE VS. CLIENT STATE (the core distinction React Query exists
  to address)
  "The current user is logged in, holding accessToken X" is CLIENT
  state — it lives in the browser's memory (AuthContext), not in a
  database row you'd refetch. But the ACT of logging in is a network
  request with its own lifecycle (idle → pending → success/error) that
  React Query is built to manage cleanly via `useMutation`, even though
  the login call is a WRITE, not something React Query would cache the
  way it caches a GET (a "query").

WHY useMutation HERE INSTEAD OF USEQUERY
  `useQuery` is for reading data you want cached, deduplicated, and
  auto-refetched in the background (e.g. "the task list"). `useMutation`
  is for a one-off write triggered by a user action (submit, delete,
  update) — it deliberately does NOT auto-run on mount or auto-retry in
  the background, because firing a login/POST request without explicit
  user intent would be actively wrong.

WHAT useMutation GIVES YOU FOR FREE VS. A HAND-ROLLED useEffect
  Doing this with plain useState + useEffect would mean manually
  tracking `isSubmitting`, `error`, and guarding against a stale
  response landing after a newer request (a race condition) — React
  Query's mutation object already exposes `isPending`/`error` and
  guarantees `onSuccess`/`onError` fire for the CURRENT call, not a
  superseded one.

COMPARISON WITH REDUX / CONTEXT FOR THIS USE CASE
  Modeling "is this login request in flight" in Redux or Context would
  require hand-writing action types/reducers (Redux) or extra
  useState+useEffect plumbing (Context) that useMutation already
  provides as a small, purpose-built hook. React Query isn't a Redux
  replacement for CLIENT state (see AuthContext.jsx's docblock) — it's
  specifically strong at managing the lifecycle of server interactions.

INTERVIEW QUESTIONS
  Q: Why not skip useMutation and just call `auth.login()` inside an
     async onSubmit with a local `isSubmitting` useState?
  A: You could — for a single mutation with no shared cache concerns,
     it's a reasonable simplification. useMutation is used here
     consistently with how OTHER mutations (task creation, comments,
     etc., in later slices) are modeled, so error/pending handling stays
     uniform across the app instead of every form reinventing its own
     loading-state pattern.

  Q: This mutation's data isn't cached anywhere (login isn't a cache
     key) — is that a misuse of React Query?
  A: No — `useMutation` doesn't require a query key or caching at all;
     that's `useQuery`'s job. Mutations are just "run this async
     function, give me its lifecycle," which is exactly what's needed
     here regardless of whether the result gets cached.
========================================================================
*/

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth.js";
import { validateEmail, validatePassword } from "../../utils/validators.js";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const loginMutation = useMutation({
    mutationFn: login,
    onSuccess: () => navigate("/", { replace: true }),
  });

  function handleSubmit(event) {
    event.preventDefault();

    const errors = {
      email: validateEmail(email),
      password: validatePassword(password),
    };
    setFieldErrors(errors);

    const hasErrors = Object.values(errors).some(Boolean);
    if (hasErrors) return;

    loginMutation.mutate({ email, password });
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Sign in</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <div>
            <label htmlFor="email" className="mb-1 block text-sm font-medium text-slate-700">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              autoComplete="email"
            />
            {fieldErrors.email && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.email}</p>
            )}
          </div>

          <div>
            <label htmlFor="password" className="mb-1 block text-sm font-medium text-slate-700">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
              autoComplete="current-password"
            />
            {fieldErrors.password && (
              <p className="mt-1 text-sm text-red-600">{fieldErrors.password}</p>
            )}
          </div>

          {loginMutation.isError && (
            <p className="text-sm text-red-600">
              {loginMutation.error?.response?.data?.message || "Login failed. Try again."}
            </p>
          )}

          <button
            type="submit"
            disabled={loginMutation.isPending}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {loginMutation.isPending ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          No account?{" "}
          <Link to="/register" className="font-medium text-indigo-600 hover:underline">
            Register
          </Link>
        </p>
      </div>
    </div>
  );
}

/*
========================================================================
SUMMARY

React concepts used: controlled inputs (value + onChange, see notes.md
  for why this differs from uncontrolled/native form behavior),
  useState for local UI-only state (field values, field errors),
  React Router's <Link> (client-side navigation, no full page reload)
  and useNavigate (programmatic navigation after a successful mutation).
Node.js concepts: n/a (client-side component).
SOLID: SRP — see above.
Design patterns: Container-ish component that composes already-extracted
  concerns (hook for auth action, pure functions for validation, React
  Query for request lifecycle) rather than owning any of them itself.
Performance considerations: field-level useState here is fine at this
  scale (few fields, low-frequency parent re-renders); a form with many
  fields or frequent re-renders elsewhere in the tree might reach for a
  form library (react-hook-form) specifically to avoid re-rendering the
  whole form on every keystroke.
Interview questions: see above (useMutation vs useQuery, why extract
  validation, controlled components).
Common mistakes: validating on every keystroke instead of on submit
  (noisy UX); trusting client-side validation as a security boundary;
  calling the API directly from this component instead of through
  useAuth/the service layer.
Best practices: keep the component focused on presentation + wiring;
  delegate everything else to the layers built for it.
========================================================================
*/
