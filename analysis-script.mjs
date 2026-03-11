import { chromium } from '@playwright/test';

const BASE_URL = 'https://kassen-mauve.vercel.app';
const SCREENSHOT_DIR = 'C:/Users/Casper/app-sparkle-time/analysis-screenshots';

async function dismissCookieBanner(page) {
  // The cookie banner is a fixed overlay at bottom - dismiss it
  try {
    const acceptBtn = page.locator('button:has-text("Acceptér"), button:has-text("Accept"), button:has-text("OK"), button:has-text("Forstået")').first();
    if (await acceptBtn.isVisible({ timeout: 2000 })) {
      await acceptBtn.click();
      await page.waitForTimeout(500);
      return;
    }
  } catch {}
  // Force-remove it via JS
  await page.evaluate(() => {
    const fixed = document.querySelectorAll('.fixed');
    fixed.forEach(el => {
      if (el.classList.contains('bottom-0') || el.style.bottom === '0px') {
        el.remove();
      }
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
  const allRequests = [];

  const page = await context.newPage();
  page.on('console', msg => {
    if (msg.type() === 'error') consoleErrors.push(msg.text());
  });
  page.on('response', response => {
    allRequests.push({ url: response.url(), status: response.status() });
    if (response.status() >= 400) {
      networkErrors.push({ url: response.url(), status: response.status() });
    }
  });

  // ─── 1. Landing page ───
  console.log('=== 1. Loading landing page ===');
  const startTime = Date.now();
  await page.goto(BASE_URL, { waitUntil: 'networkidle', timeout: 30000 });
  const loadTime = Date.now() - startTime;
  console.log(`Page load time: ${loadTime}ms`);

  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/01-landing-page-full.png`, fullPage: true });
  console.log('Screenshot: 01-landing-page-full.png');

  // Dismiss cookie banner
  await dismissCookieBanner(page);

  // Mobile view
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SCREENSHOT_DIR}/02-landing-mobile.png`, fullPage: true });
  console.log('Screenshot: 02-landing-mobile.png');
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.waitForTimeout(500);

  // ─── 2. Onboarding ───
  console.log('\n=== 2. Starting onboarding ===');
  const ctaButton = page.locator('button', { hasText: /beregn|kom i gang|start/i }).first();
  if (await ctaButton.isVisible()) {
    await ctaButton.click();
    await page.waitForTimeout(1500);
    await dismissCookieBanner(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/03-onboarding-step1-household.png`, fullPage: true });
    console.log('Screenshot: 03-onboarding-step1-household.png');

    // Step 1: Select "Solo"
    await page.locator('text=Enlig').first().click({ timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(1500);
    await dismissCookieBanner(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/04-onboarding-step2-income.png`, fullPage: true });
    console.log('Screenshot: 04-onboarding-step2-income.png');

    // Step 2: Income - click continue (force click to avoid overlay)
    await page.locator('button', { hasText: /fortsæt|videre|næste/i }).first().click({ force: true, timeout: 5000 });
    await page.waitForTimeout(1500);
    await dismissCookieBanner(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/05-onboarding-step3-housing.png`, fullPage: true });
    console.log('Screenshot: 05-onboarding-step3-housing.png');

    // Step 3: Housing - enter postal code
    const postalInput = page.locator('input[inputMode="numeric"], input[placeholder*="post"], input[maxlength="4"]').first();
    if (await postalInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await postalInput.fill('2100');
      await page.waitForTimeout(1000);
    }
    await page.locator('button', { hasText: /fortsæt|videre|næste/i }).first().click({ force: true, timeout: 5000 });
    await page.waitForTimeout(1500);
    await dismissCookieBanner(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/06-onboarding-step4-children.png`, fullPage: true });
    console.log('Screenshot: 06-onboarding-step4-children.png');

    // Step 4: Children - click "No"
    const noChoice = page.locator('text=/Nej|Ingen børn/').first();
    if (await noChoice.isVisible({ timeout: 3000 }).catch(() => false)) {
      await noChoice.click({ force: true });
      await page.waitForTimeout(500);
    }
    await page.locator('button', { hasText: /fortsæt|videre|næste/i }).first().click({ force: true, timeout: 5000 });
    await page.waitForTimeout(1500);
    await dismissCookieBanner(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/07-onboarding-step5-expenses.png`, fullPage: true });
    console.log('Screenshot: 07-onboarding-step5-expenses.png');

    // Step 5: Expenses - toggle Netflix
    const netflixEl = page.locator('text=Netflix').first();
    if (await netflixEl.isVisible({ timeout: 3000 }).catch(() => false)) {
      await netflixEl.click({ force: true });
      await page.waitForTimeout(500);
    }

    // Scroll and screenshot bottom
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/08-onboarding-expenses-bottom.png`, fullPage: true });
    console.log('Screenshot: 08-onboarding-expenses-bottom.png');

    // Click "Se overblik" or equivalent
    const seeOverview = page.locator('button', { hasText: /overblik|resultat|se dit|videre|fortsæt/i }).first();
    if (await seeOverview.isVisible({ timeout: 3000 }).catch(() => false)) {
      await seeOverview.click({ force: true });
      await page.waitForTimeout(2000);
      await dismissCookieBanner(page);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/09-onboarding-review.png`, fullPage: true });
      console.log('Screenshot: 09-onboarding-review.png');
    }

    // Review -> Dashboard
    const dashBtn = page.locator('button', { hasText: /dashboard|se dit|gå til|resultat|beregn|næste/i }).first();
    if (await dashBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dashBtn.click({ force: true });
      await page.waitForTimeout(3000);
      await dismissCookieBanner(page);
    }

    // Check for AI Welcome
    await page.waitForTimeout(1000);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/10-after-review.png`, fullPage: true });
    console.log('Screenshot: 10-after-review.png');

    // Try to continue past AI welcome if present
    const continueAny = page.locator('button', { hasText: /fortsæt|videre|se dashboard|gå til|spring over/i }).first();
    if (await continueAny.isVisible({ timeout: 3000 }).catch(() => false)) {
      await continueAny.click({ force: true });
      await page.waitForTimeout(3000);
      await dismissCookieBanner(page);
    }

    // ─── 3. Dashboard ───
    console.log('\n=== 3. Dashboard ===');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/11-dashboard-viewport.png`, fullPage: false });
    console.log('Screenshot: 11-dashboard-viewport.png');
    await page.screenshot({ path: `${SCREENSHOT_DIR}/12-dashboard-full.png`, fullPage: true });
    console.log('Screenshot: 12-dashboard-full.png');

    // Check page title/content
    const pageText = await page.textContent('body');
    console.log(`Page contains "Cockpit": ${pageText.includes('Cockpit')}`);
    console.log(`Page contains "Overblik": ${pageText.includes('Overblik')}`);
    console.log(`Page contains "Handling": ${pageText.includes('Handling')}`);
    console.log(`Page contains "Fremtid": ${pageText.includes('Fremtid')}`);
    console.log(`Page contains "Dybdegående": ${pageText.includes('Dybdegående')}`);

    // Check AI chat
    const aiChatBtn = page.locator('button:has-text("AI"), button:has-text("Spørg"), [class*="chat"]').first();
    const hasAiChat = await aiChatBtn.isVisible({ timeout: 2000 }).catch(() => false);
    console.log(`AI Chat button visible: ${hasAiChat}`);
    if (hasAiChat) {
      await aiChatBtn.click({ force: true });
      await page.waitForTimeout(1500);
      await page.screenshot({ path: `${SCREENSHOT_DIR}/13-ai-chat.png`, fullPage: false });
      console.log('Screenshot: 13-ai-chat.png');
    }

    // Expand advanced sections
    const hvadHvis = page.locator('button:has-text("Hvad hvis")').first();
    if (await hvadHvis.isVisible({ timeout: 2000 }).catch(() => false)) {
      await hvadHvis.click({ force: true });
      await page.waitForTimeout(1000);
    }
    const stressTest = page.locator('button:has-text("Stress-test")').first();
    if (await stressTest.isVisible({ timeout: 2000 }).catch(() => false)) {
      await stressTest.click({ force: true });
      await page.waitForTimeout(1000);
    }
    await page.screenshot({ path: `${SCREENSHOT_DIR}/14-advanced-sections.png`, fullPage: true });
    console.log('Screenshot: 14-advanced-sections.png');
  } else {
    console.log('CTA button not found!');
  }

  // ─── 4. Other pages ───
  console.log('\n=== 4. Other pages ===');

  for (const { path, name } of [
    { path: '/privatliv', name: '15-privacy' },
    { path: '/install', name: '16-install' },
    { path: '/login', name: '17-login' },
    { path: '/guides', name: '18-guides' },
    { path: '/nonexistent', name: '19-404' },
  ]) {
    await page.goto(`${BASE_URL}${path}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(1000);
    await dismissCookieBanner(page);
    await page.screenshot({ path: `${SCREENSHOT_DIR}/${name}.png`, fullPage: true });
    console.log(`Screenshot: ${name}.png`);
  }

  // ─── 5. Summary ───
  console.log('\n=== SUMMARY ===');
  console.log(`Page load time: ${loadTime}ms`);
  console.log(`Console errors (${consoleErrors.length}):`);
  consoleErrors.forEach((e, i) => console.log(`  [${i}] ${e.substring(0, 300)}`));
  console.log(`Network errors 4xx/5xx (${networkErrors.length}):`);
  networkErrors.forEach((e, i) => console.log(`  [${i}] ${e.status} ${e.url.substring(0, 200)}`));
  console.log(`Total network requests: ${allRequests.length}`);

  await browser.close();
  console.log('\nDone!');
}

run().catch(err => {
  console.error('Script error:', err.message);
  process.exit(1);
});
