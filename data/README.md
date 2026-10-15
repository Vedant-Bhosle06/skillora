# Skillora dataset (`data/`)

Versioned, hand-curated seed data for the Skillora skill graph. Each version lives in its own directory; the current one is `data/v1/`.

| File | Contents | Records (v1) |
|---|---|---|
| `skills.json` | Graph nodes: skills a learner can acquire | 114 |
| `edges.json` | Graph edges: prerequisite and corequisite relations between skills | 205 (183 prerequisite, 22 corequisite) |
| `roles.json` | Target roles and the skills each one requires | 18 |

Each file is a JSON array at the top level. Curation method, rubrics and statistics are described in [`docs/D1_Dataset_Methodology.md`](../docs/D1_Dataset_Methodology.md).

## Identifiers: slugs in JSON, ObjectIds in MongoDB

The JSON files never contain MongoDB ids. Everywhere one record points at a skill, it uses the skill's **slug**:

- `edges.json`: `sourceSkillId` and `targetSkillId` hold skill slugs (the key names are kept for parity with the database schema).
- `roles.json`: every entry of `requiredSkills[].anyOf` is a skill slug.

`scripts/seed.js` loads all skills first, builds a slug-to-`_id` map and resolves these references to ObjectIds when writing to MongoDB. A slug that does not exist in `skills.json` is a validation error.

## `skills.json`

| Field | Type | Required | Rules |
|---|---|---|---|
| `slug` | string | yes | Unique, kebab-case (`power-bi`, `node-js`). Stable identifier; do not rename once seeded. |
| `name` | string | yes | Display name. |
| `category` | string | yes | One of `programming`, `math`, `tool`, `framework`, `database`, `cloud`, `concept`, `domain`, `soft-skill`. (The seed script only requires a non-empty string; v1 uses exactly these nine values.) |
| `description` | string | no | One or two sentences; stored as `""` if absent. |
| `aliases` | string[] | no | Extra typeahead words (`"k8s"`, `"postgres"`). The API search is a case-insensitive word-prefix match on `name` and `aliases`. |
| `baseDifficulty` | integer | yes | 1 to 5. |
| `estHours` | number | no | Greater than 0. Hours from zero to working (intermediate) level. If omitted, the seed script stores `baseDifficulty * 8`. All v1 skills set it explicitly. |
| `marketDemand` | number | yes | 0 to 1. Expert-estimated demand within the skill's track; see the methodology document for the rubric and its limits. |

## `edges.json`

| Field | Type | Required | Rules |
|---|---|---|---|
| `sourceSkillId` | string | yes | Slug of the **prerequisite** (for `prerequisite_of`: the skill that must be known first). |
| `targetSkillId` | string | yes | Slug of the skill that needs it. Must differ from the source. |
| `type` | string | yes | `prerequisite_of` or `corequisite_with`. |
| `group` | string or null | no | Only allowed on `prerequisite_of`. `null` means mandatory. Edges into the **same target** that share a `group` value mean "any one of these is enough". |
| `source` | string | no | Curation note: the kind of reference consulted for this topic (for example `roadmap.sh/devops`, `expert judgment`). It is not a per-edge verified citation. |

Conventions and rules:

- **Group semantics.** A skill becomes learnable when all its mandatory prerequisites (`group: null`) are known **and** at least one prerequisite from each of its groups is known. A group is identified by the pair (target, group name) and must contain at least two edges.
- **Corequisites are stored once.** `corequisite_with` is symmetric, so each pair appears a single time with `sourceSkillId` alphabetically smaller than `targetSkillId` (for example `numpy` / `pandas`, never also `pandas` / `numpy`). The validator rejects the reverse duplicate. Corequisites are informational only: they appear in the graph explorer and rationales and are ignored by path search and cycle checks.
- The `prerequisite_of` subgraph must be acyclic. No self-loops, no duplicate (source, target, type).

## `roles.json`

| Field | Type | Required | Rules |
|---|---|---|---|
| `slug` | string | yes | Unique, kebab-case. |
| `title` | string | yes | Display name. |
| `description` | string | no | Stored as `""` if absent. |
| `category` | string | yes | `data`, `engineering`, `design`, `product` or `management`. |
| `demandScore` | number | no | 0 to 1, expert-estimated overall demand for the role; defaults to `0.5` when omitted. |
| `requiredSkills` | array | yes | Non-empty. Each element is an object described below. |

Each `requiredSkills` element:

| Field | Type | Rules |
|---|---|---|
| `anyOf` | string[] | Non-empty list of skill slugs. One slug = mandatory skill; several = the user needs **any one** of them. |
| `minProficiency` | string | `beginner`, `intermediate` or `advanced`. |
| `label` | string | Required when `anyOf` has more than one slug (for example `"BI tool"`); may be `""` otherwise. |

Every role must offer at least one OR-choice, either an `anyOf` with more than one slug or a grouped prerequisite somewhere in the prerequisite closure of its skills. Keep roles to 10 requirements or fewer.

## Seeding the database

The seed script reuses the Mongoose models in `skillora-api/`, so dependencies are installed there and connection settings come from `skillora-api/.env` (`MONGO_URI`, plus `PYTHON_SERVICE_URL` and `INTERNAL_API_KEY` for the graph reload).

```bash
cd skillora-api && npm install      # once
cd ..                               # back to the repository root
node scripts/seed.js --dry-run      # validate only; never connects to MongoDB
node scripts/seed.js                # validate, then upsert into MongoDB
```

| Flag | Effect |
|---|---|
| `--dry-run` | Load and validate the data, print warnings and errors, then exit without connecting. |
| `--data <dir>` | Read `skills.json`, `edges.json` and `roles.json` from another directory instead of `data/v1`. |
| `--no-reload` | Skip the best-effort call to the Python service that reloads its in-memory graph. |

What a run does:

1. Validates everything (schema rules above, unknown slugs, duplicates, group sizes, acyclicity, OR-choice per role). Any error aborts with exit code 1 and **nothing is written**. Orphan skills and out-of-range counts are reported as warnings.
2. Upserts skills (keyed by `slug`), edges (keyed by source, target, type) and roles (keyed by `slug`), writing only records that are new or changed.
3. Marks active computed paths as stale and asks the Python service to reload its graph.

**Idempotent:** re-running with unchanged files reports every record as unchanged and modifies nothing.

**Deletions are not propagated.** Removing a record from the JSON does not delete it from the database. Remove skills, edges or roles through the admin UI (or the admin API), which also keeps dependent data consistent.

MongoDB collection names (as created by the Mongoose models): `skills`, `skilledges`, `roles`. Note that the edges collection is `skilledges`, not `skill_edges`.

## Adding to the dataset safely

1. **New skill:** append an object to `skills.json` with a unique kebab-case slug, a category from the list above, `baseDifficulty`, `estHours` and `marketDemand` following the rubrics in the methodology document. Then add at least one `prerequisite_of` edge into it (or consciously make it a root) and at least one edge out of or into the graph, so it is not an orphan.
2. **New edge:** use existing slugs, put the prerequisite in `sourceSkillId`. For a corequisite, order the pair alphabetically. For an OR-prerequisite, give two or more edges into the same target the same `group` name. Make sure it cannot create a cycle.
3. **New role:** use existing slugs in `anyOf`, give a `label` for every multi-skill requirement, keep it at 10 requirements or fewer, and include at least one OR-choice.
4. Run `node scripts/seed.js --dry-run` and fix every error and review every warning before seeding for real.
5. Never rename a slug that has already been seeded; add a new skill and migrate through the admin UI instead.
