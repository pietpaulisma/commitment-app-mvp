import { test, expect } from '@playwright/test';

test.describe('Live Loading Performance Test', () => {
  test('measure actual loading time and identify bottlenecks', async ({ page }) => {
    const startTime = Date.now();
    
    // Monitor network requests
    const requests: { url: string, timing: number, status: number }[] = [];
    const slowRequests: { url: string, timing: number }[] = [];
    
    page.on('request', request => {
      (request as any).startTime = Date.now();
    });
    
    page.on('response', response => {
      const request = response.request();
      const timing = Date.now() - ((request as any).startTime || Date.now());
      
      requests.push({
        url: response.url(),
        timing,
        status: response.status()
      });
      
      if (timing > 3000) { // Requests taking over 3 seconds
        slowRequests.push({ url: response.url(), timing });
      }
    });

    // Monitor console for errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    console.log('🚀 Starting to load commitment-app-dev.vercel.app...');
    
    try {
      // Navigate with longer timeout
      await page.goto('https://commitment-app-dev.vercel.app/', { 
        waitUntil: 'networkidle',
        timeout: 60000 
      });
      
      const initialLoadTime = Date.now() - startTime;
      console.log(`⏱️ Initial page load: ${initialLoadTime}ms`);
      
      // Wait for any dynamic content to load
      await page.waitForTimeout(10000);
      
      const totalLoadTime = Date.now() - startTime;
      console.log(`⏱️ Total load time: ${totalLoadTime}ms`);
      
      // Check what's actually on the page
      const title = await page.title();
      console.log(`📄 Page title: ${title}`);
      
      const bodyText = await page.locator('body').textContent();
      const isLoginPage = bodyText?.includes('email') || bodyText?.includes('login');
      const isDashboard = bodyText?.includes('dashboard') || bodyText?.includes('points');
      const isLoading = bodyText?.includes('loading') || bodyText?.includes('Loading');
      
      console.log(`🔍 Page analysis:
        - Is login page: ${isLoginPage}
        - Is dashboard: ${isDashboard}  
        - Still loading: ${isLoading}
        - Body content length: ${bodyText?.length || 0} chars`);
      
      // Check for specific elements
      const elementCounts = {
        loadingSpinners: await page.locator('.loading, [data-loading], .spinner').count(),
        errorElements: await page.locator('.error, [data-error]').count(),
        inputFields: await page.locator('input').count(),
        buttons: await page.locator('button').count()
      };
      
      console.log(`🎯 Elements found:`, elementCounts);
      
    } catch (error) {
      console.log(`❌ Navigation failed: ${error}`);
    }
    
    // Analyze slow requests
    console.log(`\n🐌 SLOW REQUESTS (>3s):`);
    slowRequests.forEach(req => {
      console.log(`  ${req.timing}ms - ${req.url}`);
    });
    
    // Show all Supabase/API requests
    const apiRequests = requests.filter(r => 
      r.url.includes('supabase') || 
      r.url.includes('/api/') ||
      r.url.includes('auth')
    );
    
    console.log(`\n🔌 API/Database requests (${apiRequests.length}):`);
    apiRequests.forEach(req => {
      console.log(`  ${req.status} ${req.timing}ms - ${req.url}`);
    });
    
    // Show errors
    if (errors.length > 0) {
      console.log(`\n❌ Console errors:`);
      errors.forEach(error => console.log(`  ${error}`));
    }
    
    console.log(`\n📊 SUMMARY:
    - Total requests: ${requests.length}
    - Slow requests (>3s): ${slowRequests.length}
    - API requests: ${apiRequests.length}
    - Console errors: ${errors.length}`);
  });
});