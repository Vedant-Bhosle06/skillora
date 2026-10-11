const axios = require('axios');

// Lazily created so dotenv has already run when env vars are read
let client;
function getClient() {
  if (!client) {
    client = axios.create({
      baseURL: process.env.PYTHON_SERVICE_URL || 'http://localhost:5001',
      headers: { 'X-Internal-Key': process.env.INTERNAL_API_KEY },
      timeout: Number(process.env.PYTHON_TIMEOUT_MS) || 5000
    });
  }
  return client;
}

// API-P-1: POST /compute/paths
async function computePaths(payload) {
  const res = await getClient().post('/compute/paths', payload);
  return res.data;
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

module.exports = { computePaths, getGraphMetrics, reloadGraph };
