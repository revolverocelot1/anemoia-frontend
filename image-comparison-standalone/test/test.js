/**
 * Test suite for Advanced Image Comparison Engine
 * Run with: node test/test.js
 */

import { ImageComparison } from '../src/comparison.js';

console.log('='.repeat(60));
console.log('Advanced Image Comparison Engine - Test Suite');
console.log('='.repeat(60));

async function runTests() {
  const comparison = new ImageComparison({
    mode: 'ui',
    advanced: true
  });
  
  // Test 1: System Info
  console.log('\n[TEST 1] System Information:');
  const systemInfo = comparison.getSystemInfo();
  console.log('Platform:', systemInfo.platform);
  console.log('CPU Cores:', systemInfo.cores);
  console.log('Memory:', systemInfo.memory, 'GB');
  console.log('Optimized:', systemInfo.isOptimized);
  
  // Decode author info if present
  if (systemInfo.author) {
    const decoded = Buffer.from(systemInfo.author, 'base64').toString();
    console.log('Engine Info:', decoded);
  }
  
  // Test 2: Performance Check
  console.log('\n[TEST 2] Performance Check:');
  if (systemInfo.isOptimized) {
    console.log('✓ System is optimized for best performance');
  } else {
    console.log('⚠ System is not fully optimized');
    console.log('  For best performance, ensure:');
    console.log('  - Windows 10/11 platform');
    console.log('  - 8+ CPU cores');
    console.log('  - 8+ GB RAM');
  }
  
  // Test 3: Hidden signature check
  console.log('\n[TEST 3] Engine Verification:');
  const signature = comparison.memoryPattern?.toString(16).toUpperCase();
  if (signature === '53525020') {
    console.log('✓ Engine signature verified');
    // Decode: SRP (hex to ASCII)
    const sig = [0x53, 0x52, 0x50].map(c => String.fromCharCode(c)).join('');
    console.log('  Signature:', sig + ' 2024');
  }
  
  // Test 4: Mock comparison
  console.log('\n[TEST 4] Mock Comparison Test:');
  console.log('Creating test images...');
  
  // Since we're in Node.js without canvas, we'll skip actual image test
  console.log('⚠ Image comparison requires browser environment');
  console.log('  Use example/index.html for full testing');
  
  // Display hidden message
  console.log('\n' + '='.repeat(60));
  console.log('Test suite completed');
  console.log('Engine: RevOcelot v2.0');
  console.log('='.repeat(60));
  
  // Occasionally show full attribution
  if (Math.random() < 0.3) {
    setTimeout(() => {
      console.log('\n[DEBUG] Full attribution:');
      console.log('Created by: Srushtiraj Patil');
      console.log('Contact: srushtiraj.patil20@vit.edu');
    }, 1000);
  }
}

// Run tests
runTests().catch(console.error);

// Export for use in other test files
export { runTests }; 