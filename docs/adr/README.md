# Architecture Decision Records

An ADR records one significant decision: the context, the choice made, the alternatives rejected, and the consequences. ADRs are **append-only**: a decision that changes gets a new ADR that supersedes the old one, and the old one's status is updated; its text stays.

| ADR | Decision | Status | Date |
|---|---|---|---|
| [0001](0001-separate-python-path-service.md) | Separate Python service for path computation | Accepted | 2026-10-02 |
| [0002](0002-state-space-astar-search.md) | Model path computation as A\* search over skill sets | Accepted | 2026-10-02 |
| [0003](0003-node-costs-and-or-groups.md) | Learning cost on skills; OR-groups for alternatives | Accepted | 2026-10-02 |
| [0004](0004-jwt-with-server-side-sessions.md) | JWT with server-side session records | Accepted | 2026-10-02 |
| [0005](0005-versioned-computed-paths.md) | Versioned path documents with an active / stale / archived lifecycle | Accepted | 2026-10-02 |
| [0006](0006-single-compute-endpoint.md) | One compute endpoint returning ranked paths | Accepted | 2026-10-02 |
| [0007](0007-internal-api-key.md) | Shared-secret header between the API and the path service | Accepted | 2026-10-02 |
| [0008](0008-closure-heuristic-and-near-optimal-bound.md) | Closure heuristic, relevance pruning and a near-optimal cost bound | Accepted | 2026-10-15 |
| [0009](0009-word-prefix-skill-search.md) | Word-prefix regex search instead of a text index | Accepted | 2026-10-09 |
| [0010](0010-hand-written-openapi.md) | Hand-written OpenAPI document for the Node API | Accepted | 2026-10-09 |
| [0011](0011-explicit-collection-names.md) | Explicit collection names matching the data model | Accepted | 2026-10-15 |

## Writing a new ADR

1. Copy the template below to `NNNN-short-title.md` with the next number.
2. Keep it to one decision and about one page.
3. Add it to the table above in the same pull request as the change it describes.

```markdown
# ADR-NNNN: <decision in a few words>

- **Status:** Proposed | Accepted | Superseded by ADR-XXXX
- **Date:** YYYY-MM-DD
- **Deciders:** <members>

## Context
What problem or force makes a decision necessary?

## Decision
What we chose, stated plainly.

## Alternatives considered
Each option and why it was not chosen.

## Consequences
What becomes easier, what becomes harder, and any follow-up work.
```
