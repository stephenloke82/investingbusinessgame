// Automated browser playthrough of the built game.
// Usage: npm run build && node scripts/e2e.mjs [screenshotDir]
// Starts `vite preview`, plays a full career through the real UI in headless
// Chromium (Playwright), and fails on any page error or console error.
import { spawn } from 'node:child_process';
import { mkdirSync } from 'node:fs';
import { createRequire } from 'node:module';

// Playwright is resolved with require() so a globally installed copy works too.
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const shots = process.argv[2] || 'test-results/e2e';
mkdirSync(shots, { recursive: true });
const PORT = 4179;
const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], { stdio: 'pipe', detached: true });
const stopServer = () => {
  try {
    process.kill(-server.pid); // the whole process group (npx and vite)
  } catch {
    server.kill();
  }
};
await new Promise((resolve, reject) => {
  const t = setTimeout(() => reject(new Error('preview server did not start')), 20000);
  server.stdout.on('data', (d) => {
    if (String(d).includes(String(PORT))) {
      clearTimeout(t);
      resolve();
    }
  });
});

const errors = [];
const browser = await chromium.launch();
let failed = false;
try {
  for (const viewport of [{ width: 1280, height: 900, name: 'desktop' }, { width: 390, height: 844, name: 'phone' }]) {
    const page = await browser.newPage({ viewport });
    page.on('pageerror', (e) => errors.push(`[${viewport.name}] pageerror: ${e.message}`));
    page.on('console', (m) => m.type() === 'error' && errors.push(`[${viewport.name}] console: ${m.text()}`));
    page.on('dialog', (d) => d.accept());
    await page.goto(`http://localhost:${PORT}/`);
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.screenshot({ path: `${shots}/${viewport.name}-01-new-game.png`, fullPage: true });

    // New game: normal background, software career, fixed seed
    await page.fill('#ng-name', 'Tester');
    await page.check('input[name="ng-bg"][value="grad"]', { force: true });
    await page.check('input[name="ng-career"][value="software"]', { force: true });
    await page.click('summary');
    await page.fill('#ng-seed', '1234');
    await page.click('[data-action="start-game"]');
    await page.waitForSelector('.coach');
    await page.screenshot({ path: `${shots}/${viewport.name}-02-dashboard.png`, fullPage: true });

    // Tutorial: go through the steps
    for (let i = 0; i < 12; i++) {
      const next = page.locator('[data-action="tutorial-next"]');
      if ((await next.count()) === 0) break;
      await next.click();
    }

    // Budget: set 401(k) to 6%
    await page.click('[data-action="nav"][data-view="budget"]');
    await page.locator('input[data-bind="budget.k401Pct"]').fill('6');
    await page.locator('input[data-bind="budget.k401Pct"]').dispatchEvent('change');
    await page.screenshot({ path: `${shots}/${viewport.name}-03-budget.png`, fullPage: true });

    // Portfolio: sweep into VOO
    await page.click('[data-action="nav"][data-view="portfolio"]');
    await page.selectOption('select[data-bind="budget.sweepSymbol"]', 'VOO');

    // Helper to clear any modal
    const clearModals = async () => {
      for (let i = 0; i < 6; i++) {
        if (await page.locator('[data-action="close-year"]').count()) await page.click('[data-action="close-year"]');
        else if (await page.locator('[data-action="choose"]:not([disabled])').count()) await page.locator('[data-action="choose"]:not([disabled])').first().click();
        else if (await page.locator('[data-action="close-result"]').count()) await page.click('[data-action="close-result"]');
        else break;
      }
    };

    // Play a few months by hand
    for (let i = 0; i < 4; i++) {
      await clearModals();
      await page.click('[data-action="next-month"]');
    }
    await page.screenshot({ path: `${shots}/${viewport.name}-04-event.png`, fullPage: false });
    await clearModals();

    // Market: open a company, buy a stock and a fund
    await page.click('[data-action="nav"][data-view="market"]');
    await page.screenshot({ path: `${shots}/${viewport.name}-05-market.png`, fullPage: true });
    await page.fill('input[data-bind-ui="marketSearch"]', 'NVDA');
    await page.locator('tr[data-symbol="NVDA"]').click();
    await page.waitForSelector('text=Quarterly earnings');
    await page.fill('#trade-amount', '100');
    await page.click('[data-action="trade-buy"]');
    await page.screenshot({ path: `${shots}/${viewport.name}-06-company.png`, fullPage: true });

    // Career view
    await page.click('[data-action="nav"][data-view="career"]');
    await page.screenshot({ path: `${shots}/${viewport.name}-07-career.png`, fullPage: true });

    // Fast-forward a year, then start a side business
    await page.click('[data-action="toggle-ff"]');
    await page.click('[data-action="ff"][data-months="12"]');
    await clearModals();
    await page.click('[data-action="nav"][data-view="business"]');
    const startBtn = page.locator('[data-action="biz-start"][data-type="online"][data-loan="0"]:not([disabled])');
    if (await startBtn.count()) await startBtn.click();
    await page.screenshot({ path: `${shots}/${viewport.name}-08-business.png`, fullPage: true });

    // Fast-forward to retirement, deciding big events with the first enabled choice
    for (let guard = 0; guard < 400; guard++) {
      await clearModals();
      if (await page.locator('.report').count()) break;
      const ff = page.locator('[data-action="toggle-ff"]');
      if (!(await ff.count())) break;
      await ff.click();
      await page.click('[data-action="ff"][data-months="9999"]');
    }
    await clearModals();
    await page.waitForSelector('.report', { timeout: 20000 });
    await page.screenshot({ path: `${shots}/${viewport.name}-09-report.png`, fullPage: true });
    await page.click('[data-action="nav"][data-view="history"]');
    await page.hover('.chart-svg .hit >> nth=0');
    await page.screenshot({ path: `${shots}/${viewport.name}-10-history.png`, fullPage: true });
    await page.click('[data-action="nav"][data-view="guide"]');
    await page.fill('#ask-input', 'what is a p/e ratio');
    await page.click('[data-action="ask"]');
    await page.waitForSelector('.answer');
    await page.screenshot({ path: `${shots}/${viewport.name}-11-guide.png`, fullPage: true });

    // Reload: the saved game should come back
    await page.reload();
    await page.waitForSelector('.report, .coach');
    const month = await page.evaluate(() => window.wealthPath.ui.game?.month ?? 0);
    console.log(`[${viewport.name}] finished at month ${month}; reload restored the save.`);
    if (month < 400) throw new Error('Game did not reach retirement');
    // No horizontal overflow on this viewport
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 2) throw new Error(`[${viewport.name}] page scrolls horizontally by ${overflow}px`);
    await page.close();
  }
} catch (e) {
  failed = true;
  console.error(e);
} finally {
  await browser.close();
  stopServer();
}
if (errors.length) {
  console.error('Errors in the page:\n' + errors.join('\n'));
  failed = true;
}
console.log(failed ? 'E2E FAILED' : 'E2E PASSED');
process.exit(failed ? 1 : 0);
