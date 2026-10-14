#!/usr/bin/env node
// Seed / validate the Skillora skill graph.
//
// Usage (from repo root):
//   node scripts/seed.js                 validate, then upsert into MongoDB
//   node scripts/seed.js --dry-run       validate only, never connects
//   node scripts/seed.js --data <dir>    use another data directory (default data/v1)
//   node scripts/seed.js --no-reload     skip the Python service graph reload
//
// Re-running is idempotent. Records removed from the JSON are NOT deleted from the DB.

const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const API = path.join(ROOT, 'skillora-api');

const EDGE_TYPES = ['prerequisite_of', 'corequisite_with'];
const ROLE_CATEGORIES = ['data', 'engineering', 'design', 'product', 'management'];
const PROFICIENCY_LEVELS = ['beginner', 'intermediate', 'advanced'];

// ---------- CLI ----------

function parseArgs(argv) {
  const opts = { dryRun: false, reload: true, dataDir: path.join(ROOT, 'data', 'v1') };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--dry-run') opts.dryRun = true;
    else if (argv[i] === '--no-reload') opts.reload = false;
    else if (argv[i] === '--data') opts.dataDir = path.resolve(argv[++i] || '');
    else {
      console.error(`Unknown argument: ${argv[i]}`);
      process.exit(1);
    }
  }
  return opts;
}

function section(title) {
  console.log(`\n=== ${title} ===`);
}

// ---------- Load ----------

function loadData(dir) {
  const read = (name) => {
    const file = path.join(dir, name);
    try {
      const data = JSON.parse(fs.readFileSync(file, 'utf8'));
      if (!Array.isArray(data)) throw new Error('top level must be an array');
      return data;
    } catch (err) {
      console.error(`Cannot load ${file}: ${err.message}`);
      process.exit(1);
    }
  };
  return { skills: read('skills.json'), edges: read('edges.json'), roles: read('roles.json') };
}

// ---------- Validation ----------

const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function validateSkills(skills, errors) {
  const slugs = new Set();
  skills.forEach((s, i) => {
    const id = `skills[${i}] (${s && s.slug})`;
    if (!isStr(s.slug)) errors.push(`${id}: slug is required`);
    else if (slugs.has(s.slug)) errors.push(`${id}: duplicate slug`);
    else slugs.add(s.slug);
    if (!isStr(s.name)) errors.push(`${id}: name is required`);
    if (!isStr(s.category)) errors.push(`${id}: category is required`);
    if (s.description != null && typeof s.description !== 'string') errors.push(`${id}: description must be a string`);
    if (s.aliases != null && !(Array.isArray(s.aliases) && s.aliases.every(isStr))) errors.push(`${id}: aliases must be an array of strings`);
    if (!Number.isInteger(s.baseDifficulty) || s.baseDifficulty < 1 || s.baseDifficulty > 5) errors.push(`${id}: baseDifficulty must be an integer 1-5`);
    if (!isNum(s.marketDemand) || s.marketDemand < 0 || s.marketDemand > 1) errors.push(`${id}: marketDemand must be a number 0-1`);
    if (s.estHours != null && (!isNum(s.estHours) || s.estHours <= 0)) errors.push(`${id}: estHours must be > 0 when present`);
  });
  return slugs;
}

function validateEdges(edges, skillSlugs, errors) {
  const seen = new Set();
  const groupCounts = new Map(); // "target|group" -> edge count
  edges.forEach((e, i) => {
    const id = `edges[${i}] (${e.sourceSkillId} -> ${e.targetSkillId})`;
    let ok = true;
    for (const f of ['sourceSkillId', 'targetSkillId']) {
      if (!isStr(e[f])) { errors.push(`${id}: ${f} is required`); ok = false; }
      else if (!skillSlugs.has(e[f])) { errors.push(`${id}: ${f} "${e[f]}" is not a known skill slug`); ok = false; }
    }
    if (!EDGE_TYPES.includes(e.type)) { errors.push(`${id}: invalid type "${e.type}"`); ok = false; }
    if (e.sourceSkillId === e.targetSkillId) errors.push(`${id}: self-loop`);
    if (e.group != null && !isStr(e.group)) errors.push(`${id}: group must be a non-empty string or null`);
    if (e.group != null && e.type !== 'prerequisite_of') errors.push(`${id}: group is only allowed on prerequisite_of`);
    if (e.source != null && typeof e.source !== 'string') errors.push(`${id}: source must be a string`);
    if (!ok) return;

    // Corequisites are symmetric, so A-B and B-A are the same edge
    const pair = e.type === 'corequisite_with' ? [e.sourceSkillId, e.targetSkillId].sort() : [e.sourceSkillId, e.targetSkillId];
    const key = `${e.type}|${pair.join('|')}`;
    if (seen.has(key)) errors.push(`${id}: duplicate edge`);
    seen.add(key);

    if (e.type === 'prerequisite_of' && isStr(e.group)) {
      const gk = `${e.targetSkillId}|${e.group}`;
      groupCounts.set(gk, (groupCounts.get(gk) || 0) + 1);
    }
  });
  for (const [gk, n] of groupCounts) {
    if (n < 2) errors.push(`group "${gk.split('|')[1]}" on target "${gk.split('|')[0]}" has only ${n} edge (needs >= 2)`);
  }
}

// Kahn's algorithm; on failure returns one concrete cycle as a slug list
function findCycle(skillSlugs, prereqEdges) {
  const indeg = new Map([...skillSlugs].map((s) => [s, 0]));
  const adj = new Map([...skillSlugs].map((s) => [s, []]));
  for (const e of prereqEdges) {
    adj.get(e.sourceSkillId).push(e.targetSkillId);
    indeg.set(e.targetSkillId, indeg.get(e.targetSkillId) + 1);
  }
  const queue = [...indeg].filter(([, d]) => d === 0).map(([s]) => s);
  let processed = 0;
  while (queue.length) {
    const n = queue.shift();
    processed++;
    for (const m of adj.get(n)) {
      indeg.set(m, indeg.get(m) - 1);
      if (indeg.get(m) === 0) queue.push(m);
    }
  }
  if (processed === skillSlugs.size) return null;

  // Every remaining node (indeg > 0) lies on or downstream of a cycle; walk predecessors to find one
  const remaining = new Set([...indeg].filter(([, d]) => d > 0).map(([s]) => s));
  const pred = new Map();
  for (const e of prereqEdges) {
    if (remaining.has(e.sourceSkillId) && remaining.has(e.targetSkillId)) {
      if (!pred.has(e.targetSkillId)) pred.set(e.targetSkillId, e.sourceSkillId);
    }
  }
  let node = [...remaining][0];
  const order = [];
  const pos = new Map();
  while (!pos.has(node)) {
    pos.set(node, order.length);
    order.push(node);
    node = pred.get(node);
  }
  // order follows predecessor links, so reverse the loop to get prerequisite -> dependent direction
  const loop = order.slice(pos.get(node)).reverse();
  return [...loop, loop[0]];
}

function validateRoles(roles, skillSlugs, edges, errors) {
  const prereqs = edges.filter((e) => e.type === 'prerequisite_of' && skillSlugs.has(e.sourceSkillId) && skillSlugs.has(e.targetSkillId));
  const incoming = new Map(); // target -> edges into it
  for (const e of prereqs) {
    if (!incoming.has(e.targetSkillId)) incoming.set(e.targetSkillId, []);
    incoming.get(e.targetSkillId).push(e);
  }

  const roleSlugs = new Set();
  roles.forEach((r, i) => {
    const id = `roles[${i}] (${r && r.slug})`;
    if (!isStr(r.slug)) errors.push(`${id}: slug is required`);
    else if (roleSlugs.has(r.slug)) errors.push(`${id}: duplicate slug`);
    else roleSlugs.add(r.slug);
    if (!isStr(r.title)) errors.push(`${id}: title is required`);
    if (!ROLE_CATEGORIES.includes(r.category)) errors.push(`${id}: category "${r.category}" must be one of ${ROLE_CATEGORIES.join(', ')}`);
    if (r.demandScore != null && (!isNum(r.demandScore) || r.demandScore < 0 || r.demandScore > 1)) errors.push(`${id}: demandScore must be a number 0-1`);
    if (!Array.isArray(r.requiredSkills) || r.requiredSkills.length === 0) {
      errors.push(`${id}: requiredSkills must be a non-empty array`);
      return;
    }

    let hasChoice = false;
    const closure = new Set();
    const stack = [];
    r.requiredSkills.forEach((rs, j) => {
      const rid = `${id}.requiredSkills[${j}]`;
      if (!PROFICIENCY_LEVELS.includes(rs.minProficiency)) errors.push(`${rid}: minProficiency "${rs.minProficiency}" must be one of ${PROFICIENCY_LEVELS.join(', ')}`);
      if (!Array.isArray(rs.anyOf) || rs.anyOf.length === 0) { errors.push(`${rid}: anyOf must be a non-empty array`); return; }
      if (rs.anyOf.length > 1) {
        hasChoice = true;
        if (!isStr(rs.label)) errors.push(`${rid}: label is required when anyOf has more than one skill`);
      }
      for (const slug of rs.anyOf) {
        if (!skillSlugs.has(slug)) errors.push(`${rid}: anyOf slug "${slug}" is not a known skill`);
        else if (!closure.has(slug)) { closure.add(slug); stack.push(slug); }
      }
    });

    // Prerequisite-ancestor closure of the role's skills
    while (stack.length) {
      for (const e of incoming.get(stack.pop()) || []) {
        if (e.group != null) hasChoice = true;
        if (!closure.has(e.sourceSkillId)) { closure.add(e.sourceSkillId); stack.push(e.sourceSkillId); }
      }
    }
    if (!hasChoice) errors.push(`${id}: no OR-choice (needs anyOf with >1 skill or a grouped prerequisite in its ancestor closure)`);
  });
}

function validateAll({ skills, edges, roles }) {
  const errors = [];
  const warnings = [];

  const skillSlugs = validateSkills(skills, errors);
  validateEdges(edges, skillSlugs, errors);
  validateRoles(roles, skillSlugs, edges, errors);

  const prereqs = edges.filter((e) => e.type === 'prerequisite_of' && skillSlugs.has(e.sourceSkillId) && skillSlugs.has(e.targetSkillId) && e.sourceSkillId !== e.targetSkillId);
  const cycle = findCycle(skillSlugs, prereqs);
  if (cycle) errors.push(`prerequisite_of graph has a cycle: ${cycle.join(' -> ')}`);

  const touched = new Set();
  prereqs.forEach((e) => { touched.add(e.sourceSkillId); touched.add(e.targetSkillId); });
  const orphans = [...skillSlugs].filter((s) => !touched.has(s));
  if (orphans.length) warnings.push(`${orphans.length} orphan skill(s) with no prerequisite edge: ${orphans.join(', ')}`);
  if (skills.length < 80 || skills.length > 120) warnings.push(`skill count ${skills.length} is outside the 80-120 target`);
  if (prereqs.length < 150) warnings.push(`only ${prereqs.length} prerequisite edges (target >= 150)`);

  return { errors, warnings, orphans, prereqCount: prereqs.length };
}

// ---------- Seeding ----------

// Load B's models through B's own node_modules so mongoose is a single instance
function loadApi() {
  const dotenv = require(require.resolve('dotenv', { paths: [API] }));
  dotenv.config({ path: path.join(API, '.env'), quiet: true });
  return {
    mongoose: require(require.resolve('mongoose', { paths: [API] })),
    axios: require(require.resolve('axios', { paths: [API] })),
    Skill: require(path.join(API, 'models', 'Skill')),
    SkillEdge: require(path.join(API, 'models', 'SkillEdge')),
    Role: require(path.join(API, 'models', 'Role')),
    markAllPathsStale: require(path.join(API, 'utils', 'markPathStale')).markAllPathsStale
  };
}

// Only write documents that are new or differ from the DB. Mongoose's automatic
// updatedAt would otherwise make every re-run look like a modification, so
// timestamps are managed here instead (createdAt on insert, updatedAt on change).
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);

async function upsertChanged(Model, label, items, { filterOf, setOf, current, hasUpdatedAt }) {
  const now = new Date();
  const ops = [];
  let unchanged = 0;
  for (const item of items) {
    const set = setOf(item);
    const existing = current(item);
    if (existing && Object.keys(set).every((k) => same(existing[k], set[k]))) {
      unchanged++;
      continue;
    }
    if (hasUpdatedAt) set.updatedAt = now;
    ops.push({
      updateOne: {
        filter: filterOf(item),
        update: { $set: set, $setOnInsert: { createdAt: now } },
        upsert: true,
        timestamps: false
      }
    });
  }
  const res = ops.length ? await Model.bulkWrite(ops) : { upsertedCount: 0, modifiedCount: 0 };
  console.log(`${label}: ${res.upsertedCount} upserted, ${res.modifiedCount} modified, ${unchanged} unchanged`);
  return { upserted: res.upsertedCount, modified: res.modifiedCount, unchanged };
}

async function seedSkills(Skill, skills) {
  const existing = new Map((await Skill.find().lean()).map((d) => [d.slug, d]));
  const res = await upsertChanged(Skill, 'Skills', skills, {
    hasUpdatedAt: true,
    filterOf: (s) => ({ slug: s.slug }),
    current: (s) => existing.get(s.slug),
    setOf: (s) => ({
      name: s.name,
      category: s.category,
      description: s.description || '',
      aliases: s.aliases || [],
      baseDifficulty: s.baseDifficulty,
      // bulkWrite skips the pre-save hook, so apply the estHours default here
      estHours: s.estHours != null ? s.estHours : s.baseDifficulty * 8,
      marketDemand: s.marketDemand
    })
  });
  const docs = await Skill.find({}, { slug: 1 }).lean();
  return { idBySlug: new Map(docs.map((d) => [d.slug, d._id])), res };
}

async function seedEdges(SkillEdge, edges, idBySlug) {
  const keyOf = (src, tgt, type) => `${src}|${tgt}|${type}`;
  const existing = new Map((await SkillEdge.find().lean()).map((d) => [keyOf(d.sourceSkillId, d.targetSkillId, d.type), d]));
  const ids = (e) => [idBySlug.get(e.sourceSkillId), idBySlug.get(e.targetSkillId)];
  return upsertChanged(SkillEdge, 'Edges', edges, {
    hasUpdatedAt: false,
    filterOf: (e) => {
      const [sourceSkillId, targetSkillId] = ids(e);
      return { sourceSkillId, targetSkillId, type: e.type };
    },
    current: (e) => existing.get(keyOf(...ids(e), e.type)),
    setOf: (e) => ({ group: e.group || null, source: e.source || '' })
  });
}

async function seedRoles(Role, roles, idBySlug) {
  const existing = new Map((await Role.find().lean()).map((d) => [d.slug, d]));
  return upsertChanged(Role, 'Roles', roles, {
    hasUpdatedAt: true,
    filterOf: (r) => ({ slug: r.slug }),
    current: (r) => {
      const d = existing.get(r.slug);
      // Strip subdocument _ids so the comparison only covers seeded fields
      return d && { ...d, requiredSkills: d.requiredSkills.map(({ anyOf, label, minProficiency }) => ({ anyOf, label, minProficiency })) };
    },
    setOf: (r) => ({
      title: r.title,
      description: r.description || '',
      category: r.category,
      demandScore: r.demandScore != null ? r.demandScore : 0.5,
      requiredSkills: r.requiredSkills.map((rs) => ({
        anyOf: rs.anyOf.map((slug) => idBySlug.get(slug)),
        label: rs.label || '',
        minProficiency: rs.minProficiency
      }))
    })
  });
}

// Best effort: the Python service may not be running
async function reloadPythonGraph(axios) {
  const url = `${process.env.PYTHON_SERVICE_URL || 'http://localhost:5001'}/graph/reload`;
  try {
    await axios.post(url, {}, { headers: { 'X-Internal-Key': process.env.INTERNAL_API_KEY }, timeout: 3000 });
    console.log(`Python graph reloaded (${url})`);
    return true;
  } catch (err) {
    console.warn(`WARN  Python graph reload failed (${url}): ${err.message}`);
    return false;
  }
}

async function seed(opts, data, validation) {
  const { mongoose, axios, Skill, SkillEdge, Role, markAllPathsStale } = loadApi();

  section('Connecting');
  if (!process.env.MONGO_URI) throw new Error('MONGO_URI is not set (check skillora-api/.env)');
  await mongoose.connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 15000 });
  console.log(`Connected to database "${mongoose.connection.name}"`);
  await Promise.all([Skill.init(), SkillEdge.init(), Role.init()]);
  console.log('Indexes ensured');

  try {
    section('Upserting');
    const { idBySlug, res: skillRes } = await seedSkills(Skill, data.skills);
    const edgeRes = await seedEdges(SkillEdge, data.edges, idBySlug);
    const roleRes = await seedRoles(Role, data.roles, idBySlug);

    section('Post-seed');
    await markAllPathsStale();
    console.log('Active computed paths marked stale');
    let reloaded = null;
    if (opts.reload) reloaded = await reloadPythonGraph(axios);
    else console.log('Python reload skipped (--no-reload)');

    section('Summary');
    const row = (label, n, r) => console.log(`${label.padEnd(8)} ${String(n).padStart(4)} in file | ${r.upserted} upserted, ${r.modified} modified, ${r.unchanged} unchanged`);
    row('Skills', data.skills.length, skillRes);
    row('Edges', data.edges.length, edgeRes);
    row('Roles', data.roles.length, roleRes);
    console.log(`Orphan skills: ${validation.orphans.length}`);
    if (reloaded === false) console.log('Python graph NOT reloaded; restart or reload the path service manually.');
  } finally {
    await mongoose.disconnect();
  }
}

// ---------- Main ----------

async function main() {
  const opts = parseArgs(process.argv.slice(2));

  section('Loading data');
  console.log(`Data dir: ${path.relative(ROOT, opts.dataDir) || opts.dataDir}`);
  const data = loadData(opts.dataDir);
  console.log(`${data.skills.length} skills, ${data.edges.length} edges, ${data.roles.length} roles`);

  section('Validating');
  const result = validateAll(data);
  result.warnings.forEach((w) => console.warn(`WARN  ${w}`));
  if (result.errors.length) {
    result.errors.forEach((e) => console.error(`ERROR ${e}`));
    console.error(`\nValidation failed with ${result.errors.length} error(s). Nothing was written.`);
    process.exit(1);
  }
  console.log(`OK: ${result.prereqCount} prerequisite edges, graph is acyclic, every role has an OR-choice`);

  if (opts.dryRun) {
    console.log('\nDry run: no database connection made.');
    return;
  }

  await seed(opts, data, result);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
