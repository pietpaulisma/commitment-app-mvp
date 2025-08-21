const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 500
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let jsErrorCount = 0;
  let errors = [];
  let relevantMessages = [];
  
  // Listen for the specific error patterns
  page.on('console', msg => {
    const text = msg.text();
    
    // Look for dashboard-related messages
    if (text.includes('Current time:') || 
        text.includes('Selected colors:') || 
        text.includes('OnboardingGuard') ||
        text.includes('loadDashboardData') ||
        text.includes('Using cached')) {
      relevantMessages.push(`[${msg.type()}] ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    jsErrorCount++;
    errors.push(error);
    console.error('❌ JS ERROR:', error.message);
    
    // Check for the exact error
    if (error.message.includes("Cannot access 'eF' before initialization")) {
      console.error('🎯 FOUND THE EXACT ERROR!');
    }
  });
  
  try {
    console.log('🚀 Testing dashboard with login...');
    
    await page.goto('https://commitment-app-dev.vercel.app');
    console.log('✅ Initial page loaded');
    
    // Wait for initial load
    await page.waitForTimeout(3000);
    
    // Look for auth/login elements
    console.log('🔐 Looking for login options...');
    
    // Try different login approaches
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    const signInButton = page.locator('button:has-text("Sign In"), button:has-text("Login")');
    
    if (await emailInput.count() > 0 && await passwordInput.count() > 0) {
      console.log('📝 Found email/password fields');
      console.log('❗ Need login credentials to test dashboard');
      console.log('Please provide email and password to continue testing');
      
      // Keep browser open
      await new Promise(resolve => {
        console.log('⏸️ Paused - please manually log in to test dashboard');
        console.log('Press any key to continue monitoring for errors...');
        process.stdin.once('data', resolve);
      });
      
      // Now monitor the dashboard
      console.log('👁️ Monitoring dashboard for errors...');
      await page.waitForTimeout(15000);
      
    } else {
      console.log('ℹ️ No login form found - might be already authenticated or different flow');
      
      // Try to navigate directly to dashboard
      try {
        await page.goto('https://commitment-app-dev.vercel.app/dashboard');
        console.log('📊 Navigated to dashboard directly');
        await page.waitForTimeout(10000);
      } catch (e) {
        console.log('❌ Could not navigate to dashboard:', e.message);
      }
    }
    
    console.log('\n📈 DASHBOARD TEST RESULTS:');
    console.log(`- JavaScript errors: ${jsErrorCount}`);
    console.log(`- Dashboard messages: ${relevantMessages.length}`);
    
    if (relevantMessages.length > 0) {
      console.log('\n📜 Dashboard-related messages:');
      relevantMessages.forEach(msg => console.log(`  ${msg}`));
    }
    
    if (errors.length > 0) {
      console.log('\n❌ All errors:');
      errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error.message}`);
      });
    }
    
    console.log('\n🎯 SPECIFIC ERROR CHECK:');
    const hasEFError = errors.some(e => e.message.includes("Cannot access 'eF' before initialization"));
    console.log(`- "Cannot access 'eF'" error: ${hasEFError ? '❌ FOUND' : '✅ NOT FOUND'}`);
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await browser.close();
  }
})();