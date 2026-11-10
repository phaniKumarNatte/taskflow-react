/*
========================================================================
MODULE: controllers/auth.controller.js

RESPONSIBILITY
  Translate HTTP <-> domain: read `req.body`/`req.cookies`, call the
  auth service, and shape the HTTP response (status code, cookie,
  JSON body). No business rules live here — see services/auth.service.js
  for "what counts as valid credentials" and similar decisions.

REQUEST LIFECYCLE FOR, e.g., POST /api/auth/login (interview-relevant,
  trace this end-to-end):
    1. Express matches the route -> runs `loginValidator` (express-
       validator rule chains, see validators/auth.validator.js).
    2. `validateRequest` middleware checks accumulated errors; 400s if
       any exist, else calls next().
    3. THIS controller runs: reads req.body, calls
       `authService.login(...)`.
    4. The service does the actual work (repository lookups, password
       comparison, token issuance) and either returns a result or throws
       an ApiError.
    5. If it throws, `asyncHandler`'s wrapping catches the rejected
       promise and forwards to Express's error-handling chain ->
       middleware/errorHandler.js formats the final response.
    6. If it succeeds, this controller sets the refresh-token cookie and
       sends the access token + user in the JSON body.

WHY THE REFRESH TOKEN GOES IN AN HTTP-ONLY COOKIE, BUT THE ACCESS TOKEN
GOES IN THE JSON BODY
  This is a deliberate, asymmetric choice:
    - The ACCESS token is short-lived and needs to be attached to every
      API call's `Authorization` header from JavaScript, so the frontend
      keeps it in memory (see the React AuthContext) and sets the header
      itself. It is NOT put in a cookie, so it's never automatically
      resent by the browser (avoiding CSRF exposure for it).
    - The REFRESH token is long-lived and far more valuable to an
      attacker if stolen (e.g. via XSS reading `localStorage`). Storing
      it in an `httpOnly` cookie makes it INVISIBLE to any JavaScript,
      including malicious injected scripts — the browser attaches it
      automatically on requests to this API's origin, but no client-side
      code (ours or an attacker's) can ever read its value.
  This is the standard mitigation for "where do I put my JWTs" that
  balances CSRF risk (cookies) against XSS risk (localStorage) by
  putting each token where its corresponding risk is smallest.

INTERVIEW QUESTIONS
  Q: If the access token isn't in a cookie, how does CSRF protection
     work here at all?
  A: CSRF exploits the browser's *automatic* cookie attachment on
     cross-site requests. Since the access token must be manually
     attached via JS to the Authorization header, a malicious site
     can't forge that — it doesn't have access to read our token
     (same-origin policy). Only the refresh-token cookie is
     automatically sent, and it's scoped with `sameSite` to blunt
     cross-site submission (see the cookie options below).

  Q: Why does `register` also log the user in immediately (issuing
     tokens) instead of requiring a separate login call?
  A: Better UX — no reasonable security benefit is lost by skipping an
     extra round trip the user would just repeat with the same
     credentials seconds later.
========================================================================
*/

import * as authService from "../services/auth.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { isProduction } from "../config/env.js";

const REFRESH_COOKIE_NAME = "refreshToken";

const refreshCookieOptions = {
  httpOnly: true, // invisible to JavaScript — see docblock above
  secure: isProduction, // only sent over HTTPS in production
  sameSite: "strict", // never sent on cross-site requests, blunting CSRF
  path: "/api/auth", // only sent back to auth endpoints that need it
};

function sendAuthResponse(res, statusCode, { user, accessToken, refreshToken }) {
  res.cookie(REFRESH_COOKIE_NAME, refreshToken, refreshCookieOptions);
  res.status(statusCode).json({
    success: true,
    data: { user, accessToken },
  });
}

export const register = asyncHandler(async (req, res) => {
  const result = await authService.register(req.body);
  sendAuthResponse(res, 201, result);
});

export const login = asyncHandler(async (req, res) => {
  const result = await authService.login(req.body);
  sendAuthResponse(res, 200, result);
});

export const refresh = asyncHandler(async (req, res) => {
  const oldToken = req.cookies?.[REFRESH_COOKIE_NAME];
  const result = await authService.refresh(oldToken);
  sendAuthResponse(res, 200, result);
});

export const logout = asyncHandler(async (req, res) => {
  const token = req.cookies?.[REFRESH_COOKIE_NAME];
  await authService.logout(token);
  res.clearCookie(REFRESH_COOKIE_NAME, refreshCookieOptions);
  res.status(200).json({ success: true, data: null });
});

/*
========================================================================
SUMMARY

Node.js concepts: Express req/res, cookie-parser-populated req.cookies,
  res.cookie/res.clearCookie options (httpOnly, secure, sameSite, path).
SOLID: SRP — this controller only translates HTTP <-> service calls; it
  never queries the database or decides business rules.
Design patterns: this file is the "Controller" in a layered
  Controller/Service/Repository architecture — a thin adapter, not where
  logic lives.
Interview questions: see above (why asymmetric token storage, CSRF vs
  XSS tradeoffs, full request lifecycle trace).
Common mistakes: putting the refresh token in localStorage (defeats the
  entire httpOnly-cookie protection against XSS); forgetting `sameSite`
  on the cookie (opens CSRF exposure); scoping the cookie's `path` too
  broadly (sends the refresh token on every request instead of only
  auth endpoints that need it).
Best practices: keep controllers thin; let asyncHandler own async error
  forwarding so controllers never need their own try/catch.
========================================================================
*/
