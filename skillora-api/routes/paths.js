const router = require('express').Router();
const auth = require('../middleware/auth');
const User = require('../models/User');
const ComputedPath = require('../models/ComputedPath');
const { runComputeChain } = require('../services/computeService');
const { AppError } = require('../utils/errors');

// API-N-9: POST /api/paths/compute
router.post('/compute', auth, async (req, res) => {
  res.json(await runComputeChain(req.user.id));
});

// API-N-10: GET /api/paths/active
router.get('/active', auth, async (req, res) => {
  const pathDoc = await ComputedPath.findOne({
    userId: req.user.id,
    status: { $in: ['active', 'stale'] }
  }).sort({ generatedAt: -1 }).lean();

  if (!pathDoc) throw new AppError(404, 'No active path found');
  res.json(pathDoc);
});

// API-N-27: GET /api/paths/history
router.get('/history', auth, async (req, res) => {
  const history = await ComputedPath.find({ userId: req.user.id, status: 'archived' })
    .sort({ generatedAt: -1 }).lean();
  res.json(history);
});

// API-N-12: GET /api/paths/:pathDocId/alternatives
router.get('/:pathDocId/alternatives', auth, async (req, res) => {
  const pathDoc = await ComputedPath.findOne({
    _id: req.params.pathDocId,
    userId: req.user.id
  }).lean();
  if (!pathDoc) throw new AppError(404, 'Path document not found');
  res.json({ paths: pathDoc.paths, algorithm: pathDoc.algorithm, stats: pathDoc.stats });
});

// API-N-13: POST /api/paths/select  body: { rank }
router.post('/select', auth, async (req, res) => {
  const rank = Number(req.body.rank);
  if (!Number.isInteger(rank) || rank < 1)
    throw new AppError(400, 'rank must be an integer >= 1');

  const user = await User.findById(req.user.id).lean();
  const pathDoc = user.activePathId && await ComputedPath.findById(user.activePathId).lean();
  if (!pathDoc) throw new AppError(404, 'No active path document');
  if (!pathDoc.paths.some(p => p.rank === rank))
    throw new AppError(400, `Rank ${rank} does not exist in active path`);

  await User.findByIdAndUpdate(req.user.id, { selectedPathRank: rank });
  res.json({ message: `Active path set to rank ${rank}` });
});

module.exports = router;
