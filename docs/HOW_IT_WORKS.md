# SKILLORA — How It Works

> A plain-language walkthrough of the system: where the data comes from, how a path is computed, and what happens at each step a user takes. It is a tutorial, not a reference: exact fields are in [DATA_MODEL.md](DATA_MODEL.md), endpoints in [API.md](API.md), and the precise algorithm in [ALGORITHM.md](ALGORITHM.md).

---

## 1. Where the data comes from

The skill graph was **built by hand before the application existed**. It does not come from a live API. This curation is where the research of the project lives (deliverable D1, full method in [D1_Dataset_Methodology.md](D1_Dataset_Methodology.md)).

1. **Three career tracks plus shared foundations.** Data/ML, web development and cloud/DevOps, sharing skills such as Python, SQL, Git and Linux. v1 has **114 skills**.
2. **Two numbers per skill.**
   - `estHours`: rough hours from zero to a working (intermediate) level, scaled against fixed anchors (Excel 15, Power BI 20, Pandas 25, Tableau 25, SQL 30, Statistics 30, Python 40).
   - `marketDemand` (0–1): an expert estimate, from a fixed rubric, of how often relevant job postings mention the skill.
   They only need to be consistent with each other so that plans can be compared.
3. **Prerequisite edges.** For every skill: "what must a learner know before starting this?" Each answer is a `prerequisite_of` edge (183 in v1), drawn from roadmap.sh, course syllabi and expert judgment. Edges carry **no hours**; cost lives on the skill.
4. **OR-choices.** This is what makes alternative paths possible:
   - prerequisite edges sharing a `group` mean "any one of these" (Deep Learning needs TensorFlow **or** PyTorch);
   - a role requirement with several `anyOf` options means either one counts (Tableau **or** Power BI).
   Every role has at least one OR-choice.
5. **Corequisites.** Skills usually learned together (NumPy and Pandas) are linked with `corequisite_with` (22 edges). They are shown in the graph and mentioned in explanations, but never affect the search.
6. **Roles.** 18 roles synthesised from typical job descriptions, each with at most ten requirements and a minimum proficiency per requirement.

Everything is stored as versioned JSON in `data/v1/` and loaded into MongoDB by `node scripts/seed.js`, which also checks that the prerequisite graph has no cycles.

## 2. The graph in MongoDB

Two collections act as a directed graph:

```
skills (nodes)                                     skill_edges (directed edges)
──────────────────────────────────────────         ────────────────────────────────────────────────
{ _id, slug: "python", name: "Python",              { sourceSkillId: Python_id, targetSkillId: Pandas_id,
  estHours: 40, marketDemand: 0.9 }                   type: "prerequisite_of", group: null }
{ _id, slug: "pandas", name: "Pandas",              { sourceSkillId: Excel_id,  targetSkillId: PowerBI_id,
  estHours: 25, marketDemand: 0.7 }                   type: "prerequisite_of", group: null }
{ _id, slug: "power-bi", name: "Power BI",          { sourceSkillId: NumPy_id,  targetSkillId: Pandas_id,
  estHours: 20, marketDemand: 0.8 }                   type: "corequisite_with" }   ← display only
```

The Python path service loads the skills and `prerequisite_of` edges into a `networkx.DiGraph` **once at startup** and keeps it in memory. When an admin edits the dataset, the Node API asks it to reload (`POST /graph/reload`).

## 3. What happens when someone uses the app

### Step A — Getting started (P2 → P3 → P4)

1. The user registers and logs in. The login returns a token; every later request carries it.
2. **Skill profile (P3).** The user types `pyt`, picks Python and sets a level (beginner / intermediate / advanced). The list is saved as `users.currentSkills`.
3. **Target role (P4).** The user picks a role, for example Data Analyst, saved as `users.targetRoleId`. The page compares the user's skills with the role's requirements ("you have 2 of 5").

### Step B — Computing the path (the core)

**Why not plain Dijkstra?** Dijkstra finds the cheapest route from *one* node to *one* node, a single chain. A role needs *several* skills, and prerequisites are AND (Pandas needs Python; Machine Learning needs Python *and* Statistics). So the search runs over **states** instead of single skills:

- **State** = the set of skills learned so far in the plan
- **Move** = learn one more skill whose prerequisites are already known
- **Cost of a move** = that skill's learning hours
- **Goal** = every requirement of the role is met

A\* finds the cheapest sequence of moves to a goal. Dijkstra is the same search with no heuristic; it is kept as the baseline for the evaluation.

When the dashboard (P5) opens, it asks for the current path (`GET /api/paths/active`). If there is none yet, or it is out of date (`stale`), it asks for a new one (`POST /api/paths/compute`):

```
React dashboard
    │
    ▼
POST /api/paths/compute                      (Node API)
    ├─ held skills = currentSkills ∪ completedSkills (highest level per skill)
    ├─ the target role's requirements (anyOf + minimum level)
    ▼
POST /compute/paths                          (Python path service, X-Internal-Key)
    ├─ 1. drop requirements the user already meets
    ├─ 2. relevant skills = options of the unmet requirements + their unknown prerequisites
    ├─ 3. A* over sets of skills; the heuristic counts every skill any plan must learn
    ├─ 4. collect the cheapest plans; skip plans that only add an unnecessary skill;
    │     stop at 1.5 × the cheapest plan's cost
    ├─ 5. rank: 0.7 × (cost / maxCost) + 0.3 × (1 − average market demand)
    ├─ 6. order each plan's steps (prerequisites first, cheapest first) and double-check the order
    └─ return up to 3 ranked paths with a "why" sentence per step
    ▼
Node API
    ├─ saves the result as a new computed_paths document (status "active")
    ├─ archives the previous one, points users.activePathId at the new one
    └─ returns it to the browser
    ▼
React shows the chosen path as a roadmap, the other paths as cards, the total hours and progress
```

#### Worked example

Data Analyst requires Python (intermediate), SQL (intermediate), Statistics (beginner), Pandas (beginner) and one BI tool, Tableau **or** Power BI (beginner). Prerequisites: Python → Pandas, Excel → Power BI. The user already has **Python at beginner and SQL at intermediate**.

Step cost = `estHours × (target level − current level) / 2`:

| Skill | estHours | From → to | Cost | marketDemand |
|---|---|---|---|---|
| Python | 40 | beginner → intermediate | 20 | 0.9 |
| SQL | 30 | already met | — | — |
| Statistics | 30 | none → beginner | 15 | 0.6 |
| Pandas | 25 | none → beginner (Python already known) | 12.5 | 0.7 |
| Tableau | 25 | none → beginner | 12.5 | 0.5 |
| Power BI | 20 | none → beginner | 10 | 0.8 |
| Excel | 15 | none → beginner (needed for Power BI) | 7.5 | 0.7 |

- The search starts knowing that at least Python 20 + Statistics 15 + Pandas 12.5 = **47.5 h** is unavoidable (the BI choice is still open).
- Cheapest plan **A** = {Python, Statistics, Pandas, Tableau}: **60 h**, average demand 0.675.
- Next plan **B** = {Python, Statistics, Pandas, Excel, Power BI}: **65 h**, average demand 0.74.
- "Plan A plus Excel" is skipped: it only adds an unnecessary skill.

Ranking (largest cost 65):

- Default weights (speed matters more): A = 0.7·(60/65) + 0.3·0.325 = **0.744**, B = 0.7·1 + 0.3·0.26 = **0.778** → **A is the primary path.**
- If market demand matters more (0.4 / 0.6): A = 0.564, B = 0.556 → **B wins.** This is the speed-versus-demand trade-off of objective O4.

Plan A as a roadmap (prerequisites first, cheapest first): 1. Tableau → 2. Statistics → 3. Python (upgrade) → 4. Pandas.

### Step C — Making progress (P8)

When the user ticks "I've learned Tableau":

1. `POST /api/users/me/skills/complete` with Tableau's id.
2. Tableau is added to `users.completedSkills` at the level the step targeted (beginner), with the current role and path. From now on it counts as a held skill.
3. The path is recomputed. The old document is archived; the new one becomes current, and the user's choice resets to the primary path.
4. New roadmap: Statistics → Python → Pandas (47.5 h). The BI requirement is met, so only one route remains. Progress = 1 completed / (1 + 3 remaining) = 25 %.
5. If the path service is down, the completion is still saved and the old path is marked `stale`; the dashboard asks for a recompute on its next load.

Editing skills, changing the target role, or an admin editing the dataset also marks paths `stale`, so they are recomputed on the next dashboard visit. Archived paths remain visible as history.

## 4. The graph explorer (P6)

`GET /api/graph?scope=full` (or `scope=path`) returns:

```json
{
  "nodes": [{ "_id": "…", "slug": "python", "name": "Python", "category": "programming", "estHours": 40, "marketDemand": 0.9 }],
  "edges": [{ "source": "…", "target": "…", "type": "prerequisite_of", "group": null }]
}
```

The frontend draws this as a force-directed diagram. `scope=path` keeps only the user's current path and the direct prerequisites of its steps. Clicking a node loads that skill's details and connections (`GET /api/skills/:id`).

## 5. The evaluation (D6, offline)

The evaluation is a report, not a feature ([D6_Evaluation_Report.md](D6_Evaluation_Report.md)):

1. `scripts/seed-eval.js` defines six scenarios, from "complete beginner → Data Analyst" to "analyst with strong SQL → Data Engineer".
2. For each, it calls the path service directly (no login) with the closure heuristic, the simple heuristic and Dijkstra.
3. Each scenario has a hand-written "what a human advisor would suggest" path.
4. The **baseline** is the generic roadmap: every required skill plus all prerequisites, learned from scratch, ignoring what the user already knows — what a generic "how to become a Data Analyst" article tells everyone.
5. Metrics: time saved versus the baseline (the worked example: 115 h → 60 h, **47.8 %** saved), redundant skills avoided, prerequisite-order violations (always 0 for SKILLORA), agreement with the advisor path, and search effort (A\* versus Dijkstra).
6. Results go to the `evaluation_scenarios` collection and `docs/evaluation/`.

## 6. The big picture

Containers, data ownership, security and deployment: [ARCHITECTURE.md](ARCHITECTURE.md). Why it is built this way: [decision records](adr/README.md).
