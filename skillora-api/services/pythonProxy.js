const axios = require('axios');

// PYTHON_SERVICE_URL may omit the scheme (e.g. Render's host:port) - default to http://
function baseUrl() {
  const raw = (process.env.PYTHON_SERVICE_URL || 'http://localhost:5001').trim().replace(/\/+$/, '');
  return /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
}

const timeoutMs = () => Number(process.env.PYTHON_TIMEOUT_MS) || 5000;

// Lazily created so dotenv has already run when env vars are read
let client;
function getClient() {
  if (!client) {
    client = axios.create({
      baseURL: baseUrl(),
      headers: { 'X-Internal-Key': process.env.INTERNAL_API_KEY },
      timeout: timeoutMs()
    });
  }
  return client;
}

// Cold-start handling: free hosting puts the path service to sleep when idle.
// Poll its public /health with backoff until it answers or the budget runs out.
// Budget = PYTHON_TIMEOUT_MS, capped at 60 s. Remembers a recent success so
// warm calls pay nothing.
const AWAKE_TTL_MS = 10 * 60 * 1000;
let awakeUntil = 0;
let waking = null;
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function waitUntilAwake() {
  const deadline = Date.now() + Math.min(timeoutMs(), 90000);
  let delay = 1000;
  for (;;) {
    try {
      await axios.get(`${baseUrl()}/health`, { timeout: Math.max(1000, Math.min(10000, deadline - Date.now())) });
      awakeUntil = Date.now() + AWAKE_TTL_MS;
      return true;
    } catch (_) {
      if (Date.now() + delay >= deadline) return false;
      await sleep(delay);
      delay = Math.min(delay * 2, 8000);
    }
  }
}

// Resolves true if awake, false if it never answered. Never throws.
function wakePathService() {
  if (Date.now() < awakeUntil) return Promise.resolve(true);
  if (!waking) waking = waitUntilAwake().finally(() => { waking = null; });
  return waking;
}

// API-P-1: POST /compute/paths
async function computePaths(payload) {
  // If the wake-up fails we still try the call so existing error mapping (503) applies
  await wakePathService();
  try {
    const res = await getClient().post('/compute/paths', payload);
    awakeUntil = Date.now() + AWAKE_TTL_MS;
    return res.data;
  } catch (err) {
    awakeUntil = 0;
    throw err;
  }
}

// API-P-3: GET /graph/metrics
async function getGraphMetrics() {
  const res = await getClient().get('/graph/metrics');
  return res.data;
}

// API-P-5: POST /graph/reload
async function reloadGraph() {
  await getClient().post('/graph/reload', {});
}

module.exports = { wakePathService, computePaths, getGraphMetrics, reloadGraph };
