# D6: Evaluation Report

- **Project:** Skillora (Skill-Gap Navigator)
- **Deliverable:** D6, evaluation report with quantified benchmarking (objective O6)
- **System evaluated:** the path service in `skillora-path-service/` (A* state-space search) running on dataset `data/v1`: 114 skills, 183 prerequisite edges, 22 corequisite edges, 11 prerequisite groups, 18 roles (see `docs/D1_Dataset_Methodology.md`).
- **Sources of all numbers:** `docs/evaluation/results.json` and `docs/evaluation/metrics-table.md` (both written by `node scripts/seed-eval.js`), and the output of `python -m tools.check_dataset --data ../data/v1` for the all-roles stress table. A figure that does not appear verbatim in those sources is simple arithmetic on them and is labelled "derived".

---

## 1. Purpose and headline results

Objective O6 asks whether the paths Skillora computes are actually sensible and efficient. The specification (O6, D6) requires at least five representative "current skills to target role" scenarios, compared against (a) a naive generic-roadmap baseline and (b) a manually reasoned advisor benchmark, with quantified deltas, plus a discussion of limitations and scaling. This report covers six scenarios, a sensitivity run on the ranking weights, and a stress run of all 18 roles from an empty profile.

Headline results:

- **Time saved versus the generic roadmap:** between 4.35% (scenario 1, complete beginner) and 47.83% (scenario 2). The arithmetic mean over the six scenarios is 24.56% (derived, from the unrounded percentages); pooled over all hours it is 272 h of 1111.5 h, or 24.47% (derived).
- **Worked example reproduced exactly:** scenario 2 (Python beginner with SQL, target Data Analyst) needs 60 h against a 115 h baseline, a saving of 47.83%. The script asserts these three values and aborts if they drift.
- **Redundant skills avoided:** 0, 1, 2, 3, 0 and 2 across scenarios 1 to 6 (8 in total, derived).
- **Prerequisite-order violations:** 0 for the system path in every scenario. The baseline, shuffled 20 times, averages between 1.05 and 8.05 violating steps per scenario.
- **Agreement with the hand-authored benchmark:** Jaccard between 0.50 and 1.00 (mean 0.78, derived); Kendall tau between 0.21 and 0.67 (mean 0.41, derived). In every scenario the benchmark's skill set is among the returned top-3 routes: rank 1 in scenarios 3 and 4, rank 2 in scenarios 1, 2, 5 and 6 (derived from `returnedPaths`).
- **Search efficiency:** the closure heuristic pops its first goal after 1.6x to 61.4x fewer expansions than Dijkstra (scenario 4: 482 versus 29607 states). Total expansions (closure versus Dijkstra) are identical in five of six scenarios, for reasons explained in section 8; scenario 4 shows a 6.5% reduction (32130 versus 34353).
- **All 18 roles from an empty profile:** none hit the 200,000-state cap, none took over one second, every role returned at least two routes. The slowest, `python-backend-developer`, took 622 ms in-process against the 2 s performance requirement.
- **Sensitivity:** moving the weights from alpha=0.7, beta=0.3 to alpha=0.4, beta=0.6 flips the ranking of the two routes in scenario 2 (the 65 h Power BI route becomes primary).

---

## 2. Method

### 2.1 System under test

The path service searches a state space whose states are sets `L` of skills learned so far. The learner's held skills are fixed context. A move learns one *unlocked* skill from the relevant set `R` (all mandatory prerequisites known or already in `L`, and at least one known member from each prerequisite group; upgrading an already-held skill is always unlocked). Step cost is `estHours x (target rank - held rank) / 2`. A goal is any state in which every role requirement is met by some option at the required rank.

Configuration used throughout this report:

| Parameter | Value |
|---|---|
| Paths returned (`k`) | 3 (search collects up to `3k` = 9 minimal goal sets) |
| Composite score | `alpha x cost/maxCost + beta x (1 - marketDemandAvg)`, lower is better; `maxCost` is the largest cost among the candidates |
| Weights | alpha = 0.7, beta = 0.3 (speed-biased default) |
| Heuristic | `closure` (default); `simple` (the specification's heuristic) and Dijkstra (`h = 0`) are run for comparison |
| Near-optimal cost bound | 1.5 x the cheapest goal cost |
| State cap | 200,000 expanded states |
| Step order | `lexicographical_topological_sort` of the induced prerequisite subgraph, key `(step cost, skill name)`: cheapest available skill first |

Heap entries are ordered `(f, -g, counter)`, so deeper states win ties and runs are deterministic. Section 10 lists where this differs from the written specification.

### 2.2 Baseline: the generic roadmap

The baseline follows the specification's description (all required skills plus all prerequisites, learned from zero, ignoring what the user already knows, in no particular order). `buildBaseline()` in `scripts/seed-eval.js` builds its skill set as a deterministic fixpoint:

1. **Start set `B`.** For every requirement of the target role take its **first `anyOf` option**, at that requirement's minimum rank (if a skill is reached twice, the higher rank is kept). In the Data Analyst role the BI requirement is `["power-bi", "tableau"]`, so the baseline always takes Power BI. Add the transitive closure of these skills under **mandatory prerequisite edges**, each at rank 1 (beginner).
2. **Resolve prerequisite OR-groups until nothing changes.** For every skill in `B` (visited in slug order) and each of its prerequisite groups (in group-name order): if any member of the group is already in `B`, the group is satisfied and nothing is added; otherwise add the member with the **lexicographically lowest slug**, chosen without regard to cost or demand, together with its own mandatory closure at rank 1. Each pass works on a slug-sorted snapshot of `B` and tests membership against the live set; skills added in a pass are visited in the next one, and the loop ends when a pass adds nothing. The rule therefore never adds a second member to a group the plan already satisfies (for example the role's own backend runtime or deep-learning framework). Corequisite edges are ignored.
3. **Cost is computed from zero**, ignoring held skills: `estHours x t / 2` per skill, where `t` is the highest rank the role requires of that skill (1 for skills included only as prerequisites).
4. The result is an unordered set; its listing order is only the order of generation. For the order-violation metric it is shuffled (section 2.4).

On scenarios 1 and 2 this yields six skills and 115 h: Python 40, SQL 30, Statistics 15, Pandas 12.5, Power BI 10, Excel 7.5. Four prerequisite groups occur in the six baselines, and in each case the start set already satisfies the group, so the alphabetical fallback is never used in these scenarios (derived from `baselinePath` and `data/v1/edges.json`): TensorFlow, the role's first framework option, satisfies Deep Learning's `dl-framework` group (scenario 3), pandas, a mandatory prerequisite of scikit-learn, satisfies Feature Engineering's `ml-data-lib` group (scenario 3), Express satisfies Authentication's `backend-runtime` group (scenario 4) and AWS, the first cloud option, satisfies Terraform's `iac-cloud` group (scenario 5). Every baseline therefore contains exactly one member of each group present: scenario 3 has 15 skills and 273.5 h, scenario 4 has 19 skills and 232 h, scenario 5 has 16 skills and 171 h. Section 5.2 shows how much a cruder rule would change scenarios 3 and 4.

### 2.3 Expert benchmark paths

Each scenario has one **hand-authored benchmark path representing a human advisor's recommendation**: an ordered list of skill slugs hard-coded in `scripts/seed-eval.js`, together with a short written rationale (for example, "analysts live in SQL first, so start there"). The benchmark is a single path per scenario; there is no panel of advisors and no inter-rater agreement measurement (see limitations).

### 2.4 Metric definitions

| Metric | Definition |
|---|---|
| `timeSavedPct` | `(baseline hours - system hours) / baseline hours x 100`, rounded to 2 decimals. System hours is the cost of the rank-1 path. |
| `redundantSkillsAvoided` | Number of baseline skills the learner already holds at sufficient proficiency: held rank >= required rank for a required skill, held rank >= 1 for a prerequisite-only skill. |
| `systemOrderViolations` | Number of steps flagged by `validate_order()` on the rank-1 path, using the learner's held skills. A step is flagged when a mandatory prerequisite is neither held (rank >= 1) nor at an earlier position, or a prerequisite group has no known member. Evaluated through `POST /graph/validate-order`. |
| `baselineOrderViolations` | Mean flagged steps over **20 random shuffles** of the baseline list, validated with **no held skills**. Shuffles use Fisher-Yates driven by the mulberry32 PRNG with a **per-scenario seed**, `42 + scenarioIndex` with the index counted from 0 (seeds 42, 43, 44, 45, 46 and 47 for scenarios 1 to 6), so every scenario's 20 shuffles are an independent sample, including scenarios 1 and 2, which share a baseline list. |
| `expertJaccard` | `abs(S intersect E) / abs(S union E)` on the sets of skills in the system path `S` and the benchmark path `E`. |
| `expertKendallTau` | Over the `n` skills present in both lists: `tau = (C - D) / (n(n-1)/2)`, where `C` is the number of skill pairs in the same relative order in both lists and `D` the number in opposite order. Undefined (`null`) if `n < 2`. |
| `statesExpanded` | Number of non-goal states popped from the queue and expanded. |
| `statesToPrimary` | Value of `statesExpanded` at the moment the first goal is popped, i.e. the work needed before the primary path is known. |

Search efficiency is measured by calling `POST /compute/paths` three times per scenario with identical inputs: closure heuristic, `heuristic: "simple"`, and `useHeuristic: false` (Dijkstra).

### 2.5 Reproducibility

```
node scripts/seed.js                       # load data/v1 into MongoDB (idempotent)
cd skillora-path-service
uvicorn main:app --port 5001               # start the path service (virtual environment active)
cd ..
node scripts/seed-eval.js                  # run scenarios, upsert evaluation_scenarios (DB-6),
                                           # write docs/evaluation/results.json and metrics-table.md
cd skillora-path-service
.venv/bin/python -m tools.check_dataset --data ../data/v1     # all-roles stress table (section 8.5)
```

Credentials (the database address and the shared internal API key) are read from the `.env` files of `skillora-api/` and the path service and are deliberately not reproduced here. Every figure except the `elapsedMs` timings is deterministic: fixed per-scenario shuffle seeds, sorted move generation and a counter in the heap key. Timings come from single runs on a development machine and should be read as orders of magnitude.

---

## 3. Scenarios

| # | Scenario | Held skills (proficiency) | Target role | Requirements (OR-choices) |
|---|---|---|---|---|
| 1 | Complete beginner to Data Analyst | none | `data-analyst` | 5 (1) |
| 2 | Python beginner with SQL to Data Analyst | python (beginner), sql (intermediate) | `data-analyst` | 5 (1) |
| 3 | Python and stats to Machine Learning Engineer | python (intermediate), statistics (beginner) | `machine-learning-engineer` | 9 (1) |
| 4 | Frontend basics to Full-Stack MERN Developer | html (intermediate), css (intermediate), javascript (beginner) | `full-stack-mern-developer` | 10 (1) |
| 5 | Linux and Git basics to DevOps Engineer | linux (beginner), git (beginner) | `devops-engineer` | 10 (2) |
| 6 | Analyst with strong SQL to Data Engineer | python (intermediate), sql (advanced), excel (advanced) | `data-engineer` | 10 (1) |

The set was chosen to vary what is being tested: an empty profile (1), the specification's worked example (2), a deep prerequisite chain with a framework choice (3), a wide web stack with a CSS-framework choice (4), a role whose requirements exceed the learner's level (5), and a career switch with heavy overlap (6).

---

## 4. Results

### 4.1 Quality metrics

Parameters: k=3, alpha=0.7, beta=0.3; baseline violations are means over 20 seeded shuffles.

| # | Scenario | System h | Baseline h | Time saved % | Redundant avoided | Sys violations | Baseline violations | Expert Jaccard | Expert Kendall tau |
|---|---|---|---|---|---|---|---|---|---|
| 1 | S1 Complete beginner to Data Analyst | 110 | 115 | 4.35 | 0 | 0 | 1.2 | 0.57 | 0.67 |
| 2 | S2 Python beginner with SQL to Data Analyst | 60 | 115 | 47.83 | 1 | 0 | 1.05 | 0.5 | 0.33 |
| 3 | S3 Python and stats to Machine Learning Engineer | 218.5 | 273.5 | 20.11 | 2 | 0 | 5.5 | 1 | 0.36 |
| 4 | S4 Frontend basics to Full-Stack MERN Developer | 178.5 | 232 | 23.06 | 3 | 0 | 8.05 | 1 | 0.25 |
| 5 | S5 Linux and Git basics to DevOps Engineer | 155 | 171 | 9.36 | 0 | 0 | 6.5 | 0.82 | 0.21 |
| 6 | S6 Analyst with strong SQL to Data Engineer | 117.5 | 205 | 42.68 | 2 | 0 | 3.85 | 0.78 | 0.62 |

### 4.2 Per-scenario commentary

- **S1 (110 h, 5 skills, 2 routes returned).** Primary: Tableau, Statistics, SQL, Python, Pandas. The learner holds nothing, so nothing can be skipped; the whole saving comes from choosing Tableau (12.5 h) instead of the baseline's Excel plus Power BI (17.5 h). The 115 h rank-2 route is exactly the baseline's skill set.
- **S2 (60 h, 4 skills, 2 routes).** The worked example. SQL is already held at the required level and is dropped; Python is an upgrade from beginner to intermediate (20 h) rather than a full 40 h. Rank 2 (65 h) takes Excel and Power BI instead of Tableau.
- **S3 (218.5 h, 13 skills, 2 routes).** Python and Statistics are dropped. The two routes cost the same (218.5 h) and differ only in the deep-learning framework (PyTorch primary, TensorFlow alternative; the primary wins on average demand 0.535 versus 0.527). The route is long (Git, NumPy, Linux, Docker, Calculus, Linear Algebra, Pandas, then the ML core). The baseline is 15 skills and 273.5 h, with TensorFlow as its only framework; the 55 h saved (20.11%) is exactly the held Python (40 h) and Statistics (15 h).
- **S4 (178.5 h, 16 skills, 2 routes).** The largest search (32130 states) and a long chain from HTML/CSS/JavaScript through Node, Express, MongoDB and authentication. Rank 2 (179.5 h) swaps Bootstrap for Tailwind, one hour more. The baseline is 19 skills and 232 h (Express already satisfies the authentication skill's backend-runtime group, so no second runtime is added); the 53.5 h saved (23.06%) is the held HTML, CSS and JavaScript (52.5 h) plus the 1 h Bootstrap-for-Tailwind choice.
- **S5 (155 h, 15 skills, 3 routes).** The learner holds Linux and Git only at beginner level, while the role needs intermediate, so both are upgrades and none of the baseline is "redundant" (0 avoided). The routes are Jenkins with AWS (155 h), GitHub Actions with AWS (156 h) and Jenkins with Azure (155 h, lower average demand).
- **S6 (117.5 h, 8 skills, 2 routes).** Python and SQL are already held at or above the required level, so 85 h of the baseline disappears immediately. Primary picks BigQuery; rank 2 (120 h) picks Snowflake.

---

## 5. Time saved

### 5.1 The worked example (scenario 2)

The specification's example is a learner who knows Python at beginner level and SQL at intermediate level and targets Data Analyst. The generic roadmap costs 115 h from zero. The system plan costs 60 h:

| Skill | Baseline cost (h) | System cost (h) | Why it differs |
|---|---|---|---|
| Python (required: intermediate) | 40 | 20 | Upgrade from beginner, half the zero-to-intermediate effort |
| SQL (required: intermediate) | 30 | 0 | Already held at the required level (the one redundant skill) |
| Statistics (beginner) | 15 | 15 | Not held |
| Pandas (beginner) | 12.5 | 12.5 | Not held; Python is known so it is unlocked |
| BI tool | Power BI 10 + Excel 7.5 = 17.5 | Tableau 12.5 | Tableau is a root skill, so its route is 5 h cheaper |
| **Total** | **115** | **60** | **(115 - 60) / 115 = 47.83%** |

The alternative route (Excel, Power BI, then the same remaining skills) costs 65 h with average demand 0.74, against 60 h and 0.675 for the primary.

### 5.2 Where the saved hours come from (derived)

The baseline construction and the cost model allow each scenario's saving to be attributed. The table is derived by hand from `baselinePath`, the held skills and `estHours` in `data/v1`; it sums to the saved hours in section 4.1.

| # | Saved (h) | From held skills | From a cheaper OR-choice |
|---|---|---|---|
| 1 | 5 | 0 | 5 (Tableau 12.5 versus Excel + Power BI 17.5) |
| 2 | 55 | 50 (SQL 30, Python upgrade credit 20) | 5 (same Tableau saving) |
| 3 | 55 | 55 (Python 40, Statistics 15) | 0 |
| 4 | 53.5 | 52.5 (HTML 7.5, CSS 25, JavaScript 20) | 1 (Bootstrap 5 versus Tailwind 6) |
| 5 | 16 | 15 (Linux 10, Git 5 upgrade credit) | 1 (Jenkins 15 versus GitHub Actions 12 plus GitHub Collaboration 4) |
| 6 | 87.5 | 85 (Python 40, SQL 45) | 2.5 (BigQuery 7.5 versus Snowflake 10) |

With the baseline rule of section 2.2 every saved hour in the six scenarios is one of these two kinds: a skill the learner already holds, or a cheaper alternative inside an OR-requirement. The baseline never contains two members of the same OR-group. How the rule resolves groups is a modelling choice, though, and it matters in two scenarios. Had every group been resolved by its lowest slug regardless of the rest of the plan, the baseline would also include PyTorch (15 h) in scenario 3, next to TensorFlow, and Django (17.5 h) and Python (20 h) in scenario 4, next to Express. Baseline hours would be 288.5 and 269.5 and the savings 24.26% and 33.77% instead of 20.11% and 23.06% (derived, illustrative; not produced by the script). A human reading the role would not learn both frameworks or two backend runtimes, so the rule used here is the fairer comparison; scenarios 1, 2, 5 and 6 are unaffected by the choice.

### 5.3 Why scenario 1 saves little, and why it is not zero

A complete beginner has nothing to reuse, so every skill the role requires must be learned and the optimal plan is close to the baseline: 110 h against 115 h, 4.35%. This is effectively the floor of the metric. It is non-zero only because the baseline fixes the BI choice by the order in the role file (Power BI first, which also drags in Excel), whereas the system compares the two routes and finds Tableau 5 h cheaper. Time saved cannot be negative by construction: the baseline is itself a feasible plan, held skills can only lower costs, and the search returns a minimum-cost plan. The metric therefore measures personalisation (skills already held) plus optimisation of OR-choices; for a user with an empty profile only the second source exists.

---

## 6. Prerequisite-order correctness

| # | System violations | Baseline violations (mean of 20 shuffles) | Baseline range over the 20 shuffles |
|---|---|---|---|
| 1 | 0 | 1.2 | 0 to 2 |
| 2 | 0 | 1.05 | 0 to 2 |
| 3 | 0 | 5.5 | 3 to 8 |
| 4 | 0 | 8.05 | 4 to 11 |
| 5 | 0 | 6.5 | 4 to 9 |
| 6 | 0 | 3.85 | 1 to 6 |

The system's order is correct in every scenario; an unordered roadmap read in arbitrary order puts, on average, between 1.05 and 8.05 steps before something they depend on. The count grows with the number of prerequisite relations inside the baseline (derived from `data/v1/edges.json`: 22 relations in scenario 4, 19 in scenario 5, 18 in scenario 3, 11 in scenario 6 and 2 in each Data Analyst baseline; scenario 4, 19 skills, is worst).

Two honest remarks. First, zero is guaranteed by construction rather than discovered empirically: the order comes from a topological sort of the prerequisite subgraph, and the service re-validates every path with `validate_order()` before returning it (a violation would be reported as a server error). The system column is a regression check; the informative column is the baseline. Second, violations are measured against the same prerequisite graph the search optimises over, so this metric verifies consistency with the dataset, not agreement with an external curriculum. Scenarios 1 and 2 share the same baseline list but are shuffled with different seeds (42 and 43), so their samples are independent; the gap between their means (1.2 and 1.05) is sampling noise from 20 shuffles of the same list, which also indicates the size of noise to expect in the other means.

---

## 7. Agreement with the hand-authored benchmark

| # | System skills | Benchmark skills | Shared | Jaccard | Kendall tau | Only in system | Only in benchmark |
|---|---|---|---|---|---|---|---|
| 1 | 5 | 6 | 4 | 0.57 | 0.67 | tableau | excel, power-bi |
| 2 | 4 | 5 | 3 | 0.50 | 0.33 | tableau | excel, power-bi |
| 3 | 13 | 13 | 13 | 1.00 | 0.36 | none | none |
| 4 | 16 | 16 | 16 | 1.00 | 0.25 | none | none |
| 5 | 15 | 16 | 14 | 0.82 | 0.21 | jenkins | github-collaboration, github-actions |
| 6 | 8 | 8 | 7 | 0.78 | 0.62 | bigquery | snowflake |

(Counts of skills, shared skills and the "only in" columns are derived from `paths` in `results.json`.)

### 7.1 Set agreement: the OR-choices

Where the sets differ, the difference is always a single OR-choice resolved the other way:

- **Tableau versus Power BI (scenarios 1 and 2).** The benchmark recommends Excel then Power BI, reasoning that Power BI has cheaper licensing and more job advertisements. The system prefers Tableau because the route is 5 h cheaper and speed carries weight 0.7. This is precisely the trade-off the composite score parameterises: with alpha=0.4, beta=0.6 the system's own primary becomes the benchmark's route (section 9).
- **BigQuery versus Snowflake (scenario 6).** The benchmark names Snowflake as the warehouse employers mention most; the system picks BigQuery, 2.5 h cheaper (7.5 h versus 10 h) with a slightly lower demand value in the dataset (0.3 versus 0.35).
- **Jenkins versus GitHub Actions (scenario 5).** The benchmark picks GitHub Actions, natural next to Git, which needs GitHub Collaboration first. The system picks Jenkins at 155 h; the GitHub Actions route is 156 h. A one-hour gap is well inside the uncertainty of the hour estimates, and the composite scores are 0.819 and 0.82. This is a near-tie, not a disagreement of substance.

In each of scenarios 1, 2, 5 and 6 the benchmark's skill set is exactly the system's rank-2 alternative, and in scenarios 3 and 4 it is the rank-1 path. The system therefore surfaces the benchmark's choice every time, which is the behaviour objective O4 asks for. Jaccard is also coarse for small sets: a single OR-choice that swaps one skill for two (Tableau for Excel plus Power BI) takes it from 1.00 to 0.50 in scenario 2.

### 7.2 Order agreement: cost-first versus pedagogical ordering

Kendall tau is low for scenarios 3 to 5 (0.36, 0.25, 0.21) even though the system's order has no violations. The cause is the ordering policy, not an error. Among the skills currently available, the system always schedules the cheapest first, which puts cheap, peripheral skills early. The benchmark orders by what a person would learn next on a theme. Examples from `results.json`:

- Scenario 3: Linux and Docker are 3rd and 4th in the system path but 11th and 12th in the benchmark (deployment tooling comes last, after the ML core).
- Scenario 4: JSON/YAML is 1st versus 11th, Bootstrap 3rd versus 16th, and React 16th versus 5th (the system defers the most expensive skill, 40 h; the benchmark builds on the learner's frontend background first).
- Scenario 5: Linux is 7th versus 1st (it is an upgrade costing 10 h, so it is not the cheapest move), while Agile/Scrum is 2nd versus 8th and Docker and Kubernetes are 14th and 15th versus 6th and 7th.
- Scenario 6 differs in one place only (PySpark 3rd versus 8th) and has tau 0.62. Scenario 1 differs in one pair (SQL after Statistics).

Two caveats apply to reading tau. With few shared skills it is coarse (scenario 2, n = 3, can only take steps of one third). And with many independent branches there are many valid orders, so any one hand-authored order will disagree with most of them; no null model (for example, tau between random valid orders and the benchmark) was computed, so the values cannot yet be called good or bad in absolute terms.

**Suggested improvement: pedagogical tie-breaking.** The order affects neither the skill set, the total cost nor the zero-violation guarantee, so it can be changed freely. Replace the key `(step cost, name)` with a pedagogical key, for example: prefer skills that unlock the most dependants (foundations first), keep skills of the same category contiguous, and defer cheap tooling skills until their dependants are close. The new key should be tuned on scenarios held out from the six used here and validated with more than one advisor; with n = 6 and a single benchmark path per scenario it would otherwise overfit.

---

## 8. Search efficiency

### 8.1 Variants compared

- **A* closure** (service default): `h(L)` is the summed cost of skills in `N` not yet learned, where `N` is the closure of the single-option unmet requirements' skills under mandatory prerequisite edges.
- **A* simple** (the heuristic written in specification v4.0 §4.3): `h(L)` is the summed cost of the single-option unmet requirements' skills not yet learned.
- **Dijkstra**: the same code with `h = 0`.

All three share relevance pruning, the cost bound and the cap, so the comparison isolates the heuristic. Both heuristics are checked for admissibility, consistency and zero value at goals on the fixture graphs (`test_heuristics_admissible_consistent_and_zero_at_goal`), and `test_real_dataset_modes_agree` checks that the three modes return identical goal sets and costs on four real roles.

### 8.2 The six scenarios

States to primary / total states expanded.

| # | A* closure (to primary / total) | A* simple (to primary / total) | Dijkstra (to primary / total) | Dijkstra / closure, to primary |
|---|---|---|---|---|
| 1 | 24 / 57 | 24 / 57 | 57 / 57 | 2.4x |
| 2 | 16 / 37 | 16 / 37 | 37 / 37 | 2.3x |
| 3 | 433 / 2823 | 1147 / 2823 | 2616 / 2823 | 6.0x |
| 4 | 482 / 32130 | 2846 / 33298 | 29607 / 34353 | 61.4x |
| 5 | 6656 / 16763 | 8192 / 16763 | 16285 / 16763 | 2.4x |
| 6 | 72 / 118 | 72 / 118 | 118 / 118 | 1.6x |

(The last column is derived.) Single-run `elapsedMs` for closure, simple and Dijkstra: scenario 1: 1.6, 0.9, 0.8; scenario 2: 0.5, 0.4, 0.4; scenario 3: 20.9, 17.6, 17.7; scenario 4: 275.2, 301.0, 290.3; scenario 5: 120.7, 121.2, 115.3; scenario 6: 0.8, 0.7, 0.7. Differences of a few milliseconds are noise (timings vary between runs, unlike the state counts); the longest closure run, scenario 4, is 275.2 ms.

### 8.3 How strong is each heuristic? (derived, supplementary)

The value of `h` at the empty state, compared with the optimal cost found. Computed with the service's own `prepare()` on `data/v1`; not stored in `results.json`.

| # | Optimal cost (h) | h simple | h closure | Simple as % of optimum | Closure as % of optimum |
|---|---|---|---|---|---|
| 1 | 110 | 97.5 | 97.5 | 88.6 | 88.6 |
| 2 | 60 | 47.5 | 47.5 | 79.2 | 79.2 |
| 3 | 218.5 | 133.5 | 188.5 | 61.1 | 86.3 |
| 4 | 178.5 | 136 | 173.5 | 76.2 | 97.2 |
| 5 | 155 | 95 | 114 | 61.3 | 73.5 |
| 6 | 117.5 | 110 | 110 | 93.6 | 93.6 |

The two heuristics coincide when every unknown mandatory prerequisite of a single-option requirement is itself a single-option requirement (scenarios 1, 2 and 6; in the stress table `data-analyst`, `bi-analyst`, `data-engineer`, `analytics-engineer` and `frontend-developer`). The closure adds value exactly where single-option skills sit on top of prerequisites that the role does not list: `N` has 12 skills against 7 single-option skills in scenario 3, 15 against 8 in scenario 4 and 12 against 8 in scenario 5 (derived). In scenario 4 the closure heuristic recovers 97.2% of the optimal cost at the start state.

### 8.4 Why total states are often similar, and what statesToPrimary shows

The two numbers measure different phases of the search.

1. **Before the first goal is popped,** no bound exists. Up to ties, A* expands only states with `f <= C*` (the optimal cost) and Dijkstra every state with `g <= C*`. A tighter heuristic shrinks this phase, which is what `statesToPrimary` records and why it differs so much between variants (scenario 4: 482, 2846 and 29607).
2. **After the first goal is popped,** the service keeps searching to collect alternatives and expands every reachable state with `f <= 1.5 x C*` until it has 9 goal sets or the queue is empty. Every order-valid prefix `L` of any goal `G` costing at most the bound satisfies `f(L) = g(L) + h(L) <= cost(G)` for *any* admissible `h`, including `h = 0`. Unless the nine-goal stop is reached first, all three variants therefore expand all of these states, whatever the heuristic. Their number grows combinatorially with the number of independent skills in the near-optimal routes (any subset of independent skills is a distinct state), and it makes up most of the total in scenarios 3 to 5 (the closure run spends only 15%, 1.5% and 40% of its expansions before the first goal in scenarios 3, 4 and 5; derived). A stronger heuristic can only prune states outside that region, hence the 6.5% saving in scenario 4 and none elsewhere.
3. **Small cases are explored completely by every variant.** In scenarios 1, 2 and 6 the whole bounded region has only 37 to 118 states. Dijkstra expands all of them before its first goal is popped (57 / 57, 37 / 37, 118 / 118), which is why its two columns coincide there. In the all-roles table below, closure and Dijkstra totals are equal for 15 of 18 roles.

Practical reading: `statesToPrimary` is the meaningful measure of the heuristic's value and of the time to the first answer. The total reflects the policy for generating alternatives. The specification's metric ("states expanded, A* versus Dijkstra") holds in the weak sense in all six scenarios (A* total <= Dijkstra total) and in the strict sense only in scenario 4.

### 8.5 All 18 roles from an empty profile (stress test)

Output of `python -m tools.check_dataset --data ../data/v1`. Dataset header line: nodes = 114, prerequisite edges = 183, corequisite edges = 22, groups = 11, acyclic = true, orphans = 0. Columns are states to primary / total; "ms" is the in-process time of the closure run (a single measurement). An empty profile gives a clean, comparable workload per role, but it is not always the heaviest: scenario 5 (DevOps with beginner Linux and Git) expands 16763 closure states against 4782 for `devops-engineer` from nothing, presumably because a held skill below the target level is an upgrade that is always unlocked and so widens the frontier.

| Role | Paths | A* closure | A* simple | Dijkstra | ms | Capped |
|---|---|---|---|---|---|---|
| data-analyst | 2 | 24 / 57 | 24 / 57 | 57 / 57 | 0 | no |
| bi-analyst | 2 | 13 / 154 | 13 / 154 | 123 / 167 | 1 | no |
| data-scientist | 3 | 59 / 345 | 193 / 345 | 345 / 345 | 2 | no |
| machine-learning-engineer | 2 | 721 / 3639 | 1819 / 3639 | 3432 / 3639 | 26 | no |
| data-engineer | 2 | 92 / 146 | 92 / 146 | 146 / 146 | 1 | no |
| analytics-engineer | 2 | 17 / 37 | 17 / 37 | 36 / 37 | 0 | no |
| ai-nlp-engineer | 2 | 378 / 1003 | 785 / 1003 | 993 / 1003 | 7 | no |
| mlops-engineer | 3 | 4283 / 4844 | 4733 / 4844 | 4844 / 4844 | 39 | no |
| frontend-developer | 3 | 380 / 686 | 380 / 686 | 608 / 686 | 4 | no |
| backend-developer-node | 2 | 472 / 22237 | 1670 / 22993 | 17164 / 23883 | 191 | no |
| python-backend-developer | 3 | 3384 / 67214 | 5300 / 70054 | 30135 / 85099 | 622 | no |
| full-stack-mern-developer | 2 | 1030 / 48308 | 5150 / 48308 | 43003 / 48308 | 457 | no |
| java-backend-developer | 2 | 1152 / 9852 | 2262 / 9852 | 9663 / 9852 | 77 | no |
| devops-engineer | 3 | 2031 / 4782 | 2481 / 4782 | 4589 / 4782 | 34 | no |
| cloud-engineer | 3 | 63 / 475 | 100 / 475 | 347 / 475 | 3 | no |
| site-reliability-engineer | 2 | 148 / 637 | 258 / 637 | 613 / 637 | 4 | no |
| platform-kubernetes-engineer | 3 | 2939 / 6954 | 3695 / 6954 | 6640 / 6954 | 54 | no |
| ui-developer | 2 | 33 / 79 | 49 / 79 | 79 / 79 | 1 | no |

The tool raised no flags (no capped role, none over one second, none with a single route) and reproduced the worked example on the real data (costs 60 and 65 for the top two routes, status OK). Derived summaries:

- **States to primary:** the closure heuristic needs fewer than Dijkstra in all 18 roles, with a per-role ratio from 1.1x to 41.8x and a median of 3.4x (summed over roles: 17219 closure, 29021 simple, 122817 Dijkstra). It beats the specification's simple heuristic strictly in 13 roles and ties in 5.
- **Total states:** closure and Dijkstra are equal in 15 roles; the three roles that differ are `bi-analyst` (154 versus 167), `backend-developer-node` (22237 versus 23883) and `python-backend-developer` (67214 versus 85099).
- **Latency against the performance requirement:** the specification requires path computation in under 2 s server-side for graphs of this size, across the Node-to-Python round trip. The slowest role is `python-backend-developer` at 622 ms, then `full-stack-mern-developer` at 457 ms and `backend-developer-node` at 191 ms; every other role takes 77 ms or less. The in-process timing excludes HTTP and Node overhead, but roughly 1.4 s of headroom remains for it (derived). Among the six scenario runs (which include held skills) the slowest closure run is scenario 4 at 275.2 ms.
- **Distance from the cap:** the largest single run is 85,099 states (Dijkstra, `python-backend-developer`), about 43% of the 200,000-state cap. The closure run for that role uses 67,214 (about 34%).

---

## 9. Sensitivity to the ranking weights

Scenario 2, same two candidate routes, different weights:

| alpha / beta | Rank | Type | Hours | Avg demand | Score | Steps |
|---|---|---|---|---|---|---|
| 0.7 / 0.3 | 1 | primary | 60 | 0.675 | 0.744 | tableau > statistics > python > pandas |
| 0.7 / 0.3 | 2 | alternative | 65 | 0.74 | 0.778 | excel > power-bi > statistics > python > pandas |
| 0.4 / 0.6 | 1 | primary | 65 | 0.74 | 0.556 | excel > power-bi > statistics > python > pandas |
| 0.4 / 0.6 | 2 | alternative | 60 | 0.675 | 0.564 | tableau > statistics > python > pandas |

The ranking flips (`rankingChanged: true`). The set of routes is unchanged, only their order, consistent with the weights acting as a user-facing preference between speed and market relevance without affecting which routes are found (one scenario, so illustrative). The margin at alpha=0.4 is thin (0.556 versus 0.564). With `beta = 1 - alpha` the two scores are equal at alpha of about 0.46 (derived: the score difference is `0.065 - 0.1419 alpha`), so Tableau stays primary for alpha above about 0.46 and the Power BI route becomes primary below it. This matches the Power BI preference in the hand-authored benchmark (section 7.1).

---

## 10. Design refinements beyond the specification

The implementation departs from the written algorithm (specification v4.0 §4.3) in the following ways. Each is deliberate; none changes the problem being solved. Since v4.1 these refinements are part of the specification itself ([ALGORITHM.md](ALGORITHM.md), [ADR-0008](adr/0008-closure-heuristic-and-near-optimal-bound.md)).

**10.1 Closure heuristic (default).** The specification's `h` sums the costs of unmet single-option requirements. The service adds their mandatory prerequisites: `N` is the closure of those skills under mandatory prerequisite edges, stopping at known skills, and `h(L)` is the summed cost of `N` minus `L`. The simple heuristic remains selectable (`heuristic: "simple"`) and is used for the comparison above. *Admissible:* in any plan, each skill of `N` not yet learned must be learned, because a single-option requirement can be met only by its one option, and an unknown mandatory prerequisite of a learned skill must precede it (a skill is unlocked only when all its mandatory prerequisites are known or learned); costs are positive and each skill is learned once, so `h` never overestimates. Group edges are excluded because the choice of member is free. *Consistent:* a move learns one skill at cost `c`; if that skill is in `N`, `h` falls by exactly `c`, otherwise it is unchanged, so `h(L) <= c + h(L + s)`. *Zero at goals:* a goal contains every single-option skill and, being reachable, all their mandatory ancestors that are not already known (known skills are excluded from `N`), so `N` minus `L` is empty. Because `N` contains the simple heuristic's set, the closure heuristic dominates it pointwise. Admissibility, consistency and zero-at-goal are checked against exhaustively computed optimal remaining costs on the fixture graphs.

**10.2 Relevance pruning.** A move `s` is considered only if some still-unmet requirement has an option `o` not yet learned such that `s = o` or `s` is an ancestor of `o` within `R`. *Safety:* take any minimal goal set `G` (no proper subset is a goal) and a valid learning order of it. The last skill in that order must be the only member of `G` meeting some requirement (otherwise it could be removed); each earlier skill is either such a witness or a prerequisite of a later skill of `G` (otherwise it could be removed). By induction from the end, at the moment each skill is learned it is, or leads to, an option of a requirement that is still unmet, so it passes the filter. Hence every minimal goal remains reachable. Non-minimal goals are discarded anyway as supersets, so the set of returned goals is unchanged. The pruning applies in every mode, so the A* versus Dijkstra comparison stays fair, and `test_pruning_does_not_change_goals` checks equal goal sets with pruning on and off.

**10.3 Near-optimal cost bound (1.5 x optimum).** The specification says to keep popping until `3k` goals are found "or the queue is empty". When a role offers fewer than nine distinct minimal routes (only scenario 5 returned the full three routes), "queue empty" means exhausting every reachable subset of `R`, which for the widest roles (26 relevant skills for `python-backend-developer` and `full-stack-mern-developer` from an empty profile; derived from the service's `prepare()`) is exponential. The service instead fixes a bound when the first goal is popped: states with `f > 1.5 x C*` are never pushed, and the search stops when the next pop exceeds it. Because the heuristic is consistent, goals still pop in non-decreasing cost, so nothing cheaper than the bound is lost. The ratio is configurable (`COST_BOUND_RATIO`). All alternatives returned in the six scenarios cost between 1.000 and 1.083 times the primary (derived), well inside the bound, so the bound limits the search without limiting the result in these cases.

**10.4 Cap behaviour.** The specification returns only a greedy path when 200,000 states are exceeded. Because generating alternatives is what makes the search large, and the primary path is normally found long before the cap, the service returns the goals already found (in non-decreasing cost order) with `stats.capped: true`. The primary path was found within 4283 expansions in every empty-profile run (derived from the stress table). The greedy fallback (cheapest closure per unmet requirement, union, ordered as usual) is used only if the cap is hit with no goal, and reports `algorithm: "greedy_fallback"` with `statesToPrimary` null. Tests cover both branches. No evaluated case reached the cap.

**10.5 `statesToPrimary`.** An added statistic recording the expansions at the first goal pop, needed because total expansions hide the heuristic's effect (section 8.4).

**10.6 Requirements already met.** The specification does not cover a learner who already meets every requirement. The service returns one `primary` path with no steps, cost 0 and score 0, so downstream routes and progress views keep working.

**10.7 Smaller points.** Empty role labels are treated as missing (the rationale falls back to the option names); unknown held skills are ignored while unknown requirement ids are rejected with a 422; and `POST /graph/validate-order` was added so the evaluation script uses the same `validate_order()` implementation as the service.

---

## 11. Limitations

- **Expert-estimated inputs.** `marketDemand`, role `demandScore` and `estHours` are expert estimates calibrated against fixed anchors, not measurements from sampled job postings or learner data (`docs/D1_Dataset_Methodology.md`, sections 4 and 10). They support relative comparisons, not quoted statistics. "Hours saved" means hours under this model.
- **Static data and linear cost model.** The dataset is a snapshot and costs scale linearly with proficiency level (half the zero-to-intermediate hours for beginner, one and a half times for advanced), which real learning curves do not follow.
- **Self-reported proficiency.** The three-level scale is declared by the user and cannot be verified; one level of error changes a skill's cost by half of its hours.
- **Curation bias.** The graph reflects the references consulted (public roadmaps and syllabi), mostly the global and Indian technology market, across three tracks. Prerequisite edges are indicative, and some nodes bundle related tools.
- **Single, small benchmark.** Six scenarios and one hand-authored benchmark path per scenario, with no inter-rater agreement and no documented separation from the system's output. Jaccard and tau on 3 to 16 shared skills are descriptive, not statistically powered, and tau has no null model.
- **Internal validity of the order metric.** Violations are measured against the dataset's own prerequisite graph, and the system's zero is guaranteed by construction (section 6).
- **Baseline OR-resolution.** The baseline takes the first listed option of each role requirement and resolves a prerequisite group by a member the plan already contains, falling back to the lowest slug (section 2.2). This is a modelling choice and it changes baseline hours, and therefore every saving: resolving each group by lowest slug alone would add 15 h to scenario 3 and 37.5 h to scenario 4 (savings of 24.26% and 33.77% instead of 20.11% and 23.06%, section 5.2), and scenarios 1 and 2 would change if the role file listed Tableau first (the 47.83% depends on Power BI being first, as D1 section 5 records). The percentages are therefore relative to this particular naive roadmap, not absolute.
- **Overlapping scenarios.** Scenarios 1 and 2 share role and baseline list, so their results are correlated; their baseline shuffles use different seeds (42 and 43) and are independent samples.
- **Exponential worst case.** The search is exponential in the number of independent unmet requirements. It is kept in check by design rules (at most 10 requirements per role, closures of about 25 skills or fewer), relevance pruning, the cost bound and the cap; all 18 empty-profile runs stay below 43% of the cap and below 0.7 s, but a denser graph or wider roles could not be assumed to. The empty profile is also not a guaranteed upper bound (scenario 5 expands more states than `devops-engineer` from nothing), so worst-case claims need profile-based stress runs as well.
- **Near-duplicate alternatives.** Alternatives can differ by one substitutable skill: the equal-cost 218.5 h pair in scenario 3 (PyTorch or TensorFlow), the one-hour Bootstrap/Tailwind swap in scenario 4, and the first two routes in scenario 5. These satisfy "near-optimal" but offer little real choice, and only scenario 5 returned the full k = 3.
- **Timing.** `elapsedMs` values are single runs on one machine and exclude network and Node overhead.

---

## 12. Scaling and future work

- **Measured demand.** Replace expert estimates with a live pipeline: collect and tag a sample of job postings per role, store sample sizes and collection dates, compute `marketDemand` and `demandScore` as measured shares, refresh on a schedule. Calibrate `estHours` against course durations or learner completion data.
- **Dataset growth.** Version as `data/v2` rather than editing `v1`, so results stay reproducible. Growth beyond 120 nodes mainly raises the number of relevant skills per role; the stress table (section 8.5) should be rerun and the role-design rules kept.
- **Stronger or faster search.** Extend the heuristic with an admissible estimate for OR-requirements (for example, the cheapest option's marginal cost beyond `N`, taking care with overlap), or use pattern-database style decompositions. Consider bidirectional search, or returning the primary path as soon as it is known and completing alternatives afterwards, since the primary is available after a small share of the total work (for example 482 of 32130 states in scenario 4).
- **Precomputation and caching.** Precompute and cache the empty-profile solution per role, and cache by a hash of (held skills, role, weights) and graph version, invalidated on reload. The graph is read-only in memory and swapped atomically, which makes caching straightforward.
- **Task queue and workers.** Because the Python service is separable and holds only a read-only in-memory graph (no user state), it can sit behind a task queue with several workers, and expensive recomputations (many users after an admin edit) can be handled asynchronously.
- **Diversity constraint for alternatives.** Require alternatives to differ from each other and from the primary by at least a minimum number of skills or by a structural choice, so near-duplicates (section 11) are not offered as separate options.
- **Pedagogical ordering** (section 7.2), evaluated against a null model of random valid orders.
- **User study.** Ask several advisors to author paths independently (giving inter-rater agreement) and have learners follow system and baseline plans, comparing real completion time and satisfaction, to ground the hour model.

---

## 13. Conclusion

On six scenarios the path service produces plans that are prerequisite-correct in every case, cheaper than the generic roadmap in every case (4.35% to 47.83%, with the specification's worked example reproduced at 60 h versus 115 h), and whose skill set matches the hand-authored benchmark among the top three returned routes every time. Where the system and the benchmark differ, it is by a single defensible OR-choice that the ranking weights can reverse (scenario 2 flips at alpha=0.4, beta=0.6), and by an ordering policy that favours cheap skills first, which the suggested pedagogical tie-break could address without changing cost or correctness. The closure heuristic reduces the work needed to reach the primary path by 1.6x to 61.4x against Dijkstra in the six scenarios, and strictly beats the specification's simple heuristic in 13 of 18 roles from an empty profile (ties in the other 5); total expansions are dominated by alternative generation and are similar across variants. All 18 roles run from an empty profile well inside the 200,000-state cap and the 2 s requirement (slowest 622 ms). The results should be read within the stated limits: expert-estimated hours and demand, a static curated graph, a single small benchmark, and a baseline whose OR-group resolution is a modelling choice that moves the baseline hours.
