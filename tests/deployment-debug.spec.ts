import { test, expect } from '@playwright/test';

test.describe('Deployment Loading Issues', () => {
  test('should load the deployment site without chunk errors', async ({ page }) => {
    // Monitor console errors
    const consoleErrors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Monitor network failures
    const networkFailures: string[] = [];
    page.on('response', response => {
      if (!response.ok() && response.url().includes('_next/static')) {
        networkFailures.push(`${response.status()} - ${response.url()}`);
      }
    });

    // Navigate to the deployed site
    await page.goto('https://commitment-nh5yx9azq-pietpaulismas-projects.vercel.app/');
    
    // Wait for the page to fully load
    await page.waitForLoadState('networkidle');
    
    // Check for specific chunk errors
    const chunkErrors = consoleErrors.filter(error => 
      error.includes('ChunkLoadError') || 
      error.includes('Loading chunk') ||
      error.includes('Failed to load resource')
    );

    console.log('Console Errors:', consoleErrors);
    console.log('Network Failures:', networkFailures);
    console.log('Chunk Errors:', chunkErrors);

    // Check if the page loaded properly
    await expect(page.locator('body')).toBeVisible();
    
    // Try navigating to different pages to see if chunks load
    await page.goto('https://commitment-nh5yx9azq-pietpaulismas-projects.vercel.app/dashboard');
    await page.waitForLoadState('networkidle');
    
    await page.goto('https://commitment-nh5yx9azq-pietpaulismas-projects.vercel.app/workout');
    await page.waitForLoadState('networkidle');

    // Report findings
    if (chunkErrors.length > 0 || networkFailures.length > 0) {
      console.log('=== DEPLOYMENT ISSUES FOUND ===');
      console.log('Chunk Errors:', chunkErrors);
      console.log('Network Failures:', networkFailures);
    }
  });

  test('should check if chunks load properly on new deployment', async ({ page }) => {
    // Test general static chunk loading from new deployment
    const response = await page.request.get('https://commitment-nh5yx9azq-pietpaulismas-projects.vercel.app/_next/static/chunks/964-eda38e26c0391a47.js');
    console.log(`Main chunk status: ${response.status()}`);
    
    if (!response.ok()) {
      console.log('Main chunk failed to load');
    } else {
      console.log('Chunks are loading properly now');
    }
  });
});