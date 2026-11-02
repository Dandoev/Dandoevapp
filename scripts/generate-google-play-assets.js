const { chromium } = require('playwright');
const http = require('http');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const distDir = path.resolve(__dirname, '..', 'ebike-mobile', 'dist');
const playStoreDir = path.resolve(__dirname, '..', 'ebike-mobile', 'store-assets', 'google-play');
const brainDir = path.resolve('C:\\Users\\DELL\\.gemini\\antigravity\\brain\\d677c9f0-df83-4d96-b5e6-4ec06fdef182');

const phoneDir = path.join(playStoreDir, 'phone');
const tablet7Dir = path.join(playStoreDir, 'tablet-7inch');
const tablet10Dir = path.join(playStoreDir, 'tablet-10inch');

[phoneDir, tablet7Dir, tablet10Dir, brainDir].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

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
      console.log(`Web dist server running at http://127.0.0.1:${port}`);
      resolve(server);
    });
  });
}

const configurations = [
  {
    category: 'Phone',
    targetFolder: phoneDir,
    filenamePrefix: 'google-play-phone',
    viewport: { width: 432, height: 768 },
    scale: 2.5, // 432 * 2.5 = 1080, 768 * 2.5 = 1920 (exact 9:16)
    minSide: 320,
    maxSide: 3840,
    targetDesc: 'Phone (1080 x 1920 px, 9:16)',
  },
  {
    category: '7-inch Tablet',
    targetFolder: tablet7Dir,
    filenamePrefix: 'google-play-tablet-7inch',
    viewport: { width: 540, height: 960 },
    scale: 2.0, // 540 * 2.0 = 1080, 960 * 2.0 = 1920 (exact 9:16)
    minSide: 320,
    maxSide: 3840,
    targetDesc: '7-inch Tablet (1080 x 1920 px, 9:16)',
  },
  {
    category: '10-inch Tablet',
    targetFolder: tablet10Dir,
    filenamePrefix: 'google-play-tablet-10inch',
    viewport: { width: 720, height: 1280 },
    scale: 2.0, // 720 * 2.0 = 1440, 1280 * 2.0 = 2560 (exact 9:16)
    minSide: 1080,
    maxSide: 7680,
    targetDesc: '10-inch Tablet (1440 x 2560 px, 9:16)',
  },
];

(async () => {
  const PORT = 4190;
  const server = await serveDist(PORT);
  const baseUrl = `http://127.0.0.1:${PORT}`;

  const browser = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
  });

  const allCapturedAssets = [];

  try {
    for (const config of configurations) {
      console.log(`\n======================================================`);
      console.log(`Generating Google Developer Console assets for: ${config.targetDesc}`);
      console.log(`Destination: ${config.targetFolder}`);

      const context = await browser.newContext({
        viewport: config.viewport,
        deviceScaleFactor: config.scale,
      });

      const page = await context.newPage();

      // Configure mock demo authenticated customer session
      await page.addInitScript(() => {
        localStorage.setItem('@dandoev_auth_token', 'demo-token-customer');
      });

      // Optimize CSS for edge-to-edge mobile app screenshot capture
      await page.addInitScript(() => {
        window.addEventListener('DOMContentLoaded', () => {
          const style = document.createElement('style');
          style.innerHTML = `
            html, body, #root {
              height: 100% !important;
              margin: 0 !important;
              padding: 0 !important;
              overflow: hidden !important;
            }
            div[style*="max-width: 480px"], div[style*="max-width: 860px"] {
              max-width: 100% !important;
              max-height: 100% !important;
              border-radius: 0 !important;
              box-shadow: none !important;
            }
          `;
          document.head.appendChild(style);
        });
      });

      await page.goto(baseUrl, { waitUntil: 'networkidle' });
      await page.waitForTimeout(2500);

      // --- SCREEN 1: DASHBOARD / OVERVIEW ---
      console.log(`  [1/3] Capturing Dashboard / Fleet Telemetry...`);
      const overviewTab = page.getByRole('tab', { name: 'Overview' }).or(page.getByText('Overview', { exact: true }));
      await overviewTab.first().click();
      await page.waitForTimeout(1600);

      const shot1Name = `${config.filenamePrefix}-01-dashboard.png`;
      const shot1Path = path.join(config.targetFolder, shot1Name);
      await page.screenshot({ path: shot1Path });
      fs.copyFileSync(shot1Path, path.join(brainDir, shot1Name));
      allCapturedAssets.push({ file: shot1Path, config });
      console.log(`        Saved: ${shot1Name}`);

      // --- SCREEN 2: SHOP / FLEET CATALOG ---
      console.log(`  [2/3] Capturing Shop / E-Bike Fleet Catalog...`);
      const shopTab = page.getByRole('tab', { name: 'Shop' }).or(page.getByText('Shop', { exact: true }));
      await shopTab.last().click();
      await page.waitForTimeout(1600);

      const shot2Name = `${config.filenamePrefix}-02-shop.png`;
      const shot2Path = path.join(config.targetFolder, shot2Name);
      await page.screenshot({ path: shot2Path });
      fs.copyFileSync(shot2Path, path.join(brainDir, shot2Name));
      allCapturedAssets.push({ file: shot2Path, config });
      console.log(`        Saved: ${shot2Name}`);

      // --- SCREEN 3: PLANS & REPAYMENTS ---
      console.log(`  [3/3] Capturing Plans / Active Mandate & Repayments...`);
      const loansTab = page.getByRole('tab', { name: 'Loans' }).or(page.getByText('Loans', { exact: true }));
      await loansTab.first().click();
      await page.waitForTimeout(1600);

      const shot3Name = `${config.filenamePrefix}-03-plans.png`;
      const shot3Path = path.join(config.targetFolder, shot3Name);
      await page.screenshot({ path: shot3Path });
      fs.copyFileSync(shot3Path, path.join(brainDir, shot3Name));
      allCapturedAssets.push({ file: shot3Path, config });
      console.log(`        Saved: ${shot3Name}`);

      await context.close();
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`\n======================================================`);
  console.log(`VERIFICATION & COMPLIANCE REPORT FOR GOOGLE PLAY CONSOLE:`);
  console.log(`======================================================`);

  let allCompliant = true;

  for (const item of allCapturedAssets) {
    const meta = await sharp(item.file).metadata();
    const stats = fs.statSync(item.file);
    const sizeMb = stats.size / (1024 * 1024);
    const ratio = meta.width / meta.height;
    const is9by16 = Math.abs(ratio - (9 / 16)) < 0.001;
    const isUnder8Mb = sizeMb < 8.0;
    const minSideOk = Math.min(meta.width, meta.height) >= item.config.minSide;
    const maxSideOk = Math.max(meta.width, meta.height) <= item.config.maxSide;
    const isPng = meta.format === 'png';

    const compliant = is9by16 && isUnder8Mb && minSideOk && maxSideOk && isPng;
    if (!compliant) allCompliant = false;

    console.log(`\nFile: ${path.basename(item.file)}`);
    console.log(`  Category:       ${item.config.category}`);
    console.log(`  Resolution:     ${meta.width} x ${meta.height} px`);
    console.log(`  Aspect Ratio:   ${ratio.toFixed(4)} (Expected 9:16 = 0.5625) -> ${is9by16 ? 'PASS' : 'FAIL'}`);
    console.log(`  Format:         ${meta.format.toUpperCase()} -> ${isPng ? 'PASS' : 'FAIL'}`);
    console.log(`  File Size:      ${sizeMb.toFixed(2)} MB (${stats.size} bytes) (Limit: < 8 MB) -> ${isUnder8Mb ? 'PASS' : 'FAIL'}`);
    console.log(`  Side Limits:    min >= ${item.config.minSide} px, max <= ${item.config.maxSide} px -> ${(minSideOk && maxSideOk) ? 'PASS' : 'FAIL'}`);
    console.log(`  Status:         ${compliant ? '100% GOOGLE PLAY COMPLIANT' : 'NON-COMPLIANT'}`);
  }

  if (allCompliant) {
    console.log(`\n>>> SUCCESS: All 9 screenshots strictly satisfy every Google Developer Console criteria! <<<`);
  } else {
    console.error(`\n>>> WARNING: One or more screenshots did not satisfy requirements. <<<`);
    process.exitCode = 1;
  }
})().catch(err => {
  console.error('Fatal error during asset generation:', err);
  process.exit(1);
});
