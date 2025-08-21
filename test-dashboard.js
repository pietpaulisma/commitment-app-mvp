const { chromium } = require('playwright');

(async () => {
  console.log('🚀 Starting dashboard-specific test...');
  
  const browser = await chromium.launch({ 
    headless: false,
    slowMo: 1000
  });
  
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let jsErrorCount = 0;
  let dashboardErrors = [];
  let consoleCount = 0;
  let eFErrors = [];
  
  // Monitor for specific errors
  page.on('console', msg => {
    consoleCount++;
    const text = msg.text();
    
    // Look for dashboard-specific messages
    if (text.includes('Current time:') || 
        text.includes('Selected colors:') || 
        text.includes('loadDashboardData') ||
        text.includes('RectangularDashboard')) {
      console.log(`📊 DASHBOARD: [${msg.type()}] ${text}`);
    }
  });
  
  page.on('pageerror', error => {
    jsErrorCount++;
    console.error('❌ JS ERROR:', error.message);
    
    // Check for the specific error pattern
    if (error.message.includes("Cannot access 'eF' before initialization") || 
        error.message.includes("before initialization")) {
      eFErrors.push(error);
      console.error('🎯 FOUND TARGET ERROR!');
    }
    
    dashboardErrors.push(error);
  });
  
  try {
    // Load the site
    await page.goto('https://commitment-app-dev.vercel.app');
    console.log('✅ Site loaded');
    
    await page.waitForTimeout(3000);
    
    // Check if we're on login page
    const currentUrl = page.url();
    console.log(`📍 Current URL: ${currentUrl}`);
    
    if (currentUrl.includes('/login')) {
      console.log('🔐 On login page - need authentication to test dashboard');
      
      // Check if there are email/password inputs
      const emailInput = await page.locator('input[type="email"]').count();
      const passwordInput = await page.locator('input[type="password"]').count();
      
      if (emailInput > 0 && passwordInput > 0) {
        console.log('\n📝 LOGIN FORM DETECTED');
        console.log('To test the dashboard error, please:');
        console.log('1. Provide email and password as environment variables:');
        console.log('   TEST_EMAIL=your@email.com TEST_PASSWORD=yourpassword node test-dashboard.js');
        console.log('2. Or manually log in while this browser is open');
        
        // Check for environment variables
        const testEmail = process.env.TEST_EMAIL;
        const testPassword = process.env.TEST_PASSWORD;
        
        if (testEmail && testPassword) {
          console.log('🔑 Using provided credentials...');
          
          await page.fill('input[type="email"]', testEmail);
          await page.fill('input[type="password"]', testPassword);
          
          const submitButton = page.locator('button[type="submit"], button:has-text("Sign In"), button:has-text("Login")');
          await submitButton.click();
          
          console.log('⏳ Waiting for login to complete...');
          
          // Wait for navigation away from login page
          try {
            await page.waitForURL(url => !url.includes('/login'), { timeout: 10000 });
            console.log('✅ Login successful, now on:', page.url());
            
            // Wait for dashboard to load
            await page.waitForTimeout(5000);
            
          } catch (e) {
            console.log('❌ Login may have failed or took too long');
          }
        } else {
          console.log('⏸️ Waiting for manual login...');
          console.log('Please log in manually in the browser, then press Enter here...');
          
          // Wait for user input
          await new Promise(resolve => {
            process.stdin.once('data', resolve);
          });
        }
      }
    } else {
      console.log('ℹ️ Not on login page, continuing...');
    }
    
    // Now check the current page for errors
    console.log('🔍 Monitoring for dashboard errors...');
    await page.waitForTimeout(10000);
    
    console.log('\n📊 DASHBOARD TEST RESULTS:');
    console.log(`- Total JS errors: ${jsErrorCount}`);
    console.log(`- Console messages: ${consoleCount}`);
    console.log(`- 'eF' initialization errors: ${eFErrors.length}`);
    console.log(`- Dashboard functional: ${jsErrorCount === 0 ? '✅ YES' : '❌ NO'}`);
    
    if (eFErrors.length > 0) {
      console.log('\n🎯 FOUND THE TARGET ERRORS:');
      eFErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error.message}`);
        if (error.stack) {
          console.log(`   Stack: ${error.stack.split('\n')[1]}`);
        }
      });
    }
    
    if (dashboardErrors.length > 0) {
      console.log('\n❌ ALL DASHBOARD ERRORS:');
      dashboardErrors.forEach((error, i) => {
        console.log(`${i + 1}. ${error.message}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await browser.close();
  }
})();