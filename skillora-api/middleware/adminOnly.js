const User = require('../models/User');

// Role is read from the DB, not trusted from the JWT claim
module.exports = async (req, res, next) => {
  const user = await User.findById(req.user.id).select('role').lean();
  if (user?.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
};
