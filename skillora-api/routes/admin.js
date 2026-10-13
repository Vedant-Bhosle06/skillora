const router = require('express').Router();
const auth = require('../middleware/auth');
const adminOnly = require('../middleware/adminOnly');
const Skill = require('../models/Skill');
const SkillEdge = require('../models/SkillEdge');
const Role = require('../models/Role');
const ComputedPath = require('../models/ComputedPath');
const User = require('../models/User');
const { wouldCreateCycle } = require('../utils/cycleCheck');
const { markAllPathsStale } = require('../utils/markPathStale');
const { AppError } = require('../utils/errors');
const { reloadGraph, getGraphMetrics } = require('../services/pythonProxy');

const EDGE_TYPES = ['prerequisite_of', 'corequisite_with'];
const EDGE_FIELDS = ['sourceSkillId', 'targetSkillId', 'type', 'group', 'source'];

// All admin routes require auth + admin role
router.use(auth, adminOnly);

// Helper: after any admin write → reload Python graph + mark all active paths stale
async function afterAdminWrite() {
  try {
    await reloadGraph();
  } catch (err) {
    console.warn('Python graph reload failed:', err.message);
  }
  await markAllPathsStale();
}

// Shared edge validation for POST and PATCH (FR-14 cycle check for prerequisite_of)
async function validateEdge({ sourceSkillId, targetSkillId, type, group }, ignoreEdgeId) {
  if (!sourceSkillId || !targetSkillId)
    throw new AppError(400, 'sourceSkillId and targetSkillId are required');
  if (!EDGE_TYPES.includes(type))
    throw new AppError(400, `type must be one of: ${EDGE_TYPES.join(', ')}`);
  if (String(sourceSkillId) === String(targetSkillId))
    throw new AppError(400, 'Self-loops are not allowed');
  if (type !== 'prerequisite_of' && group)
    throw new AppError(400, 'group is only valid for prerequisite_of edges');

  const count = await Skill.countDocuments({ _id: { $in: [sourceSkillId, targetSkillId] } });
  if (count !== 2) throw new AppError(404, 'One or both skills not found');

  if (type === 'prerequisite_of' && await wouldCreateCycle(sourceSkillId, targetSkillId, { ignoreEdgeId }))
    throw new AppError(409, 'This edge would create a cycle in the prerequisite graph.');
}

// ── SKILLS ──────────────────────────────────────────────────────────────────

// API-N-18: POST /api/admin/skills
router.post('/skills', async (req, res) => {
  const skill = await Skill.create(req.body);
  await afterAdminWrite();
  res.status(201).json(skill);
});

// API-N-19: PATCH /api/admin/skills/:id
router.patch('/skills/:id', async (req, res) => {
  const skill = await Skill.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  if (!skill) throw new AppError(404, 'Skill not found');
  await afterAdminWrite();
  res.json(skill);
});

// API-N-20: DELETE /api/admin/skills/:id
// Block if skill is in any role's requiredSkills; else cascade
router.delete('/skills/:id', async (req, res) => {
  const skillId = req.params.id;
  const usedInRole = await Role.findOne({ 'requiredSkills.anyOf': skillId });
  if (usedInRole) {
    throw new AppError(409,
      `Cannot delete: skill is required by role "${usedInRole.title}". Remove it from the role first.`);
  }
  // Delete all edges touching this skill
  await SkillEdge.deleteMany({ $or: [{ sourceSkillId: skillId }, { targetSkillId: skillId }] });
  // Remove from all users' currentSkills and completedSkills
  await User.updateMany({}, {
    $pull: {
      currentSkills: { skillId },
      completedSkills: { skillId }
    }
  });
  await Skill.findByIdAndDelete(skillId);
  await afterAdminWrite();
  res.json({ message: 'Skill deleted and edges/user references cleaned up' });
});

// ── EDGES ────────────────────────────────────────────────────────────────────

// API-N-30: GET /api/admin/edges?skillId=
router.get('/edges', async (req, res) => {
  const filter = {};
  if (req.query.skillId) {
    filter.$or = [
      { sourceSkillId: req.query.skillId },
      { targetSkillId: req.query.skillId }
    ];
  }
  res.json(await SkillEdge.find(filter).lean());
});

// API-N-21: POST /api/admin/edges
router.post('/edges', async (req, res) => {
  const { sourceSkillId, targetSkillId, type, group, source } = req.body;
  await validateEdge({ sourceSkillId, targetSkillId, type, group });

  const edge = await SkillEdge.create({ sourceSkillId, targetSkillId, type, group: group || null, source: source || '' });
  await afterAdminWrite();
  res.status(201).json(edge);
});

// API-N-22: PATCH /api/admin/edges/:id
router.patch('/edges/:id', async (req, res) => {
  const existing = await SkillEdge.findById(req.params.id);
  if (!existing) throw new AppError(404, 'Edge not found');

  const updates = {};
  for (const f of EDGE_FIELDS) if (req.body[f] !== undefined) updates[f] = req.body[f];

  const merged = { ...existing.toObject(), ...updates };
  if (merged.type !== 'prerequisite_of') merged.group = null;
  await validateEdge(merged, existing._id);

  existing.set({ ...updates, group: merged.group });
  await existing.save();
  await afterAdminWrite();
  res.json(existing);
});

// API-N-23: DELETE /api/admin/edges/:id
router.delete('/edges/:id', async (req, res) => {
  const edge = await SkillEdge.findByIdAndDelete(req.params.id);
  if (!edge) throw new AppError(404, 'Edge not found');
  await afterAdminWrite();
  res.json({ message: 'Edge deleted' });
});

// ── ROLES ────────────────────────────────────────────────────────────────────

// API-N-24: POST /api/admin/roles
router.post('/roles', async (req, res) => {
  const role = await Role.create(req.body);
  await afterAdminWrite();
  res.status(201).json(role);
});

// API-N-25: PATCH /api/admin/roles/:id
router.patch('/roles/:id', async (req, res) => {
  const role = await Role.findByIdAndUpdate(req.params.id, { $set: req.body }, { new: true, runValidators: true });
  if (!role) throw new AppError(404, 'Role not found');
  await afterAdminWrite();
  res.json(role);
});

// API-N-29: DELETE /api/admin/roles/:id  — cascade: null targetRoleId, archive active paths
router.delete('/roles/:id', async (req, res) => {
  const roleId = req.params.id;
  const role = await Role.findById(roleId);
  if (!role) throw new AppError(404, 'Role not found');

  // Find users targeting this role
  const affectedUsers = await User.find({ targetRoleId: roleId }, '_id').lean();
  const affectedIds = affectedUsers.map(u => u._id);

  if (affectedIds.length > 0) {
    // Archive their active/stale paths
    await ComputedPath.updateMany(
      { userId: { $in: affectedIds }, status: { $in: ['active', 'stale'] } },
      { $set: { status: 'archived' } }
    );
    // Null out targetRoleId and activePathId
    await User.updateMany({ _id: { $in: affectedIds } }, {
      $set: { targetRoleId: null, activePathId: null, selectedPathRank: 1 }
    });
  }

  await Role.findByIdAndDelete(roleId);
  await afterAdminWrite();
  res.json({ message: 'Role deleted; affected users reset' });
});

// ── GRAPH METRICS ─────────────────────────────────────────────────────────────

// API-N-31: GET /api/admin/graph/metrics  — proxies API-P-3
router.get('/graph/metrics', async (req, res) => {
  try {
    res.json(await getGraphMetrics());
  } catch (err) {
    console.error('Graph metrics failed:', err.message);
    res.status(503).json({ error: 'Graph metrics service unavailable' });
  }
});

module.exports = router;
