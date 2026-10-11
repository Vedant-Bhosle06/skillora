const router = require('express').Router();
const Skill = require('../models/Skill');
const SkillEdge = require('../models/SkillEdge');
const { AppError } = require('../utils/errors');

// API-N-4: GET /api/skills?search=<query>
// Case-insensitive word-prefix match on name + aliases (typeahead); all skills if no search
router.get('/', async (req, res) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim() : '';
  let query = Skill.find();
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp('(^|\\s)' + escaped, 'i');
    query = Skill.find({ $or: [{ name: re }, { aliases: re }] }).sort({ name: 1 }).limit(20);
  }
  res.json(await query
    .select('slug name category description aliases estHours marketDemand baseDifficulty')
    .lean());
});

// API-N-4b: GET /api/skills/:id  — skill detail + connected edges
router.get('/:id', async (req, res) => {
  const skill = await Skill.findById(req.params.id).lean();
  if (!skill) throw new AppError(404, 'Skill not found');

  const edges = await SkillEdge.find({
    $or: [{ sourceSkillId: skill._id }, { targetSkillId: skill._id }]
  }).lean();

  res.json({ ...skill, edges });
});

module.exports = router;
