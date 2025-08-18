import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate } from 'k6/metrics';

// Custom metrics
const errorRate = new Rate('errors');
const loginSuccessRate = new Rate('login_success');

// Test configuration
export const options = {
  stages: [
    // Warm up
    { duration: '1m', target: 50 },
    // Ramp up to target
    { duration: '2m', target: 300 },
    // Sustain target load
    { duration: '5m', target: 300 },
    // Ramp down
    { duration: '2m', target: 0 },
  ],
  thresholds: {
    http_req_duration: ['p(99)<120'], // P99 < 120ms
    http_req_failed: ['rate<0.01'],   // Error rate < 1%
    login_success: ['rate>0.95'],     // Success rate > 95%
    errors: ['rate<0.01'],            // Error rate < 1%
  },
};

// Test data
const testUsers = [
  { email: 'test1@example.com', password: 'TestPassword123!' },
  { email: 'test2@example.com', password: 'TestPassword123!' },
  { email: 'test3@example.com', password: 'TestPassword123!' },
  { email: 'test4@example.com', password: 'TestPassword123!' },
  { email: 'test5@example.com', password: 'TestPassword123!' },
];

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000';

export default function () {
  // Select a random test user
  const user = testUsers[Math.floor(Math.random() * testUsers.length)];
  
  // Login request
  const loginPayload = JSON.stringify({
    email: user.email,
    password: user.password,
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'X-Request-ID': `k6-${Date.now()}-${Math.random()}`,
    },
  };

  const loginResponse = http.post(`${BASE_URL}/auth/login`, loginPayload, params);

  // Check login response
  const loginCheck = check(loginResponse, {
    'login status is 200': (r) => r.status === 200,
    'login response time < 120ms': (r) => r.timings.duration < 120,
    'login has access token': (r) => r.json('accessToken') !== undefined,
    'login has refresh token': (r) => r.json('refreshToken') !== undefined,
  });

  // Record success/failure rates
  loginSuccessRate.add(loginCheck);
  errorRate.add(!loginCheck);

  // If login successful, test protected endpoint
  if (loginCheck && loginResponse.status === 200) {
    const accessToken = loginResponse.json('accessToken');
    
    // Test profile endpoint
    const profileParams = {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'X-Request-ID': `k6-${Date.now()}-${Math.random()}`,
      },
    };

    const profileResponse = http.get(`${BASE_URL}/users/profile`, profileParams);

    check(profileResponse, {
      'profile status is 200': (r) => r.status === 200,
      'profile response time < 100ms': (r) => r.timings.duration < 100,
    });

    // Test loyalty points endpoint
    const loyaltyResponse = http.get(`${BASE_URL}/loyalty/points`, profileParams);

    check(loyaltyResponse, {
      'loyalty status is 200': (r) => r.status === 200,
      'loyalty response time < 100ms': (r) => r.timings.duration < 100,
    });
  }

  // Small delay between requests to simulate real user behavior
  sleep(0.1);
}

// Setup function to create test users if needed
export function setup() {
  console.log('Setting up k6 test...');
  console.log(`Base URL: ${BASE_URL}`);
  console.log('Test users configured:', testUsers.length);
  
  // You could add user creation logic here if needed
  return { baseUrl: BASE_URL, userCount: testUsers.length };
}

// Teardown function
export function teardown(data) {
  console.log('Cleaning up k6 test...');
  console.log(`Test completed for ${data.baseUrl}`);
}
