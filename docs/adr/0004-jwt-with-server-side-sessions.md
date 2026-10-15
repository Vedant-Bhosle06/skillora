# ADR-0004: JWT with server-side session records

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Members B, C

## Context

The SPA needs a simple bearer-token scheme, but logout must invalidate a token immediately (FR-20). A pure stateless JWT cannot be revoked before it expires.

## Decision

On login, issue a JWT (`JWT_SECRET`, lifetime `JWT_EXPIRES_IN`, default 7 days, random `jti`) **and** store a session document holding the SHA-256 hash of the token and its expiry. Every protected request verifies the JWT and requires the session to exist. Logout deletes the session; a TTL index removes expired sessions. Admin rights are read from `users.role` in the database on each admin request, not from the token. There is no refresh token in v1.

## Alternatives considered

- **Stateless JWT only.** No real logout; a stolen token stays valid until expiry.
- **Cookie-based server sessions.** Requires CSRF protection and cross-site cookie configuration between separately hosted frontend and API.
- **Short-lived access token + refresh token.** More secure for long sessions, but more moving parts than v1 needs.

## Consequences

- ➕ Immediate revocation on logout and on account deletion; role changes take effect without re-login.
- ➕ The token hash, not the token, is stored.
- ➖ One database lookup per authenticated request (acceptable at this scale).
- ➖ The token is held by the client; the client is responsible for storing it carefully.
- Note: the random `jti` was added after two logins in the same second produced identical tokens and collided on the unique session index.
