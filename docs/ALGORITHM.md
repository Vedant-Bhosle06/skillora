# SKILLORA — Path-Computation Algorithm

| | |
|---|---|
| **Implemented in** | `skillora-path-service/search.py` (`prepare`, `astar_search`, `compute_paths`), `validate.py` |
| **Endpoint** | API-P-1 `POST /compute/paths` ([API.md §5](API.md#5-path-service-internal)) |
| **Status** | Current (spec v4.1) — matches the implementation |
| **Related** | [ADR-0002](adr/0002-state-space-astar-search.md) · [ADR-0003](adr/0003-node-costs-and-or-groups.md) · [ADR-0008](adr/0008-closure-heuristic-and-near-optimal-bound.md) · [D6 report](D6_Evaluation_Report.md) |

## 1. Problem

Given the skills a user holds (with proficiency ranks) and a target role's requirements, find the **cheapest set of learning steps** that meets every requirement, in an order that never places a skill before its prerequisites, and up to `k − 1` near-optimal **alternatives** that make different choices.

Shortest path between two nodes of the prerequisite graph does not solve this: a role needs several skills and prerequisites are conjunctive. The search therefore runs over **sets of skills** ([ADR-0002](adr/0002-state-space-astar-search.md)).

## 2. Inputs and definitions

- **Graph.** A `networkx.DiGraph` of `prerequisite_of` edges (corequisites excluded), loaded in memory. Each skill has `estHours` and `marketDemand`. Edges into a skill are *mandatory* (`group = null`) or belong to a named *group* ("any one of").
- **Ranks.** `beginner = 1`, `intermediate = 2`, `advanced = 3`; `held(s)` is the user's rank for skill *s* (0 if unknown).
- **Requirement.** `{ anyOf: [s₁ … sₙ], minRank }`. It is **met** if some option is held at rank ≥ `minRank`. A requirement with one option is *single-option*.
- **Known.** A skill is known (enough to act as a prerequisite) if `held(s) ≥ 1`.
- **Unlocked.** A skill can be learned once all its mandatory prerequisites are known or learned and each of its groups has at least one known or learned member. Upgrading a skill the user already knows is always unlocked.

## 3. Preparation

1. **Unmet requirements** `U`: requirements not met by held skills. If `U` is empty, return one primary path with no steps and cost 0 (§8).
2. **Target rank** `t(s)`: for an option of an unmet requirement, the highest `minRank` among the requirements it appears in; for a skill included only as a prerequisite, 1 (beginner).
3. **Relevant set** `R`: every option of every unmet requirement, plus their prerequisite ancestors, walking backwards and stopping at known skills. Only skills in `R` are ever learned.
4. **Step cost** `c(s) = estHours(s) × (t(s) − held(s)) / 2`.
5. **Must-learn set** `N`: the single-option requirements' skills plus their mandatory-prerequisite closure, stopping at known skills. Every plan must contain all of `N` (group edges are excluded because the member is a free choice).

## 4. Search

| Element | Definition |
|---|---|
| State | `L ⊆ R`, the set of skills learned so far (held skills are fixed context) |
| Start | `L = ∅` |
| Move | Add one unlocked skill `s ∈ R \ L`, at cost `c(s)` |
| Goal | Every requirement in `U` has an option in `L` |
| Cost `g(L)` | `Σ c(s)` for `s ∈ L`; it depends only on the set, never on the order |

The frontier is a binary heap ordered by `(f, −g, counter)` with `f = g + h`, so ties prefer deeper states and runs are deterministic in their exploration order. A state is recorded as seen when first pushed; this is correct here because every route to the same set has the same cost.

**Dijkstra mode** (`useHeuristic: false`) is the identical search with `h = 0`; it is the evaluation baseline.

### 4.1 Heuristics

| Name | `h(L)` | Notes |
|---|---|---|
| **closure** (default) | `Σ c(s)` for `s ∈ N \ L` | Admissible, consistent, zero at every goal; dominates `simple` |
| **simple** | `Σ c(s)` over unmet single-option requirement skills not in `L` | The original specification heuristic |

*Why closure is admissible and consistent.* Each skill of `N` not yet in `L` must still be learned in every plan, and costs are positive, so `h` never overestimates. Learning a skill of cost `c` lowers `h` by exactly `c` if the skill is in `N` and by 0 otherwise, so `h(L) ≤ c + h(L ∪ {s})`. At a goal every single-option skill and all their unknown mandatory ancestors have been learned, so `h = 0`. Both properties are also checked by brute force on fixture graphs in the test suite. Full argument: [D6 §10.1](D6_Evaluation_Report.md#10-design-refinements-beyond-the-specification).

### 4.2 Relevance pruning

A move `s` is generated only if some still-unmet requirement has an option `o` not yet learned with `s = o` or `s` an ancestor of `o` within `R`. This never removes a minimal goal (proof in [D6 §10.2](D6_Evaluation_Report.md#10-design-refinements-beyond-the-specification)), and it applies in every mode so A\* and Dijkstra are compared fairly.

## 5. Primary path and alternatives

1. Pop states in order of `f`. Because `h` is consistent, goals are popped in non-decreasing cost.
2. The first goal is the cheapest plan, cost `C*`. From then on, states with `f > costBoundRatio × C*` (default 1.5) are neither pushed nor expanded, and the search stops when the next pop exceeds the bound.
3. A goal that is a strict superset of an earlier goal is discarded: it only adds an unnecessary skill.
4. Collect up to `3k` goals, then score each:

   `compositeScore = α · (cost / maxCost) + β · (1 − marketDemandAvg)` (lower is better)

   where `maxCost` is the largest cost among the collected goals and `marketDemandAvg` is the mean `marketDemand` of the plan's skills. Defaults: `α = 0.7`, `β = 0.3`.
5. Sort by `(compositeScore, cost)` and return the top `k`; rank 1 is the primary path.

## 6. Step order, rationale and validation

- Steps are ordered with `networkx.lexicographical_topological_sort` on the prerequisite subgraph induced by the plan's skills, key `(step cost, skill name)`: the cheapest available skill comes first.
- Each step carries `fromRank`, `toRank`, `estCost` and a `rationale` sentence (why the skill is needed, which choice it represents, related corequisites).
- Every returned path is checked by `validate_order()`: each step's mandatory prerequisites, and at least one member of each group, must be held or appear earlier. A violation raises an internal error (500) rather than returning a wrong path.

## 7. Safety cap

After `MAX_STATES` expansions (default 200 000):

- if at least one goal was found, return the goals found so far with `stats.capped: true`;
- otherwise return a **greedy fallback**: for each unmet requirement the cheapest option with its prerequisite closure, unioned and ordered as in §6, with `algorithm: "greedy_fallback"` and `statesToPrimary: null`.

No evaluated case or role reaches the cap.

## 8. Edge cases

| Case | Result |
|---|---|
| Every requirement already met | One primary path, `steps: []`, cost 0, score 0 |
| Requirement references an unknown skill | 422 |
| Held skill unknown to the graph | Ignored |
| Only one non-dominated plan exists | One path returned |

## 9. Complexity and performance

The state space is the set of subsets of `R`, so the worst case is exponential in the number of independent choices. It is kept small by data rules (at most 10 requirements per role, closures of about 25 skills), relevance pruning, the cost bound and the cap. Measured on the v1 dataset: the slowest of all 18 roles from an empty profile takes 622 ms in-process, and the closure heuristic reaches the primary path with 1.6× to 61.4× fewer expansions than Dijkstra in the six evaluation scenarios ([D6 §8](D6_Evaluation_Report.md#8-search-efficiency)). Statistics reported per request: `statesExpanded`, `statesToPrimary`, `elapsedMs`, `capped`.

## 10. Worked example

Data Analyst requires Python (intermediate), SQL (intermediate), Statistics (beginner), Pandas (beginner) and one BI tool, Tableau **or** Power BI (beginner). Prerequisites: Python → Pandas, Excel → Power BI. The user holds Python at beginner and SQL at intermediate.

| Skill | `estHours` | Step | Cost (h) | `marketDemand` |
|---|---|---|---|---|
| Python | 40 | beginner → intermediate (upgrade) | 20 | 0.9 |
| SQL | 30 | already met | — | — |
| Statistics | 30 | 0 → beginner | 15 | 0.6 |
| Pandas | 25 | 0 → beginner | 12.5 | 0.7 |
| Tableau | 25 | 0 → beginner | 12.5 | 0.5 |
| Power BI | 20 | 0 → beginner | 10 | 0.8 |
| Excel | 15 | 0 → beginner (prerequisite of Power BI) | 7.5 | 0.7 |

- `h(∅)` = Python 20 + Statistics 15 + Pandas 12.5 = **47.5** (here `N` adds nothing, because Pandas's only prerequisite, Python, is already known).
- First goal: **A** = {Python, Statistics, Pandas, Tableau}, **60 h**, demand 0.675.
- Next goal: **B** = {Python, Statistics, Pandas, Excel, Power BI}, **65 h**, demand 0.74 (within 1.5 × 60).
- Ranking with `maxCost = 65`: A = 0.7 · 60/65 + 0.3 · 0.325 = **0.744**; B = 0.7 · 1 + 0.3 · 0.26 = **0.778** → A is primary. With `α = 0.4, β = 0.6` the order flips (A 0.564, B 0.556).
- A's steps: Tableau → Statistics → Python → Pandas.

The test suite and the D6 evaluation reproduce these numbers on the real dataset.

## 11. Configuration

| Setting | Default | Where |
|---|---|---|
| `k` | 3 | request |
| `alpha`, `beta` | 0.7, 0.3 | request |
| `useHeuristic` | `true` | request |
| `heuristic` | `closure` | request |
| `costBoundRatio` | 1.5 | request, or env `COST_BOUND_RATIO` |
| `MAX_STATES` | 200 000 | env |

## 12. Known issue

Repeated evaluation runs produced `marketDemandAvg` 0.588 and 0.587 for the same alternative. The likely cause is that plan totals and demand averages are summed while iterating over Python sets, whose order varies between processes (string-hash randomisation), so floating-point sums can differ in the last bits and round differently. Planned fix: sum with `math.fsum` or over sorted members so results are identical across runs.
