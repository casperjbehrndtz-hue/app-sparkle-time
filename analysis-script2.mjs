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

  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  await page.waitForTimeout(1500);
  await dismissOverlays(page);

  // Click CTA
  await page.locator('button:has-text("Beregn")').first().click({ force: true });
  await page.waitForTimeout(1500);
  await dismissOverlays(page);

  // Household: "Kun mig" auto-advances after 300ms, so we're already on income step
  // The screenshot 03 confirms "Kun mig" is pre-selected, and clicking it auto-navigates
  // So we click it and wait for Income to appear
  const kunMig = page.locator('text=Kun mig').first();
  const isOnHousehold = await kunMig.isVisible({ timeout: 3000 }).catch(() => false);
  if (isOnHousehold) {
    await kunMig.click({ force: true });
    await page.waitForTimeout(2000); // wait for auto-advance
    await dismissOverlays(page);
  }

  // We should now be on Income step - wait for "Fortsæt" button
  await page.waitForSelector('button:has-text("Fortsæt")', { timeout: 5000 });
  console.log('On income step');
  await page.locator('button:has-text("Fortsæt")').first().click({ force: true });
  await page.waitForTimeout(1500);
  await dismissOverlays(page);

  // Housing step
  console.log('On housing step');
  const postal = page.locator('input[maxlength="4"]').first();
  if (await postal.isVisible({ timeout: 3000 }).catch(() => false)) {
    await postal.fill('2100');
    await page.waitForTimeout(800);
  }
  await page.locator('button:has-text("Fortsæt")').first().click({ force: true });
  await page.waitForTimeout(1500);
  await dismissOverlays(page);

  // Children step
  console.log('On children step');
  await page.locator('button:has-text("Fortsæt")').first().click({ force: true });
  await page.waitForTimeout(1500);
  await dismissOverlays(page);

  // Expenses step
  console.log('On expenses step');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  // Button text from source: t("step.expenses.seeOverview") which is "Se dit overblik"
  const expBtns = page.locator('button').filter({ hasText: /overblik|Fortsæt/i });
  await expBtns.first().click({ force: true });
  await page.waitForTimeout(2000);
  await dismissOverlays(page);

  // Review step
  console.log('On review step');
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(500);
  // Button text from source: t("step.review.seeDashboard")
  const reviewBtns = page.locator('button').filter({ hasText: /dashboard|Se dit/i });
  const reviewVisible = await reviewBtns.first().isVisible({ timeout: 3000 }).catch(() => false);
  if (reviewVisible) {
    await reviewBtns.first().click({ force: true });
    await page.waitForTimeout(6000); // Wait for AI welcome insight to load
    await dismissOverlays(page);
  }

  // AI Welcome screen
  console.log('Checking for AI Welcome...');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/20-ai-welcome-check.png`, fullPage: true });

  const seFullt = page.locator('button:has-text("Se fuldt dashboard")');
  let found = await seFullt.isVisible({ timeout: 10000 }).catch(() => false);
  if (found) {
    console.log('Found "Se fuldt dashboard", clicking...');
    await seFullt.click({ force: true });
    await page.waitForTimeout(3000);
    await dismissOverlays(page);
  } else {
    console.log('Button not found yet, waiting more...');
    await page.waitForTimeout(5000);
    found = await seFullt.isVisible({ timeout: 5000 }).catch(() => false);
    if (found) {
      await seFullt.click({ force: true });
      await page.waitForTimeout(3000);
      await dismissOverlays(page);
    }
  }

  // Now check if we're on dashboard
  const bodyText = await page.textContent('body');
  const onDashboard = bodyText.includes('Cockpit') || bodyText.includes('cockpit');
  console.log(`On dashboard: ${onDashboard}`);

  if (!onDashboard) {
    // Maybe still loading, try once more
    console.log('Not on dashboard yet, current page text sample:', bodyText.substring(0, 200));
    await page.screenshot({ path: `${SCREENSHOT_DIR}/20-stuck-state.png`, fullPage: true });
    // Try clicking any visible continue/dashboard button
    const anyBtn = page.locator('button').filter({ hasText: /dashboard|fortsæt|videre/i }).first();
    if (await anyBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await anyBtn.click({ force: true });
      await page.waitForTimeout(3000);
    }
  }

  // Dashboard screenshots
  await page.screenshot({ path: `${SCREENSHOT_DIR}/21-dashboard-viewport.png`, fullPage: false });
  console.log('Screenshot: 21-dashboard-viewport.png');
  await page.screenshot({ path: `${SCREENSHOT_DIR}/22-dashboard-full.png`, fullPage: true });
  console.log('Screenshot: 22-dashboard-full.png');

  // Scroll to each section
  for (const [id, num] of [['cockpit','23'],['overblik','24'],['handling','25'],['fremad','26'],['dybde','27']]) {
    const exists = await page.evaluate((sid) => !!document.getElementById(sid), id);
    if (exists) {
      await page.evaluate((sid) => document.getElementById(sid).scrollIntoView({ behavior: 'instant', block: 'start' }), id);
      await page.waitForTimeout(800);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/${num}-section-${id}.png`, fullPage: false });
      console.log(`Screenshot: ${num}-section-${id}.png`);
    } else {
      console.log(`Section #${id} not found on page`);
    }
  }

  // Expand advanced sections
  for (const label of ['Hvad hvis', 'Stress-test', 'Årshjul', 'Abonnementer', 'Sammenlign']) {
    const btn = page.locator(`button:has-text("${label}")`).first();
    if (await btn.isVisible({ timeout: 1000 }).catch(() => false)) {
      await btn.click({ force: true });
      await page.waitForTimeout(800);
    }
  }
  await page.screenshot({ path: `${SCREENSHOT_DIR}/28-advanced-expanded.png`, fullPage: true });
  console.log('Screenshot: 28-advanced-expanded.png');

  // Look for AI chat
  const chatInfo = await page.evaluate(() => {
    const allBtns = Array.from(document.querySelectorAll('button'));
    const chatBtns = allBtns.filter(b => {
      const t = (b.textContent || '').toLowerCase();
      return t.includes('spørg') || t.includes('chat') || t.includes(' ai');
    });
    const fixedBtns = allBtns.filter(b => {
      const style = window.getComputedStyle(b);
      return style.position === 'fixed';
    });
    return {
      chatButtons: chatBtns.map(b => b.textContent?.trim().substring(0, 40)),
      fixedButtons: fixedBtns.map(b => b.textContent?.trim().substring(0, 40)),
      totalButtons: allBtns.length
    };
  });
  console.log('Chat/AI info:', JSON.stringify(chatInfo));

  // If there's a fixed button, it's likely the AI chat FAB
  if (chatInfo.fixedButtons.length > 0 || chatInfo.chatButtons.length > 0) {
    const chatBtn = page.locator('button:has-text("Spørg"), button:has-text("AI")').first();
    if (await chatBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await chatBtn.click({ force: true });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/29-ai-chat.png`, fullPage: false });
      console.log('Screenshot: 29-ai-chat.png');
    }
  }

  // Try report
  const reportBtn = page.locator('button:has-text("Rapport")').first();
  if (await reportBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await reportBtn.click({ force: true });
    await page.waitForTimeout(2000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/30-report.png`, fullPage: true });
    console.log('Screenshot: 30-report.png');
  }

  console.log(`\nConsole errors: ${consoleErrors.length}`);
  consoleErrors.forEach((e, i) => console.log(`  [${i}] ${e.substring(0, 250)}`));
  console.log(`Network errors: ${networkErrors.length}`);
  networkErrors.forEach((e, i) => console.log(`  [${i}] ${e.status} ${e.url.substring(0, 200)}`));

  await browser.close();
  console.log('\nDone!');
}

run().catch(err => {
  console.error('Script error:', err.message);
  process.exit(1);
});
