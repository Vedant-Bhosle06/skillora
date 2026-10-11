const router = require('express').Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Session = require('../models/Session');
const authMiddleware = require('../middleware/auth');
const { hashToken } = require('../utils/tokenHash');
const { AppError } = require('../utils/errors');

// Rate-limit auth endpoints: ≤10 requests/minute per IP (NFR — Security)
const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  message: { error: 'Too many requests, please try again in a minute.' }
});

// API-N-2: POST /api/auth/register
router.post('/register', authLimiter, async (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password)
    throw new AppError(400, 'name, email, and password are required');

  const existing = await User.findOne({ email: email.toLowerCase() });
  if (existing) throw new AppError(409, 'Email already registered');

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await User.create({ name, email, passwordHash });

  res.status(201).json({ message: 'Registered successfully', userId: user._id });
});

// API-N-3: POST /api/auth/login
router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password)
    throw new AppError(400, 'email and password are required');

  const user = await User.findOne({ email: email.toLowerCase() });
  if (!user) throw new AppError(401, 'Invalid credentials');

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) throw new AppError(401, 'Invalid credentials');

  // jwtid keeps tokens unique even for logins within the same second
  const token = jwt.sign(
    { id: user._id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d', jwtid: crypto.randomUUID() }
  );

  // Write session record for server-side revocation
  const decoded = jwt.decode(token);
  await Session.create({ userId: user._id, tokenHash: hashToken(token), expiresAt: new Date(decoded.exp * 1000) });

  res.json({ token, user: { id: user._id, name: user.name, email: user.email, role: user.role } });
});

// API-N-28: POST /api/auth/logout
router.post('/logout', authMiddleware, async (req, res) => {
  await Session.deleteOne({ tokenHash: req.tokenHash });
  res.json({ message: 'Logged out successfully' });
});

module.exports = router;
