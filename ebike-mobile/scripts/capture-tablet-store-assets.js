const { chromium } = require('playwright');
const path = require('path');

const output = path.resolve(__dirname, '..', 'store-assets');
const baseUrl = process.env.DANDOEV_PREVIEW_URL || 'http://127.0.0.1:4173';

const devices = [
  { prefix: 'android-tablet', width: 540, height: 960, scale: 2 },
  { prefix: 'ios-ipad-13', width: 1032, height: 1376, scale: 2 },
];

(async () => {
  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });

  try {
    for (const device of devices) {
      const context = await browser.newContext({
        viewport: { width: device.width, height: device.height },
        deviceScaleFactor: device.scale,
      });
      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      await page.getByText('Sign in', { exact: true }).click();
      await page.getByText('Explore demo account').click();
      await page.getByRole('tab', { name: 'Home' }).waitFor();
      await page.screenshot({
        path: path.join(output, `${device.prefix}-01-dashboard.png`),
      });

      await page.getByRole('tab', { name: 'Shop' }).click();
      await page.getByText('Payment view').waitFor();
      await page.screenshot({
        path: path.join(output, `${device.prefix}-02-shop.png`),
      });
      await context.close();
    }
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
