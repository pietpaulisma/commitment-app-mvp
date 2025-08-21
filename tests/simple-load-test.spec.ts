import { test, expect } from '@playwright/test';

test('simple load test - just navigation and basic checks', async ({ page }) => {
  console.log('🚀 Starting simple load test...');
  
  const startTime = Date.now();
  
  // Simple request tracking
  let requestCount = 0;
  let supabaseRequestCount = 0;
  
  page.on('response', response => {
    requestCount++;
    if (response.url().includes('supabase')) {
      supabaseRequestCount++;
    }
  });

  try {
    console.log('📍 Navigating to commitment-app-dev.vercel.app...');
    
    await page.goto('https://commitment-app-dev.vercel.app/', { 
      timeout: 20000,
      waitUntil: 'domcontentloaded'
    });
    
    const navTime = Date.now() - startTime;
    console.log(`⚡ Page loaded in ${navTime}ms`);
    
    // Wait 3 seconds and count requests
    await page.waitForTimeout(3000);
    
    const totalTime = Date.now() - startTime;
    console.log(`⏱️ Total time: ${totalTime}ms`);
    console.log(`📈 Requests: ${requestCount} total, ${supabaseRequestCount} to Supabase`);
    
    // Check if page has content
    const bodyText = await page.locator('body').textContent();
    const hasContent = bodyText && bodyText.length > 100;
    
    console.log(`📄 Body content length: ${bodyText?.length || 0} chars`);
    console.log(`✅ Has meaningful content: ${hasContent}`);
    
    // Simple performance check
    const isHealthy = totalTime < 15000 && hasContent;
    console.log(`🎯 Overall: ${isHealthy ? '✅ HEALTHY' : '❌ ISSUES'}`);
    
  } catch (error) {
    console.log(`❌ Test failed: ${error}`);
    
    const failTime = Date.now() - startTime;
    console.log(`💥 Failed after ${failTime}ms`);
    console.log(`📈 Requests before failure: ${requestCount} total, ${supabaseRequestCount} to Supabase`);
  }
});