# ADR-0005: Versioned path documents with an active / stale / archived lifecycle

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Members A, B, C

## Context

A computed path depends on the user's skills, the target role and the dataset, all of which change. Users must be able to see their history (FR-19), the evaluation needs past results, and a failure of the path service must not leave the dashboard empty or lose progress (FR-11).

## Decision

Store each computation as a new `computed_paths` document containing the primary path **and** its ranked alternatives, with a status:

- **active** — the current result;
- **stale** — its inputs changed (profile edits, target role change, any admin graph edit) or the last recompute failed; it is still shown;
- **archived** — superseded by a newer document; kept for history.

Rules: at most one non-archived document per user; a new document is inserted only after the path service succeeds, and older ones are archived afterwards; `users.activePathId` points to the current document and `users.selectedPathRank` (reset to 1 on every recompute) selects a path inside it. Concurrent computes for one user share a single in-flight request.

## Alternatives considered

- **Overwrite one path per user.** No history; a failed recompute could destroy the last good path.
- **Recompute on every page view.** Wasted work, and nothing to show when the service is down.
- **Recompute automatically on the server when inputs change.** Fans out to many users after an admin edit; recomputing lazily on the next dashboard load is cheaper and simpler.

## Consequences

- ➕ History and evaluation data come for free; the dashboard always has something to show.
- ➕ Selecting an alternative is a cheap pointer change, not a recompute (FR-17).
- ➖ The client must recompute when it sees `404` or `stale` (`POST /api/paths/compute`); the server does not retry on its own.
- ➖ The collection grows with use; archived documents could be pruned later.
