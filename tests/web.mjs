import { chromium, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const url = process.env.DSH_TEST_URL;
if (!url) throw new Error('Set DSH_TEST_URL to the URL printed by an isolated dsh web profile with this plugin installed.');

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, locale: 'en-US' });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));

const settings = page.getByRole('button', { name: /^(Settings|設定)$/ });
const account = page.getByRole('button', { name: /^(Account menu|アカウントメニュー)$/ });
const fontStyle = page.locator('style[data-dsh-font-ja]');
const english = 'English';
const japanese = '日本語';
const currentLanguage = name => page.getByRole('button', { name, exact: true });
const typography = () => page.evaluate(() => {
  const style = getComputedStyle(document.body);
  return {
    text: style.fontFamily,
    code: style.getPropertyValue('--ds-font-family-code'),
    terminal: style.getPropertyValue('--dsh-font-family-terminal'),
  };
});

async function openSettings() {
  await expect(settings.or(account)).toBeVisible();
  if (await settings.isVisible()) await settings.click();
  else {
    await account.click();
    await page.getByText(/^(Settings|設定)$/, { exact: true }).click();
  }
}

async function chooseLanguage(from, to) {
  await currentLanguage(from).click();
  await page.getByText(to, { exact: true }).click();
  await expect(currentLanguage(to)).toBeVisible();
}

try {
  await page.goto(url);
  const continueButton = page.getByRole('button', { name: /^(Continue|続ける|続行)$/ });
  await continueButton.waitFor({ state: 'visible', timeout: 2500 }).catch(() => {});
  if (await continueButton.isVisible()) await continueButton.click();
  await openSettings();
  if (await currentLanguage(japanese).isVisible()) await chooseLanguage(japanese, english);
  await expect(fontStyle).toHaveCount(0);
  const original = await typography();
  expect(original.code).not.toBe('');

  await chooseLanguage(english, japanese);
  const probe = page.getByRole('button', { name: '一般', exact: true });
  await expect(probe).toBeVisible();
  await expect(fontStyle).toHaveCount(1);
  const changed = await typography();
  expect(changed.text).toMatch(/^"?BIZ UDPGothic"?/);
  expect(changed.code).toBe(original.code);
  expect(changed.terminal).toBe(original.terminal);

  // CSS.getPlatformFontsForNode reports the font actually used to draw these glyphs.
  await probe.evaluate(element => element.setAttribute('data-test-font-probe', ''));
  const cdp = await context.newCDPSession(page);
  await cdp.send('DOM.enable');
  await cdp.send('CSS.enable');
  const { root } = await cdp.send('DOM.getDocument');
  const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: '[data-test-font-probe]' });
  const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
  console.log('Japanese glyphs:', fonts.map(font => `${font.familyName} (${font.glyphCount})`).join(', '));
  if (process.env.DSH_TEST_EXPECT_FONT) {
    expect(fonts.some(font => font.familyName.includes(process.env.DSH_TEST_EXPECT_FONT) && font.glyphCount >= 2)).toBe(true);
  }
  await cdp.detach();

  // DSH applies an explicit text font through this body token.
  await page.evaluate(() => document.body.style.setProperty('--dsh-font-family-text', 'Meiryo'));
  expect((await typography()).text).toMatch(/^Meiryo/);
  await page.evaluate(() => document.body.style.removeProperty('--dsh-font-family-text'));
  await chooseLanguage(japanese, english);
  await expect(fontStyle).toHaveCount(0);
  expect(await typography()).toEqual(original);
  await chooseLanguage(english, japanese);

  // The language picker updates optimistically. Keep that page open while the
  // Host saves the preference, and verify it from an English browser context.
  const fresh = await browser.newContext({ locale: 'en-US' });
  try {
    const other = await fresh.newPage();
    await expect(async () => {
      await other.goto(url);
      await expect(other.locator('style[data-dsh-font-ja]')).toHaveCount(1, { timeout: 1500 });
    }).toPass({ timeout: 15_000 });
  } finally {
    await fresh.close();
  }
  await page.reload();
  await expect(fontStyle).toHaveCount(1);
  await openSettings();
  await expect(currentLanguage(japanese)).toBeVisible();
  await page.getByRole('button', { name: /^(閉じる|Close)$/ }).click();

  await page.getByRole('button', { name: 'プラグイン', exact: true }).click();
  const installed = page.getByRole('tab', { name: 'インストール済み', exact: true });
  await installed.waitFor({ state: 'visible', timeout: 30_000 }).catch(() => {});
  if (await installed.isVisible()) await installed.click();
  const toggle = page.getByRole('switch', { name: /dsh-font-ja/ });
  await expect(toggle).toHaveAttribute('aria-checked', 'true', { timeout: 20_000 });
  await toggle.click();
  await expect(fontStyle).toHaveCount(0, { timeout: 20_000 });
  await expect(toggle).toHaveAttribute('aria-checked', 'false', { timeout: 35_000 });
  expect(await typography()).toEqual(original);
  await toggle.click();
  await expect(fontStyle).toHaveCount(1, { timeout: 20_000 });
  await expect(toggle).toHaveAttribute('aria-checked', 'true', { timeout: 35_000 });
  expect(errors).toEqual([]);
  console.log('PASS: locale switching, rendered font, font precedence, reload, and live disable/enable.');
} catch (error) {
  await mkdir('test-results', { recursive: true });
  await page.screenshot({ path: 'test-results/failure.png' }).catch(() => {});
  // Avoid including the local bootstrap URL in logs when Playwright prints its call log.
  console.error(String(error).replaceAll(url, '[DSH test URL]'));
  console.error((await page.locator('body').innerText({ timeout: 1000 }).catch(() => '')).slice(0, 4000));
  console.error(await page.getByRole('switch').evaluateAll(elements => elements.map(element => element.getAttribute('aria-label'))));
  process.exitCode = 1;
} finally {
  await browser.close();
}
