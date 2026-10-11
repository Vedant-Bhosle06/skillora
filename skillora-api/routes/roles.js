const router = require('express').Router();
const Role = require('../models/Role');
const Skill = require('../models/Skill');
const { AppError } = require('../utils/errors');

// API-N-6: GET /api/roles  (sortable by demandScore)
router.get('/', async (req, res) => {
  const sort = req.query.sort === 'demand' ? { demandScore: -1 } : {};
  res.json(await Role.find().sort(sort).lean());
});

// API-N-7: GET /api/roles/:id  — role detail + skill names joined
router.get('/:id', async (req, res) => {
  const role = await Role.findById(req.params.id).lean();
  if (!role) throw new AppError(404, 'Role not found');

  const allSkillIds = role.requiredSkills.flatMap(r => r.anyOf);
  const skills = await Skill.find({ _id: { $in: allSkillIds } })
    .select('_id slug name estHours marketDemand').lean();
  const skillMap = Object.fromEntries(skills.map(s => [s._id.toString(), s]));

  const requiredSkills = role.requiredSkills.map(req => ({
    ...req,
    anyOfSkills: req.anyOf.map(id => skillMap[id.toString()] || { _id: id })
  }));

  res.json({ ...role, requiredSkills });
});

module.exports = router;
