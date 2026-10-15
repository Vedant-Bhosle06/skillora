# ADR-0008: Closure heuristic, relevance pruning and a near-optimal cost bound

- **Status:** Accepted
- **Date:** 2026-10-15 (adopted from the path-service implementation)
- **Deciders:** Member A (author), Member B

## Context

The specification's search ([ADR-0002](0002-state-space-astar-search.md)) used a heuristic summing only the unmet single-option requirements, and collected alternatives "until `3k` goals are found or the queue is empty". For the widest roles (about 26 relevant skills from an empty profile), exhausting the queue means exploring an exponential number of skill sets, and the weak heuristic gives A\* little advantage over Dijkstra before the first answer.

## Decision

1. **Closure heuristic (default).** `h(L)` = the cost of every skill that *any* plan must learn and `L` does not yet contain: the unmet single-option requirements plus their mandatory-prerequisite closure, stopping at known skills. It is admissible, consistent, zero at goals, and dominates the original heuristic, which remains available as `heuristic: "simple"`.
2. **Relevance pruning.** A move is considered only if it is, or leads to, an option of a still-unmet requirement. Every minimal goal remains reachable (proof in [D6 §10.2](../D6_Evaluation_Report.md#10-design-refinements-beyond-the-specification)).
3. **Near-optimal bound.** When the first goal is found with cost `C*`, states with `f > 1.5 × C*` are no longer explored (`COST_BOUND_RATIO`, per request `costBoundRatio`).
4. **Cap behaviour.** At 200 000 expansions the search returns the goals found so far with `stats.capped: true`; the greedy fallback is used only if none were found.
5. **`statesToPrimary`** is reported so the heuristic's effect is measurable.

## Alternatives considered

- **Keep the specification's heuristic and exhaust the queue.** Correct, but exponential on wide roles and slower to the first answer.
- **Return only the primary path.** Loses O4.

## Consequences

- ➕ All 18 roles from an empty profile finish well under the cap and under 1 s; the closure heuristic reaches the primary path with 1.6× to 61× fewer expansions than Dijkstra in the evaluation.
- ➕ Correctness is unchanged: goals still come out cheapest-first, and nothing cheaper than the bound is lost.
- ➖ Alternatives costing more than 1.5× the cheapest are never offered (in the evaluation all alternatives were within 1.08×).
- ➖ Total expansions of A\* and Dijkstra are often equal, because both explore up to the same bound; `statesToPrimary` is the meaningful efficiency measure ([D6 §8.4](../D6_Evaluation_Report.md#84-why-total-states-are-often-similar-and-what-statestoprimary-shows)).
