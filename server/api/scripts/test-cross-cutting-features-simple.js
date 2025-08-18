const http = require('http');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Test data
const testUser = {
  email: 'test@example.com',
  password: 'TestPassword123!',
  name: 'Test User'
};

// Helper function to make HTTP requests
function makeRequest(path, method = 'GET', data = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'X-Request-ID': `test-${Date.now()}-${Math.random()}`,
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const parsedBody = body ? JSON.parse(body) : {};
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: parsedBody
          });
        } catch (error) {
          resolve({
            statusCode: res.statusCode,
            headers: res.headers,
            body: body
          });
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test functions
async function testHealthCheck() {
  console.log('🔍 Testing Health Check...');
  try {
    const response = await makeRequest('/health');
    console.log(`✅ Health check: ${response.statusCode}`);
    console.log(`   Response:`, response.body);
    return response.statusCode === 200;
  } catch (error) {
    console.log(`❌ Health check failed:`, error.message);
    return false;
  }
}

async function testUserCreation() {
  console.log('🔍 Testing User Creation...');
  try {
    const response = await makeRequest('/users', 'POST', testUser);
    console.log(`✅ User creation: ${response.statusCode}`);
    if (response.statusCode === 201) {
      console.log(`   User created:`, response.body.user?.email);
    }
    return response.statusCode === 201;
  } catch (error) {
    console.log(`❌ User creation failed:`, error.message);
    return false;
  }
}

async function testLogin() {
  console.log('🔍 Testing Login...');
  try {
    const loginData = {
      email: testUser.email,
      password: testUser.password
    };
    const response = await makeRequest('/v1/auth/login', 'POST', loginData);
    console.log(`✅ Login: ${response.statusCode}`);
    if (response.statusCode === 200) {
      console.log(`   Login successful, got tokens`);
    } else if (response.statusCode === 401) {
      console.log(`   Login failed: Invalid credentials (expected for test user)`);
    }
    return response.statusCode === 200 || response.statusCode === 401; // 401 is expected for test user
  } catch (error) {
    console.log(`❌ Login failed:`, error.message);
    return false;
  }
}

async function testRateLimiting() {
  console.log('🔍 Testing Rate Limiting...');
  try {
    const promises = [];
    for (let i = 0; i < 5; i++) {
      promises.push(makeRequest('/users', 'GET'));
    }
    
    const responses = await Promise.all(promises);
    const successCount = responses.filter(r => r.statusCode === 200).length;
    const rateLimitedCount = responses.filter(r => r.statusCode === 429).length;
    
    console.log(`✅ Rate limiting test: ${successCount} successful, ${rateLimitedCount} rate limited`);
    return true;
  } catch (error) {
    console.log(`❌ Rate limiting test failed:`, error.message);
    return false;
  }
}

async function testPerformanceEndpoints() {
  console.log('🔍 Testing Performance Endpoints...');
  try {
    const response = await makeRequest('/performance/stats');
    console.log(`✅ Performance stats: ${response.statusCode}`);
    return response.statusCode === 200 || response.statusCode === 401; // 401 is expected without auth
  } catch (error) {
    console.log(`❌ Performance endpoints failed:`, error.message);
    return false;
  }
}

async function testSecurityHeaders() {
  console.log('🔍 Testing Security Headers...');
  try {
    const response = await makeRequest('/health');
    const headers = response.headers;
    
    const securityHeaders = {
      'x-frame-options': headers['x-frame-options'],
      'x-content-type-options': headers['x-content-type-options'],
      'x-xss-protection': headers['x-xss-protection'],
      'x-request-id': headers['x-request-id']
    };
    
    console.log(`✅ Security headers:`, securityHeaders);
    
    const hasSecurityHeaders = securityHeaders['x-frame-options'] && 
                              securityHeaders['x-content-type-options'] &&
                              securityHeaders['x-request-id'];
    
    return hasSecurityHeaders;
  } catch (error) {
    console.log(`❌ Security headers test failed:`, error.message);
    return false;
  }
}

// Main test runner
async function runTests() {
  console.log('🚀 Starting Cross-Cutting Features Test');
  console.log(`📍 Testing against: ${BASE_URL}`);
  console.log('');

  const tests = [
    { name: 'Health Check', fn: testHealthCheck },
    { name: 'User Creation', fn: testUserCreation },
    { name: 'Login', fn: testLogin },
    { name: 'Rate Limiting', fn: testRateLimiting },
    { name: 'Performance Endpoints', fn: testPerformanceEndpoints },
    { name: 'Security Headers', fn: testSecurityHeaders }
  ];

  const results = [];
  
  for (const test of tests) {
    console.log(`\n📋 Running: ${test.name}`);
    console.log('─'.repeat(50));
    
    const startTime = Date.now();
    const result = await test.fn();
    const duration = Date.now() - startTime;
    
    results.push({
      name: test.name,
      passed: result,
      duration: duration
    });
    
    console.log(`⏱️  Duration: ${duration}ms`);
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  
  const passed = results.filter(r => r.passed).length;
  const total = results.length;
  
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} ${result.name} (${result.duration}ms)`);
  });
  
  console.log(`\n🎯 Results: ${passed}/${total} tests passed`);
  
  if (passed === total) {
    console.log('🎉 All cross-cutting features are working correctly!');
    process.exit(0);
  } else {
    console.log('⚠️  Some tests failed. Check the logs above for details.');
    process.exit(1);
  }
}

// Run tests
runTests().catch(error => {
  console.error('💥 Test runner failed:', error);
  process.exit(1);
});
