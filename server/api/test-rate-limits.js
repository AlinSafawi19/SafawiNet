#!/usr/bin/env node

/**
 * Simple test script to verify rate limiting configuration
 * This script tests the rate limiting in both development and production modes
 */

const axios = require('axios');
const winston = require('winston');

const BASE_URL = process.env.API_URL || 'http://localhost:3000';

// Create a simple logger for this test script
const logger = winston.createLogger({
  level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    winston.format.errors({ stack: true }),
    winston.format.colorize(),
    winston.format.printf(({ timestamp, level, message, stack, ...meta }) => {
      const logEntry = {
        timestamp,
        level,
        message,
        ...(stack && typeof stack === 'string' ? { stack } : {}),
        ...(typeof meta === 'object' && meta !== null ? meta : {}),
      };
      return `${timestamp} [${level}]: ${message} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`;
    })
  ),
  defaultMeta: { service: 'safawinet-rate-limit-test' },
  transports: [
    new winston.transports.Console()
  ],
});

// Test configuration
const TEST_CONFIG = {
  // Auth endpoints - should be more restrictive
  auth: {
    register: { limit: 5, ttl: 60000 },
    login: { limit: 10, ttl: 60000 },
    forgotPassword: { limit: 3, ttl: 300000 },
  },
  // User endpoints
  users: {
    profile: { limit: 50, ttl: 60000 },
    changePassword: { limit: 5, ttl: 300000 },
  },
  // Loyalty endpoints
  loyalty: {
    account: { limit: 30, ttl: 60000 },
    transactions: { limit: 30, ttl: 60000 },
  },
  // General API
  api: {
    general: { limit: 100, ttl: 60000 },
  },
};

async function testRateLimit(endpoint, method = 'GET', data = null, expectedLimit = 100) {
  logger.info(`🧪 Testing ${method} ${endpoint} (expected limit: ${expectedLimit}/min)`, {
    endpoint,
    method,
    expectedLimit,
    source: 'rate-limit-test'
  });
  
  const requests = [];
  const startTime = Date.now();
  
  // Make requests up to the expected limit + 5 extra
  for (let i = 0; i < expectedLimit + 5; i++) {
    const request = makeRequest(endpoint, method, data, i);
    requests.push(request);
  }
  
  try {
    const results = await Promise.allSettled(requests);
    const endTime = Date.now();
    
    let successCount = 0;
    let rateLimitedCount = 0;
    let errorCount = 0;
    
    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        if (result.value.status === 200 || result.value.status === 201) {
          successCount++;
        } else if (result.value.status === 429) {
          rateLimitedCount++;
        } else {
          errorCount++;
        }
      } else {
        errorCount++;
      }
    });
    
    logger.info(`✅ Successful: ${successCount}`, {
      successCount,
      rateLimitedCount,
      errorCount,
      duration: endTime - startTime,
      endpoint,
      method,
      source: 'rate-limit-test'
    });
    
    logger.info(`🚫 Rate Limited: ${rateLimitedCount}`, {
      rateLimitedCount,
      endpoint,
      method,
      source: 'rate-limit-test'
    });
    
    logger.info(`❌ Errors: ${errorCount}`, {
      errorCount,
      endpoint,
      method,
      source: 'rate-limit-test'
    });
    
    logger.info(`⏱️ Time: ${endTime - startTime}ms`, {
      duration: endTime - startTime,
      endpoint,
      method,
      source: 'rate-limit-test'
    });
    
    // Check if rate limiting is working
    if (rateLimitedCount > 0) {
      logger.info(`🎯 Rate limiting is ACTIVE`, {
        rateLimitedCount,
        endpoint,
        method,
        source: 'rate-limit-test'
      });
    } else {
      logger.warn(`⚠️ Rate limiting may not be active (development mode?)`, {
        rateLimitedCount,
        endpoint,
        method,
        source: 'rate-limit-test'
      });
    }
    
  } catch (error) {
    logger.error(`❌ Test failed: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      endpoint,
      method,
      source: 'rate-limit-test'
    });
  }
}

async function makeRequest(endpoint, method, data, requestNumber) {
  try {
    const config = {
      method,
      url: `${BASE_URL}${endpoint}`,
      timeout: 5000,
      validateStatus: () => true, // Don't throw on any status code
    };
    
    if (data) {
      config.data = data;
    }
    
    const response = await axios(config);
    return response;
  } catch (error) {
    logger.error(`❌ Request failed: ${error.message}`, {
      error: error.message,
      stack: error.stack,
      endpoint,
      method,
      source: 'rate-limit-test'
    });
    if (error.response) {
      return error.response;
    }
  }
}

async function testEnvironment() {
  logger.info('🔍 Testing Rate Limiting Configuration', {
    source: 'rate-limit-test'
  });
  logger.info('=====================================', {
    source: 'rate-limit-test'
  });
  
  // Test environment detection
  try {
    const healthResponse = await makeRequest('/health');
    logger.info(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`, {
      environment: process.env.NODE_ENV || 'development',
      source: 'rate-limit-test'
    });
    logger.info(`🏥 Health check: ${healthResponse.status === 200 ? 'OK' : 'FAILED'}`, {
      healthStatus: healthResponse.status,
      isHealthy: healthResponse.status === 200,
      source: 'rate-limit-test'
    });
  } catch (error) {
    logger.error(`❌ Cannot connect to API at ${BASE_URL}`, {
      baseUrl: BASE_URL,
      error: error.message,
      source: 'rate-limit-test'
    });
    logger.info(`   Make sure the server is running: npm run start:dev`, {
      source: 'rate-limit-test'
    });
    return;
  }
  
  // Test different endpoint categories
  logger.info('📊 Testing Rate Limits by Endpoint Category', {
    source: 'rate-limit-test'
  });
  logger.info('==========================================', {
    source: 'rate-limit-test'
  });
  
  // Test auth endpoints (should be most restrictive)
  await testRateLimit('/v1/auth/login', 'POST', {
    email: 'test@example.com',
    password: 'testpassword'
  }, 10);
  
  await testRateLimit('/v1/auth/register', 'POST', {
    email: 'test@example.com',
    password: 'testpassword',
    name: 'Test User'
  }, 5);
  
  // Test general API endpoints
  await testRateLimit('/', 'GET', null, 100);
  
  // Test performance endpoints (if available)
  await testRateLimit('/performance/stats', 'GET', null, 20);
  
  logger.info('✅ Rate limiting test completed!', {
    source: 'rate-limit-test'
  });
  logger.info('📝 Notes:', {
    source: 'rate-limit-test'
  });
  logger.info('   - In development mode, rate limiting is disabled', {
    source: 'rate-limit-test'
  });
  logger.info('   - In production mode, rate limiting should be active', {
    source: 'rate-limit-test'
  });
  logger.info('   - WebSocket rate limiting is tested separately', {
    source: 'rate-limit-test'
  });
}

// Run the test
if (require.main === module) {
  testEnvironment().catch((error) => {
    logger.error('Test execution failed', {
      error: error.message,
      stack: error.stack,
      source: 'rate-limit-test'
    });
    process.exit(1);
  });
}

module.exports = { testRateLimit, testEnvironment };
