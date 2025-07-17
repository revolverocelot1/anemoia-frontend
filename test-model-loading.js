const puppeteer = require('puppeteer');

(async () => {
  console.log('Starting browser...');
  const browser = await puppeteer.launch({ 
    headless: false,
    devtools: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  const page = await browser.newPage();
  
  // Listen for console messages
  page.on('console', msg => {
    console.log('PAGE LOG:', msg.text());
  });
  
  // Listen for errors
  page.on('error', err => {
    console.error('PAGE ERROR:', err);
  });
  
  page.on('pageerror', err => {
    console.error('PAGE ERROR:', err);
  });
  
  console.log('Navigating to test page...');
  await page.goto('http://localhost:5173/test-whisper-loading.html');
  
  // Wait for the page to load
  await page.waitForSelector('#load-proxy', { visible: true });
  
  console.log('Clicking "Load Model (Via Proxy)" button...');
  await page.click('#load-proxy');
  
  // Wait for visual confirmation
  console.log('Waiting for visual confirmation...');
  try {
    await page.waitForSelector('#success-modal.show', { 
      visible: true, 
      timeout: 300000 // 5 minutes
    });
    
    console.log('✅ SUCCESS! Model loaded with visual confirmation!');
    
    // Take a screenshot
    await page.screenshot({ path: 'model-loaded-success.png' });
    console.log('Screenshot saved as model-loaded-success.png');
    
    // Wait a bit to see the modal
    await new Promise(resolve => setTimeout(resolve, 5000));
    
  } catch (error) {
    console.error('❌ Failed to load model:', error);
    
    // Take a screenshot of the error state
    await page.screenshot({ path: 'model-loading-error.png' });
    console.log('Error screenshot saved as model-loading-error.png');
  }
  
  console.log('Test complete. Browser will remain open.');
  // Keep browser open for inspection
})(); 