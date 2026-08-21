const { expect, test } = require("@playwright/test");
const path = require("node:path");
const { pathToFileURL } = require("node:url");
const performanceBudgets = require("../../performance-budgets.json");

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
  expect(await page.locator(".deck-card").count()).toBeLessThanOrEqual(
    performanceBudgets.visibleCardDomLimit,
  );
});

test("在线版按需请求非默认词库并完成切换", async ({ page }) => {
  await page.goto("/dist/web/index.html");
  await expect(
    page.locator('.deck-card[data-offset="0"] .card-word'),
  ).toBeVisible();
  const serviceWorkerScope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.scope;
  });
  expect(serviceWorkerScope).toContain("/dist/web/");
  await page.locator("#settingsButton").click();
  await page.locator("#wordbookButton").click();
  const otherBook = page
    .locator('#builtInWordbookList .wordbook-option[aria-pressed="false"]')
    .first();
  const bookId = await otherBook.getAttribute("data-book-id");
  const responsePromise = page.waitForResponse(
    (response) =>
      response.url().includes("/data/books/") && response.status() === 200,
  );
  await otherBook.click();
  await responsePromise;
  await expect(
    page.locator(
      `#builtInWordbookList .wordbook-option[data-book-id="${bookId}"]`,
    ),
  ).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#importStatus")).toContainText("已切换到");
});

test("单文件离线产物可通过 file 协议独立启动", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const offlineFile = path.join(
    __dirname,
    "..",
    "..",
    "dist",
    "offline",
    "vocabulary-flashcards.html",
  );
  await page.goto(pathToFileURL(offlineFile).href);
  await expect(
    page.locator('.deck-card[data-offset="0"] .card-word'),
  ).toBeVisible();
  await expect(page.locator("#memoryButton")).toBeEnabled();
});

test("经典模式桌面按钮切换到下一张", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const word = page.locator('.deck-card[data-offset="0"] .card-word');
  const initialWord = await word.textContent();
  await page.locator("#nextButton").click();
  await expect.poll(() => word.textContent()).not.toBe(initialWord);
  await expect(page.locator(".card-layer")).not.toHaveClass(/is-transitioning/);
  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "idle",
  );
});

test("经典模式快速重复前进只提交一次切换", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const currentCard = page.locator('.deck-card[data-offset="0"]');
  const initialPosition = Number(
    await currentCard.getAttribute("data-deck-position"),
  );

  await page.evaluate(() => {
    document.querySelector("#nextButton").click();
    document.querySelector("#nextButton").click();
  });
  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "idle",
  );

  const settledPosition = Number(
    await currentCard.getAttribute("data-deck-position"),
  );
  expect(settledPosition).toBe(initialPosition + 1);
  await expect(page.locator('.deck-card[data-offset="0"]')).toHaveCount(1);
  await expect(
    page.locator(".is-flying-out, .is-returning, .is-yielding, .is-incoming"),
  ).toHaveCount(0);
});

test("页面隐藏会取消进行中的经典切卡并恢复稳定 DOM", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  const currentCard = page.locator('.deck-card[data-offset="0"]');
  const initialPosition = await currentCard.getAttribute("data-deck-position");
  await page.locator("#nextButton").click();
  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "revealing-incoming",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));

  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "idle",
  );
  await expect(currentCard).toHaveAttribute(
    "data-deck-position",
    initialPosition,
  );
  await expect(page.locator('.deck-card[data-offset="0"]')).toHaveCount(1);
  await expect(page.locator(".card-layer")).not.toHaveClass(/is-transitioning/);
  await expect(
    page.locator(".is-flying-out, .is-returning, .is-yielding, .is-incoming"),
  ).toHaveCount(0);
});

test("减少动态效果时经典切卡立即稳定且不创建临时状态", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.reload();
  const currentCard = page.locator('.deck-card[data-offset="0"]');
  const initialPosition = Number(
    await currentCard.getAttribute("data-deck-position"),
  );
  await page.evaluate(() => document.querySelector("#nextButton").click());
  await expect(currentCard).toHaveAttribute(
    "data-deck-position",
    String(initialPosition + 1),
  );
  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "idle",
  );
  await expect(page.locator(".card-layer")).not.toHaveClass(/is-transitioning/);
});

test("移动端隐藏经典箭头并保留卡片内容", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");
  await expect(page.locator(".controls")).toBeHidden();
  await expect(
    page.locator('.deck-card[data-offset="0"] .card-word'),
  ).not.toBeEmpty();
});

test("导入词本复用共享解析规则并生成两张卡", async ({ page }) => {
  await page
    .locator("#importInput")
    .setInputFiles(
      path.join(__dirname, "..", "fixtures", "sample-wordbook.html"),
    );
  await expect(page.locator("#importStatus")).toContainText(
    "已载入 1 个生词本，共 2 个词条",
  );
  await expect(
    page.locator('.deck-card[data-offset="0"] .card-word'),
  ).toHaveText(/^(lucid|resilient)$/);
  await expect(
    page.locator('.deck-card[data-offset="0"] .card-progress-count'),
  ).toContainText("/2");
});

test("导入在读取前拒绝非 HTML 文件", async ({ page }) => {
  await page.locator("#importInput").setInputFiles({
    name: "words.txt",
    mimeType: "text/plain",
    buffer: Buffer.from("not a wordbook"),
  });
  await expect(page.locator("#importStatus")).toContainText("不是 HTML 生词本");
  await expect(page.locator("#importStatus")).toHaveClass(/is-error/);
});

test("记忆备份在写入前拒绝未知元数据键", async ({ page }) => {
  await page.locator("#memoryImportInput").setInputFiles({
    name: "invalid-progress.json",
    mimeType: "application/json",
    buffer: Buffer.from(
      JSON.stringify({
        format: "pidanvoca-memory-progress",
        formatVersion: 1,
        reviewCards: [],
        reviewLogs: [],
        metaEntries: [["unexpected", {}]],
      }),
    ),
  });
  await expect(page.locator("#importStatus")).toContainText("不允许的元数据键");
  await expect(page.locator("#importStatus")).toHaveClass(/is-error/);
});

test("设置控制器同步主题、抽屉和内置词本切换", async ({ page }) => {
  await page.locator("#settingsButton").click();
  await expect(page.locator("body")).toHaveClass(/settings-open/);
  await expect(page.locator("#settingsButton")).toHaveAttribute(
    "aria-expanded",
    "true",
  );

  await page.locator("#themeButton").click();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "playful");

  await page.locator("#wordbookButton").click();
  await expect(page.locator("#wordbookPanel")).toBeVisible();
  const otherBook = page
    .locator('#builtInWordbookList .wordbook-option[aria-pressed="false"]')
    .first();
  const expectedBookId = await otherBook.getAttribute("data-book-id");
  await otherBook.click();
  const selectedBook = page.locator(
    `#builtInWordbookList .wordbook-option[data-book-id="${expectedBookId}"]`,
  );
  await expect(selectedBook).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator("#importStatus")).toContainText("已切换到");
  expect(expectedBookId).toBeTruthy();
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

test("记忆模式快速重复评分只推进一次", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.locator("#memoryButton").click();
  await expect(page.locator("#memoryGoodButton")).toBeEnabled();
  const progress = page.locator("#memoryProgressText");
  const initialIndex = Number((await progress.textContent()).split("/")[0]);
  await page.evaluate(() => {
    document.querySelector("#memoryGoodButton").click();
    document.querySelector("#memoryGoodButton").click();
  });
  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "idle",
  );
  const settledIndex = Number((await progress.textContent()).split("/")[0]);
  expect(settledIndex).toBe(initialIndex + 1);
  await expect(
    page.locator(
      ".memory-panel--flight, .memory-panel--incoming, .memory-panel--yielding",
    ),
  ).toHaveCount(0);
});

test("记忆模式点击后方叠卡等同 Good 并保留前进动画", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.locator("#memoryButton").click();
  await expect(page.locator("#memoryGoodButton")).toBeEnabled();
  const initialWord = await page.locator("#memoryCardWord").textContent();
  const stablePanel = page.locator("#memoryBackdrop > .memory-panel").first();
  await expect(stablePanel).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  await stablePanel.evaluate((panel) => {
    panel.dataset.e2eFlightStarts = "0";
    panel.dataset.e2eReturnStarts = "0";
    panel.addEventListener("transitionstart", (event) => {
      if (event.propertyName !== "transform") return;
      const key = panel.classList.contains("memory-panel--flight")
        ? "e2eFlightStarts"
        : "e2eReturnStarts";
      panel.dataset[key] = String(Number(panel.dataset[key] || "0") + 1);
    });
  });
  const stackedCard = page.locator('.deck-card[data-offset="1"]');
  await stackedCard.evaluate((card) => card.click());

  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "revealing-incoming",
  );
  await expect(page.locator(".memory-panel--flight")).toHaveCount(1);
  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "idle",
  );
  await page.waitForTimeout(80);
  expect(
    await stablePanel.evaluate((panel) => ({
      flight: Number(panel.dataset.e2eFlightStarts || "0"),
      returning: Number(panel.dataset.e2eReturnStarts || "0"),
    })),
  ).toEqual({ flight: 1, returning: 0 });
  await expect(page.locator("#memoryCardWord")).not.toHaveText(initialWord);
});

test("记忆动画被页面隐藏打断后保留评分并恢复稳定主卡", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.locator("#memoryButton").click();
  await expect(page.locator("#memoryGoodButton")).toBeEnabled();
  const progress = page.locator("#memoryProgressText");
  const initialProgress = await progress.textContent();
  await page.locator("#memoryGoodButton").click();
  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "revealing-incoming",
  );
  await page.evaluate(() => window.dispatchEvent(new Event("pagehide")));

  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "idle",
  );
  await expect(progress).not.toHaveText(initialProgress);
  await expect(
    page.locator('#memoryBackdrop > .memory-panel[role="region"]'),
  ).toHaveCount(1);
  await expect(
    page.locator(
      ".memory-panel--flight, .memory-panel--incoming, .memory-panel--yielding",
    ),
  ).toHaveCount(0);
});

test("记忆模式 Good 不可用时点击后方叠卡只触发抖动", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.locator("#memoryButton").click();
  await expect(page.locator("#memoryGoodButton")).toBeEnabled();
  const progress = page.locator("#memoryProgressText");
  const initialProgress = await progress.textContent();
  await page.locator("#memoryModeButton").click();
  await expect(page.locator("#memoryGoodButton")).toBeDisabled();
  await page
    .locator('.deck-card[data-offset="1"]')
    .evaluate((card) => card.click());

  await expect(
    page.locator('#memoryBackdrop > .memory-panel[role="region"]'),
  ).toHaveClass(/is-good-blocked/);
  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "idle",
  );
  await expect(progress).toHaveText(initialProgress);
});

test("记忆模式由真实主面板飞出且后方卡片独立进入", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.locator("#memoryButton").click();
  await expect(page.locator("#memoryGoodButton")).toBeEnabled();
  const stablePanel = page.locator("#memoryBackdrop > .memory-panel").first();
  await expect(stablePanel).toHaveCSS("transform", "matrix(1, 0, 0, 1, 0, 0)");
  const stableBox = await stablePanel.boundingBox();
  const initialWord = await page.locator("#memoryCardWord").textContent();
  await stablePanel.evaluate((panel) => {
    panel.dataset.e2eStablePanel = "true";
    panel.dataset.e2eFlightStarts = "0";
    panel.dataset.e2eReturnStarts = "0";
    panel.addEventListener("transitionstart", (event) => {
      if (event.propertyName !== "transform") return;
      const key = panel.classList.contains("memory-panel--flight")
        ? "e2eFlightStarts"
        : "e2eReturnStarts";
      panel.dataset[key] = String(Number(panel.dataset[key] || "0") + 1);
    });
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
    const incomingRect = incomingPanel.getBoundingClientRect();
    return {
      incomingCenter: incomingRect.left + incomingRect.width / 2,
      incomingStartCenter: Number(incomingPanel.dataset.transitionStartCenter),
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
  expect(frame.incomingStartCenter).toBeGreaterThan(
    stableBox.x + stableBox.width / 2 + 10,
  );
  expect(frame.incomingCenter).not.toBe(frame.incomingStartCenter);
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
  await page.waitForTimeout(80);
  expect(
    await stablePanel.evaluate((panel) => ({
      flight: Number(panel.dataset.e2eFlightStarts || "0"),
      returning: Number(panel.dataset.e2eReturnStarts || "0"),
    })),
  ).toEqual({ flight: 1, returning: 0 });
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

test("退出记忆模式由协调器返回经典卡并统一清理", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.locator("#memoryButton").click();
  await expect(page.locator("#memoryBackdrop")).toHaveClass(/is-visible/);
  await page.locator("#memoryCloseButton").click();
  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "returning-classic",
  );
  const returningCard = page.locator(".deck-card.is-returning");
  await expect(returningCard).toHaveCount(1);
  await expect(page.locator(".deck-stage")).toHaveAttribute(
    "data-animation-state",
    "idle",
  );
  await expect(page.locator("#memoryBackdrop")).toBeHidden();
  await expect(page.locator("body")).not.toHaveClass(/memory-mode/);
  await expect(page.locator('.deck-card[data-offset="0"]')).toHaveCount(1);
  await expect(
    page.locator(
      ".memory-panel--flight, .memory-panel--incoming, .memory-panel--yielding, .deck-card.is-returning",
    ),
  ).toHaveCount(0);
});
