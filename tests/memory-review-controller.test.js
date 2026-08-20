const test = require("node:test");
const assert = require("node:assert/strict");
const {
  MemoryReviewController,
} = require("../src/features/memory-review/controller");

function queueItem(isNew = false) {
  return {
    word: { word: isNew ? "novel" : "known" },
    record: isNew ? null : { cardId: "before" },
    isNew,
  };
}

test("新会话独占队列、索引、统计和身份", () => {
  const controller = new MemoryReviewController();
  controller.startSession([queueItem()], {
    sessionId: "session-1",
    bookId: "book-1",
    dateKey: "2026-08-20",
  });
  assert.equal(controller.currentItem().word.word, "known");
  assert.equal(controller.canResume("book-1", "2026-08-20"), true);
  assert.equal(controller.state.reviewed, 0);
  assert.equal(controller.state.actionHistory.length, 0);
});

test("评分锁和提交只推进一次并记录可撤销动作", () => {
  const controller = new MemoryReviewController();
  controller.startSession([queueItem(true), queueItem()], {
    sessionId: "session-1",
    bookId: "book-1",
    dateKey: "2026-08-20",
  });
  assert.equal(controller.beginRating(), true);
  assert.equal(controller.beginRating(), false);
  const update = controller.applyRating({
    logId: "log-1",
    beforeRecord: null,
    afterRecord: { cardId: "after" },
    wasNew: true,
    exitPoint: { x: -100, y: 20 },
  });
  assert.equal(update.index, 1);
  assert.equal(controller.state.learnedNew, 1);
  assert.equal(controller.latestAction().logId, "log-1");
  controller.finishRating();
  assert.equal(controller.state.ratingPending, false);
});

test("撤销恢复队列索引、统计和原卡片记录", () => {
  const controller = new MemoryReviewController();
  const original = queueItem(false);
  controller.startSession([original], {
    sessionId: "session-1",
    bookId: "book-1",
    dateKey: "2026-08-20",
  });
  controller.beginRating();
  controller.applyRating({
    logId: "log-1",
    beforeRecord: { cardId: "before" },
    afterRecord: { cardId: "after" },
    wasNew: false,
    exitPoint: null,
  });
  controller.finishRating();
  assert.equal(controller.beginUndo(), true);
  const restored = controller.applyUndo();
  assert.equal(restored.index, 0);
  assert.equal(controller.state.reviewed, 0);
  assert.deepEqual(controller.currentItem().record, { cardId: "before" });
  assert.equal(controller.latestAction(), null);
});

test("仅当前词本的失效请求清空可恢复会话", () => {
  const controller = new MemoryReviewController();
  controller.startSession([], {
    sessionId: "session-1",
    bookId: "book-1",
    dateKey: "2026-08-20",
  });
  assert.equal(controller.invalidateSession("book-2"), false);
  assert.equal(controller.canResume("book-1", "2026-08-20"), true);
  assert.equal(controller.invalidateSession("book-1"), true);
  assert.equal(controller.canResume("book-1", "2026-08-20"), false);
});

test("过渡绑定让旧变量访问同一个控制器状态", () => {
  const controller = new MemoryReviewController();
  const legacy = {};
  const uninstall = controller.installLegacyBindings(legacy);
  legacy.memoryQueue = [queueItem()];
  legacy.memoryIndex = 0;
  legacy.memoryStudyMode = "spelling";
  assert.equal(controller.currentItem().word.word, "known");
  assert.equal(controller.state.studyMode, "spelling");
  uninstall();
  assert.equal("memoryQueue" in legacy, false);
});
