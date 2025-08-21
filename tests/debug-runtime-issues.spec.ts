import { test, expect } from '@playwright/test';

test.describe('Runtime Issues Debug', () => {
  test('capture console errors and network failures on live site', async ({ page }) => {
    // Monitor all console messages
    const consoleMessages: string[] = [];
    page.on('console', msg => {
      consoleMessages.push(`[${msg.type()}] ${msg.text()}`);
    });

    // Monitor network responses
    const failedRequests: { url: string, status: number, statusText: string }[] = [];
    page.on('response', response => {
      if (!response.ok()) {
        failedRequests.push({
          url: response.url(),
          status: response.status(),
          statusText: response.statusText()
        });
      }
    });

    // Navigate to the site
    console.log('Loading commitment-app-dev.vercel.app...');
    await page.goto('https://commitment-app-dev.vercel.app/');
    
    // Wait a bit for initial loading
    await page.waitForTimeout(10000);
    
    // Try to capture what's actually rendered
    const bodyContent = await page.locator('body').textContent();
    console.log('Page content sample:', bodyContent?.substring(0, 500));
    
    // Check if we're on login page vs dashboard
    const isLoginPage = await page.locator('[data-testid="login-form"], input[type="email"]').count();
    const isDashboard = await page.locator('[data-testid="dashboard"], .dashboard').count();
    
    console.log(`Login page detected: ${isLoginPage > 0}`);
    console.log(`Dashboard detected: ${isDashboard > 0}`);
    
    // Try clicking settings if it exists
    const settingsButton = page.locator('button').filter({ hasText: /settings|Settings/ }).first();
    const settingsExists = await settingsButton.count();
    console.log(`Settings button found: ${settingsExists > 0}`);
    
    if (settingsExists > 0) {
      try {
        await settingsButton.click();
        console.log('Settings button clicked successfully');
      } catch (error) {
        console.log('Settings button click failed:', error);
      }
    }
    
    // Report all issues
    console.log('\n=== CONSOLE MESSAGES ===');
    consoleMessages.forEach(msg => console.log(msg));
    
    console.log('\n=== FAILED REQUESTS ===');
    failedRequests.forEach(req => console.log(`${req.status} ${req.statusText}: ${req.url}`));
    
    console.log('\n=== SUMMARY ===');
    console.log(`Total console messages: ${consoleMessages.length}`);
    console.log(`Failed requests: ${failedRequests.length}`);
  });

  test('try to access dashboard directly if logged out', async ({ page }) => {
    // Monitor responses
    const responses: { url: string, status: number }[] = [];
    page.on('response', response => {
      responses.push({
        url: response.url(),
        status: response.status()
      });
    });

    console.log('Trying to access dashboard directly...');
    await page.goto('https://commitment-app-dev.vercel.app/dashboard');
    await page.waitForTimeout(5000);
    
    const url = page.url();
    console.log(`Final URL: ${url}`);
    
    // Check for specific elements
    const elements = {
      loginForm: await page.locator('input[type="email"]').count(),
      loadingSpinner: await page.locator('.loading, [data-loading="true"]').count(),
      errorMessage: await page.locator('.error, [data-error="true"]').count(),
      dashboardContent: await page.locator('[data-testid*="dashboard"]').count()
    };
    
    console.log('Elements found:', elements);
    
    // Check API calls
    const apiCalls = responses.filter(r => r.url.includes('supabase') || r.url.includes('/api/'));
    console.log('API calls made:', apiCalls);
  });
});