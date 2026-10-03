# Skillora — How It Actually Works (Internal Mental Model)

> A plain-language explanation of the system: where data comes from, how the graph is built, how path computation works, and what happens at each step a user takes. Field names and API IDs match **SKILLORA_Project_Specification.md v4.0**.

---

## 1. Where Does the Data Come From?

This is the most important question for a project like this, and the honest answer is: **you build it by hand, once, before the app exists.**

### The Skill Graph Dataset (D1 — the hardest deliverable)

The `skills` and `skill_edges` collections are the heart of the project. They don't come from a live API — you curate them manually before writing most of the application code. Here's how:

**Step 1 — Pick a domain to focus on.** For a lab project, don't try to cover everything. Pick 2–3 career tracks, e.g.:
- **Data / ML track:** Python, NumPy, Pandas, SQL, Statistics, Excel, Power BI, Tableau, Machine Learning, Scikit-Learn, Deep Learning, TensorFlow, PyTorch
- **Web Dev track:** HTML/CSS, JavaScript, React, Vue, Node.js, Express, MongoDB, PostgreSQL, REST APIs, Auth
- **Cloud/DevOps track:** Linux, Git, Docker, Kubernetes, AWS, GCP, CI/CD

**Step 2 — Give every skill two numbers.**
- `estHours` — rough hours to go from zero to a working (intermediate) level. E.g., Python 40, SQL 30, Pandas 25, Excel 15. If unsure, use `baseDifficulty × 8`.
- `marketDemand` (0–1) — the share of job postings you sampled that mention the skill. E.g., read 30 "Data Analyst" postings on LinkedIn/Naukri/Indeed; if 24 mention SQL, SQL's demand ≈ 0.8.

These don't have to be perfect — they just need to be internally consistent so the search can compare plans meaningfully.

**Step 3 — Add prerequisite edges.** For each skill, ask: "what do you need to know *before* learning this?" Each answer is a `prerequisite_of` edge from the prerequisite to the skill. Edges carry **no hours** — the cost lives on the skill. Sources:
- **Course syllabi** (Coursera, edX, NPTEL): courses list prerequisites explicitly
- **Roadmap.sh**: `roadmap.sh/python`, `roadmap.sh/react` — community-curated prerequisite trees
- **Job postings**: skills listed together often are good `corequisite_with` candidates (informational only)
- **Your own judgment / expert review**

**Step 4 — Mark the OR-choices.** This is what makes *alternative paths* possible. Without it, every user gets exactly one plan.
- **Prerequisite groups:** if a skill needs *any one* of several skills, give those edges the same `group`. E.g., Deep Learning ← {TensorFlow, PyTorch} with `group: "dl-framework"`.
- **Role choices:** a role requirement with `anyOf: [Tableau, Power BI]` means either one counts.
- Aim for **every role to have at least one OR-choice** (a D1 acceptance criterion).

**Step 5 — Store it as versioned JSON.** `data/v1/skills.json`, `data/v1/edges.json`, `data/v1/roles.json`. Then write `scripts/seed.js`, which reads these files, checks the prerequisite graph has no cycles, and upserts into MongoDB. This is your D1 deliverable.

> **Realistic scope:** For 80–120 skills and ≥150 edges across 3 career tracks, expect to spend 1–2 days on curation. This is intentional — it's where the "research" in your project lives.

### The Roles Catalog

Similarly hand-crafted. Each role document lists requirements, e.g. "to be a Data Analyst you need: Python (intermediate), SQL (intermediate), Statistics (beginner), Pandas (beginner), and one BI tool — Tableau **or** Power BI (beginner)." You get these by reading job descriptions and synthesizing them. 15–20 roles covering your skill domain is plenty.

---

## 2. How the Graph Is Built in MongoDB

Once seeded, you have two collections acting as a directed graph:

```
skills (nodes)                                     skill_edges (directed edges)
──────────────────────────────────────────         ────────────────────────────────────────────────
{ _id, slug: "python", name: "Python",              { sourceSkillId: Python_id, targetSkillId: Pandas_id,
  estHours: 40, marketDemand: 0.9 }                   type: "prerequisite_of", group: null }
{ _id, slug: "pandas", name: "Pandas",              { sourceSkillId: Excel_id,  targetSkillId: PowerBI_id,
  estHours: 25, marketDemand: 0.7 }                   type: "prerequisite_of", group: null }
{ _id, slug: "power-bi", name: "Power BI",          { sourceSkillId: SQL_id,    targetSkillId: Python_id,
  estHours: 20, marketDemand: 0.8 }                   type: "corequisite_with" }   ← display only
```

The **Python FastAPI service** loads the `prerequisite_of` edges into a `networkx.DiGraph` **once at startup** and keeps it in memory. Each node is a skill ObjectId carrying `estHours` and `marketDemand`. When an admin edits the dataset, Node calls `POST /graph/reload` (API-P-5) so the service picks up the change.

---

## 3. Full Data Flow — What Happens When a User Uses the App

### Step A: Registration & Onboarding (P2 → P3 → P4)

1. User registers → stored in `users` collection with empty `currentSkills`.
2. **Skill Profile Builder (P3):** User searches for and picks skills they already know (e.g., "Python - beginner", "SQL - intermediate"). This writes to `users.currentSkills`.
3. **Role Selection (P4):** User picks a target role (e.g., "Data Analyst"). This writes `users.targetRoleId`. The page also shows a "you have X of Y requirements" badge by comparing the user's skills (from API-N-26) against `roles.requiredSkills`.

### Step B: Path Computation (the core of the project)

**Why not plain Dijkstra?** Dijkstra finds the cheapest route from *one* node to *one* node — a single chain. But a role needs *several* skills, and prerequisites are AND (Pandas needs Python; ML needs Python *and* Statistics). So we search over **states** instead of skills:

- **State** = the set of skills learned so far in the plan
- **Move** = learn one more skill whose prerequisites are already known
- **Cost of a move** = that skill's learning hours
- **Goal** = every requirement of the role is met

A\* finds the cheapest sequence of moves to a goal. Dijkstra is the same search with no heuristic; we keep it to show in D6 how much work the heuristic saves.

When the user opens the Dashboard (P5), it calls `GET /api/paths/active` (API-N-10). If there is no path yet, or the path is `stale`, it calls `POST /api/paths/compute` (API-N-9):

```
React Dashboard
    │
    ▼
POST /api/paths/compute   (Node.js Web/API service — API-N-9)
    │
    ├─ reads held skills: currentSkills ∪ completedSkills (highest rank per skill)
    ├─ reads roles.requiredSkills (anyOf + minProficiency) for the target role
    ├─ converts proficiencies to ranks (beginner=1, intermediate=2, advanced=3)
    │
    ▼
POST /compute/paths   (Python FastAPI service — API-P-1, header X-Internal-Key)
    │
    ├─ 1. held-skill rule: drop requirements already met
    ├─ 2. relevant skills = unmet options + their unknown prerequisites (networkx.ancestors)
    ├─ 3. A* over states, h = hours of unmet single-option requirements
    ├─ 4. keep popping goal states (they come out cheapest-first),
    │     drop any that are supersets of one already found
    ├─ 5. rank candidates: α·(cost / maxCost) + β·(1 − avg marketDemand)   (α=0.7, β=0.3)
    ├─ 6. order each path's steps by topological sort; validate_order() checks it
    └─ returns: { algorithm, stats, paths: [{ rank, steps, totalLearningCost,
                                             marketDemandAvg, compositeScore }, ...] }
    │
    ▼
Back in Node.js (API-N-9):
    ├─ archives the previous path doc (if any)
    ├─ writes the result to computed_paths (status: "active")
    ├─ sets users.activePathId → new doc, users.selectedPathRank → 1
    └─ returns it to the React client
    │
    ▼
React renders:
    ├─ Selected path → ordered roadmap (Step 1 → Step 2 → Step 3...)
    ├─ Other paths → summary cards ("Alt 1: 65h, higher market demand")
    ├─ Progress ring → completedForRole / (completedForRole + remaining steps)
    └─ Estimated time → sum of steps[].estCost
```

#### Worked example

Data Analyst requirements: Python (int), SQL (int), Statistics (beg), Pandas (beg), and one of {Tableau, Power BI} (beg).
Prerequisites: Python → Pandas, Excel → Power BI.
User holds: **Python: beginner, SQL: intermediate.**

Step cost = `estHours × (toRank − fromRank) / 2`:

| Skill | estHours | From → to | Cost | marketDemand |
|---|---|---|---|---|
| Python | 40 | beginner → intermediate | 20 | 0.9 |
| SQL | 30 | already met | — | — |
| Statistics | 30 | 0 → beginner | 15 | 0.6 |
| Pandas | 25 | 0 → beginner (Python already known) | 12.5 | 0.7 |
| Tableau | 25 | 0 → beginner | 12.5 | 0.5 |
| Power BI | 20 | 0 → beginner | 10 | 0.8 |
| Excel | 15 | 0 → beginner (prerequisite of Power BI) | 7.5 | 0.7 |

- Start heuristic `h` = Python 20 + Statistics 15 + Pandas 12.5 = **47.5** (the OR-group isn't counted).
- Goal found first: **Plan A** {Python, Statistics, Pandas, Tableau} = **60 h**, demand avg 0.675.
- Next goal: **Plan B** {Python, Statistics, Pandas, Excel, Power BI} = **65 h**, demand avg 0.74.
- Sets like "Plan A + Excel" are supersets of Plan A, so they are dropped.

Ranking (maxCost = 65):
- Default α=0.7, β=0.3 → A = 0.7·(60/65) + 0.3·0.325 = **0.744**; B = 0.7·1 + 0.3·0.26 = **0.778** → **A is primary.**
- If the user cares more about demand (α=0.4, β=0.6) → A = 0.564, B = 0.556 → **B wins.** This is the speed vs. market trade-off from O4.

Plan A's roadmap after the topological sort (ties broken by cheapest first): 1. Tableau → 2. Statistics → 3. Python (upgrade) → 4. Pandas.

### Step C: Progress Tracking & Recomputation (P8)

When the user checks off "✅ I've learned Tableau":

1. `POST /api/users/me/skills/complete` (API-N-14) fires with `{ skillId: Tableau }`.
2. Tableau is **added** to `users.completedSkills` with `proficiency: "beginner"` (the step's target level), the current `targetRoleId`, and `fromPathId`. It was never in `currentSkills`, so nothing moves out of there; it now counts as held.
3. API-N-14 calls API-P-1 again with the updated held skills.
4. On success, the old `computed_paths` doc is set to `status: "archived"`, a new `active` doc is created, `users.activePathId` points to it, and `selectedPathRank` resets to 1.
5. The updated roadmap is returned: Statistics → Python → Pandas (47.5 h). The BI requirement is met, so only one route remains and P7 says so. Progress ring = 1 / (1 + 3) = 25%.
6. If the Python service is down, the completion is still saved, the old path is marked `stale`, and the dashboard retries later.

Editing skills in Settings, changing the target role, or an admin editing the dataset also marks the path `stale`, so the next dashboard visit recomputes it.

The archived history is available from API-N-27, so the user can see their learning journey over time.

---

## 4. How the Graph Explorer Works (P6)

API-N-11 (`GET /api/graph?scope=path|full`) reads skills + skill_edges from MongoDB and returns them as a JSON graph:

```json
{
  "nodes": [{ "id": "...", "name": "Python", "category": "programming", "estHours": 40 }, ...],
  "edges": [{ "source": "...", "target": "...", "type": "prerequisite_of", "group": null }, ...]
}
```

The React frontend feeds this directly into `react-force-graph` (or `d3-force`), which renders the interactive diagram. `scope=path` keeps only the nodes in the selected path plus their direct prerequisites — useful when the full graph is too cluttered. (The API maps `sourceSkillId`/`targetSkillId` to `source`/`target` because that is what the graph library expects.)

Clicking a node triggers `GET /api/skills/:id` (API-N-4b) to fetch that skill's description, aliases, hours, demand and edges for the detail panel.

---

## 5. The Evaluation System (D6 — offline, not live)

D6 is a report, not a feature. Here's the workflow:

1. You define 5+ test scenarios in `scripts/seed-eval.js`:
   - e.g., Scenario 1: User knows nothing, wants to be a "Data Analyst"
   - e.g., Scenario 2: User knows Python + SQL, wants to be an "ML Engineer"
2. The script calls API-P-1 directly (with the `X-Internal-Key`, no user login) twice per scenario: A\* mode and Dijkstra mode (`useHeuristic: false`).
3. You hand-write what you think a human advisor would suggest (the "expert benchmark").
4. The script builds the **generic roadmap baseline**: every skill the role requires (first option of each OR-group) plus all their prerequisites, learned from zero, ignoring what the user already knows — i.e., what a generic "become a Data Analyst" article would tell everyone.
5. It computes the metrics:
   - **Time saved %** = (baseline hours − system hours) / baseline hours. In the worked example the baseline is Python 40 + SQL 30 + Statistics 15 + Pandas 12.5 + Power BI 10 + Excel 7.5 = 115 h, versus 60 h → **47.8% saved.**
   - **Redundant skills avoided** = baseline skills the user already holds (SQL in the example).
   - **Order violations**: the system's must be 0; the baseline's is the average over 20 random shuffles.
   - **Expert agreement**: Jaccard overlap of skill sets, and Kendall τ on the order.
   - **Search efficiency**: states expanded by A\* vs. Dijkstra.
6. All of this is stored in `evaluation_scenarios` (DB-6) and presented in your D6 report.

---

## 6. Project Architecture — The Big Picture

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Browser (React SPA)                         │
│ Landing │ Auth │ Onboarding │ Dashboard │ Graph │ Progress │ Admin  │
└─────────────────────────────────┬───────────────────────────────────┘
                                  │  HTTP /api/*  (JWT)
                                  ▼
┌─────────────────────────────────────────────────────────────────────┐
│               Node.js / Express  —  skillora-api                    │
│  Auth routes │ User routes │ Skills/Roles │ Paths │ Admin CRUD      │
│  Owns: auth, sessions, all DB writes, response to browser           │
└───────┬─────────────────────────────────────────┬───────────────────┘
        │  HTTP /compute/*, /graph/*               │  Read/Write
        │  header X-Internal-Key                   ▼
        │  (never called by the browser)  ┌───────────────────────┐
        ▼                                 │   MongoDB Atlas       │
┌────────────────────────┐                │   users               │
│  Python / FastAPI      │                │   skills              │
│  skillora-path-service │ ──Read──────►  │   skill_edges         │
│                        │ (startup and   │   roles               │
│  in-memory DiGraph     │  /graph/reload)│   computed_paths      │
│  A* state-space search │                │   sessions            │
│  validate_order()      │                │   evaluation_scenarios│
└────────────────────────┘                └───────────────────────┘
```

---

## 7. Build Order (Suggested)

> **Before you start:** confirm with your faculty that a Python microservice is acceptable in a MERN lab project. If not, the same algorithm can be written in Node.js (a priority queue + a simple graph library), and the spec's D3 would change accordingly.

| Phase | What to Build | Why This Order |
|---|---|---|
| **1** | MongoDB connection + Mongoose schemas, then curate the D1 dataset + `scripts/seed.js` | Everything depends on real data, and the seed script needs the schemas |
| **2** | Python FastAPI service (API-P-1, P-3, P-4, P-5) + pytest unit tests on small fixture graphs (including the worked example above) | Build & test the algorithm in isolation first — you can `curl` it without any frontend |
| **3** | Node.js auth routes (P2 — register, login, logout) | Auth gates everything else |
| **4** | Node.js skill/role catalog + profile routes (P3, P4) | Users need to pick skills/roles before paths |
| **5** | Node.js path routes (API-N-9, N-10, N-12, N-13 — proxies to Python) | Core feature |
| **6** | React frontend — Onboarding flow (P2 → P3 → P4) | Wire up the backend you just built |
| **7** | React frontend — Dashboard + Roadmap + Alternatives (P5, P7) | The showcase screen |
| **8** | Progress tracker + recompute + staleness rules (P8, API-N-14) | Builds on everything above |
| **9** | Graph Explorer (P6, react-force-graph) | Visual flourish — can be done in parallel with phase 8 |
| **10** | Admin CRUD (P10) with cycle checks and graph reload | Needed to show dataset curation in the demo |
| **11** | Deployment: Node + React + Python services, MongoDB Atlas, `INTERNAL_API_KEY` set on both services | D2 requires a reachable URL; leave time for hosting issues |
| **12** | Evaluation seed script + D6 report, then D7 docs and screenshots | Last — uses data from the finished system |
