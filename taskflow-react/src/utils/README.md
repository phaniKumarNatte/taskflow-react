# utils/

Small, framework-agnostic pure functions used across components (currently: `validators.js`, shared form-field validation rules).

**Why this folder exists:** logic that doesn't need React at all (a validation rule, a date formatter, a currency formatter) shouldn't be tangled into a component's body — pure functions here are independently testable and reusable across any component that needs the same rule, avoiding copy-pasted/drifting duplicates.

**Why files belong here:** a file belongs here if it exports plain functions with no JSX, no hooks, and no side effects tied to the DOM or network. If a "util" starts needing `useState`/`useEffect`, it has outgrown this folder and belongs in `hooks/` instead.

**How this scales:** keep this folder small and boring on purpose (see the backend's `utils/README.md` for the same "junk drawer" warning) — group by concern (`validators.js`, `formatters.js`, `constants.js` lives in `src/constants/` instead) rather than accumulating one large catch-all file.
