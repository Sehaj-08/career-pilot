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
 * Check backend health status.
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

/**
 * Fetch predefined questions for a specific role from FastAPI.
 * Calls GET /interview/questions?role={role}
 */
export async function fetchQuestionsByRole(role) {
  try {
    const response = await client.get('/interview/questions', {
      params: { role }
    });
    if (response.data && response.data.questions) {
      return response.data.questions;
    }
    return [];
  } catch (error) {
    console.warn(`Backend fetch failed for role "${role}", loading fallback questions:`, error.message);
    return getFallbackQuestionsByRole(role);
  }
}

/**
 * Initialize an interview session on the backend.
 * Calls POST /interview/session/start
 */
export async function startInterviewSession(candidateName, role) {
  try {
    const response = await client.post('/interview/session/start', {
      candidate_name: candidateName,
      role
    });
    return response.data;
  } catch (error) {
    console.warn('Session start API fallback:', error.message);
    return {
      status: 'fallback',
      session_id: `sess_local_${Date.now()}`,
      candidate_name: candidateName,
      role,
      duration_minutes: 30
    };
  }
}

/**
 * Fallback questions if backend is offline
 */
function getFallbackQuestionsByRole(role) {
  const fallbacks = {
    'DevOps Engineer': [
      { id: 'devops_1', role: 'DevOps Engineer', title: 'Explain how you would design a zero-downtime CI/CD deployment pipeline using Kubernetes and Canary or Blue-Green strategies.' },
      { id: 'devops_2', role: 'DevOps Engineer', title: 'How do you manage Infrastructure as Code (IaC) state files and handle configuration drift in Terraform across team environments?' },
      { id: 'devops_3', role: 'DevOps Engineer', title: 'What are the key security and optimization practices you follow when creating production-grade Docker containers?' },
      { id: 'devops_4', role: 'DevOps Engineer', title: 'Describe an end-to-end observability architecture using Prometheus and Grafana for monitoring a microservices cluster.' },
      { id: 'devops_5', role: 'DevOps Engineer', title: 'How would you design a disaster recovery (DR) strategy with minimal RTO and RPO for cloud infrastructure and databases?' }
    ],
    'Backend Developer': [
      { id: 'backend_1', role: 'Backend Developer', title: 'Explain the architectural trade-offs between RESTful APIs, GraphQL, and gRPC in modern backend systems.' },
      { id: 'backend_2', role: 'Backend Developer', title: 'How do database indexes work internally (e.g., B-Trees), and how do you diagnose and resolve a slow SQL query in production?' },
      { id: 'backend_3', role: 'Backend Developer', title: 'Describe distributed caching strategies using Redis, and how you mitigate issues like cache stampede and stale data.' },
      { id: 'backend_4', role: 'Backend Developer', title: 'How do you design an asynchronous, event-driven architecture using message queues like Kafka or RabbitMQ?' },
      { id: 'backend_5', role: 'Backend Developer', title: 'What are the best practices for securing backend APIs with JWT and OAuth2, and protecting against common vulnerabilities like SQL injection and CSRF?' }
    ],
    'Frontend Developer': [
      { id: 'frontend_1', role: 'Frontend Developer', title: "Explain how React's Virtual DOM and Reconciliation algorithm (Fiber) work, and how you optimize unnecessary re-renders." },
      { id: 'frontend_2', role: 'Frontend Developer', title: 'How do you choose between local state, Context API, and external global state libraries (like Zustand or Redux) in large applications?' },
      { id: 'frontend_3', role: 'Frontend Developer', title: 'What strategies and metrics do you use to measure and optimize Core Web Vitals (LCP, INP/FID, CLS) in a web application?' },
      { id: 'frontend_4', role: 'Frontend Developer', title: 'How do you handle asynchronous data fetching, caching, and race conditions when multiple API requests are fired rapidly?' },
      { id: 'frontend_5', role: 'Frontend Developer', title: 'Describe essential web security practices on the frontend, specifically mitigating Cross-Site Scripting (XSS) and implementing Content Security Policy (CSP).' }
    ]
  };

  return fallbacks[role] || fallbacks['Backend Developer'];
}

export default client;
