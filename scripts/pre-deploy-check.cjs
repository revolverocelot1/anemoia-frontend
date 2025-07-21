#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔍 Running pre-deployment checks...\n');

let hasErrors = false;
let warnings = [];

// Check 1: Required files exist
console.log('1. Checking required files...');
const requiredFiles = [
  'package.json',
  'vite.config.ts',
  'tsconfig.json',
  'render.yaml',
  'index.html',
  'src/App.tsx',
  'src/main.tsx',
  'public/robots.txt',
  'public/sitemap.xml'
];

requiredFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing required file: ${file}`);
    hasErrors = true;
  } else {
    console.log(`✅ Found: ${file}`);
  }
});

// Check 2: Critical dependencies
console.log('\n2. Checking critical dependencies...');
const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const criticalDeps = [
  '@ffmpeg/ffmpeg',
  'onnxruntime-web',
  'react',
  'react-dom',
  'vite'
];

criticalDeps.forEach(dep => {
  if (!packageJson.dependencies[dep] && !packageJson.devDependencies[dep]) {
    console.error(`❌ Missing critical dependency: ${dep}`);
    hasErrors = true;
  } else {
    console.log(`✅ Found dependency: ${dep}`);
  }
});

// Check 3: Large files that might cause issues
console.log('\n3. Checking for large files...');
const publicDir = 'public';
const checkLargeFiles = (dir) => {
  const files = fs.readdirSync(dir);
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat.isDirectory() && file !== 'node_modules' && file !== '.git') {
      checkLargeFiles(filePath);
    } else if (stat.isFile()) {
      const sizeMB = stat.size / (1024 * 1024);
      if (sizeMB > 50) {
        warnings.push(`⚠️  Large file detected: ${filePath} (${sizeMB.toFixed(2)} MB)`);
      }
    }
  });
};

try {
  checkLargeFiles(publicDir);
} catch (e) {
  console.error('Error checking file sizes:', e.message);
}

// Check 4: WASM files
console.log('\n4. Checking WASM files...');
const wasmFiles = [
  'public/ffmpeg/ffmpeg-core.wasm',
  'public/ort-wasm/ort-wasm-simd-threaded.jsep.wasm',
  'public/doom/doom1.wasm'
];

wasmFiles.forEach(file => {
  if (!fs.existsSync(file)) {
    warnings.push(`⚠️  Missing WASM file: ${file} (may need to run download scripts)`);
  } else {
    console.log(`✅ Found WASM: ${file}`);
  }
});

// Check 5: Environment setup
console.log('\n5. Checking environment setup...');
if (!packageJson.engines) {
  warnings.push('⚠️  No engines specified in package.json');
} else {
  console.log(`✅ Node version requirement: ${packageJson.engines.node || 'not specified'}`);
}

// Check 6: Build script
console.log('\n6. Checking build configuration...');
if (!packageJson.scripts.build) {
  console.error('❌ No build script found in package.json');
  hasErrors = true;
} else {
  console.log(`✅ Build script: ${packageJson.scripts.build}`);
}

// Check 7: Public assets
console.log('\n7. Checking public assets...');
const publicAssets = [
  'public/favicon.png',
  'public/A_logo.png',
  'public/manifest.json'
];

publicAssets.forEach(asset => {
  if (!fs.existsSync(asset)) {
    warnings.push(`⚠️  Missing public asset: ${asset}`);
  } else {
    console.log(`✅ Found asset: ${asset}`);
  }
});

// Summary
console.log('\n' + '='.repeat(60));
console.log('DEPLOYMENT CHECK SUMMARY');
console.log('='.repeat(60));

if (warnings.length > 0) {
  console.log('\n⚠️  WARNINGS:');
  warnings.forEach(warning => console.log(warning));
}

if (hasErrors) {
  console.log('\n❌ ERRORS FOUND: Please fix the issues above before deploying.');
  process.exit(1);
} else {
  console.log('\n✅ All critical checks passed!');
  console.log('\n📋 Next steps:');
  console.log('1. Run "npm run build" to test the build locally');
  console.log('2. Test the production build with "npm run preview"');
  console.log('3. Commit all changes to git');
  console.log('4. Push to your repository');
  console.log('5. Deploy on Render.com');
  
  if (warnings.length > 0) {
    console.log('\n⚠️  Note: There are some warnings that you may want to address, but they won\'t prevent deployment.');
  }
} 