const puppeteer = require('puppeteer');

async function testSite() {
  let browser;
  try {
    console.log('🚀 Starting browser test...');
    
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    const page = await browser.newPage();
    
    // Listen for console messages and errors
    const consoleMessages = [];
    const errors = [];
    
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
    });
    
    console.log('📍 Navigating to commitment-app-dev.vercel.app...');
    
    const startTime = Date.now();
    await page.goto('https://commitment-app-dev.vercel.app/', {
      waitUntil: 'networkidle2',
      timeout: 20000
    });
    
    const loadTime = Date.now() - startTime;
    console.log(`⏱️ Page loaded in ${loadTime}ms`);
    
    // Wait a bit more for JavaScript execution
    await page.waitForTimeout(3000);
    
    // Check page content
    const title = await page.title();
    const bodyText = await page.evaluate(() => document.body.innerText);
    
    console.log(`📄 Page title: "${title}"`);
    console.log(`📝 Body text sample: "${bodyText.substring(0, 200)}..."`);
    
    // Check for specific elements
    const hasLoadingScreen = bodyText.includes('Authenticating');
    const hasLogo = await page.$('img[alt*="Commitment"]') !== null;
    
    console.log(`🔍 Page analysis:`);
    console.log(`  - Has loading screen: ${hasLoadingScreen}`);
    console.log(`  - Has logo: ${hasLogo}`);
    console.log(`  - Body text length: ${bodyText.length} chars`);
    
    // Report console messages
    console.log(`\n📊 Console messages (${consoleMessages.length}):`);
    consoleMessages.slice(0, 10).forEach(msg => console.log(`  ${msg}`));
    if (consoleMessages.length > 10) {
      console.log(`  ... and ${consoleMessages.length - 10} more messages`);
    }
    
    // Report errors
    console.log(`\n❌ JavaScript errors (${errors.length}):`);
    errors.forEach(error => console.log(`  ${error}`));
    
    // Final assessment
    const hasJSErrors = errors.length > 0;
    const hasReferenceError = errors.some(e => e.includes('ReferenceError'));
    const isWorking = !hasJSErrors && hasLoadingScreen && hasLogo;
    
    console.log(`\n🎯 TEST RESULT: ${isWorking ? '✅ WORKING' : '❌ ISSUES FOUND'}`);
    console.log(`  - JavaScript errors: ${hasJSErrors ? '❌' : '✅'}`);
    console.log(`  - ReferenceError fixed: ${hasReferenceError ? '❌' : '✅'}`);
    console.log(`  - Loading screen shown: ${hasLoadingScreen ? '✅' : '❌'}`);
    console.log(`  - Logo loaded: ${hasLogo ? '✅' : '❌'}`);
    
  } catch (error) {
    console.log(`💥 Test failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testSite();