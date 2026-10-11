const User = require('../models/User');
const Role = require('../models/Role');
const ComputedPath = require('../models/ComputedPath');
const { computePaths } = require('./pythonProxy');
const { RANK } = require('../utils/proficiencyRank');
const { markPathStale } = require('../utils/markPathStale');
const { AppError } = require('../utils/errors');

// userId → in-flight compute promise (concurrent calls share one run)
const inFlight = new Map();

async function compute(userId) {
  const user = await User.findById(userId).lean();
  if (!user.targetRoleId) throw new AppError(400, 'No target role set');

  const role = await Role.findById(user.targetRoleId).lean();
  if (!role) throw new AppError(404, 'Target role no longer exists. Please select a new role.');

  // heldSkills: max rank per skill across currentSkills ∪ completedSkills
  const rankMap = new Map();
  for (const s of [...user.currentSkills, ...user.completedSkills]) {
    const key = s.skillId.toString();
    const rank = RANK[s.proficiency] || 0;
    if ((rankMap.get(key) || 0) < rank) rankMap.set(key, rank);
  }
  const heldSkills = [...rankMap.entries()].map(([skillId, rank]) => ({ skillId, rank }));

  const requirements = role.requiredSkills.map(req => ({
    anyOf: req.anyOf.map(id => id.toString()),
    minRank: RANK[req.minProficiency] || 1,
    label: req.label || ''
  }));

  let pythonResult;
  try {
    pythonResult = await computePaths({ heldSkills, requirements, k: 3, alpha: 0.7, beta: 0.3, useHeuristic: true });
  } catch (err) {
    console.error('Path computation failed:', err.message);
    await markPathStale(userId);
    throw new AppError(503, 'Path computation service unavailable');
  }

  // Insert the new doc first so a failed insert can't lose the old path
  const newPath = await ComputedPath.create({
    userId,
    targetRoleId: user.targetRoleId,
    algorithm: pythonResult.algorithm,
    alpha: 0.7,
    beta: 0.3,
    stats: pythonResult.stats,
    status: 'active',
    paths: pythonResult.paths
  });

  await ComputedPath.updateMany(
    { userId, status: { $in: ['active', 'stale'] }, _id: { $ne: newPath._id } },
    { $set: { status: 'archived' } }
  );

  await User.findByIdAndUpdate(userId, { activePathId: newPath._id, selectedPathRank: 1 });

  return newPath;
}

// Shared compute chain used by API-N-9 and API-N-14
function runComputeChain(userId) {
  const key = String(userId);
  if (!inFlight.has(key)) {
    inFlight.set(key, compute(userId).finally(() => inFlight.delete(key)));
  }
  return inFlight.get(key);
}

module.exports = { runComputeChain };
