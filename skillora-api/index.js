const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/db');
const { notFound, errorHandler } = require('./middleware/errorHandler');

// Fail fast on missing config (no silent fallbacks)
const missing = ['JWT_SECRET', 'MONGO_URI', 'INTERNAL_API_KEY'].filter(k => !process.env[k]);
if (missing.length) {
  console.error(`FATAL: missing required env var(s): ${missing.join(', ')}`);
  process.exit(1);
}

const app = express();

// Needed so the rate limiter sees real client IPs behind Render/Railway
if (process.env.NODE_ENV === 'production') app.set('trust proxy', 1);

connectDB();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Routes
app.use('/api/auth',   require('./routes/auth'));
app.use('/api/skills', require('./routes/skills'));
app.use('/api/roles',  require('./routes/roles'));
app.use('/api/stats',  require('./routes/stats'));
app.use('/api/graph',  require('./routes/graph'));


app.use('/api', notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
