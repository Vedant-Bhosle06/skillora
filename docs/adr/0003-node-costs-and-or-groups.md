# ADR-0003: Learning cost on skills; OR-groups for alternatives

- **Status:** Accepted
- **Date:** 2026-10-02
- **Deciders:** Members A, B

## Context

Spec v3.0 put learning hours on edges (`weight` = hours to learn the target skill). A skill with three prerequisites then had three different costs, and summing edge weights along a plan double-counted. Separately, with only mandatory ("AND") prerequisites, the set of skills a user must learn is fixed, so there can be no meaningful alternative paths (O4).

## Decision

1. **Cost lives on the skill.** `skills.estHours` is the estimated time from zero to intermediate. A step from rank *r* to rank *t* costs `estHours × (t − r) / 2`. If an admin omits `estHours`, it defaults to `baseDifficulty × 8`. Edges carry no weight.
2. **Two kinds of OR-choice:**
   - a role requirement lists several acceptable skills: `requiredSkills[].anyOf` (for example Tableau **or** Power BI);
   - prerequisite edges into the same skill that share a `group` value mean "needs any one of these" (for example TensorFlow **or** PyTorch for Deep Learning).
3. **`corequisite_with` edges are informational only**: shown in the graph and used in rationales, never in search or cycle checks.
4. Market demand is a per-skill value (`skills.marketDemand`, 0–1), used in ranking.

## Alternatives considered

- **Keep edge weights.** Inconsistent and double-counting, as above.
- **Model alternatives as separate role variants.** Multiplies roles and hides the choice from the search.

## Consequences

- ➕ One consistent cost per skill and proficiency step; plan cost is a simple sum.
- ➕ Real, explainable alternatives: each one corresponds to a different OR-choice.
- ➖ The dataset must contain OR-choices; D1 requires at least one per role.
- ➖ The step cost is linear in proficiency, a simplification acknowledged in D6.
