const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');

const distDir = path.resolve(__dirname, '..', 'ebike-mobile', 'dist');
const storeAssetsDir = path.resolve(__dirname, '..', 'ebike-mobile', 'store-assets');
const brainDir = path.resolve('C:\\Users\\DELL\\.gemini\\antigravity\\brain\\ce27e458-cd0b-4b60-b1dc-655e102f27aa');

if (!fs.existsSync(storeAssetsDir)) fs.mkdirSync(storeAssetsDir, { recursive: true });

function serveDist(port) {
  const mimeTypes = {
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.css': 'text/css',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon',
    '.ttf': 'font/ttf',
  };

  const server = http.createServer((req, res) => {
    let filePath = path.join(distDir, req.url === '/' ? 'index.html' : req.url.split('?')[0]);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(distDir, 'index.html');
    }
    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(500);
        res.end('Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(content, 'utf-8');
      }
    });
  });

  return new Promise((resolve) => {
    server.listen(port, '127.0.0.1', () => {
      console.log(`Server listening at http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

(async () => {
  const PORT = 4173;
  const server = await serveDist(PORT);
  const baseUrl = `http://127.0.0.1:${PORT}`;

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });

  const targets = [
    // 1. iPhone with Dynamic Island (medium display): 1179 x 2556 (Apple required)
    {
      name: 'iphone-dynamic-island-medium',
      width: 393,
      height: 852,
      scale: 3, // 393 x 3 = 1179, 852 x 3 = 2556
    },
    // 2. 13-inch iPad display: 2048 x 2732 (Apple required)
    {
      name: 'ipad-13-inch',
      width: 1024,
      height: 1366,
      scale: 2, // 1024 x 2 = 2048, 1366 x 2 = 2732
    },
  ];

  try {
    for (const target of targets) {
      console.log(`\nCapturing screenshots for ${target.name} (${target.width * target.scale}x${target.height * target.scale})...`);
      const context = await browser.newContext({
        viewport: { width: target.width, height: target.height },
        deviceScaleFactor: target.scale,
      });

      const page = await context.newPage();
      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      // Wait for 2200ms splash screen to disappear
      await page.waitForTimeout(2800);

      // Shot 1: Onboarding Screen (Hero Card + Halo + Bike)
      const shot1Path = path.join(storeAssetsDir, `${target.name}-01-onboarding.png`);
      await page.screenshot({ path: shot1Path });
      console.log(`  ✓ Shot 1 (Onboarding): ${shot1Path}`);
      fs.copyFileSync(shot1Path, path.join(brainDir, `${target.name}-01-onboarding.png`));

      // Click "Explore demo" on Onboarding Screen
      const demoBtn = page.getByRole('button', { name: 'Explore demo' }).or(page.getByText('Explore demo'));
      await demoBtn.first().click();
      await page.waitForTimeout(1800);

      // Shot 2: Dashboard
      const shot2Path = path.join(storeAssetsDir, `${target.name}-02-dashboard.png`);
      await page.screenshot({ path: shot2Path });
      console.log(`  ✓ Shot 2 (Dashboard): ${shot2Path}`);
      fs.copyFileSync(shot2Path, path.join(brainDir, `${target.name}-02-dashboard.png`));

      // Shot 3: Shop / Fleet
      const shopBtn = page.getByRole('tab', { name: 'Shop' }).or(page.locator('[aria-label="Shop"]')).or(page.getByText('Shop', { exact: true }));
      if (await shopBtn.first().isVisible()) {
        await shopBtn.first().click();
        await page.waitForTimeout(1500);
        const shot3Path = path.join(storeAssetsDir, `${target.name}-03-shop.png`);
        await page.screenshot({ path: shot3Path });
        console.log(`  ✓ Shot 3 (Shop): ${shot3Path}`);
        fs.copyFileSync(shot3Path, path.join(brainDir, `${target.name}-03-shop.png`));
      }

      // Shot 4: Loans
      const loansBtn = page.getByRole('tab', { name: 'Loans' }).or(page.locator('[aria-label="Loans"]')).or(page.getByText('Loans', { exact: true }));
      if (await loansBtn.first().isVisible()) {
        await loansBtn.first().click();
        await page.waitForTimeout(1500);
        const shot4Path = path.join(storeAssetsDir, `${target.name}-04-loans.png`);
        await page.screenshot({ path: shot4Path });
        console.log(`  ✓ Shot 4 (Loans): ${shot4Path}`);
        fs.copyFileSync(shot4Path, path.join(brainDir, `${target.name}-04-loans.png`));
      }

      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log('\nAll App Store screenshots successfully generated!');
})().catch((err) => {
  console.error('Error generating screenshots:', err);
  process.exit(1);
});
