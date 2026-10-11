const router = require('express').Router();
const auth = require('../middleware/auth');
const Skill = require('../models/Skill');
const SkillEdge = require('../models/SkillEdge');
const ComputedPath = require('../models/ComputedPath');
const User = require('../models/User');

// API-N-11: GET /api/graph?scope=path|full
router.get('/', auth, async (req, res) => {
  let skillIds = null;

  if (req.query.scope === 'path') {
    // Path-scoped node IDs from the user's selected path
    const user = await User.findById(req.user.id).lean();
    if (user?.activePathId) {
      const pathDoc = await ComputedPath.findById(user.activePathId).lean();
      const selectedPath = pathDoc?.paths?.find(p => p.rank === (user.selectedPathRank || 1));
      if (selectedPath) {
        const stepIds = selectedPath.steps.map(s => s.skillId.toString());
        // Also include direct prerequisites of path steps
        const prereqEdges = await SkillEdge.find({
          targetSkillId: { $in: stepIds }, type: 'prerequisite_of'
        }).lean();
        const prereqIds = prereqEdges.map(e => e.sourceSkillId.toString());
        skillIds = [...new Set([...stepIds, ...prereqIds])];
      }
    }
  }

  const nodeFilter = skillIds ? { _id: { $in: skillIds } } : {};
  const edgeFilter = skillIds
    ? { sourceSkillId: { $in: skillIds }, targetSkillId: { $in: skillIds } }
    : {};

  const [nodes, rawEdges] = await Promise.all([
    Skill.find(nodeFilter).select('slug name category estHours marketDemand').lean(),
    SkillEdge.find(edgeFilter).lean()
  ]);

  // Map sourceSkillId/targetSkillId → source/target (required by react-force-graph)
  const edges = rawEdges.map(e => ({
    source: e.sourceSkillId.toString(),
    target: e.targetSkillId.toString(),
    type: e.type,
    group: e.group
  }));

  res.json({ nodes, edges });
});

module.exports = router;
