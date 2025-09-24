#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building optimized production bundle...\n');

// Set production environment
process.env.NODE_ENV = 'production';

try {
  // Clean previous builds
  console.log('🧹 Cleaning previous builds...');
  execSync('rm -rf .next out', { stdio: 'inherit' });

  // Build the application
  console.log('📦 Building application...');
  execSync('npm run build', { stdio: 'inherit' });

  // Analyze bundle size
  console.log('📊 Analyzing bundle size...');
  try {
    execSync('npm run analyze', { stdio: 'inherit' });
  } catch (error) {
    console.log('⚠️ Bundle analysis failed, but build succeeded');
  }

  // Generate performance report
  console.log('📈 Generating performance report...');
  const reportPath = path.join(__dirname, '..', 'performance-report.json');
  const report = {
    buildTime: new Date().toISOString(),
    environment: 'production',
    optimizations: [
      'Bundle splitting enabled',
      'Image optimization enabled',
      'Console removal in production',
      'Performance monitoring disabled in production',
      'Critical resource preloading',
      'Scroll performance optimization'
    ]
  };

  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
  console.log(`✅ Performance report saved to ${reportPath}`);

  console.log('\n🎉 Optimized build completed successfully!');
  console.log('📊 Key optimizations applied:');
  console.log('  • Bundle splitting for better caching');
  console.log('  • Image optimization with WebP/AVIF');
  console.log('  • Console removal in production');
  console.log('  • Performance monitoring disabled in production');
  console.log('  • Critical resource preloading');
  console.log('  • Scroll and resize performance optimization');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
