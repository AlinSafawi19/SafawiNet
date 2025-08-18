import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Burst test configuration
export const options = {
  stages: [
    // Burst to high load quickly
    { duration: '30s', target: 100 },
    { duration: '1m', target: 200 },  // Burst to 200 RPS
    { duration: '30s', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<500'], // P95 < 500ms for burst
    http_req_failed: ['rate<0.05'],   // Error rate < 5% for burst
    errors: ['rate<0.05'],            // Custom error rate < 5%
  },
};

// Test data
const testUsers = [
  { email: 'test1@example.com', password: 'password123' },
  { email: 'test2@example.com', password: 'password123' },
  { email: 'test3@example.com', password: 'password123' },
  { email: 'test4@example.com', password: 'password123' },
  { email: 'test5@example.com', password: 'password123' },
];

// Base URL - change this for different environments
const BASE_URL = __ENV.API_URL || 'http://localhost:3000';

export default function () {
  // Select a random test user
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // Test login endpoint
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password,
  });

  const loginResponse = http.post(`${BASE_URL}/v1/auth/login`, loginPayload, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'k6-burst-test',
    },
  });

  // Check login response
  const loginCheck = check(loginResponse, {
    'login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'login response time < 500ms': (r) => r.timings.duration < 500,
    'login has valid json': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });

  if (!loginCheck) {
    errorRate.add(1);
  }

  // Test health endpoint
  const healthResponse = http.get(`${BASE_URL}/health`, {
    headers: {
      'User-Agent': 'k6-burst-test',
    },
  });

  // Check health response
  const healthCheck = check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 200ms': (r) => r.timings.duration < 200,
    'health has valid json': (r) => {
      try {
        JSON.parse(r.body);
        return true;
      } catch (e) {
        return false;
      }
    },
  });

  if (!healthCheck) {
    errorRate.add(1);
  }

  // Minimal sleep for burst test
  sleep(0.1);
}
