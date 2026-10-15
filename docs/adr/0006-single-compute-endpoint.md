# ADR-0006: One compute endpoint returning ranked paths

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Members A, B

## Context

Spec v3.0 had two path-service endpoints: API-P-1 for the shortest path and API-P-2 for alternatives. The best alternative *is* the primary path, so the same search ran twice and the two "primaries" could disagree.

## Decision

A single endpoint, **API-P-1 `POST /compute/paths`**, runs one search and returns up to `k` ranked paths (rank 1 = primary). API-P-2 is retired. The request carries the user's held skills with ranks, the role's requirements with minimum ranks, and optional `k`, `alpha`, `beta`, `useHeuristic`, `costBoundRatio` and `heuristic`. The path service, not Node, applies the held-skill rule.

## Alternatives considered

- **Keep two endpoints.** Duplicate work and possible inconsistency.
- **Apply the held-skill rule in Node and send only missing skills.** Splits algorithm logic across two services and loses the information needed for upgrades (a skill held at a lower level).

## Consequences

- ➕ One search per request; primary and alternatives are always consistent.
- ➕ The evaluation script can call the same endpoint with Dijkstra mode or other weights.
- ➖ The response is larger; the Node API stores it as one document ([ADR-0005](0005-versioned-computed-paths.md)).
