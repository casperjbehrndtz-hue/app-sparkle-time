import { chromium } from '@playwright/test';

const BASE_URL = 'https://kassen-mauve.vercel.app';
const SCREENSHOT_DIR = 'C:/Users/Casper/app-sparkle-time/analysis-screenshots';

async function dismissOverlays(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.fixed').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom >= window.innerHeight - 10) el.remove();
    });
  });
}

async function debugPage(page, label) {
  const text = (await page.textContent('body')).substring(0, 500);
  const buttons = await page.evaluate(() => {
    return Array.from(document.querySelectorAll('button')).map(b => b.textContent?.trim().substring(0, 60));
  });
  console.log(`--- ${label} ---`);
  console.log('Buttons:', buttons);
  console.log('Text sample:', text.substring(0, 200));
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'da-DK',
  });

  const page = await context.newPage();

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await dismissOverlays(page);

  // CTA
  await page.locator('button:has-text("Beregn")').first().click({ force: true });
  await page.waitForTimeout(2000);
  await dismissOverlays(page);

  await debugPage(page, 'After CTA click');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/debug-1.png` });

  // The household step shows "Kun mig" (already selected with checkmark).
  // Clicking it triggers auto-advance after 300ms timeout.
  // But it seems the first click on CTA might already show the household step
  // and auto-select "Kun mig". Let's see what's there.

  // Try clicking "Kun mig" if visible
  const kunMig = page.locator(':text("Kun mig")').first();
  if (await kunMig.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Clicking Kun mig...');
    await kunMig.click({ force: true });
    await page.waitForTimeout(2000);
    await dismissOverlays(page);
    await debugPage(page, 'After Kun mig');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/debug-2.png` });
  } else {
    console.log('Kun mig not visible, checking current state...');
    await debugPage(page, 'No Kun mig');
  }

  // Now try finding and clicking Fortsæt
  const fortsat = page.locator('button:has-text("Fortsæt")').first();
  if (await fortsat.isVisible({ timeout: 3000 }).catch(() => false)) {
    console.log('Clicking Fortsæt (income)...');
    await fortsat.click({ force: true });
    await page.waitForTimeout(2000);
    await dismissOverlays(page);
    await debugPage(page, 'After income continue');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/debug-3.png` });
  } else {
    console.log('No Fortsæt button found');
    await debugPage(page, 'No Fortsæt');
  }

  // Housing: postal + continue
  const postal = page.locator('input[maxlength="4"]').first();
  if (await postal.isVisible({ timeout: 2000 }).catch(() => false)) {
    await postal.fill('2100');
    await page.waitForTimeout(800);
  }
  const fortsat2 = page.locator('button:has-text("Fortsæt")').first();
  if (await fortsat2.isVisible({ timeout: 2000 }).catch(() => false)) {
    await fortsat2.click({ force: true });
    await page.waitForTimeout(2000);
    await dismissOverlays(page);
    await debugPage(page, 'After housing');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/debug-4.png` });
  }

  // Children: continue
  const fortsat3 = page.locator('button:has-text("Fortsæt")').first();
  if (await fortsat3.isVisible({ timeout: 2000 }).catch(() => false)) {
    await fortsat3.click({ force: true });
    await page.waitForTimeout(2000);
    await dismissOverlays(page);
    await debugPage(page, 'After children');
  }

  // Expenses: scroll and click
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  await debugPage(page, 'Expenses bottom');

  const expBtn = page.locator('button').filter({ hasText: /overblik|Fortsæt/i }).first();
  if (await expBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await expBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await dismissOverlays(page);
    await debugPage(page, 'After expenses');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/debug-5.png` });
  }

  // Review: scroll and click dashboard
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  const dashBtn = page.locator('button').filter({ hasText: /dashboard/i }).first();
  if (await dashBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    console.log('Clicking Se dit dashboard...');
    await dashBtn.click({ force: true });
    await page.waitForTimeout(8000);
    await dismissOverlays(page);
    await debugPage(page, 'After review -> dashboard');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/debug-6.png` });
  }

  // AI welcome -> Se fuldt dashboard
  const seFullt = page.locator('button:has-text("Se fuldt dashboard")');
  if (await seFullt.isVisible({ timeout: 10000 }).catch(() => false)) {
    console.log('Clicking Se fuldt dashboard...');
    await seFullt.click({ force: true });
    await page.waitForTimeout(3000);
    await dismissOverlays(page);
    await debugPage(page, 'DASHBOARD');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/debug-7-dashboard.png`, fullPage: true });
  } else {
    console.log('Se fuldt dashboard not found');
    await debugPage(page, 'Current state');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/debug-7-stuck.png`, fullPage: true });
  }

  await browser.close();
  console.log('Done!');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
