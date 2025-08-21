const { chromium } = require('playwright');

(async () => {
  console.log('🧪 Simple dashboard error test...');
  
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  let errors = [];
  let eFErrorFound = false;
  
  page.on('pageerror', error => {
    errors.push(error.message);
    console.error('❌ ERROR:', error.message);
    
    if (error.message.includes("Cannot access 'eF' before initialization")) {
      eFErrorFound = true;
      console.error('🎯 FOUND THE TARGET ERROR!');
    }
  });
  
  try {
    // Go directly to dashboard with auth cookies if possible
    await page.goto('https://commitment-app-dev.vercel.app/dashboard');
    console.log('✅ Navigated to dashboard');
    
    // Wait for page to fully load
    await page.waitForTimeout(8000);
    
    console.log('\n📊 TEST RESULTS:');
    console.log(`- Total errors: ${errors.length}`);
    console.log(`- Target 'eF' error: ${eFErrorFound ? '❌ STILL PRESENT' : '✅ FIXED'}`);
    console.log(`- Dashboard working: ${errors.length === 0 ? '✅ YES' : '❌ NO'}`);
    
    if (errors.length > 0) {
      console.log('\n❌ ALL ERRORS:');
      errors.forEach((error, i) => {
        console.log(`${i + 1}. ${error}`);
      });
    }
    
  } catch (error) {
    console.error('💥 Test failed:', error);
  } finally {
    await browser.close();
  }
})();