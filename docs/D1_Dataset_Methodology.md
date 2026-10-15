# D1: Curated Skill Graph Dataset, Methodology

## 1. Purpose

Deliverable D1 is the knowledge base behind Skillora's gap analysis and path search: a directed skill graph with prerequisite relations, per-skill cost and demand estimates, and a catalog of target roles. The path service searches this graph for the cheapest ordered set of skills that closes the gap between a learner's profile and a role, and for alternatives where the graph offers a choice. The dataset is therefore curated to be **small enough to review by hand, dense enough to produce non-trivial plans, and consistent enough to compare plans against each other**.

The data is stored as versioned JSON in `data/v1/` and loaded into MongoDB by `scripts/seed.js`. File formats and seeding instructions are in [`data/README.md`](../data/README.md).

## 2. Scope

The dataset covers three career tracks plus a shared foundation layer:

| Track | Representative content |
|---|---|
| Data / ML | Excel, statistics, Python data stack, BI tools (Power BI, Tableau), machine learning and deep learning, data engineering and MLOps |
| Web development | HTML/CSS, JavaScript and TypeScript, React/Vue/Angular, Node.js, Python and Java backends, databases, security, design handoff |
| Cloud / DevOps | Cloud platforms, containers and Kubernetes, CI/CD, infrastructure as code, observability, SRE practice |
| Shared foundations | Python, SQL, Git, Linux, networking, data structures and algorithms, OOP, agile, technical communication |

The target size is **80 to 120 nodes**. Below about 80 skills a graph is too thin to give different roles overlapping but distinct paths and too few OR-choices to demonstrate alternatives. Above about 120 the manual curation and review effort grows faster than the benefit, and the search space of the path service grows with it. v1 contains **114 skills**, **205 edges** and **18 roles**.

Skills do not carry an explicit track field; tracks are a curation grouping only, so the statistics below are reported per category rather than per track.

## 3. Curation process

1. **Skill inventory.** Skills were drafted per track from roadmap.sh topic pages (data analyst, AI/data scientist, data engineer, MLOps, frontend, backend, Node.js, Python, Java, DevOps, Kubernetes, system design), cross-checked against the topics of public course syllabi (Coursera, edX, NPTEL), and then pruned to a consistent granularity: one node is something a learner can plan and track as a unit of study.
2. **Prerequisite edges.** For each skill the question asked was "what must a learner already be able to do before starting this?". The answer becomes a `prerequisite_of` edge from the prerequisite to the skill. Sources consulted were roadmap.sh dependency ordering, explicit course prerequisites in syllabi, and expert judgment where the references disagree or are silent. Only **direct** prerequisites are modelled; transitive ones follow from the graph. Edges carry no hours: cost lives on the skills.
3. **OR-choices.** Where a skill genuinely needs one of several interchangeable skills (any deep-learning framework, any cloud provider), those edges share a `group`. See section 6.
4. **Corequisites.** Skills that are normally learned together but do not depend on each other (for example NumPy and Pandas, Terraform and Ansible) are linked with `corequisite_with`. They are **informational only**: shown in the graph explorer and used in rationales, never in path search or cycle checks. Each pair is stored once.
5. **Roles.** Eighteen roles were synthesized from typical job descriptions, each reduced to at most ten requirements with a minimum proficiency, and at least one OR-choice.
6. **Validation.** `scripts/seed.js` enforces the structural rules (section 9) on every run.

### What the `source` field means

Every edge has a `source` note. In v1 the values are `expert judgment` (41 edges), `roadmap.sh/devops` (37), `roadmap.sh/frontend` (25), `roadmap.sh/data-analyst` (20), `Coursera Machine Learning Specialization syllabus; roadmap.sh/ai-data-scientist` (19), `roadmap.sh/data-engineer` (16), `roadmap.sh/backend` (14), `roadmap.sh/kubernetes` (8), `roadmap.sh/nodejs` (7), `roadmap.sh/mlops` (6), `roadmap.sh/python` (6), `roadmap.sh/java` (3) and `roadmap.sh/system-design` (3).

These notes indicate **the type of reference consulted for that topic area**. They are not per-edge verified citations: an edge tagged with a roadmap does not claim that the roadmap draws exactly that arrow. The edge set as a whole reflects curator judgment informed by those references.

## 4. Per-skill estimates

### 4.1 `baseDifficulty` and `estHours`

`baseDifficulty` is an integer from 1 (light, a few sessions) to 5 (long, conceptually demanding). `estHours` is the estimated number of hours for a learner to go from zero to a working, intermediate level. It is the cost unit of the path search (zero to beginner costs half of it, zero to intermediate all of it, zero to advanced one and a half times).

Rubric:

- A set of **fixed anchors** pins the scale: Excel 15, Power BI 20, Pandas 25, Tableau 25, SQL 30, Statistics 30, Python 40.
- Every other skill is scaled relative to these anchors, by comparing breadth and conceptual load with the closest anchor (for example Advanced Excel above Excel, TensorFlow and PyTorch above Pandas).
- When no researched number exists, `estHours` defaults to `baseDifficulty x 8`. The seed script applies this default itself, because bulk writes bypass the model's save hook. In v1 every skill has an explicit `estHours` (range 5 to 50 hours), so the default is not used.

### 4.2 `marketDemand`

`marketDemand` (0 to 1) is the **expert-estimated** share of relevant job postings, within the skill's own track, that mention the skill. Values were assigned using this rubric:

| Score | Meaning | Examples |
|---|---|---|
| 0.9 | Near-universal | Python and SQL for data roles, Git |
| 0.7 to 0.8 | Most postings | Pandas, Docker, React |
| 0.5 to 0.6 | About half | Tableau, Kubernetes |
| 0.3 to 0.4 | Notable minority | Vue, Ansible |
| 0.1 to 0.2 | Niche | Helm, Seaborn-specific |

Intermediate values (for example 0.35, 0.45, 0.65) are used to separate skills within a band.

**Honest statement of limits.** `marketDemand` and each role's `demandScore` are **expert estimates, not measurements**. They were not computed from a sample of collected job postings. The project specification describes the field as a share of sampled postings; v1 deliberately substitutes the rubric above and the figures should be read as ordinal judgments ("more or less in demand than"), not as statistics with an error margin. Replacing them with a measured pipeline is listed under future work.

## 5. Worked-example consistency constraints

The specification's worked example (a learner whose remaining work is 60 hours against a 65-hour alternative, with 47.8% time saved) only reproduces on the real dataset if the data keeps a specific shape. These constraints are intentional and must be preserved when editing the data:

| Constraint | v1 data | Why |
|---|---|---|
| Anchor values are exact | Python 40 h / 0.9, SQL 30 h / 0.9, Statistics 30 h / 0.6, Pandas 25 h / 0.7, Tableau 25 h / 0.5, Power BI 20 h / 0.8, Excel 15 h / 0.7 | The example arithmetic uses these costs and demand values. |
| `statistics`, `tableau`, `excel` are roots | No incoming prerequisite edges | Learning them must not drag in extra skills. |
| `pandas` depends on `python` only | Single incoming edge from `python` | Fixes its from-scratch cost to Pandas plus Python. |
| `power-bi` depends on `excel` only | Single incoming edge from `excel` | Makes Power BI cost Power BI plus Excel. |
| Data Analyst requirements | Python (intermediate), SQL (intermediate), Statistics (beginner), Pandas (beginner), BI tool `anyOf [power-bi, tableau]` (beginner) | Exactly the five requirements of the example. |
| `power-bi` listed first in the BI `anyOf` | `["power-bi", "tableau"]` | The 47.8% figure assumes the baseline picks Power BI as the first option; listing Tableau first would change the baseline. |

These facts are verified against the JSON; a regression test in the path service is expected to check them on the real dataset.

## 6. OR-choice design

Alternatives in a plan come from two mechanisms.

### 6.1 Prerequisite groups (11)

Edges into the same target that share a `group` mean "any one of these is enough".

| Group | Target | Options |
|---|---|---|
| `dl-framework` | deep-learning | tensorflow, pytorch |
| `oop-language` | oop | python, java, javascript |
| `dsa-language` | data-structures-algorithms | python, java, javascript |
| `backend-runtime` | authentication-jwt | express, django, fastapi, spring-boot |
| `iac-cloud` | terraform | aws, azure, gcp |
| `cicd-tool` | gitops-argocd | github-actions, jenkins |
| `ml-data-lib` | feature-engineering | pandas, pyspark |
| `scripting` | sre-practices | python, go, bash-scripting |
| `dataviz-lib` | data-storytelling | matplotlib-seaborn, tableau, power-bi |
| `db-for-cache` | redis | mongodb, postgresql |
| `warehouse` | dbt | snowflake, bigquery |

### 6.2 Role-level `anyOf` requirements

| Label | Options | Roles using it |
|---|---|---|
| BI tool | power-bi, tableau | data-analyst, bi-analyst |
| Visualization tool | matplotlib-seaborn, tableau, power-bi | data-scientist |
| DL framework | tensorflow, pytorch | machine-learning-engineer, ai-nlp-engineer |
| Cloud warehouse | snowflake, bigquery | data-engineer, analytics-engineer |
| CI tool | github-actions, jenkins | mlops-engineer, devops-engineer, platform-kubernetes-engineer |
| Cloud platform | aws, azure, gcp | mlops-engineer, devops-engineer, cloud-engineer, platform-kubernetes-engineer |
| Frontend framework | react, vue, angular | frontend-developer |
| CSS framework | tailwind, bootstrap | frontend-developer, full-stack-mern-developer, ui-developer |
| Database | mongodb, postgresql (order varies by role) | backend-developer-node, python-backend-developer, java-backend-developer |
| Python web framework | django, flask, fastapi | python-backend-developer |
| Programming language | python, go | site-reliability-engineer |

## 7. Role catalog

`Requirements` is the number of `requiredSkills` entries; `OR-choices` is the number of those entries with more than one option. `Closure` is the number of distinct skills (and their summed `estHours`) a learner starting from nothing must learn when every OR-choice takes its first listed option and every prerequisite group takes its first listed edge. It is an indicative size, not the optimal plan.

| Role slug | Title | Category | demandScore | Requirements | OR-choices | Closure (skills / hours) |
|---|---|---|---|---|---|---|
| data-analyst | Data Analyst | data | 0.85 | 5 | 1 | 6 / 160 |
| bi-analyst | BI Analyst | data | 0.60 | 6 | 1 | 9 / 195 |
| data-scientist | Data Scientist | data | 0.75 | 8 | 1 | 10 / 270 |
| machine-learning-engineer | Machine Learning Engineer | data | 0.70 | 9 | 1 | 15 / 387 |
| data-engineer | Data Engineer | data | 0.80 | 10 | 1 | 10 / 240 |
| analytics-engineer | Analytics Engineer | data | 0.50 | 7 | 1 | 7 / 165 |
| ai-nlp-engineer | AI / NLP Engineer | data | 0.55 | 8 | 1 | 15 / 405 |
| mlops-engineer | MLOps Engineer | data | 0.50 | 9 | 2 | 19 / 402 |
| frontend-developer | Frontend Developer | engineering | 0.80 | 10 | 2 | 12 / 221 |
| backend-developer-node | Backend Developer (Node.js) | engineering | 0.75 | 9 | 1 | 16 / 255 |
| python-backend-developer | Python Backend Developer | engineering | 0.70 | 9 | 2 | 20 / 385 |
| full-stack-mern-developer | Full-Stack MERN Developer | engineering | 0.80 | 10 | 1 | 19 / 319 |
| java-backend-developer | Java Backend Developer | engineering | 0.65 | 10 | 1 | 15 / 350 |
| devops-engineer | DevOps Engineer | engineering | 0.75 | 10 | 2 | 16 / 270 |
| cloud-engineer | Cloud Engineer | engineering | 0.75 | 10 | 1 | 11 / 202 |
| site-reliability-engineer | Site Reliability Engineer | engineering | 0.55 | 10 | 1 | 12 / 230 |
| platform-kubernetes-engineer | Platform / Kubernetes Engineer | engineering | 0.50 | 10 | 2 | 18 / 312 |
| ui-developer | UI Developer | design | 0.40 | 7 | 1 | 8 / 141 |

Role mix: 8 data, 9 engineering, 1 design (the `product` and `management` categories are valid but unused in v1). Required proficiency across all 157 requirements: 92 intermediate, 62 beginner, 3 advanced. The largest closure is 20 skills, within the design limit of about 25.

## 8. Dataset statistics (computed from `data/v1`)

| Metric | Value |
|---|---|
| Skills | 114 |
| Edges (total) | 205 |
| Prerequisite edges (`prerequisite_of`) | 183 |
| Corequisite edges (`corequisite_with`) | 22 |
| Prerequisite groups (OR-prerequisites) | 11 (all with 2 to 4 edges) |
| Roles | 18 |
| Root skills (no prerequisites) | 17 |
| Leaf skills (no dependents) | 47 |
| Maximum prerequisite depth | 7 (`web-security`) |
| Average in-degree (prerequisite edges per skill) | 1.61 over all skills, 1.89 over non-root skills |
| Orphan skills | 0 |
| Prerequisite graph acyclic | Yes |
| `estHours` range | 5 to 50 hours |
| `baseDifficulty` distribution | 1: 7, 2: 34, 3: 56, 4: 17, 5: 0 |

Roots: excel, statistics, probability, linear-algebra, calculus, tableau, python, sql, html, java, go, git, linux, networking-basics, json-yaml, agile-scrum, technical-communication.

Skills per depth level (longest prerequisite chain from a root): depth 0: 17, 1: 25, 2: 39, 3: 21, 4: 7, 5: 3, 6: 1, 7: 1.

Skills per category:

| Category | Skills |
|---|---|
| concept | 33 |
| tool | 27 |
| framework | 22 |
| programming | 11 |
| database | 6 |
| math | 5 |
| domain | 5 |
| cloud | 3 |
| soft-skill | 2 |
| **Total** | **114** |

Edge sources by reference type are listed in section 3. All D1 numeric targets are met: 80 to 120 nodes (114), at least 150 prerequisite edges (183), `estHours` and `marketDemand` on every skill, acyclic prerequisite graph, and at least one OR-choice per role.

## 9. Validation

On every run (including `--dry-run`) `scripts/seed.js` checks, and refuses to write anything if any error is found:

- All three files parse as JSON arrays.
- Skills: non-empty unique `slug`, `name`, `category`; `baseDifficulty` an integer 1 to 5; `marketDemand` a number 0 to 1; `estHours` greater than 0 when present; `aliases` an array of strings.
- Edges: both endpoints are known slugs; `type` is valid; no self-loops; no duplicates (corequisite pairs are compared order-independently, so a reversed duplicate is rejected); `group` only on `prerequisite_of`; every (target, group) has at least two edges.
- Roles: unique `slug`, valid `category`, `demandScore` in 0 to 1, non-empty `requiredSkills`, valid `minProficiency`, non-empty `anyOf` of known slugs, a `label` whenever `anyOf` has more than one entry, and at least one OR-choice (multi-skill `anyOf` or a grouped prerequisite in the role's ancestor closure).
- The `prerequisite_of` subgraph is acyclic (Kahn's algorithm; a failing run prints a concrete cycle).
- Warnings (non-fatal): orphan skills, skill count outside 80 to 120, fewer than 150 prerequisite edges.

## 10. Known limitations

- **Expert-estimated demand and hours.** `marketDemand`, `demandScore` and `estHours` are judgments calibrated against a handful of fixed anchors, not measurements. They are internally consistent enough to compare plans but should not be quoted as market statistics.
- **Edge sources are indicative.** The `source` field records the type of reference consulted, not a verified citation per edge.
- **Static data.** The dataset is a snapshot. Technologies and job requirements change, and nothing updates the data automatically.
- **Market bias.** Curation reflects the general global and Indian technology job market as seen through public roadmaps and syllabi; it does not model regional, sector or seniority differences, and covers only three tracks.
- **Granularity choices.** Some nodes combine closely related tools (for example `matplotlib-seaborn`, `json-yaml`, `monitoring-prometheus-grafana`, `gitops-argocd`) to keep the graph small; a learner who knows only one of them is treated as all-or-nothing.
- **Weak links.** For example `figma` has only a weak prerequisite link to `technical-communication`, because design tooling has no strong technical prerequisite in the graph.
- **Transitively redundant edges.** 19 mandatory edges are implied by other paths in the graph (for example `javascript` to `typescript`, `sql` to `snowflake`, `git` to `gitops-argocd`). They were kept as explicit curation, since the direct relationship is meaningful on its own and removal would not change any search result.
- **Single proficiency scale.** Costs scale linearly with proficiency level; real learning curves are not linear.

## 11. Future work

- **Sampled-posting demand pipeline.** Collect and tag a sample of job postings per role, compute `marketDemand` and `demandScore` as measured shares with sample sizes, and record the collection date.
- **Verified edge citations.** Replace track-level source notes with per-edge references and a review checklist.
- **More tracks and roles.** Product, management and additional design roles are valid categories but unused.
- **Versioning.** Publish revisions as `data/v2/` rather than editing `v1` in place, so computed paths and evaluation results remain reproducible against a fixed dataset; the seed script's `--data` flag already supports this.
