const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();
  
  // Listen to console logs
  page.on('console', msg => {
    console.log('BROWSER CONSOLE:', msg.type(), msg.text());
  });
  
  // Listen to page errors
  page.on('pageerror', error => {
    console.error('PAGE ERROR:', error.message);
    console.error('STACK:', error.stack);
  });
  
  try {
    await page.goto('https://commitment-app-dev.vercel.app');
    console.log('Page loaded successfully');
    
    // Wait a bit to see what happens
    await page.waitForTimeout(10000);
    
  } catch (error) {
    console.error('Failed to load page:', error);
  } finally {
    await browser.close();
  }
})();