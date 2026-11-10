# hooks/

Custom hooks: reusable, named pieces of stateful logic extracted out of components (currently: `useAuth`, a guarded accessor for `AuthContext`).

**Why this folder exists:** components should read as "what does this render," not "what state machinery does this manage." Extracting logic into a custom hook (a function starting with `use` that itself calls other hooks) lets that logic be reused across multiple components/pages without copy-pasting `useContext`/`useState`/`useEffect` wiring, and lets it be reasoned about independently of any specific component's JSX.

**Why files belong here:** a file belongs here if it's a function starting with `use` that composes React's built-in hooks (or other custom hooks) into a named, reusable unit. It should own ONE clear responsibility (SRP) — `useAuth` only provides guarded access to auth context; it doesn't fetch data or manage unrelated UI state.

**How this scales:** as more cross-cutting stateful patterns emerge (`useDebounce`, `usePagination`, `useInfiniteScroll`, a `useTheme` paired with a future ThemeContext), each gets its own file here — small, independently testable, and named after what it PROVIDES rather than how it's implemented.
