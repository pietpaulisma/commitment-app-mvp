import { test, expect } from '@playwright/test';

test.describe('Performance Fix Verification', () => {
  test('verify the fixed site loads quickly and functions properly', async ({ page }) => {
    const startTime = Date.now();
    
    // Monitor network requests to catch infinite loops
    const requests: { url: string, timing: number, status: number }[] = [];
    const duplicateRequests = new Map<string, number>();
    
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
      
      // Track duplicate API calls (sign of infinite loops)
      const url = response.url();
      if (url.includes('supabase') || url.includes('/api/')) {
        duplicateRequests.set(url, (duplicateRequests.get(url) || 0) + 1);
      }
    });

    // Monitor console errors
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    console.log('🚀 Testing fixed deployment at commitment-app-dev.vercel.app...');
    
    try {
      // Navigate with reasonable timeout
      await page.goto('https://commitment-app-dev.vercel.app/', { 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
      
      const navigationTime = Date.now() - startTime;
      console.log(`⚡ Navigation completed in: ${navigationTime}ms`);
      
      // Wait a bit for dynamic content but not forever
      await page.waitForTimeout(5000);
      
      const totalTime = Date.now() - startTime;
      console.log(`⏱️ Total time after 5s: ${totalTime}ms`);
      
      // Check what's loaded
      const title = await page.title();
      console.log(`📄 Page title: "${title}"`);
      
      // Check for key elements
      const elements = {
        body: await page.locator('body').count(),
        loadingSpinners: await page.locator('.loading, [data-loading], .spinner').count(),
        inputFields: await page.locator('input').count(),
        buttons: await page.locator('button').count(),
        headings: await page.locator('h1, h2, h3').count(),
        links: await page.locator('a').count()
      };
      
      console.log(`🎯 Page elements:`, elements);
      
      // Check for specific dashboard elements
      const dashboardElements = {
        settingsButton: await page.locator('button', { hasText: /settings|Settings/i }).count(),
        chartElements: await page.locator('[data-testid*="chart"], .chart, svg').count(),
        pointsDisplay: await page.locator('text=/\\d+.*pt|point/i').count(),
        groupMembers: await page.locator('[data-testid*="member"], .member').count()
      };
      
      console.log(`📊 Dashboard elements:`, dashboardElements);
      
      // Test if settings button is clickable
      const settingsButton = page.locator('button').filter({ hasText: /settings|Settings/i }).first();
      if (await settingsButton.count() > 0) {
        try {
          await settingsButton.click({ timeout: 3000 });
          console.log('✅ Settings button is clickable');
        } catch (error) {
          console.log('❌ Settings button click failed:', error);
        }
      } else {
        console.log('❓ Settings button not found');
      }
      
    } catch (error) {
      console.log(`❌ Page loading failed: ${error}`);
    }
    
    // Analyze request patterns for infinite loops
    console.log(`\n📈 REQUEST ANALYSIS:`);
    console.log(`- Total requests: ${requests.length}`);
    
    const apiRequests = requests.filter(r => 
      r.url.includes('supabase') || r.url.includes('/api/')
    );
    console.log(`- API requests: ${apiRequests.length}`);
    
    // Check for suspicious duplicate requests (sign of infinite loops)
    const suspiciousUrls = Array.from(duplicateRequests.entries())
      .filter(([url, count]) => count > 3)
      .sort((a, b) => b[1] - a[1]);
    
    if (suspiciousUrls.length > 0) {
      console.log(`\n🚨 SUSPICIOUS DUPLICATE REQUESTS (possible infinite loops):`);
      suspiciousUrls.forEach(([url, count]) => {
        console.log(`  ${count}x - ${url}`);
      });
    } else {
      console.log(`\n✅ No suspicious duplicate requests detected`);
    }
    
    // Show errors
    if (errors.length > 0) {
      console.log(`\n❌ Console errors (${errors.length}):`);
      errors.slice(0, 5).forEach(error => console.log(`  ${error}`));
      if (errors.length > 5) {
        console.log(`  ... and ${errors.length - 5} more errors`);
      }
    } else {
      console.log(`\n✅ No console errors detected`);
    }
    
    // Performance assessment
    const isHealthy = totalTime < 8000 && suspiciousUrls.length === 0 && errors.length < 3;
    console.log(`\n🎯 PERFORMANCE ASSESSMENT: ${isHealthy ? '✅ HEALTHY' : '❌ ISSUES REMAIN'}`);
    
    console.log(`\n📊 FINAL SUMMARY:
    - Load time: ${totalTime}ms
    - Duplicate API calls: ${suspiciousUrls.length > 0 ? '❌' : '✅'}
    - Console errors: ${errors.length}
    - Overall health: ${isHealthy ? '✅ GOOD' : '❌ NEEDS WORK'}`);
  });
});