const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, locale: 'da-DK' });
  const page = await context.newPage();
  const base = 'https://app-sparkle-time.vercel.app';
  const dir = 'C:/Users/Casper/app-sparkle-time/market-analysis';

  // 1. Landing page
  console.log('Taking landing page screenshot...');
  await page.goto(base, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${dir}/01-landing.png`, fullPage: true });

  // 2. Auth/Login page
  console.log('Taking auth page screenshot...');
  await page.goto(`${base}/auth`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${dir}/02-auth.png`, fullPage: true });

  // 3. Blog/Guides
  console.log('Taking blog page screenshot...');
  await page.goto(`${base}/blog`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${dir}/03-blog.png`, fullPage: true });

  // 4. Privacy page
  console.log('Taking privacy page screenshot...');
  await page.goto(`${base}/privatliv`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${dir}/04-privatliv.png`, fullPage: true });

  // 5. Install page
  console.log('Taking install page screenshot...');
  await page.goto(`${base}/install`, { waitUntil: 'networkidle', timeout: 30000 });
  await page.screenshot({ path: `${dir}/05-install.png`, fullPage: true });

  // 6. Try onboarding flow - click CTA on landing
  console.log('Navigating to onboarding...');
  await page.goto(base, { waitUntil: 'networkidle', timeout: 30000 });
  
  // Look for CTA button
  const ctaButton = await page.$('text=Kom i gang') || await page.$('text=Start') || await page.$('text=Prøv gratis') || await page.$('a[href*="onboarding"]') || await page.$('button >> text=Kom');
  if (ctaButton) {
    await ctaButton.click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${dir}/06-onboarding-step1.png`, fullPage: true });
    
    // Try to advance through onboarding steps
    for (let i = 2; i <= 6; i++) {
      const nextBtn = await page.$('text=Næste') || await page.$('text=Fortsæt') || await page.$('button >> text=Next') || await page.$('text=Videre');
      if (nextBtn) {
        await nextBtn.click();
        await page.waitForTimeout(1500);
        await page.screenshot({ path: `${dir}/06-onboarding-step${i}.png`, fullPage: true });
      } else {
        break;
      }
    }
  } else {
    console.log('No CTA button found on landing page');
  }

  // 7. Dashboard (might require auth, try anyway)
  console.log('Trying dashboard...');
  await page.goto(`${base}/dashboard`, { waitUntil: 'networkidle', timeout: 30000 }).catch(() => {});
  await page.screenshot({ path: `${dir}/07-dashboard.png`, fullPage: true });

  await browser.close();
  console.log('Done!');
})();
