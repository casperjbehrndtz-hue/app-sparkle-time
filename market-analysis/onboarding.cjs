const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 430, height: 932 } }); // mobile
  const base = 'https://app-sparkle-time.vercel.app';
  const dir = 'C:/Users/Casper/app-sparkle-time/market-analysis';

  await page.goto(base, { waitUntil: 'networkidle', timeout: 30000 });
  
  // Click CTA
  const cta = await page.$('text=Beregn dit rådighedsbeløb');
  if (cta) {
    await cta.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${dir}/08-onboard-household.png`, fullPage: true });
    
    // Pick "Solo"
    const solo = await page.$('text=Solo');
    if (solo) { await solo.click(); await page.waitForTimeout(1500); }
    await page.screenshot({ path: `${dir}/09-onboard-income.png`, fullPage: true });
    
    // Click continue
    const cont1 = await page.$('text=Fortsæt');
    if (cont1) { await cont1.click(); await page.waitForTimeout(1500); }
    await page.screenshot({ path: `${dir}/10-onboard-housing.png`, fullPage: true });
    
    const cont2 = await page.$('text=Fortsæt');
    if (cont2) { await cont2.click(); await page.waitForTimeout(1500); }
    await page.screenshot({ path: `${dir}/11-onboard-children.png`, fullPage: true });
    
    const cont3 = await page.$('text=Fortsæt');
    if (cont3) { await cont3.click(); await page.waitForTimeout(1500); }
    await page.screenshot({ path: `${dir}/12-onboard-expenses.png`, fullPage: true });
  }
  
  await browser.close();
  console.log('Done!');
})();
