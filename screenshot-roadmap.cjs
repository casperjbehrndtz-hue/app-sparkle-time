const { chromium } = require('@playwright/test');
const path = require('path');
(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  await page.setViewportSize({ width: 1280, height: 900 });
  const filePath = 'file:///' + path.resolve('roadmap.html').replace(/\\/g, '/');
  await page.goto(filePath, { waitUntil: 'load' });
  await page.screenshot({ path: 'roadmap-screenshot.png', fullPage: true });
  await browser.close();
  console.log('done');
})();
