const { AppError } = require('../utils/errors');

// 404 for unknown /api/* routes
const notFound = (req, res) => {
  res.status(404).json({ error: 'Route not found' });
};

// Central error handler (Express 5 forwards rejected async handlers here)
const errorHandler = (err, req, res, next) => {
  if (res.headersSent) return next(err);
  if (err instanceof AppError) return res.status(err.status).json({ error: err.message });
  if (err.name === 'CastError') return res.status(400).json({ error: 'Invalid id' });
  if (err.name === 'ValidationError') return res.status(400).json({ error: err.message });
  if (err.code === 11000) return res.status(409).json({ error: 'Duplicate entry' });
  if (err.type === 'entity.parse.failed') return res.status(400).json({ error: 'Invalid JSON body' });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
};

module.exports = { notFound, errorHandler };
