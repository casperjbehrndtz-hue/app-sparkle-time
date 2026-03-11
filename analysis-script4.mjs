import { chromium } from '@playwright/test';

const BASE_URL = 'https://kassen-mauve.vercel.app';
const SCREENSHOT_DIR = 'C:/Users/Casper/app-sparkle-time/analysis-screenshots';

const PROFILE = {
  householdType: "solo", income: 30000, partnerIncome: 0, additionalIncome: [],
  postalCode: "2100", housingType: "lejer", hasMortgage: false, rentAmount: 8500,
  mortgageAmount: 0, propertyValue: 0, interestRate: 4.0,
  hasChildren: false, childrenAges: [],
  hasNetflix: true, hasSpotify: true, hasHBO: false, hasViaplay: false,
  hasAppleTV: false, hasDisney: false, hasAmazonPrime: false,
  hasCar: false, carAmount: 3500, carLoan: 2500, carFuel: 1500, carInsurance: 6000, carTax: 3600, carService: 4500,
  hasInternet: true,
  hasInsurance: true, insuranceAmount: 600,
  hasUnion: true, unionAmount: 500,
  hasFitness: false, fitnessAmount: 349,
  hasPet: false, petAmount: 800,
  hasLoan: false, loanAmount: 1500,
  hasSavings: true, savingsAmount: 3000,
  foodAmount: 3500, leisureAmount: 1500, clothingAmount: 800, healthAmount: 350, restaurantAmount: 800,
  customExpenses: [],
};

async function dismissOverlays(page) {
  await page.evaluate(() => {
    document.querySelectorAll('.fixed').forEach(el => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom >= window.innerHeight - 10) el.remove();
    });
  });
}

async function run() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    locale: 'da-DK',
  });

  const consoleErrors = [];
  const networkErrors = [];
  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', response => {
    if (response.status() >= 400) {
      networkErrors.push({ url: response.url(), status: response.status() });
    }
  });

  // Inject profile into localStorage before navigating
  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.evaluate((profile) => {
    localStorage.setItem('kassen_profile_v2', JSON.stringify(profile));
  }, PROFILE);

  // Reload to pick up the profile - should go directly to dashboard
  await page.reload({ waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(3000);
  await dismissOverlays(page);

  const bodyText = await page.textContent('body');
  const onDashboard = bodyText.includes('Cockpit') || bodyText.includes('Overblik');
  console.log(`On dashboard: ${onDashboard}`);

  if (!onDashboard) {
    console.log('Text sample:', bodyText.substring(0, 300));
    await page.screenshot({ path: `${SCREENSHOT_DIR}/30-not-dashboard.png`, fullPage: true });
    await browser.close();
    return;
  }

  // ─── DASHBOARD SCREENSHOTS ───
  await page.screenshot({ path: `${SCREENSHOT_DIR}/20-dashboard-viewport.png`, fullPage: false });
  console.log('Screenshot: 20-dashboard-viewport.png');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/21-dashboard-full.png`, fullPage: true });
  console.log('Screenshot: 21-dashboard-full.png');

  // Section screenshots
  for (const [id, num] of [['cockpit','22'],['overblik','23'],['handling','24'],['fremad','25'],['dybde','26']]) {
    const exists = await page.evaluate((sid) => !!document.getElementById(sid), id);
    if (exists) {
      await page.evaluate((sid) => document.getElementById(sid).scrollIntoView({ behavior: 'instant', block: 'start' }), id);
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${num}-section-${id}.png`, fullPage: false });
      console.log(`Screenshot: ${num}-section-${id}.png`);
    } else {
      console.log(`Section #${id} NOT found`);
    }
  }

  // Expand advanced sections
  for (const label of ['Hvad hvis', 'Stress-test', 'Årshjul', 'Abonnementer', 'Sammenlign', 'Historik']) {
    const btn = page.locator(`button:has-text("${label}")`).first();
    if (await btn.isVisible({ timeout: 1500 }).catch(() => false)) {
      await btn.click({ force: true });
      await page.waitForTimeout(1000);
      console.log(`Expanded: ${label}`);
    }
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/27-advanced-expanded.png`, fullPage: true });
  console.log('Screenshot: 27-advanced-expanded.png');

  // AI Chat panel
  const chatInfo = await page.evaluate(() => {
    // Look for the AIChatPanel component's floating button
    const allBtns = Array.from(document.querySelectorAll('button'));
    const fixedEls = Array.from(document.querySelectorAll('*')).filter(el => {
      const style = window.getComputedStyle(el);
      return style.position === 'fixed' && el.tagName !== 'HEADER';
    });
    return {
      fixedElements: fixedEls.map(el => ({
        tag: el.tagName,
        className: el.className?.substring(0, 80),
        text: el.textContent?.substring(0, 60),
      })),
      buttonTexts: allBtns.map(b => b.textContent?.trim().substring(0, 50)).filter(t => t),
    };
  });
  console.log('Fixed elements:', JSON.stringify(chatInfo.fixedElements, null, 2));

  // Find and click AI chat
  const sporgBtn = page.locator('button:has-text("Spørg")').first();
  if (await sporgBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await sporgBtn.click({ force: true });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/28-ai-chat.png`, fullPage: false });
    console.log('Screenshot: 28-ai-chat.png');
  } else {
    console.log('No "Spørg" button found');
    // Try bottom-right area click
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/28-dashboard-no-chat.png`, fullPage: false });
  }

  // Budget report
  const reportBtn = page.locator('button:has-text("Rapport")').first();
  if (await reportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await page.evaluate(() => window.scrollTo(0, 0));
    await reportBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/29-report.png`, fullPage: true });
    console.log('Screenshot: 29-report.png');
  }

  // Mobile dashboard
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(2000);
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(1000);
  await dismissOverlays(page);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/30-dashboard-mobile.png`, fullPage: true });
  console.log('Screenshot: 30-dashboard-mobile.png');

  console.log(`\nConsole errors: ${consoleErrors.length}`);
  consoleErrors.forEach((e, i) => console.log(`  [${i}] ${e.substring(0, 300)}`));
  console.log(`Network errors: ${networkErrors.length}`);
  networkErrors.forEach((e, i) => console.log(`  [${i}] ${e.status} ${e.url.substring(0, 200)}`));

  await browser.close();
  console.log('\nDone!');
}

run().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
