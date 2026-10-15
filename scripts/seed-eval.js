#!/usr/bin/env node
// Build the D6 evaluation: 6 scenarios, system vs. naive baseline vs. hand-written expert path (DB-6).
//
// Usage (from repo root; the Python path service must be running):
//   node scripts/seed-eval.js
//
// Writes: MongoDB `evaluationscenarios` (upsert by scenarioName), docs/evaluation/results.json,
//         docs/evaluation/metrics-table.md. Re-running is idempotent.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const API = path.join(ROOT, 'skillora-api');
const OUT_DIR = path.join(ROOT, 'docs', 'evaluation');

const RANK = { beginner: 1, intermediate: 2, advanced: 3 };
const SHUFFLES = 20;
// Baseline order-violation shuffles: scenario i (0-based index in SCENARIOS) draws its 20 shuffles from
// mulberry32(SHUFFLE_SEED_BASE + i), so S1 = 42, S2 = 43, ... S6 = 47. A per-scenario seed keeps the
// shuffle samples of scenarios that share a baseline list (S1, S2) independent of each other.
const SHUFFLE_SEED_BASE = 42;

// ---------- Scenarios ----------
// held: [slug, proficiency]. expert: ordered slugs a career advisor would recommend.
const SCENARIOS = [
  {
    name: 'S1 Complete beginner to Data Analyst',
    held: [],
    role: 'data-analyst',
    // Advisor: analysts live in SQL first, so start there, add statistics for the reasoning side,
    // then Python/pandas. Power BI is the safer pick over Tableau (cheaper licence, more job ads),
    // and Excel is learned right before it as its on-ramp.
    expert: ['sql', 'statistics', 'python', 'pandas', 'excel', 'power-bi']
  },
  {
    name: 'S2 Python beginner with SQL to Data Analyst',
    held: [['python', 'beginner'], ['sql', 'intermediate']],
    role: 'data-analyst',
    // Advisor: SQL is already fine. Lift Python to working level, then statistics, pandas on top,
    // and finish with the dashboard tool (Excel first, then Power BI).
    expert: ['python', 'statistics', 'pandas', 'excel', 'power-bi']
  },
  {
    name: 'S3 Python and stats to Machine Learning Engineer',
    held: [['python', 'intermediate'], ['statistics', 'beginner']],
    role: 'machine-learning-engineer',
    // Advisor: engineering hygiene (git) and numeric libraries first, then the maths behind ML,
    // the ML core and scikit-learn, then deep learning with PyTorch (the framework most employers
    // ask for), and finally the deployment side: Linux, Docker, MLflow.
    expert: ['git', 'numpy', 'pandas', 'calculus', 'linear-algebra', 'machine-learning', 'scikit-learn',
      'feature-engineering', 'pytorch', 'deep-learning', 'linux', 'docker', 'mlflow']
  },
  {
    name: 'S4 Frontend basics to Full-Stack MERN Developer',
    held: [['html', 'intermediate'], ['css', 'intermediate'], ['javascript', 'beginner']],
    role: 'full-stack-mern-developer',
    // Advisor: modern JS and npm, then React (frontend first because that is what they already
    // know), then the backend (Node, HTTP, Express), data layer (MongoDB/Mongoose), REST design
    // and auth. Bootstrap chosen as the quick CSS framework, Git picked up first.
    expert: ['git', 'es6-plus', 'dom-manipulation', 'npm', 'react', 'async-javascript', 'node-js',
      'networking-basics', 'http-web-fundamentals', 'express', 'json-yaml', 'mongodb', 'mongoose',
      'rest-api-design', 'authentication-jwt', 'bootstrap']
  },
  {
    name: 'S5 Linux and Git basics to DevOps Engineer',
    held: [['linux', 'beginner'], ['git', 'beginner']],
    role: 'devops-engineer',
    // Advisor: deepen Linux and Git, add shell scripting, then containers and orchestration,
    // CI/CD with GitHub Actions (natural next to Git), then cloud (AWS), Terraform, monitoring.
    expert: ['linux', 'git', 'bash-scripting', 'networking-basics', 'json-yaml', 'docker', 'kubernetes',
      'agile-scrum', 'ci-cd-concepts', 'github-collaboration', 'github-actions', 'cloud-fundamentals',
      'aws', 'terraform', 'http-web-fundamentals', 'monitoring-prometheus-grafana']
  },
  {
    name: 'S6 Analyst with strong SQL to Data Engineer',
    held: [['python', 'intermediate'], ['sql', 'advanced'], ['excel', 'advanced']],
    role: 'data-engineer',
    // Advisor: a career switcher with strong SQL goes modelling, warehousing, then pipelines and
    // orchestration; Snowflake as the warehouse employers name most; PySpark for scale;
    // Git and Linux are quick basics picked up first.
    expert: ['git', 'linux', 'data-modeling', 'data-warehousing', 'snowflake', 'etl-pipelines', 'airflow', 'pyspark']
  }
];

const SENSITIVITY = { scenarioIndex: 1, alpha: 0.4, beta: 0.6 };

// ---------- Helpers ----------

function fail(msg) {
  console.error(`\nERROR: ${msg}`);
  process.exit(1);
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

function loadApi() {
  const dotenv = require(require.resolve('dotenv', { paths: [API] }));
  dotenv.config({ path: path.join(API, '.env'), quiet: true });
  return {
    mongoose: require(require.resolve('mongoose', { paths: [API] })),
    axios: require(require.resolve('axios', { paths: [API] })),
    Skill: require(path.join(API, 'models', 'Skill')),
    SkillEdge: require(path.join(API, 'models', 'SkillEdge')),
    Role: require(path.join(API, 'models', 'Role')),
    EvaluationScenario: require(path.join(API, 'models', 'EvaluationScenario'))
  };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6D2B79F5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffled(arr, rand) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const round2 = (n) => Math.round(n * 100) / 100;

function jaccard(a, b) {
  const A = new Set(a);
  const B = new Set(b);
  const inter = [...A].filter((x) => B.has(x)).length;
  const union = new Set([...A, ...B]).size;
  return union === 0 ? 1 : inter / union;
}

// Kendall tau over skills present in both lists; null when fewer than 2 are shared.
function kendallTau(a, b) {
  const posB = new Map(b.map((x, i) => [x, i]));
  const common = a.filter((x) => posB.has(x));
  const n = common.length;
  if (n < 2) return null;
  let conc = 0;
  let disc = 0;
  for (let i = 0; i < n; i++) {
    for (let j = i + 1; j < n; j++) {
      // common is in a-order, so only b-order can disagree
      if (posB.get(common[i]) < posB.get(common[j])) conc++;
      else disc++;
    }
  }
  return (conc - disc) / (n * (n - 1) / 2);
}

// ---------- Python service ----------

function makeClient(axios) {
  const base = process.env.PYTHON_SERVICE_URL || 'http://localhost:5001';
  const headers = { 'X-Internal-Key': process.env.INTERNAL_API_KEY };
  const post = async (route, body) => {
    try {
      const res = await axios.post(base + route, body, { headers, timeout: 60000 });
      return res.data;
    } catch (err) {
      if (!err.response) fail(`Python path service unreachable at ${base} (${err.code || err.message}). Start it first.`);
      fail(`${route} returned ${err.response.status}: ${JSON.stringify(err.response.data)}`);
    }
  };
  return { base, post };
}

// ---------- Baseline ----------
// Naive plan with no personalisation. Cost from zero = estHours * t / 2, where t is the largest rank
// the role requires of that skill (1 for skills included only as prerequisites). Core (corequisite)
// edges are ignored. The skill set B is built deterministically as a fixpoint:
//   1. Start: B = the FIRST anyOf option of every requirement (at its minRank target), plus the
//      transitive closure of these under MANDATORY prerequisites (all added at rank 1; a skill reached
//      twice keeps its highest rank).
//   2. Repeat until stable. For every skill in B and each of its prerequisite OR-groups (skills visited
//      in slug order, groups in name order; each pass works on a slug-sorted snapshot of B and tests
//      membership against the live set): if any member of the group is already in B the group is
//      satisfied and nothing is added; otherwise add the member with the lowest slug, plus its
//      mandatory closure. The new skills are visited in the next pass.
// An OR-group is therefore resolved by a member the plan already contains (e.g. the role's own backend
// runtime, or a deep-learning framework it lists) before falling back to the alphabetically lowest slug.
// Which member is picked is a modelling choice and moves the baseline hours, hence the savings.

function buildBaseline(role, reqs, ctx) {
  const { prereqsOf, slugOf, hoursOf } = ctx;
  const rankNeeded = new Map(); // id -> rank
  const requiredIds = new Set();
  const order = []; // generation order
  const add = (id, rank) => {
    if (!rankNeeded.has(id)) order.push(id);
    rankNeeded.set(id, Math.max(rankNeeded.get(id) || 0, rank));
  };
  // Add id's mandatory prerequisites (rank 1) transitively; groups are not touched here.
  const closeMandatory = (id) => {
    for (const p of prereqsOf(id).mandatory) {
      const seen = rankNeeded.has(p);
      add(p, 1);
      if (!seen) closeMandatory(p);
    }
  };

  // 1. first anyOf option of each requirement + mandatory closure
  for (const r of reqs) {
    const id = r.anyOf[0];
    const seen = rankNeeded.has(id);
    add(id, r.minRank);
    requiredIds.add(id);
    if (!seen) closeMandatory(id);
  }

  // 2. resolve OR-groups to a fixpoint
  const bySlug = (x, y) => slugOf(x).localeCompare(slugOf(y));
  for (let changed = true; changed;) {
    changed = false;
    for (const id of [...rankNeeded.keys()].sort(bySlug)) {
      const { groups } = prereqsOf(id);
      for (const g of Object.keys(groups).sort()) {
        if (groups[g].some((m) => rankNeeded.has(m))) continue; // already satisfied by a member of B
        const pick = groups[g].slice().sort(bySlug)[0];
        add(pick, 1);
        closeMandatory(pick);
        changed = true;
      }
    }
  }

  const ids = [...order];
  const hours = ids.reduce((s, id) => s + hoursOf(id) * rankNeeded.get(id) / 2, 0);
  return { ids, hours, rankNeeded, requiredIds };
}

// ---------- Main ----------

async function main() {
  const { mongoose, axios, Skill, SkillEdge, Role, EvaluationScenario } = loadApi();
  if (!process.env.MONGO_URI) fail('MONGO_URI is not set (skillora-api/.env)');
  const py = makeClient(axios);

  section('Python path service');
  try {
    const h = await axios.get(py.base + '/health', { timeout: 5000 });
    if (!h.data.graphLoaded) fail('Python service is up but the graph is not loaded');
    console.log(`${py.base} ok: ${h.data.nodes} nodes, ${h.data.edges} edges`);
  } catch (err) {
    if (err.response) fail(`/health returned ${err.response.status}`);
    fail(`Python path service unreachable at ${py.base} (${err.code || err.message}). Start it first.`);
  }

  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log(`Connected to database "${mongoose.connection.name}"`);

  try {
    // ----- load graph -----
    const skills = await Skill.find().lean();
    const idBySlug = new Map(skills.map((s) => [s.slug, String(s._id)]));
    const slugById = new Map(skills.map((s) => [String(s._id), s.slug]));
    const hoursById = new Map(skills.map((s) => [String(s._id), s.estHours != null ? s.estHours : s.baseDifficulty * 8]));
    const edges = await SkillEdge.find({ type: 'prerequisite_of' }).lean();
    const parents = new Map(); // target id -> { mandatory: [], groups: {g: []} }
    for (const e of edges) {
      const t = String(e.targetSkillId);
      const s = String(e.sourceSkillId);
      if (!parents.has(t)) parents.set(t, { mandatory: [], groups: {} });
      const p = parents.get(t);
      if (e.group) (p.groups[e.group] = p.groups[e.group] || []).push(s);
      else p.mandatory.push(s);
    }
    const roles = await Role.find().lean();
    const roleBySlug = new Map(roles.map((r) => [r.slug, r]));
    console.log(`Loaded ${skills.length} skills, ${edges.length} prerequisite edges, ${roles.length} roles`);

    const sid = (slug, where) => {
      const id = idBySlug.get(slug);
      if (!id) fail(`Unknown skill slug "${slug}" in ${where}`);
      return id;
    };
    const slugs = (ids) => ids.map((i) => slugOf(i));
    const slugOf = (id) => slugById.get(String(id)) || String(id);
    const ctx = {
      prereqsOf: (id) => parents.get(id) || { mandatory: [], groups: {} },
      slugOf,
      hoursOf: (id) => hoursById.get(id)
    };

    // ----- run scenarios -----
    const results = [];
    const rankToName = ['', 'beginner', 'intermediate', 'advanced'];

    for (const [scenarioIndex, sc] of SCENARIOS.entries()) {
      section(sc.name);
      const role = roleBySlug.get(sc.role);
      if (!role) fail(`Unknown role "${sc.role}"`);
      sc.expert.forEach((s) => sid(s, `${sc.name} expert path`));
      if (new Set(sc.expert).size !== sc.expert.length) fail(`${sc.name}: duplicate slug in expert path`);

      const heldSkills = sc.held.map(([slug, prof]) => ({ skillId: sid(slug, sc.name), rank: RANK[prof] }));
      const heldRank = new Map(heldSkills.map((h) => [h.skillId, h.rank]));
      const requirements = role.requiredSkills.map((req) => ({
        anyOf: req.anyOf.map((id) => id.toString()),
        minRank: RANK[req.minProficiency] || 1,
        label: req.label || ''
      }));

      // A* (default closure heuristic), k = 3
      const aStar = await py.post('/compute/paths', { heldSkills, requirements, k: 3, alpha: 0.7, beta: 0.3, useHeuristic: true });
      const dijk = await py.post('/compute/paths', { heldSkills, requirements, k: 3, alpha: 0.7, beta: 0.3, useHeuristic: false });
      const simple = await py.post('/compute/paths', { heldSkills, requirements, k: 3, alpha: 0.7, beta: 0.3, useHeuristic: true, heuristic: 'simple' });

      const primary = aStar.paths.find((p) => p.rank === 1);
      if (!primary) fail(`${sc.name}: no rank-1 path returned`);
      const systemIds = primary.steps.map((s) => s.skillId);
      const systemHours = primary.totalLearningCost;

      // baseline
      const base = buildBaseline(role, requirements, ctx);
      const baselineRand = mulberry32(SHUFFLE_SEED_BASE + scenarioIndex); // per-scenario seed
      const baselineHours = base.hours;

      // redundant skills avoided
      let redundant = 0;
      for (const id of base.ids) {
        const need = base.requiredIds.has(id) ? base.rankNeeded.get(id) : 1;
        if ((heldRank.get(id) || 0) >= need) redundant++;
      }

      // order violations
      const sysVal = await py.post('/graph/validate-order', { steps: systemIds, heldSkills });
      let totalViol = 0;
      const shuffleViolations = [];
      for (let i = 0; i < SHUFFLES; i++) {
        const v = await py.post('/graph/validate-order', { steps: shuffled(base.ids, baselineRand), heldSkills: [] });
        shuffleViolations.push(v.violations);
        totalViol += v.violations;
      }
      const baselineOrderViolations = totalViol / SHUFFLES;

      const expertIds = sc.expert.map((s) => idBySlug.get(s));
      const metrics = {
        systemHours,
        baselineHours,
        timeSavedPct: round2(((baselineHours - systemHours) / baselineHours) * 100),
        redundantSkillsAvoided: redundant,
        systemOrderViolations: sysVal.violations,
        baselineOrderViolations: round2(baselineOrderViolations),
        expertJaccard: round2(jaccard(systemIds, expertIds)),
        expertKendallTau: (() => { const t = kendallTau(systemIds, expertIds); return t == null ? null : round2(t); })(),
        statesExpandedAStar: aStar.stats.statesExpanded,
        statesExpandedDijkstra: dijk.stats.statesExpanded
      };

      // worked-example assertion
      if (sc === SCENARIOS[1]) {
        if (metrics.baselineHours !== 115 || metrics.systemHours !== 60 || metrics.timeSavedPct !== 47.83) {
          fail(`Scenario 2 must give baseline 115h / system 60h / 47.83% but got ${metrics.baselineHours}h / ${metrics.systemHours}h / ${metrics.timeSavedPct}%`);
        }
      }
      if (metrics.systemOrderViolations !== 0) console.warn(`  WARNING: system path has ${metrics.systemOrderViolations} order violations`);

      const mapPaths = (resp) => resp.paths.map((p) => ({
        rank: p.rank, type: p.type, totalLearningCost: p.totalLearningCost,
        marketDemandAvg: p.marketDemandAvg, compositeScore: p.compositeScore,
        steps: p.steps.map((s) => ({ slug: slugOf(s.skillId), fromRank: s.fromRank, toRank: s.toRank, estCost: s.estCost, rationale: s.rationale }))
      }));

      results.push({
        scenarioName: sc.name,
        role: sc.role,
        held: sc.held.map(([slug, proficiency]) => ({ slug, proficiency })),
        paths: {
          systemPath: slugs(systemIds),
          baselinePath: slugs(base.ids),
          humanExpertPath: sc.expert
        },
        metrics,
        baselineShuffleViolations: shuffleViolations,
        searchEfficiency: {
          closure: { statesToPrimary: aStar.stats.statesToPrimary, statesExpanded: aStar.stats.statesExpanded, elapsedMs: aStar.stats.elapsedMs, capped: aStar.stats.capped },
          simple: { statesToPrimary: simple.stats.statesToPrimary, statesExpanded: simple.stats.statesExpanded, elapsedMs: simple.stats.elapsedMs, capped: simple.stats.capped },
          dijkstra: { statesToPrimary: dijk.stats.statesToPrimary, statesExpanded: dijk.stats.statesExpanded, elapsedMs: dijk.stats.elapsedMs, capped: dijk.stats.capped }
        },
        systemAlgorithm: aStar.algorithm,
        returnedPaths: mapPaths(aStar),
        _db: {
          currentSkills: sc.held.map(([slug, proficiency]) => ({ skillId: sid(slug, sc.name), proficiency })),
          targetRoleId: String(role._id),
          humanExpertPath: expertIds, systemPath: systemIds, baselinePath: base.ids
        }
      });

      console.log(`  system  (${systemHours}h): ${slugs(systemIds).join(' > ')}`);
      console.log(`  expert        : ${sc.expert.join(' > ')}`);
      console.log(`  baseline (${baselineHours}h, ${base.ids.length} skills)`);
      console.log(`  metrics: ${JSON.stringify(metrics)}`);
    }

    // ----- sensitivity -----
    section('Sensitivity (scenario 2, alpha/beta)');
    const s2 = SCENARIOS[SENSITIVITY.scenarioIndex];
    const s2role = roleBySlug.get(s2.role);
    const s2held = s2.held.map(([slug, prof]) => ({ skillId: idBySlug.get(slug), rank: RANK[prof] }));
    const s2req = s2role.requiredSkills.map((req) => ({
      anyOf: req.anyOf.map((id) => id.toString()), minRank: RANK[req.minProficiency] || 1, label: req.label || ''
    }));
    const sensRun = async (alpha, beta) => {
      const r = await py.post('/compute/paths', { heldSkills: s2held, requirements: s2req, k: 3, alpha, beta, useHeuristic: true });
      return r.paths.map((p) => ({
        rank: p.rank, type: p.type, totalLearningCost: p.totalLearningCost, marketDemandAvg: p.marketDemandAvg,
        compositeScore: p.compositeScore, steps: p.steps.map((s) => slugOf(s.skillId))
      }));
    };
    const sensitivity = {
      scenarioName: s2.name,
      default: { alpha: 0.7, beta: 0.3, paths: await sensRun(0.7, 0.3) },
      alternative: { alpha: SENSITIVITY.alpha, beta: SENSITIVITY.beta, paths: await sensRun(SENSITIVITY.alpha, SENSITIVITY.beta) }
    };
    for (const k of ['default', 'alternative']) {
      console.log(`  alpha=${sensitivity[k].alpha} beta=${sensitivity[k].beta}`);
      sensitivity[k].paths.forEach((p) => console.log(`    #${p.rank} ${p.totalLearningCost}h score ${p.compositeScore}: ${p.steps.join(' > ')}`));
    }
    const sig = (paths) => paths.map((p) => p.steps.join('>'));
    sensitivity.rankingChanged = JSON.stringify(sig(sensitivity.default.paths)) !== JSON.stringify(sig(sensitivity.alternative.paths));
    console.log(`  ranking changed: ${sensitivity.rankingChanged}`);

    // ----- upsert -----
    section('Upsert to MongoDB');
    for (const r of results) {
      await EvaluationScenario.findOneAndUpdate(
        { scenarioName: r.scenarioName },
        {
          $set: {
            currentSkills: r._db.currentSkills,
            targetRoleId: r._db.targetRoleId,
            humanExpertPath: r._db.humanExpertPath,
            systemPath: r._db.systemPath,
            baselinePath: r._db.baselinePath,
            metrics: r.metrics
          }
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
    }
    const count = await EvaluationScenario.countDocuments();
    console.log(`Upserted ${results.length} scenarios; collection now has ${count} documents`);

    // ----- files -----
    fs.mkdirSync(OUT_DIR, { recursive: true });
    const clean = results.map(({ _db, ...rest }) => rest);
    fs.writeFileSync(path.join(OUT_DIR, 'results.json'), JSON.stringify({
      parameters: { k: 3, alpha: 0.7, beta: 0.3, shuffles: SHUFFLES, shuffleSeedBase: SHUFFLE_SEED_BASE, shuffleSeedRule: 'mulberry32(shuffleSeedBase + scenarioIndex), scenarioIndex 0-based' },
      scenarios: clean,
      sensitivity
    }, null, 2) + '\n');
    fs.writeFileSync(path.join(OUT_DIR, 'metrics-table.md'), renderMarkdown(clean, sensitivity));
    console.log(`Wrote ${path.relative(ROOT, path.join(OUT_DIR, 'results.json'))} and metrics-table.md`);
  } finally {
    await mongoose.disconnect();
  }
}

function renderMarkdown(results, sens) {
  const f = (v) => (v == null ? 'n/a' : v);
  const lines = [];
  lines.push('# Evaluation results (D6)', '');
  lines.push('Generated by `node scripts/seed-eval.js`. Parameters: k=3, alpha=0.7, beta=0.3; baseline order violations are the mean over 20 seeded shuffles (mulberry32, seed 42 + scenario index, so 42 to 47).', '');
  lines.push('## Quality metrics', '');
  lines.push('| # | Scenario | System h | Baseline h | Time saved % | Redundant avoided | Sys violations | Baseline violations | Expert Jaccard | Expert Kendall tau |');
  lines.push('|---|---|---|---|---|---|---|---|---|---|');
  results.forEach((r, i) => {
    const m = r.metrics;
    lines.push(`| ${i + 1} | ${r.scenarioName} | ${m.systemHours} | ${m.baselineHours} | ${m.timeSavedPct} | ${m.redundantSkillsAvoided} | ${m.systemOrderViolations} | ${m.baselineOrderViolations} | ${m.expertJaccard} | ${f(m.expertKendallTau)} |`);
  });
  lines.push('', '## Search efficiency', '');
  lines.push('States to primary / total states expanded.', '');
  lines.push('| # | A* closure (to primary / total) | A* simple (to primary / total) | Dijkstra (to primary / total) |');
  lines.push('|---|---|---|---|');
  results.forEach((r, i) => {
    const e = r.searchEfficiency;
    const c = (x) => `${f(x.statesToPrimary)} / ${x.statesExpanded}`;
    lines.push(`| ${i + 1} | ${c(e.closure)} | ${c(e.simple)} | ${c(e.dijkstra)} |`);
  });
  lines.push('', '## Sensitivity: alpha / beta weighting (scenario 2)', '');
  lines.push(`Ranking changed: ${sens.rankingChanged ? 'yes' : 'no'}`, '');
  for (const k of ['default', 'alternative']) {
    lines.push(`alpha=${sens[k].alpha}, beta=${sens[k].beta}`, '');
    lines.push('| Rank | Type | Hours | Avg demand | Score | Steps |');
    lines.push('|---|---|---|---|---|---|');
    sens[k].paths.forEach((p) => lines.push(`| ${p.rank} | ${p.type} | ${p.totalLearningCost} | ${p.marketDemandAvg} | ${p.compositeScore} | ${p.steps.join(' > ')} |`));
    lines.push('');
  }
  lines.push('## Paths', '');
  results.forEach((r, i) => {
    lines.push(`### ${i + 1}. ${r.scenarioName}`, '');
    lines.push(`- System: ${r.paths.systemPath.join(' > ')}`);
    lines.push(`- Expert: ${r.paths.humanExpertPath.join(' > ')}`);
    lines.push(`- Baseline (${r.paths.baselinePath.length} skills): ${r.paths.baselinePath.join(', ')}`, '');
  });
  return lines.join('\n') + '\n';
}

main().catch((err) => {
  console.error(`\nERROR: ${err.stack || err.message}`);
  process.exit(1);
});
