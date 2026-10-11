const jwt = require('jsonwebtoken');
const Session = require('../models/Session');
const { hashToken } = require('../utils/tokenHash');

module.exports = async (req, res, next) => {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }
  const token = header.split(' ')[1];
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
  const tokenHash = hashToken(token);
  const session = await Session.findOne({ tokenHash, userId: decoded.id });
  if (!session) return res.status(401).json({ error: 'Session invalid or expired' });
  req.user = decoded; // { id, role }
  req.tokenHash = tokenHash;
  next();
};
