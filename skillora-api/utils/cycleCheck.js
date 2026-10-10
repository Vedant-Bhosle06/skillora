const SkillEdge = require('../models/SkillEdge');

/**
 * Returns true if adding prerequisite_of edge sourceId → targetId would create
 * a cycle, i.e. sourceId is already reachable from targetId. Iterative DFS.
 * ignoreEdgeId excludes one edge (the one being updated) from the graph.
 */
async function wouldCreateCycle(sourceId, targetId, { ignoreEdgeId } = {}) {
  const filter = { type: 'prerequisite_of' };
  if (ignoreEdgeId) filter._id = { $ne: ignoreEdgeId };
  const edges = await SkillEdge.find(filter, 'sourceSkillId targetSkillId').lean();

  const adj = new Map();
  for (const e of edges) {
    const s = e.sourceSkillId.toString();
    if (!adj.has(s)) adj.set(s, []);
    adj.get(s).push(e.targetSkillId.toString());
  }

  const source = sourceId.toString();
  const visited = new Set();
  const stack = [targetId.toString()];
  while (stack.length) {
    const node = stack.pop();
    if (node === source) return true;
    if (visited.has(node)) continue;
    visited.add(node);
    for (const next of adj.get(node) || []) stack.push(next);
  }
  return false;
}

module.exports = { wouldCreateCycle };
