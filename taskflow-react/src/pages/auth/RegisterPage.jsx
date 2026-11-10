/*
========================================================================
COMPONENT: RegisterPage

RESPONSIBILITY
  Only renders the registration UI and coordinates submitting it — same
  division of concerns as LoginPage (see that file's docblock for the
  full SRP / useMutation / validation-extraction reasoning, not repeated
  here to avoid duplication).

SOLID
  ✓ Single Responsibility Principle — presentation + wiring only.

DEPENDENCIES
  useAuth (register action), React Query's useMutation, React Router's
  useNavigate/Link, shared field validators.

WHAT'S DIFFERENT FROM LoginPage (worth calling out specifically)
  Registration also confirms the password client-side (`confirmPassword`)
  purely for UX — catching a typo before a round trip, NOT a security or
  business rule. The backend never receives `confirmPassword` at all;
  it's discarded once the two fields are confirmed to match, which is
  itself a small example of "client state that has no server-side
  counterpart" (contrast with AuthContext's `user`, which mirrors real
  server data).

INTERVIEW QUESTION
  Q: Why does the mutation's `mutationFn` destructure and drop
     `confirmPassword` before calling `register(...)`, instead of just
     sending the whole form state to the API?
  A: The API's contract (name/email/password) shouldn't be dictated by
     UI-only fields — sending an extra field the backend's validator
     doesn't expect works today (express-validator only checks the
     fields it's told to) but pollutes the request payload and couples
     the UI form's shape to the API's, which is now backwards. Keeping
     this filtering here means the API contract stays exactly what the
     API needs.
========================================================================
*/

import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth.js";
import { validateName, validateEmail, validatePassword } from "../../utils/validators.js";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [form, setForm] = useState({ name: "", email: "", password: "", confirmPassword: "" });
  const [fieldErrors, setFieldErrors] = useState({});

  const registerMutation = useMutation({
    mutationFn: ({ name, email, password }) => register({ name, email, password }),
    onSuccess: () => navigate("/", { replace: true }),
  });

  function updateField(field) {
    return (event) => setForm((prev) => ({ ...prev, [field]: event.target.value }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const errors = {
      name: validateName(form.name),
      email: validateEmail(form.email),
      password: validatePassword(form.password),
      confirmPassword:
        form.password !== form.confirmPassword ? "Passwords do not match" : undefined,
    };
    setFieldErrors(errors);

    if (Object.values(errors).some(Boolean)) return;

    registerMutation.mutate(form);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm rounded-xl bg-white p-8 shadow-sm">
        <h1 className="mb-6 text-2xl font-semibold text-slate-900">Create your account</h1>

        <form onSubmit={handleSubmit} noValidate className="space-y-4">
          <Field
            id="name"
            label="Name"
            type="text"
            value={form.name}
            onChange={updateField("name")}
            error={fieldErrors.name}
            autoComplete="name"
          />
          <Field
            id="email"
            label="Email"
            type="email"
            value={form.email}
            onChange={updateField("email")}
            error={fieldErrors.email}
            autoComplete="email"
          />
          <Field
            id="password"
            label="Password"
            type="password"
            value={form.password}
            onChange={updateField("password")}
            error={fieldErrors.password}
            autoComplete="new-password"
          />
          <Field
            id="confirmPassword"
            label="Confirm password"
            type="password"
            value={form.confirmPassword}
            onChange={updateField("confirmPassword")}
            error={fieldErrors.confirmPassword}
            autoComplete="new-password"
          />

          {registerMutation.isError && (
            <p className="text-sm text-red-600">
              {registerMutation.error?.response?.data?.message ||
                "Registration failed. Try again."}
            </p>
          )}

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
          >
            {registerMutation.isPending ? "Creating account…" : "Create account"}
          </button>
        </form>

        <p className="mt-4 text-center text-sm text-slate-600">
          Already have an account?{" "}
          <Link to="/login" className="font-medium text-indigo-600 hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}

// A small reusable presentational piece local to this page. It isn't
// promoted to components/common/ yet because nothing outside this page
// needs it — premature extraction into a shared component before a
// second real consumer exists just adds indirection without payoff.
function Field({ id, label, type, value, onChange, error, autoComplete }) {
  return (
    <div>
      <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={onChange}
        autoComplete={autoComplete}
        className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
      />
      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}
    </div>
  );
}

/*
========================================================================
SUMMARY

React concepts used: controlled inputs with a single object useState
  (functional updater form `(prev) => ({...prev, [field]: value})` to
  safely merge partial updates), a small local (non-shared) presentational
  component to avoid repeating the label/input/error markup four times.
Node.js concepts: n/a.
SOLID: SRP (see above); the local `Field` component is a small example
  of Open/Closed at the markup level — new fields are added by adding a
  <Field> usage, not by modifying Field's internals.
Design patterns: same Container-ish composition as LoginPage.
Interview questions: see LoginPage.jsx for the shared useMutation/
  validation-extraction questions; this file adds: why filter
  confirmPassword out before calling the service (API contract should
  not mirror UI-only fields).
Common mistakes: sending UI-only fields (confirmPassword) to the API;
  extracting a shared component before a second real usage justifies it
  (YAGNI — Field stays local here, not moved to components/common/).
Best practices: keep client-only validation (password match) clearly
  separate from fields whose validity the server also independently
  enforces (name/email/password length, in server/src/validators/).
========================================================================
*/
