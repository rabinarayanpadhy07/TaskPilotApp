# Auth & onboarding API

Implemented in `backend/accounts` and `backend/workspaces`. All paths are relative to
`API_BASE_URL` (default `/api`, proxied to `http://localhost:8000` in development).
The full, generated reference is the OpenAPI schema at `/api/docs/` (development, or
when `API_DOCS_ENABLED=true`). Client code: `src/services/auth-service.js`,
`src/services/workspace-service.js`, `src/lib/api-client.js`.

## Session model

| Token | Lifetime | Where it lives |
| ----- | -------- | -------------- |
| Access JWT | 10 min (`JWT_ACCESS_MINUTES`) | JSON response body → JavaScript memory only. Sent as `Authorization: Bearer <access>`. |
| Refresh JWT | 14 days (`JWT_REFRESH_DAYS`) | `tp_refresh` cookie: `HttpOnly`, `SameSite=Lax`, `Secure` in production, `Path=/api/auth/`. Never visible to JavaScript. |

- **Refresh rotation**: every refresh returns a new access token and replaces the cookie;
  the previous refresh token is blacklisted. A token rotated in the last 30 seconds is
  still honoured (a reload that interrupted the response, two tabs refreshing at once);
  logout and password changes close that window.
- **"Keep me signed in"** off → the cookie is a browser-session cookie (no `Max-Age`), and
  stays one across rotations.
- **CSRF**: the cookie is only sent to `/api/auth/`, is `SameSite`, and the refresh/logout
  endpoints reject requests whose `Origin` isn't an allowed frontend origin.
- **Client**: on startup, if a non-secret "has session" hint is stored, the app calls
  refresh, then `GET /auth/me/`. A 401 on any request triggers one refresh + retry; only a
  rejected refresh (401) signs the user out. Throttling or outages keep the session.
- **Throttling**: login/register/reset-confirm 20/min, refresh 120/min, password-reset
  emails 5/hour (per client IP; configurable).

## Errors

DRF shapes, rendered automatically by the client:

| Shape | Shown as |
| ----- | -------- |
| `{"detail": "..."}` | Alert above the form |
| `{"non_field_errors": ["..."]}` | Alert above the form |
| `{"email": ["..."], "password": [...]}` | Inline under the matching field |

## Endpoints

| Method | Path | Auth | Notes |
| ------ | ---- | ---- | ----- |
| `POST` | `/auth/register/` | public | `{ full_name, email, password }` → `201 { id, email, full_name }`. Django password validators apply. Does not sign in. |
| `POST` | `/auth/login/` | public | `{ email, password, remember }` → `200 { access, user }` + refresh cookie. Wrong credentials: `401 {"detail": "Incorrect email or password."}`. |
| `POST` | `/auth/token/refresh/` | cookie | → `200 { access }` + rotated cookie. `401` (cookie cleared) when missing, expired or revoked. |
| `POST` | `/auth/logout/` | cookie | → `204`; blacklists the refresh token and clears the cookie. Works with an expired access token. |
| `GET` / `PATCH` | `/auth/me/` | bearer | `{ id, email, full_name, title }`; `full_name` and `title` are editable, `email` is not. |
| `POST` | `/auth/password/change/` | bearer | `{ current_password, new_password }` → `200 { access }` + new cookie; every other session is revoked. |
| `POST` | `/auth/password-reset/` | public | `{ email }` → `204` whether or not the account exists. Emails `FRONTEND_URL/reset-password/<uid>/<token>`. |
| `POST` | `/auth/password-reset/confirm/` | public | `{ uid, token, password }` → `204`; single-use token (expires after `PASSWORD_RESET_TIMEOUT`, default 3 h); revokes all sessions. |
| `POST` | `/workspaces/` | bearer | `{ name, slug }` → `201`; the creator becomes **Owner**. Slug: `^[a-z0-9]+(-[a-z0-9]+)*$`, 3–40 chars, unique. |
| `GET` | `/invitations/:token/` | public | Minimal details for the accept page: `{ workspace, email, role, invited_by, expires_at }`. `404` for unknown, expired, revoked or used invitations. |
| `POST` | `/invitations/:token/accept/` | bearer | The signed-in email must match the invited email (`403` otherwise). Single use. → `{ workspace }`. |

## CORS

Not needed in development (Vite proxies `/api`). When the frontend calls the API on
another origin, list that exact origin in `CORS_ALLOWED_ORIGINS` (credentials are
allowed so the refresh cookie works). App and API on one site (e.g.
`app.example.com` + `api.example.com`) keep `SameSite=Lax`; unrelated sites would need
`REFRESH_COOKIE_SAMESITE=None`, which isn't recommended.
