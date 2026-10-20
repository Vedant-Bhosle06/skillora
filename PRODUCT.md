# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Two audiences, weighted equally:

- **Students and early-career people** choosing a first tech role (data, web, cloud/DevOps) who do not know what to learn next or in what order.
- **Career switchers** — working people moving into a tech role who already hold some relevant skills and want to skip what they know.

Their job: go from "I know these skills, I want that role" to an ordered, realistic learning plan they can follow and update.

## Product Purpose

SKILLORA maps a person's current skills (with proficiency) onto a curated skill graph, takes a target role, and computes the cheapest learning path that respects prerequisites, with up to two alternative routes. As skills are completed the plan is recomputed and old plans are kept as history. Success: a learner reaches the role's requirements with fewer wasted hours than a generic roadmap, never meeting a step before what it depends on.

## Positioning

Not a course list or a generic roadmap: the plan is computed per person by an A* search over a real prerequisite graph, starts from what the learner already knows (upgrades cost less than learning from zero), prices "either tool" choices (e.g. Tableau or Power BI) and shows the alternatives side by side.

## Operating Context

- Web app: register → add current skills with level → pick a target role → dashboard roadmap → alternatives → progress tracking (tick a skill, plan recomputes) → skill graph explorer → settings; admins curate skills, edges and roles.
- Stack: React (Vite, Tailwind v4, motion, three.js on the homepage) client; Node/Express API; Python/FastAPI path service (A* search); MongoDB Atlas. Strict production Content-Security-Policy (self-hosted assets only).
- The public homepage cannot read the authenticated graph API; it uses a generated snapshot (`skillora-client/src/content/landing-graph.json`, built by `scripts/build-landing-graph.py`).

## Capabilities and Constraints

- Dataset (data/v1): 114 skills, 183 prerequisite links + 22 co-requisite links (205 total), 11 either-or prerequisite groups, 18 roles across data, engineering and design.
- Proficiency levels: beginner, intermediate, advanced. Hours are curated estimates (zero → working level); market demand scores are expert estimates, not measured.
- The engine returns a primary path plus alternatives within 1.5× of the cheapest, with step-by-step rationale.
- Terminology: skill, role, requirement, prerequisite, route/path, step, alternative, recompute.

## Brand Commitments

- Name **SKILLORA**, all-caps wordmark.
- The **S-path mark**: an S-shaped path through four skill nodes (start → goal); colour may change, form stays (`skillora-client/src/components/Logo.tsx`, `public/favicon.svg`).
- **Light and dark modes are mandatory** on every surface, switchable by the theme toggle.

## Evidence on Hand

Real, citable: the dataset counts above; engine outputs (e.g. Data Analyst from Python beginner + SQL intermediate: Tableau → Statistics → Python → Pandas, 60 h vs 65 h alternative); the D6 evaluation (`docs/D6_Evaluation_Report.md`, `docs/evaluation/results.json`): 47.8% time saved on the worked example vs a 115 h generic roadmap, 24.6% mean over 6 profiles, 0 prerequisite-order violations vs up to 8.05 in shuffled roadmaps; A* reaches the best ML Engineer plan after 433 states vs 2,616 for Dijkstra.

Absent — must not be fabricated: users or user counts, testimonials, company logos, press, pricing, partnerships, job-placement outcomes. SKILLORA is a **college team project** (three members) and the site must not present it as a commercial company.

## Product Principles

1. Start from what the person already knows; never make them relearn it.
2. Order is non-negotiable: no step before what it needs.
3. Show the reasoning — hours, alternatives and why each step is there — rather than asking for trust.
4. Plans are living: progress changes the plan, and history is kept.
5. Claim only what the engine and evaluation can show.

## Accessibility & Inclusion

Must respect reduced-motion preferences (every animation has a still fallback) and remain usable at phone widths; text contrast at WCAG AA in both themes.
