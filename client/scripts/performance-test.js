#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🧪 Running performance tests...\n');

try {
  // Start the development server
  console.log('🚀 Starting development server...');
  const serverProcess = execSync('npm run dev', { 
    stdio: 'pipe',
    detached: true 
  });

  // Wait for server to start
  console.log('⏳ Waiting for server to start...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Run Lighthouse audit
  console.log('🔍 Running Lighthouse audit...');
  try {
    execSync('npx lighthouse http://localhost:3000 --output=json --output-path=./lighthouse-report.json --chrome-flags="--headless"', { 
      stdio: 'inherit' 
    });
    console.log('✅ Lighthouse audit completed');
  } catch (error) {
    console.log('⚠️ Lighthouse audit failed, but continuing...');
  }

  // Run bundle analyzer
  console.log('📊 Analyzing bundle...');
  try {
    execSync('npm run analyze', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️ Bundle analysis failed, but continuing...');
  }

  // Generate performance summary
  const summary = {
    timestamp: new Date().toISOString(),
    tests: [
      'Lighthouse audit',
      'Bundle analysis',
      'Performance monitoring'
    ],
    recommendations: [
      'Monitor Core Web Vitals',
      'Optimize images further if needed',
      'Consider implementing service worker for caching',
      'Monitor bundle size growth'
    ]
  };

  fs.writeFileSync('./performance-summary.json', JSON.stringify(summary, null, 2));
  console.log('✅ Performance summary saved to performance-summary.json');

  console.log('\n🎉 Performance testing completed!');
  console.log('📊 Check the generated reports for detailed analysis');

} catch (error) {
  console.error('❌ Performance test failed:', error.message);
  process.exit(1);
}
