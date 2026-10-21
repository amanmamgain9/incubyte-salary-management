# Login

## Demo scope

One seeded HR account (`DEMO_HR_EMAIL`, `DEMO_HR_PASSWORD`), created by `npm run db:seed` with Better Auth's `hashPassword` ([data generation](data-generation.md)); show its credentials on the login page. All data is synthetic.

Signup, password reset and user administration are excluded.

## Library

[Better Auth](https://better-auth.com/docs/integrations/next) with its [Drizzle/PostgreSQL adapter](https://better-auth.com/docs/adapters/drizzle) handles password hashing, cookie sessions and login/logout at `/api/auth/[...all]`.

Generate its auth schema and commit Drizzle migrations. Enable email/password; disable public signup.

## Flow

1. Sign in with email/password through the library.
2. Library creates a PostgreSQL session and sets the browser cookie.
3. tRPC reads the current HR user from that session.
4. Logout revokes the session, clears the cookie and clears client query data.

## Security

- **Cookie-based authentication:** Browser holds the session token; server checks the PostgreSQL session on every request and rejects expired or revoked sessions. Keep [session cookie caching](https://better-auth.com/docs/concepts/session-management#cookie-cache) disabled.
- **Cookie protections:** Production cookies use `HttpOnly` (blocks JavaScript access), `Secure` (HTTPS only), `SameSite=Lax` (limits cross-site sending), host-only scope and `Path=/`.
- Use the library's password hashing: [scrypt by default](https://better-auth.com/docs/authentication/email-password#configuration).
- Retain the library's [origin and CSRF protections](https://better-auth.com/docs/reference/security); tRPC mutations also require `Origin` to equal `new URL(APP_URL).origin`.
- Keep private responses uncached; redact submitted credentials and session tokens from logs.
