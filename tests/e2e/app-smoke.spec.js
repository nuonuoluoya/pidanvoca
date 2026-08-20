const { expect, test } = require("@playwright/test");

test.beforeEach(async ({ page }) => {
  const runtimeErrors = [];
  page.on("console", (message) => {
    if (message.type() === "error") runtimeErrors.push(message.text());
  });
  page.on("pageerror", (error) => runtimeErrors.push(error.message));
  page.runtimeErrors = runtimeErrors;
  await page.goto("/vocabulary-flashcards.html");
  await expect(
    page.locator('.deck-card[data-offset="0"] .card-word'),
  ).toBeVisible();
});

test.afterEach(async ({ page }) => {
  expect(page.runtimeErrors).toEqual([]);
});

test("应用启动并渲染稳定主卡", async ({ page }) => {
  await expect(page).toHaveTitle(/随机单词本/);
  await expect(page.locator('.deck-card[data-offset="0"]')).toHaveCount(1);
  await expect(page.locator("#memoryButton")).toBeEnabled();
});

test("经典模式桌面按钮切换到下一张", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const word = page.locator('.deck-card[data-offset="0"] .card-word');
  const initialWord = await word.textContent();
  await page.locator("#nextButton").click();
  await expect.poll(() => word.textContent()).not.toBe(initialWord);
  await expect(page.locator(".card-layer")).not.toHaveClass(/is-transitioning/);
});

test("移动端隐藏经典箭头并保留卡片内容", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");
  await expect(page.locator(".controls")).toBeHidden();
  await expect(
    page.locator('.deck-card[data-offset="0"] .card-word'),
  ).not.toBeEmpty();
});

test("记忆模式 Good 评分推进一次并清理动画状态", async ({ page }) => {
  await page.locator("#memoryButton").click();
  await expect(page.locator("#memoryBackdrop")).toHaveClass(/is-visible/);
  const progress = page.locator("#memoryProgressText");
  const initialProgress = await progress.textContent();
  await expect(page.locator("#memoryGoodButton")).toBeEnabled();
  await page.locator("#memoryGoodButton").click();
  await expect.poll(() => progress.textContent()).not.toBe(initialProgress);
  await expect(page.locator("#memoryBackdrop")).not.toHaveClass(
    /is-transitioning/,
  );
  await expect(page.locator(".memory-panel--flight")).toHaveCount(0);
});
