# ADR-0011: Explicit collection names matching the data model

- **Status:** Accepted
- **Date:** 2026-10-15
- **Deciders:** Members A, B

## Context

Mongoose derives collection names from model names, so the `SkillEdge`, `ComputedPath` and `EvaluationScenario` models wrote to `skilledges`, `computedpaths` and `evaluationscenarios`, while the data model and documentation use `skill_edges`, `computed_paths` and `evaluation_scenarios`. The path service read the edges collection by a configurable name defaulting to `skilledges` to compensate. Schema documentation that does not match the database is misleading for reviewers and fragile for new code.

## Decision

Pin the collection names in the three models (`mongoose.model(name, schema, 'skill_edges')`, and likewise for the others), set the path service's `EDGES_COLLECTION` default to `skill_edges`, and rename the existing collections in the shared database in place (data and indexes preserved).

## Alternatives considered

- **Keep Mongoose's defaults and change the documentation.** Leaves inconsistent naming (`skilledges` beside `skill_edges` in prose) and an implicit dependency on Mongoose's pluralisation rules.

## Consequences

- ➕ Database, models, path service and documentation use the same names.
- ➖ Anyone running an older checkout of the path service must pull, or set `EDGES_COLLECTION=skill_edges`.
