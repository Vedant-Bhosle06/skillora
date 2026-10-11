const router = require('express').Router();
const Skill = require('../models/Skill');
const Role = require('../models/Role');

// API-N-1: GET /api/stats/public
router.get('/public', async (req, res) => {
  const [skillCount, roleCount] = await Promise.all([
    Skill.countDocuments(),
    Role.countDocuments()
  ]);
  res.json({ skillCount, roleCount });
});

module.exports = router;
