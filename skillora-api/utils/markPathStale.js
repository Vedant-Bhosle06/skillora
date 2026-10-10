const ComputedPath = require('../models/ComputedPath');

// Mark the user's active computed_paths doc as stale (user skills / target role changed)
async function markPathStale(userId) {
  await ComputedPath.updateOne(
    { userId, status: 'active' },
    { $set: { status: 'stale' } }
  );
}

// Mark every user's active doc as stale (admin graph/role write)
async function markAllPathsStale() {
  await ComputedPath.updateMany({ status: 'active' }, { $set: { status: 'stale' } });
}

module.exports = { markPathStale, markAllPathsStale };
