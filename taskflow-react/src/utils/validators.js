/*
========================================================================
MODULE: utils/validators.js

RESPONSIBILITY
  Pure functions that check form field values and return an error
  message (or `undefined` if valid). Used by LoginPage/RegisterPage.

WHY VALIDATION LOGIC IS EXTRACTED OUT OF COMPONENTS
  A component's job is rendering UI and responding to events — not
  encoding "what counts as a valid email." If that logic lived inline
  inside a component's `onSubmit` handler, two things get harder:
    1. Reuse — RegisterPage and LoginPage both need "is this a valid
       email"; without extraction, that regex/rule gets copy-pasted and
       can silently drift into two slightly different implementations.
    2. Testability — a pure function (`validateEmail("x") ->
       "message"`) can be tested directly with no rendering involved,
       versus needing to render a component and simulate typing to
       exercise the same logic.
  This mirrors exactly why the BACKEND extracts validation into its own
  `validators/` layer (see server/src/validators/auth.validator.js) —
  same principle, applied on the client for UX responsiveness rather
  than as the actual security boundary (the backend's validation is
  the one that can't be bypassed).

WHY THESE RETURN A MESSAGE STRING INSTEAD OF THROWING
  Form validation is an expected, routine outcome (most real user typing
  IS momentarily invalid mid-input) — not an exceptional condition.
  Returning `undefined | string` lets a component collect ALL field
  errors before deciding whether to submit, rather than short-circuiting
  submission on the first thrown exception.
========================================================================
*/

export function validateEmail(value) {
  if (!value.trim()) return "Email is required";
  const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_PATTERN.test(value)) return "Enter a valid email address";
  return undefined;
}

export function validatePassword(value) {
  if (!value) return "Password is required";
  if (value.length < 8) return "Password must be at least 8 characters";
  return undefined;
}

export function validateName(value) {
  if (!value.trim()) return "Name is required";
  return undefined;
}

/*
========================================================================
SUMMARY

React/frontend concepts: n/a directly — deliberately framework-agnostic
  pure functions, called BY components rather than containing any React.
SOLID: SRP (each function validates exactly one field's one rule set).
Design patterns: none significant — plain, composable pure functions.
Interview questions: Why should form validation return a value instead
  of throwing? Validation failures are routine/expected, not exceptional
  — see docblock. Why keep this framework-agnostic? So the exact same
  rules could be reused server-side (Node) or in a different UI
  framework without rewriting the logic.
Common mistakes: duplicating the same email/password regex inline in
  multiple components instead of sharing one source of truth; treating
  client-side validation as a security boundary (it never is — always
  re-validate on the server, see server/src/validators/).
Best practices: keep client validation focused on UX responsiveness;
  trust the server's validation as the actual gate.
========================================================================
*/
