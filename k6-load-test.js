import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');

// Test configuration
export const options = {
  stages: [
    // Ramp up to target RPS
    { duration: '2m', target: 50 },
    { duration: '5m', target: 100 }, // Target RPS
    { duration: '2m', target: 0 },   // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(99)<250'], // P99 < 250ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
    errors: ['rate<0.01'],            // Custom error rate < 1%
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
      'User-Agent': 'k6-load-test',
    },
  });

  // Check login response
  const loginCheck = check(loginResponse, {
    'login status is 200 or 401': (r) => r.status === 200 || r.status === 401,
    'login response time < 250ms': (r) => r.timings.duration < 250,
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
      'User-Agent': 'k6-load-test',
    },
  });

  // Check health response
  const healthCheck = check(healthResponse, {
    'health status is 200': (r) => r.status === 200,
    'health response time < 100ms': (r) => r.timings.duration < 100,
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

  // Test registration endpoint (less frequently)
  if (Math.random() < 0.1) { // 10% of requests
    const registerPayload = JSON.stringify({
      email: `loadtest_${Date.now()}_${Math.random()}@example.com`,
      password: 'password123',
      name: 'Load Test User',
    });

    const registerResponse = http.post(`${BASE_URL}/v1/auth/register`, registerPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'k6-load-test',
      },
    });

    // Check registration response
    const registerCheck = check(registerResponse, {
      'register status is 201 or 409': (r) => r.status === 201 || r.status === 409,
      'register response time < 500ms': (r) => r.timings.duration < 500,
      'register has valid json': (r) => {
        try {
          JSON.parse(r.body);
          return true;
        } catch (e) {
          return false;
        }
      },
    });

    if (!registerCheck) {
      errorRate.add(1);
    }
  }

  // Add some think time between requests
  sleep(0.1);
}

// Setup function to create test users if needed
export function setup() {
  console.log('Setting up k6 load test...');
  console.log(`Testing API at: ${BASE_URL}`);
  
  // Create test users if they don't exist
  testUsers.forEach((user, index) => {
    const registerPayload = JSON.stringify({
      email: user.email,
      password: user.password,
      name: `Load Test User ${index + 1}`,
    });

    const response = http.post(`${BASE_URL}/v1/auth/register`, registerPayload, {
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'k6-load-test-setup',
      },
    });

    if (response.status === 201) {
      console.log(`Created test user: ${user.email}`);
    } else if (response.status === 409) {
      console.log(`Test user already exists: ${user.email}`);
    } else {
      console.log(`Failed to create test user: ${user.email} (${response.status})`);
    }
  });

  return { baseUrl: BASE_URL };
}

// Teardown function
export function teardown(data) {
  console.log('Cleaning up k6 load test...');
  // You could add cleanup logic here if needed
}
