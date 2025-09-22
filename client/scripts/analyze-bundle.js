#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 Analyzing bundle size and performance...\n');

try {
  // Run Next.js bundle analyzer
  console.log('📊 Running bundle analysis...');
  execSync('npx @next/bundle-analyzer', { stdio: 'inherit' });
  
  console.log('\n✅ Bundle analysis complete!');
  console.log('\n📈 Performance recommendations:');
  console.log('1. Check for large dependencies in the bundle');
  console.log('2. Look for duplicate dependencies');
  console.log('3. Consider code splitting for large components');
  console.log('4. Optimize images and assets');
  console.log('5. Remove unused CSS and JavaScript');
  
} catch (error) {
  console.error('❌ Bundle analysis failed:', error.message);
  console.log('\n💡 Alternative: Run "npm run build" to see build output');
}
