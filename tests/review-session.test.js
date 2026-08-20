const test = require("node:test");
const assert = require("node:assert/strict");
const memoryCore = require("../memory-curve-core");
const {
  applyRating,
  buildReviewQueue,
  undoRating,
} = require("../src/features/memory-review/review-session");

const words = [{ word: "Alpha" }, { word: "Beta" }, { word: "Gamma" }];

test("复习队列按到期词后接新词，并过滤缺失和重复项", () => {
  const due = [
    { wordKey: "alpha", cardId: "a" },
    { wordKey: "removed", cardId: "missing" },
  ];
  const queue = buildReviewQueue(
    words,
    due,
    ["beta", "BETA", "alpha", "unknown"],
    memoryCore.normalizeWordKey,
  );
  assert.equal(queue.dueCount, 1);
  assert.equal(queue.newCount, 1);
  assert.deepEqual(
    queue.items.map((item) => [item.word.word, item.isNew]),
    [
      ["Alpha", false],
      ["Beta", true],
    ],
  );
});

test("新词评分只增加新词统计并生成可撤销动作", () => {
  const result = applyRating(
    { index: 2, reviewed: 4, learnedNew: 1 },
    {
      logId: "log-1",
      beforeRecord: null,
      afterRecord: { cardId: "book::beta" },
      wasNew: true,
      exitPoint: { x: -10, y: 20, rotate: 3 },
    },
  );
  assert.equal(result.index, 3);
  assert.equal(result.reviewed, 4);
  assert.equal(result.learnedNew, 2);
  assert.equal(result.action.queueIndex, 2);
});

test("旧词评分与撤销构成统计和索引的往返", () => {
  const before = { index: 3, reviewed: 2, learnedNew: 1 };
  const rated = applyRating(before, {
    logId: "log-2",
    beforeRecord: { cardId: "book::alpha", reps: 1 },
    afterRecord: { cardId: "book::alpha", reps: 2 },
    wasNew: false,
    exitPoint: { x: -20, y: 5, rotate: 0 },
  });
  const restored = undoRating(rated, rated.action);
  assert.deepEqual(restored, before);
});
