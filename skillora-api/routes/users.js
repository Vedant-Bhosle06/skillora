const router = require('express').Router();
const mongoose = require('mongoose');
const auth = require('../middleware/auth');
const User = require('../models/User');
const Skill = require('../models/Skill');
const Role = require('../models/Role');
const ComputedPath = require('../models/ComputedPath');
const Session = require('../models/Session');
const { markPathStale } = require('../utils/markPathStale');
const { runComputeChain } = require('../services/computeService');
const { PROFICIENCY_LEVELS, FROM_RANK } = require('../utils/proficiencyRank');
const { AppError } = require('../utils/errors');

const isId = (v) => typeof v === 'string' && mongoose.isValidObjectId(v);

// API-N-26: GET /api/users/me
// Returns full user profile (used by P4, P5, P7, P9)
router.get('/me', auth, async (req, res) => {
  const user = await User.findById(req.user.id)
    .select('-passwordHash')
    .populate('currentSkills.skillId', 'slug name category')
    .populate('completedSkills.skillId', 'slug name category')
    .populate('targetRoleId', 'slug title')
    .lean();
  if (!user) throw new AppError(404, 'User not found');
  res.json(user);
});

// API-N-5: POST /api/users/me/skills
// Replaces currentSkills array (P3 Onboarding Skill Profile Builder)
router.post('/me/skills', auth, async (req, res) => {
  const { skills } = req.body; // [{ skillId, proficiency }]
  if (!Array.isArray(skills)) throw new AppError(400, 'skills must be an array');

  const seen = new Set();
  for (const s of skills) {
    if (!s || !isId(s.skillId)) throw new AppError(400, 'Each skill needs a valid skillId');
    if (!PROFICIENCY_LEVELS.includes(s.proficiency))
      throw new AppError(400, `proficiency must be one of: ${PROFICIENCY_LEVELS.join(', ')}`);
    if (seen.has(s.skillId)) throw new AppError(400, 'Duplicate skillId in skills');
    seen.add(s.skillId);
  }

  const found = await Skill.countDocuments({ _id: { $in: [...seen] } });
  if (found !== seen.size) throw new AppError(400, 'One or more skills do not exist');

  const addedAt = new Date();
  await User.findByIdAndUpdate(req.user.id, {
    $set: {
      currentSkills: skills.map(s => ({ skillId: s.skillId, proficiency: s.proficiency, addedAt }))
    }
  });
  await markPathStale(req.user.id);
  res.json({ message: 'Skills updated' });
});

// API-N-8: POST /api/users/me/target-role
router.post('/me/target-role', auth, async (req, res) => {
  const { roleId } = req.body;
  if (!isId(roleId)) throw new AppError(400, 'A valid roleId is required');
  if (!(await Role.exists({ _id: roleId }))) throw new AppError(404, 'Role not found');

  await User.findByIdAndUpdate(req.user.id, { $set: { targetRoleId: roleId } });
  await markPathStale(req.user.id);
  res.json({ message: 'Target role updated' });
});

// API-N-15: PATCH /api/users/me/skills/:id  (update proficiency of one skill)
router.patch('/me/skills/:id', auth, async (req, res) => {
  const { proficiency } = req.body;
  if (!PROFICIENCY_LEVELS.includes(proficiency))
    throw new AppError(400, `proficiency must be one of: ${PROFICIENCY_LEVELS.join(', ')}`);

  const result = await User.findOneAndUpdate(
    { _id: req.user.id, 'currentSkills.skillId': req.params.id },
    { $set: { 'currentSkills.$.proficiency': proficiency } },
    { new: true }
  );
  if (!result) throw new AppError(404, 'Skill not found in your profile');
  await markPathStale(req.user.id);
  res.json({ message: 'Proficiency updated' });
});

// API-N-16: DELETE /api/users/me/skills/:id  (remove skill from currentSkills)
router.delete('/me/skills/:id', auth, async (req, res) => {
  await User.findByIdAndUpdate(req.user.id, {
    $pull: { currentSkills: { skillId: req.params.id } }
  });
  await markPathStale(req.user.id);
  res.json({ message: 'Skill removed' });
});

// API-N-17: DELETE /api/users/me  (delete account + cascade)
router.delete('/me', auth, async (req, res) => {
  const userId = req.user.id;
  await Session.deleteMany({ userId });
  await ComputedPath.deleteMany({ userId });
  await User.findByIdAndDelete(userId);
  res.json({ message: 'Account deleted' });
});

// API-N-14: POST /api/users/me/skills/complete
router.post('/me/skills/complete', auth, async (req, res) => {
  const { skillId } = req.body;
  if (!isId(skillId)) throw new AppError(400, 'A valid skillId is required');

  const user = await User.findById(req.user.id).lean();
  if (!user) throw new AppError(404, 'User not found');
  if (!user.targetRoleId) throw new AppError(400, 'No target role set');
  if (!user.activePathId) throw new AppError(400, 'No active path');

  const pathDoc = await ComputedPath.findById(user.activePathId).lean();
  if (!pathDoc) throw new AppError(400, 'No active path');
  const selectedPath = pathDoc.paths.find(p => p.rank === (user.selectedPathRank || 1));
  const step = selectedPath?.steps.find(s => s.skillId.toString() === skillId);
  if (!step) throw new AppError(400, 'Skill is not a step of the selected path');

  const alreadyDone = user.completedSkills.some(c =>
    c.skillId.toString() === skillId && String(c.targetRoleId) === String(user.targetRoleId));
  if (alreadyDone) throw new AppError(409, 'Skill already completed for this target role');

  // Completion is always saved, even if the recompute fails
  await User.findByIdAndUpdate(req.user.id, {
    $push: {
      completedSkills: {
        skillId,
        proficiency: FROM_RANK[step.toRank],
        targetRoleId: user.targetRoleId,
        fromPathId: user.activePathId,
        completedAt: new Date()
      }
    }
  });

  try {
    const newPath = await runComputeChain(req.user.id);
    res.json({ message: 'Skill completed and path recomputed', path: newPath });
  } catch (err) {
    if (err instanceof AppError && err.status === 503) {
      return res.status(202).json({
        recomputePending: true,
        message: 'Skill completion saved; path will recompute on next dashboard load'
      });
    }
    throw err;
  }
});

module.exports = router;
