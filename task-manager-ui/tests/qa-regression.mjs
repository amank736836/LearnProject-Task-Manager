/**
 * PulseTask — QA regression suite
 * ---------------------------------------------------------------------------
 * Locks in every issue that was found and fixed during the QA audit so the
 * same defects cannot silently come back.
 *
 * Run it with:
 *
 *   npm run test:regression
 *
 * The suite can drive a browser in three ways (auto-detected, in this order):
 *
 *   1. PW_CDP_URL=http://127.0.0.1:9222  → attach to an already running Chrome
 *      (used in sandboxes/CI images where browsers cannot be downloaded)
 *   2. CHROME_PATH=/path/to/chrome       → launch that Chrome/Chromium build
 *   3. otherwise                         → `npx playwright install chromium`
 *      then run again (playwright-core resolves the bundled browser)
 *
 * APP_URL defaults to http://127.0.0.1:4173 (vite preview).
 */
import { chromium } from 'playwright-core';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const APP_URL = process.env.APP_URL || 'http://127.0.0.1:4173/';
const CDP_URL = process.env.PW_CDP_URL || '';
const CHROME_PATH = process.env.CHROME_PATH || '';
const AXE_PATH = process.env.AXE_PATH || '';
const SHOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'screenshots');

const results = [];
function check(name, pass, detail = '') {
  results.push({ name, pass, detail });
  const icon = pass ? '✔' : '✘';
  console.log(`${icon} ${name}${detail ? ` — ${detail}` : ''}`);
}

async function openBrowser() {
  if (CDP_URL) {
    const browser = await chromium.connectOverCDP(CDP_URL);
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    return { browser, context, mode: `CDP ${CDP_URL}` };
  }
  const browser = await chromium.launch(
    CHROME_PATH ? { executablePath: CHROME_PATH, args: ['--no-sandbox'] } : {}
  );
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  return { browser, context, mode: CHROME_PATH || 'playwright bundled chromium' };
}

async function newPage(context, { width = 1440, height = 900, reducedMotion } = {}) {
  context.setDefaultTimeout(8000);
  const page = await context.newPage();
  await page.setViewportSize({ width, height });
  if (reducedMotion) await page.emulateMedia({ reducedMotion });
  page.on('pageerror', (error) => {
    results.push({ name: 'uncaught page error', pass: false, detail: String(error).slice(0, 200) });
  });
  return page;
}

const ready = (page) =>
  page.waitForFunction(() => !!document.querySelector('#root')?.children.length, null, { timeout: 20000 });

async function signIn(page) {
  await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
  await ready(page);
  const demo = page.getByRole('button', { name: /Demo as Manager/i });
  if (await demo.count()) {
    await demo.first().click();
  } else {
    await page.getByRole('button', { name: 'My Tasks' }).click().catch(() => {});
  }
  await page.waitForFunction(() => !!document.querySelector('#taskTitle'), null, { timeout: 15000 });
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const { browser, context, mode } = await openBrowser();
  console.log(`\nBrowser mode: ${mode}\nApp under test: ${APP_URL}\n`);

  // ---------------------------------------------------------------------
  // 1. No horizontal page overflow at the narrowest supported width (320)
  //    (fixed: 2-col grids using 1fr tracks + min-content blowout)
  // ---------------------------------------------------------------------
  {
    const page = await newPage(context, { width: 320, height: 720 });
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await ready(page);
    let overflow = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    check('guest login: no horizontal overflow @320', overflow.scrollW <= overflow.clientW + 1, JSON.stringify(overflow));

    await signIn(page);
    overflow = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    check('tasks view: no horizontal overflow @320', overflow.scrollW <= overflow.clientW + 1, JSON.stringify(overflow));

    await page.getByRole('button', { name: 'Kanban Board' }).click();
    await page.waitForTimeout(800);
    overflow = await page.evaluate(() => ({
      scrollW: document.documentElement.scrollWidth,
      clientW: document.documentElement.clientWidth,
    }));
    check('kanban view: no horizontal overflow @320', overflow.scrollW <= overflow.clientW + 1, JSON.stringify(overflow));
    await page.screenshot({ path: path.join(SHOT_DIR, 'regression-320-kanban.png'), fullPage: true });
    await page.close();
  }

  // ---------------------------------------------------------------------
  // 2. Long, unbroken text wraps instead of being clipped by the card
  //    (fixed: overflow-wrap on headings/paragraphs)
  // ---------------------------------------------------------------------
  {
    const page = await newPage(context);
    await signIn(page);
    const longTitle = `QA-LONGTITLE-${'W'.repeat(140)}`;
    await page.locator('#taskTitle').fill(longTitle);
    await page.locator('#taskDescription').fill(`QA-LONGDESC-${'x'.repeat(400)}`);
    await page.getByRole('button', { name: /Add Task to Workspace/ }).click();
    await page.waitForTimeout(2200);
    const h4 = page.locator('h4', { hasText: 'QA-LONGTITLE' }).first();
    const metrics = await h4.evaluate((el) => ({
      scrollW: el.scrollWidth,
      clientW: el.clientWidth,
      scrollH: el.scrollHeight,
      clientH: el.clientHeight,
    }));
    check(
      'very long unbroken title wraps inside its card',
      metrics.scrollW <= metrics.clientW + 1,
      JSON.stringify(metrics)
    );

    // -------------------------------------------------------------------
    // 3. Duplicate-submit guard (rapid repeated clicks create one task)
    // -------------------------------------------------------------------
    await page.locator('#taskTitle').fill('QA-RAPID');
    await page.locator('#taskDescription').fill('rapid click guard');
    const submit = page.getByRole('button', { name: /Add Task to Workspace|Saving/ });
    await Promise.all(
      [1, 2, 3].map(() =>
        submit
          .click({ timeout: 3000, noWaitAfter: true })
          .catch(() => {})
      )
    );
    await page.waitForTimeout(2200);
    const created = await page.evaluate(
      () =>
        (JSON.parse(localStorage.getItem('pulsetask_interactive_db_v1') || '{}').tasks || []).filter(
          (t) => t.title === 'QA-RAPID'
        ).length
    );
    check('rapid triple submit creates exactly one task', created === 1, `created=${created}`);
    await page.close();
  }

  // ---------------------------------------------------------------------
  // 4. Accessible confirmation dialog: semantics, focus move, Escape,
  //    focus restore + scroll lock behind the overlay
  // ---------------------------------------------------------------------
  {
    const page = await newPage(context);
    await signIn(page);
    const deleteButton = page.locator('button[aria-label^="Delete"]').first();
    await deleteButton.click();
    await page.waitForTimeout(500);

    const dialog = await page.evaluate(() => {
      const dlg = document.querySelector('[role="dialog"]');
      return dlg
        ? {
            ariaModal: dlg.getAttribute('aria-modal'),
            labelled: dlg.getAttribute('aria-labelledby'),
            focusInside: dlg.contains(document.activeElement),
            bodyOverflow: getComputedStyle(document.body).overflow,
          }
        : null;
    });
    check('confirm dialog exposes role=dialog + aria-modal', dialog?.ariaModal === 'true', JSON.stringify(dialog));
    check('confirm dialog labels itself via aria-labelledby', Boolean(dialog?.labelled), String(dialog?.labelled));
    check('focus moves into the dialog when it opens', dialog?.focusInside === true, JSON.stringify(dialog));
    check('background scroll is locked while the dialog is open', dialog?.bodyOverflow === 'hidden', String(dialog?.bodyOverflow));

    await page.keyboard.press('Escape');
    await page.waitForTimeout(400);
    const afterEscape = await page.evaluate(() => ({
      dialogOpen: !!document.querySelector('[role="dialog"]'),
      bodyOverflow: getComputedStyle(document.body).overflow,
      focusRestored: document.activeElement?.getAttribute('aria-label') || '',
    }));
    check('Escape closes the dialog', afterEscape.dialogOpen === false, JSON.stringify(afterEscape));
    check('scroll lock is released after close', afterEscape.bodyOverflow !== 'hidden', afterEscape.bodyOverflow);
    check('focus returns to the delete trigger', afterEscape.focusRestored.startsWith('Delete'), afterEscape.focusRestored);
    await page.close();
  }

  // ---------------------------------------------------------------------
  // 5. Visible keyboard focus indicator on every tab stop
  // ---------------------------------------------------------------------
  {
    const page = await newPage(context);
    await signIn(page);
    let missing = 0;
    let checked = 0;
    for (let i = 0; i < 20; i += 1) {
      await page.keyboard.press('Tab');
      await page.waitForTimeout(40);
      const info = await page.evaluate(() => {
        const el = document.activeElement;
        if (!el || el === document.body) return null;
        const style = getComputedStyle(el);
        return {
          outlineWidth: parseFloat(style.outlineWidth) || 0,
          outlineStyle: style.outlineStyle,
        };
      });
      if (!info) continue;
      checked += 1;
      if (info.outlineStyle === 'none' || info.outlineWidth < 2) missing += 1;
    }
    check('every tab stop shows a visible focus ring', missing === 0, `checked=${checked} missing=${missing}`);
    await page.close();
  }

  // ---------------------------------------------------------------------
  // 6. Reduced-motion preference disables decorative animation
  // ---------------------------------------------------------------------
  {
    const page = await newPage(context, { reducedMotion: 'reduce' });
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await ready(page);
    const running = await page.evaluate(() => {
      const out = [];
      for (const el of document.querySelectorAll('*')) {
        const style = getComputedStyle(el);
        if (
          style.animationName &&
          style.animationName !== 'none' &&
          style.animationPlayState === 'running' &&
          style.animationDuration !== '0s'
        ) {
          out.push(style.animationName);
        }
      }
      return out;
    });
    check('prefers-reduced-motion stops all running animations', running.length === 0, JSON.stringify(running.slice(0, 5)));
    await page.close();
  }

  // ---------------------------------------------------------------------
  // 7. Form controls have accessible names + WCAG 2.2 target sizing
  // ---------------------------------------------------------------------
  {
    const page = await newPage(context, { width: 375, height: 812 });
    await signIn(page);
    const audit = await page.evaluate(() => {
      const unnamed = [];
      for (const el of document.querySelectorAll('input,select,textarea')) {
        const style = getComputedStyle(el);
        if (style.display === 'none') continue;
        const label = el.id ? document.querySelector(`label[for="${el.id}"]`) : null;
        const name = el.getAttribute('aria-label') || label?.textContent?.trim();
        if (!name) unnamed.push(el.id || el.tagName);
      }
      const smallTargets = [];
      for (const el of document.querySelectorAll('button,a[href],[role="button"]')) {
        const rect = el.getBoundingClientRect();
        const style = getComputedStyle(el);
        if (rect.width === 0 || rect.height === 0 || style.visibility === 'hidden') continue;
        if (rect.width < 24 || rect.height < 24) {
          smallTargets.push({ text: (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 24), w: Math.round(rect.width), h: Math.round(rect.height) });
        }
      }
      return { unnamed, smallTargets };
    });
    check('all visible form controls have an accessible name', audit.unnamed.length === 0, JSON.stringify(audit.unnamed));
    check('all interactive targets are at least 24×24 CSS px @375', audit.smallTargets.length === 0, JSON.stringify(audit.smallTargets.slice(0, 5)));
    await page.close();
  }

  // ---------------------------------------------------------------------
  // 8. Theme is applied before first paint (no dark/light flash)
  // ---------------------------------------------------------------------
  {
    const page = await newPage(context);
    await page.addInitScript(() => localStorage.setItem('pulsetask_theme', 'light'));
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
    check('stored light theme is applied before React mounts', theme === 'light', `data-theme=${theme}`);
    check('light theme background painted correctly', bg === 'rgb(238, 242, 249)', bg);
    await page.close();
  }

  // ---------------------------------------------------------------------
  // 9. In-app Back / Forward keeps the session and the view
  // ---------------------------------------------------------------------
  {
    const page = await newPage(context);
    await signIn(page);
    await page.getByRole('button', { name: 'Dashboard' }).click();
    await page.waitForTimeout(1500);
    await page.goBack();
    await page.waitForTimeout(900);
    const backHeading = await page.locator('h2').first().innerText();
    const stillSignedIn = (await page.getByRole('button', { name: /Logout/i }).count()) > 0;
    check('Back returns to the previous in-app view', backHeading === 'Workspace Tasks', backHeading);
    check('Back keeps the user signed in', stillSignedIn);
    await page.goForward();
    await page.waitForTimeout(1200);
    const forwardHeading = await page.locator('h2').first().innerText();
    check('Forward returns to the dashboard', /Analytics/.test(forwardHeading), forwardHeading);
    await page.close();
  }

  // ---------------------------------------------------------------------
  // 10. axe-core zero-violation gate (optional: needs axe-core installed)
  // ---------------------------------------------------------------------
  const axeSource = AXE_PATH && fs.existsSync(AXE_PATH) ? fs.readFileSync(AXE_PATH, 'utf8') : '';
  if (axeSource) {
    // Reduced motion keeps the entrance/stagger animations out of the
    // measurement: axe can otherwise sample text mid-fade (opacity < 1),
    // which produces non-deterministic contrast results.
    const page = await newPage(context, { reducedMotion: 'reduce' });
    await page.goto(APP_URL, { waitUntil: 'domcontentloaded' });
    await ready(page);
    await page.waitForTimeout(600);
    // Sign in without navigating (a navigation would drop the injected script)
    const demoButton = page.getByRole('button', { name: /Demo as Manager/i });
    if (await demoButton.count()) {
      await demoButton.first().click();
      await page.waitForFunction(() => !!document.querySelector('#taskTitle'), null, { timeout: 15000 });
      await page.waitForTimeout(800);
    }
    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () => {
      const res = await window.axe.run(document, {
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'] },
      });
      return res.violations.map(
        (v) =>
          `${v.id}(${v.nodes.length}) → ` +
          v.nodes
            .map((n) => `${n.target.join(' ')} [${n.any[0]?.data?.fgColor} on ${n.any[0]?.data?.bgColor} = ${n.any[0]?.data?.contrastRatio}]`)
            .join(' | ')
      );
    });
    check('axe-core: no WCAG 2.2 AA violations on the tasks view', violations.length === 0, JSON.stringify(violations));
    await page.close();
  } else {
    console.log('… skipping axe-core gate (set AXE_PATH=/path/to/axe.min.js to enable)');
  }

  await browser.close();

  const failed = results.filter((r) => !r.pass);
  console.log(`\n${results.length - failed.length}/${results.length} regression checks passed`);
  if (failed.length) {
    console.log('Failed:');
    failed.forEach((f) => console.log(`  - ${f.name}: ${f.detail}`));
    process.exitCode = 1;
  }
  fs.writeFileSync(
    path.join(SHOT_DIR, '..', 'regression-results.json'),
    JSON.stringify({ generatedAt: new Date().toISOString(), appUrl: APP_URL, mode, results }, null, 2)
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
