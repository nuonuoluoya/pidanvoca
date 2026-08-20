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
  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "idle",
  );
  await expect(
    page.locator(
      ".memory-panel--flight, .memory-panel--incoming, .memory-panel--yielding",
    ),
  ).toHaveCount(0);
});

test("记忆模式由真实主面板飞出且后方卡片独立进入", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.locator("#memoryButton").click();
  await expect(page.locator("#memoryGoodButton")).toBeEnabled();
  const stablePanel = page.locator("#memoryBackdrop > .memory-panel").first();
  const stableBox = await stablePanel.boundingBox();
  const initialWord = await page.locator("#memoryCardWord").textContent();
  await stablePanel.evaluate((panel) => {
    panel.dataset.e2eStablePanel = "true";
  });

  await page.locator("#memoryGoodButton").click();
  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "revealing-incoming",
  );
  const outgoing = page.locator(
    '[data-e2e-stable-panel="true"]:not(.memory-panel--incoming)',
  );
  const incoming = page.locator(".memory-panel--incoming");
  await expect(outgoing).toHaveClass(/memory-panel--flight/);
  await expect(incoming).toHaveCount(1);
  await expect
    .poll(() =>
      outgoing.evaluate((panel) => Number(getComputedStyle(panel).opacity)),
    )
    .toBeLessThan(0.95);

  const frame = await page.evaluate(() => {
    const incomingPanel = document.querySelector(".memory-panel--incoming");
    const outgoingPanel = document.querySelector(
      '[data-e2e-stable-panel="true"]:not(.memory-panel--incoming)',
    );
    const incomingWord = incomingPanel?.querySelector(
      '[data-memory-clone-id="memoryCardWord"]',
    );
    const incomingStyle = getComputedStyle(incomingPanel);
    const outgoingStyle = getComputedStyle(outgoingPanel);
    return {
      incomingLeft: incomingPanel.getBoundingClientRect().left,
      incomingOpacity: Number(incomingStyle.opacity),
      incomingTransform: incomingStyle.transform,
      outgoingOpacity: Number(outgoingStyle.opacity),
      outgoingTransform: outgoingStyle.transform,
      incomingWord: incomingWord?.textContent,
      negativeOffsets: document.querySelectorAll(
        '.card-layer.is-memory-advancing .deck-card[data-offset^="-"]',
      ).length,
    };
  });

  expect(stableBox).not.toBeNull();
  expect(frame.incomingLeft).toBeGreaterThan(stableBox.x + 10);
  expect(frame.incomingOpacity).toBeLessThan(1);
  expect(frame.incomingTransform).not.toBe("none");
  expect(frame.outgoingOpacity).toBeLessThan(1);
  expect(frame.outgoingTransform).not.toBe("none");
  expect(frame.incomingWord).not.toBe(initialWord);
  expect(frame.negativeOffsets).toBe(0);

  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "idle",
  );
  await expect(page.locator("#memoryCardWord")).toHaveText(frame.incomingWord);
});

test("记忆模式撤销时返回卡遮挡当前卡并恢复上一词", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.locator("#memoryButton").click();
  await expect(page.locator("#memoryGoodButton")).toBeEnabled();
  const previousWord = await page.locator("#memoryCardWord").textContent();
  await page.locator("#memoryGoodButton").click();
  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "idle",
  );

  await page.locator("#memoryUndoButton").click();
  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "undo-returning",
  );
  await expect(page.locator(".memory-panel--returning")).toHaveCount(1);
  await expect(page.locator(".memory-panel--yielding")).toHaveCount(1);
  const layers = await page.evaluate(() => {
    const returning = document.querySelector(".memory-panel--returning");
    const yielding = document.querySelector(".memory-panel--yielding");
    return {
      returningZ: Number(getComputedStyle(returning).zIndex),
      yieldingZ: Number(getComputedStyle(yielding).zIndex),
      returningWord: returning.querySelector("#memoryCardWord")?.textContent,
    };
  });
  expect(layers.returningZ).toBeGreaterThan(layers.yieldingZ);
  expect(layers.returningWord).toBe(previousWord);

  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "idle",
  );
  await expect(page.locator("#memoryCardWord")).toHaveText(previousWord);
  await expect(
    page.locator(".memory-panel--returning, .memory-panel--yielding"),
  ).toHaveCount(0);
});
