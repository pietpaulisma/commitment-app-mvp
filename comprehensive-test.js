const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000  // Slow down for easier observation
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let jsErrorCount = 0;
  let totalMessages = 0;
  let errors = [];
  
  // Listen to console logs and errors
  page.on('console', msg => {
    totalMessages++;
    console.log(`CONSOLE [${msg.type()}]:`, msg.text());
  });
  
  page.on('pageerror', error => {
    jsErrorCount++;
    errors.push(error);
    console.error('❌ PAGE ERROR:', error.message);
    console.error('STACK:', error.stack);
    
    // Check for the specific error the user reported
    if (error.message.includes("Cannot access 'eF' before initialization")) {
      console.error('🔥 FOUND THE EXACT ERROR USER REPORTED!');
    }
  });
  
  try {
    console.log('🚀 Starting comprehensive test of commitment-app-dev.vercel.app');
    
    // Go to the dev site
    await page.goto('https://commitment-app-dev.vercel.app', {
      waitUntil: 'networkidle',
      timeout: 30000
    });
    
    console.log('✅ Page loaded successfully');
    
    // Wait and observe for a while
    console.log('⏳ Waiting to observe any errors...');
    await page.waitForTimeout(10000);
    
    // Check page content
    const title = await page.title();
    const url = page.url();
    
    console.log(`📄 Title: ${title}`);
    console.log(`🌐 URL: ${url}`);
    
    // Try to click login button if visible
    try {
      const loginButton = page.locator('button:has-text("Sign In"), button:has-text("Login"), a:has-text("Sign In")');
      if (await loginButton.count() > 0) {
        console.log('🔐 Found login button, clicking...');
        await loginButton.first().click();
        await page.waitForTimeout(3000);
      }
    } catch (e) {
      console.log('ℹ️ No login button found or clickable');
    }
    
    // Final assessment
    console.log('\n📊 FINAL RESULTS:');
    console.log(`- JavaScript errors: ${jsErrorCount}`);
    console.log(`- Total console messages: ${totalMessages}`);
    console.log(`- Specific 'eF' error: ${errors.some(e => e.message.includes("Cannot access 'eF'")) ? '❌ FOUND' : '✅ NOT FOUND'}`);
    console.log(`- Site functional: ${jsErrorCount === 0 ? '✅ YES' : '❌ NO'}`);
    
    if (errors.length > 0) {
      console.log('\n🔍 All errors found:');
      errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error.message}`);
      });
    }
    
    // Keep browser open for manual inspection
    console.log('\n👁️ Browser staying open for manual inspection...');
    console.log('Press Ctrl+C to close');
    
    // Wait indefinitely
    await new Promise(() => {});
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    // Browser will be closed by Ctrl+C
  }
})();