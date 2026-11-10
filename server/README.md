# TaskFlow API (server/)

This backend is written to double as a Node.js / Express / MongoDB / Mongoose interview-prep handbook — every file's docblock explains not just what it does, but *why it's shaped that way*, what it's an example of, and what interview questions it maps to.

## Architecture: layered, request → response

```
HTTP request
   │
   ▼
routes/            (URL + verb → middleware chain → controller)
   │
   ▼
validators/         (is this request well-formed?)
   │
   ▼
middleware/         (cross-cutting: auth, error translation, 404)
   │
   ▼
controllers/        (HTTP ⇄ domain translation — thin)
   │
   ▼
services/           (business rules — the actual logic)
   │
   ▼
repositories/       (the ONLY layer that queries Mongoose models)
   │
   ▼
models/             (Mongoose schemas — the persisted shape of data)
   │
   ▼
MongoDB
```

Each layer only ever talks to the layer directly below it. A controller never queries a model directly; a service never reads `req`/`res`. This is a deliberate application of the Dependency Inversion Principle at the architecture level — see each folder's own `README.md` for the specific reasoning, and `repositories/user.repository.js`'s docblock for the fullest treatment of *why*.

## Auth flow implemented in this slice

- Register / Login issue a short-lived **access token** (returned in the JSON body, held in memory on the frontend) and a long-lived **refresh token** (set as an `httpOnly` cookie, persisted in MongoDB so it's revocable).
- `/api/auth/refresh` rotates the refresh token on every use — the old one is revoked, a new one issued — so a stolen-and-reused token is detectable (see `services/auth.service.js`).
- `/api/auth/logout` revokes the current refresh token and clears the cookie.
- Protected routes compose `authenticate` (who are you) and `authorize(...)` (are you allowed) as independent middleware — see `middleware/README.md`.

## Running locally

```bash
cd server
npm install
cp .env.example .env   # fill in a real MONGO_URI and JWT secrets
npm run dev
```

Requires a running MongoDB instance (local `mongod`, or an Atlas connection string in `.env`).

## Why this exists as a separate app from the React client

This is a genuine two-process MERN split (`server/` for the API, the sibling Vite app for the client) rather than a monorepo-with-shared-build-step — the same shape you'd deploy in production (API on one host/container, static frontend on a CDN or another host), so the local dev setup matches the production topology instead of diverging from it.
