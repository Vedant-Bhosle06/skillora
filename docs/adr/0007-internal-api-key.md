# ADR-0007: Shared-secret header between the API and the path service

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Members A, B

## Context

The path service is meant to be internal, but free hosting platforms give every service a public URL, so "not publicly reachable" cannot be guaranteed by network placement alone. The service must also stay callable without any user session for testing and demos (FR-15).

## Decision

Every path-service endpoint except `GET /health` requires the header `X-Internal-Key` equal to `INTERNAL_API_KEY`. The Node API and the offline scripts send it; the browser never receives it. Wrong or missing keys get `403`. The service refuses to start without the variable.

## Alternatives considered

- **Rely on a private network only.** Not available on the target free hosting tiers.
- **Mutual TLS or signed per-request tokens.** Stronger, but disproportionate for one trusted caller.
- **Forward the user's JWT.** Couples the stateless service to user sessions and breaks independent testing.

## Consequences

- ➕ Simple, works on any host, keeps the service independently callable with `curl`.
- ➖ A single static secret: it must be kept out of git, shared privately, and rotated if exposed.
- ➖ `/health` is public by design and reveals only liveness and graph size.
