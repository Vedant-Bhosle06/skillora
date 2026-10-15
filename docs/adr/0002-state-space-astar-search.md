# ADR-0002: Model path computation as A\* search over skill sets

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Members A, B

## Context

Spec v3.0 described the path as Dijkstra from a virtual start node to a virtual goal node over the prerequisite graph, with Yen's k-shortest paths for alternatives. That finds **one chain** reaching **one** missing skill. A role needs *all* of its missing skills and *all* of their unmet prerequisites, and prerequisites are conjunctive (Machine Learning needs Python **and** Statistics). A single shortest chain therefore does not solve the problem, and Yen's alternatives would be different single chains, not different learning plans.

## Decision

Search the **state space of skill sets**:

- a state is the set of skills learned so far (held skills are fixed context);
- a move learns one skill whose prerequisites are satisfied, at that skill's cost;
- a goal is any state that meets every role requirement.

Use **A\*** with an admissible, consistent heuristic, and keep **Dijkstra** (the same code with `h = 0`) as the evaluation baseline. Alternatives are the next-cheapest non-dominated goal states of the same search. The full algorithm is in [ALGORITHM.md](../ALGORITHM.md).

## Alternatives considered

- **Shortest path on the prerequisite graph (Dijkstra / Yen's).** Solves the wrong problem, as above.
- **Prerequisite closure plus topological sort.** Always correct and simple, but there is nothing to optimise without OR-choices, and it gives up the shortest-path formulation the objectives (O3) require.
- **Integer programming / Steiner-tree formulations.** Heavier machinery than an 80–120 node graph needs, and harder to explain.

## Consequences

- ➕ Correct by construction: a skill can only be learned once its prerequisites are met, so ordering is valid (FR-6), and it is still checked by `validate_order()`.
- ➕ A genuine weighted shortest-path search, so A\* versus Dijkstra can be measured (D6).
- ➖ Exponential in the worst case (states are subsets). Bounded in practice by relevance pruning, a near-optimal cost bound and a 200 000-state cap ([ADR-0008](0008-closure-heuristic-and-near-optimal-bound.md)).
- ➖ Requires OR-choices in the data for alternatives to exist ([ADR-0003](0003-node-costs-and-or-groups.md)).
