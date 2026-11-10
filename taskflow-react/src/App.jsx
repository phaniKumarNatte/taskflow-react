/*
========================================================================
COMPONENT: App

RESPONSIBILITY
  Declare the app's URL -> page mapping. This is the frontend's
  equivalent of the backend's routes/index.js — the one place a new
  contributor reads to see "what pages exist and which are protected,"
  without needing to trace through every page component individually.

SOLID
  ✓ Single Responsibility Principle — this component only declares
    routes. It renders no UI of its own beyond the route tree.

DEPENDENCIES
  React Router's Routes/Route, ProtectedRoute (the auth gate), and the
  page components themselves.

BACKEND ROUTING VS. REACT ROUTER (see routes/auth.routes.js on the
  server for the fuller comparison) — this file plays the same role
  `app.use('/api', routes)` plays on the backend: a declarative map from
  URL to "what handles this," with nesting expressing which routes share
  a common guard (ProtectedRoute) the same way an Express router groups
  routes that share common middleware.

WHY /login AND /register ARE OUTSIDE ProtectedRoute, BUT / IS INSIDE
  Nesting `<Route element={<ProtectedRoute />}>` around the dashboard
  route (and future protected routes) means EVERY route nested inside it
  automatically goes through the auth-gate check — a new protected page
  is added by nesting it here, not by remembering to import and wrap it
  in a guard component individually.

INTERVIEW QUESTIONS
  Q: Why is ProtectedRoute rendered as a parent <Route element>, rather
     than wrapping <DashboardPage> directly like
     `<ProtectedRoute><DashboardPage /></ProtectedRoute>`?
  A: React Router's nested-route convention (parent route renders
     `<Outlet />` for whichever child matched) lets ONE guard component
     protect an arbitrary, growing NUMBER of child routes declared
     inside it, without ProtectedRoute needing to accept/forward a
     `children` prop per page. Wrapping each page individually would
     work for one page but doesn't scale as cleanly once there are many
     protected routes (Projects, Tasks, Settings, Admin, ...).
========================================================================
*/

import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "./routes/ProtectedRoute.jsx";
import LoginPage from "./pages/auth/LoginPage.jsx";
import RegisterPage from "./pages/auth/RegisterPage.jsx";
import DashboardPage from "./pages/DashboardPage.jsx";

function App() {
    return (
        <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />

            <Route element={<ProtectedRoute />}>
                <Route path="/" element={<DashboardPage />} />
            </Route>
        </Routes>
    );
}

export default App;

/*
========================================================================
SUMMARY

React concepts used: React Router's <Routes>/<Route> declarative
  routing, nested routes as a way to share a guard/layout across
  multiple child routes.
Node.js concepts: n/a (client-side), though see the docblock for the
  direct structural comparison to Express routing.
SOLID: SRP (routing declaration only) and Open/Closed (new protected
  pages are added by nesting a new <Route> inside the existing
  ProtectedRoute wrapper, without modifying ProtectedRoute itself).
Design patterns: Composition (nested routes compose a navigation guard
  with an open-ended set of pages).
Interview questions: see above; also "why <Routes> instead of the
  legacy <Switch>?" — <Routes> (React Router v6+) matches routes by
  best-match ranking rather than first-match-wins, and is what enables
  the nested-route/<Outlet /> model used here at all.
Common mistakes: wrapping every protected page individually in
  <ProtectedRoute> instead of nesting once; forgetting that route
  ORDER matters less in v6's <Routes> than it did in v5's <Switch> (but
  still declare more specific routes before broader catch-alls once
  wildcard routes are introduced).
Best practices: keep this file a pure route map — no data fetching, no
  business logic, just composition of already-built pieces.
========================================================================
*/
