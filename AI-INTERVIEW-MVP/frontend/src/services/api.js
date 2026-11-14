import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000';

const client = axios.create({
  baseURL: API_BASE_URL,
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json',
  },
});

/**
 * Check backend health status for Hour 1 requirements.
 * Calls GET /api/health
 */
export async function checkBackendHealth() {
  try {
    const response = await client.get('/api/health');
    if (response.data && response.data.status === 'success') {
      return { isConnected: true, message: response.data.message };
    }
    return { isConnected: true, message: 'Backend reachable' };
  } catch (error) {
    return { isConnected: false, error: error.message };
  }
}

export default client;
