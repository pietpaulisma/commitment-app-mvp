const { chromium } = require('playwright');

async function testLiveSite() {
  let browser;
  try {
    console.log('🚀 Starting Playwright browser test...');
    
    browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();
    
    // Monitor console and errors - limit to prevent memory issues
    const consoleMessages = [];
    const errors = [];
    let messageCount = 0;
    
    page.on('console', msg => {
      messageCount++;
      if (consoleMessages.length < 20) { // Only capture first 20 to avoid memory issues
        consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
      }
    });
    
    page.on('pageerror', error => {
      errors.push(error.message);
      console.log(`❌ JavaScript Error: ${error.message}`);
      if (error.stack) {
        console.log(`   Stack: ${error.stack}`);
      }
    });
    
    console.log('📍 Loading commitment-app-c1b8um7er-pietpaulismas-projects.vercel.app...');
    
    const startTime = Date.now();
    await page.goto('https://commitment-app-c1b8um7er-pietpaulismas-projects.vercel.app/', {
      waitUntil: 'domcontentloaded',
      timeout: 15000
    });
    
    const loadTime = Date.now() - startTime;
    console.log(`⚡ Initial load: ${loadTime}ms`);
    
    // Wait for JavaScript execution and hydration - but not too long due to infinite loops
    await page.waitForTimeout(3000);
    
    const totalTime = Date.now() - startTime;
    console.log(`⏱️ Total time: ${totalTime}ms`);
    
    // Get page info
    const title = await page.title();
    
    // Try different ways to get content
    const bodyText = await page.textContent('body');
    const visibleText = await page.evaluate(() => {
      // Get only visible text content
      const body = document.body;
      const walker = document.createTreeWalker(
        body,
        NodeFilter.SHOW_TEXT,
        {
          acceptNode: function(node) {
            const element = node.parentElement;
            const style = window.getComputedStyle(element);
            return style.display !== 'none' && style.visibility !== 'hidden' 
              ? NodeFilter.FILTER_ACCEPT 
              : NodeFilter.FILTER_REJECT;
          }
        }
      );
      let text = '';
      let node;
      while (node = walker.nextNode()) {
        text += node.textContent + ' ';
      }
      return text.trim();
    });
    
    console.log(`📄 Title: "${title}"`);
    console.log(`📝 Raw body: "${bodyText.substring(0, 100)}..."`);
    console.log(`👁️ Visible text: "${visibleText.substring(0, 150)}..."`);
    
    // Check specific elements
    const hasAuth = visibleText.includes('Authenticating') || bodyText.includes('Authenticating');
    const hasLogo = await page.locator('img[alt*="Commitment"]').count() > 0;
    const hasProgress = visibleText.includes('%') || bodyText.includes('%');
    
    console.log(`🔍 Elements found:`);
    console.log(`  - Auth screen: ${hasAuth ? '✅' : '❌'}`);
    console.log(`  - Logo: ${hasLogo ? '✅' : '❌'}`);
    console.log(`  - Progress indicator: ${hasProgress ? '✅' : '❌'}`);
    
    // Analyze console output - look for the EXACT error the user reported
    const jsErrors = errors.length;
    const referenceErrors = errors.filter(e => e.includes('ReferenceError')).length;
    const beforeInitErrors = errors.filter(e => e.includes('before initialization')).length;
    const eFErrors = errors.filter(e => e.includes("Cannot access 'eF' before initialization")).length;
    
    console.log(`\n📊 Console Analysis:`);
    console.log(`  - TOTAL MESSAGES: ${messageCount} (!!!)`);
    console.log(`  - Messages captured: ${consoleMessages.length}`);
    console.log(`  - JavaScript errors: ${jsErrors}`);
    console.log(`  - ReferenceErrors: ${referenceErrors}`);
    console.log(`  - "before initialization" errors: ${beforeInitErrors}`);
    console.log(`  - EXACT "eF" errors: ${eFErrors}`);
    
    if (consoleMessages.length > 0) {
      console.log(`\n📜 Console messages:`);
      consoleMessages.slice(0, 8).forEach(msg => console.log(`  ${msg}`));
      if (consoleMessages.length > 8) {
        console.log(`  ... ${consoleMessages.length - 8} more messages`);
      }
    }
    
    if (errors.length > 0) {
      console.log(`\n❌ JavaScript errors:`);
      errors.forEach(error => console.log(`  ${error}`));
    }
    
    // Final verdict - check for the EXACT error the user reported
    const isFixed = eFErrors === 0 && beforeInitErrors === 0;
    const isWorking = jsErrors === 0;
    
    console.log(`\n🎯 FINAL VERDICT:`);
    console.log(`  - ReferenceError fixed: ${isFixed ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Site working: ${isWorking ? '✅ YES' : '❌ NO'}`);
    console.log(`  - Overall status: ${isWorking && isFixed ? '✅ SUCCESS' : '❌ NEEDS WORK'}`);
    
  } catch (error) {
    console.log(`💥 Test failed: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

testLiveSite();