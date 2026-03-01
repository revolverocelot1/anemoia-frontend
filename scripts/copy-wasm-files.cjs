const fs = require('fs');
const path = require('path');

console.log('Copying ONNX Runtime WASM files...');

const srcDir = path.resolve(__dirname, '../node_modules/onnxruntime-web/dist');
const dstDir = path.resolve(__dirname, '../public/ort-wasm');

// Create destination directory if it doesn't exist
if (!fs.existsSync(dstDir)) {
  fs.mkdirSync(dstDir, { recursive: true });
  console.log(`Created directory: ${dstDir}`);
}

// List of files to copy
const filesToCopy = [
  // WASM files
  'ort-wasm.wasm',
  'ort-wasm-simd.wasm',
  'ort-wasm-threaded.wasm',
  'ort-wasm-simd-threaded.wasm',
  'ort-wasm-simd-threaded.mjs',
  'ort-wasm-simd.jsep.wasm',
  'ort-wasm-simd-threaded.jsep.wasm',
  
  // JavaScript files that might be needed
  'ort-wasm-threaded.worker.js',
  'ort-wasm-threaded.js',
  'ort-wasm-simd-threaded.jsep.js',
  'ort-wasm-simd-threaded.jsep.mjs',
  
  // Main ORT files
  'ort.js',
  'ort.min.js',
  'ort.es6.min.js',
  'ort.es5.min.js',
  'ort.wasm.min.js',
  'ort.wasm-core.min.js',
  'ort.webgl.min.js',
  'ort.webgpu.min.js',
  
  // Web-specific files
  'ort-web.js',
  'ort-web.min.js',
  'ort-web.es6.min.js',
  'ort-web.es5.min.js',
  'ort-web.node.js'
];

let copiedCount = 0;
let skippedCount = 0;

filesToCopy.forEach(file => {
  const srcPath = path.join(srcDir, file);
  const dstPath = path.join(dstDir, file);
  
  if (fs.existsSync(srcPath)) {
    try {
      fs.copyFileSync(srcPath, dstPath);
      console.log(`✓ Copied: ${file}`);
      copiedCount++;
    } catch (error) {
      console.error(`✗ Failed to copy ${file}: ${error.message}`);
    }
  } else {
    console.log(`- Skipped: ${file} (not found)`);
    skippedCount++;
  }
});

console.log(`\nSummary: ${copiedCount} files copied, ${skippedCount} files skipped`);
console.log('ONNX Runtime WASM files copy complete!'); 