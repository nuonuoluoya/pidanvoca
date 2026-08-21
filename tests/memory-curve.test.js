const assert = require("node:assert/strict");
const test = require("node:test");
const Core = require("../src/features/memory-review/core");
const FSRS = require("ts-fsrs");

test("规范化单词键保留实际标点并统一空白和大小写", () => {
  assert.equal(Core.normalizeWordKey("  Tit\u3000For   Tat  "), "tit for tat");
  assert.equal(Core.normalizeWordKey("Mother-in-law's"), "mother-in-law's");
});

test("卡片 ID 按词库隔离", () => {
  assert.equal(Core.createCardId("cet4", "Acme"), "cet4::acme");
  assert.notEqual(
    Core.createCardId("cet4", "Acme"),
    Core.createCardId("ielts", "Acme"),
  );
});

test("同一天的新词选择稳定且排除已学习词", () => {
  const words = Array.from({ length: 30 }, (_, index) => ({
    word: "word-" + index,
  }));
  const learned = new Set(["word-1", "word-2"]);
  const first = Core.selectDailyNewWords(
    words,
    learned,
    "book-a",
    "2026-08-20",
    10,
  );
  const second = Core.selectDailyNewWords(
    words,
    learned,
    "book-a",
    "2026-08-20",
    10,
  );
  assert.deepEqual(first, second);
  assert.equal(first.length, 10);
  assert.equal(
    first.some((item) => learned.has(item.wordKey)),
    false,
  );
});

test("调整每日上限时保留已学习词并只增减未学习名单", () => {
  const words = Array.from({ length: 80 }, (_, index) => ({
    word: "word-" + index,
  }));
  const initial = Core.selectDailyNewWords(
    words,
    new Set(),
    "book-a",
    "2026-08-20",
    20,
  ).map((item) => item.wordKey);
  const learned = new Set(initial.slice(0, 5));

  const increased = Core.resizeDailyNewWordKeys(
    words,
    learned,
    initial,
    "book-a",
    "2026-08-20",
    50,
  );
  assert.equal(increased.length, 50);
  assert.deepEqual(increased.slice(0, initial.length), initial);
  assert.equal(new Set(increased).size, increased.length);

  const decreased = Core.resizeDailyNewWordKeys(
    words,
    learned,
    increased,
    "book-a",
    "2026-08-20",
    10,
  );
  assert.equal(decreased.length, 10);
  assert.equal(
    [...learned].every((wordKey) => decreased.includes(wordKey)),
    true,
  );
  assert.equal(decreased.filter((wordKey) => !learned.has(wordKey)).length, 5);

  const belowCompleted = Core.resizeDailyNewWordKeys(
    words,
    learned,
    decreased,
    "book-a",
    "2026-08-20",
    3,
  );
  assert.equal(belowCompleted.length, learned.size);
  assert.equal(
    [...learned].every((wordKey) => belowCompleted.includes(wordKey)),
    true,
  );
});

test("每日新词缺省值为 20，显式设置 0 时仍可暂停新词", () => {
  assert.equal(Core.clampDailyNew(null), 20);
  assert.equal(Core.clampDailyNew(undefined), 20);
  assert.equal(Core.clampDailyNew(0), 0);
  assert.equal(Core.clampDailyNew(600), 600);
  assert.equal(Core.clampDailyNew(601), 600);
});

test("FSRS 两档评分生成 10 分钟重学与更长 Good 间隔", () => {
  const now = new Date("2026-08-20T00:00:00Z");
  const scheduler = FSRS.fsrs({
    request_retention: 0.9,
    enable_short_term: true,
    learning_steps: ["10m"],
    relearning_steps: ["10m"],
    enable_fuzz: false,
  });
  const preview = scheduler.repeat(FSRS.createEmptyCard(now), now);
  assert.equal(
    preview[FSRS.Rating.Again].card.due.getTime() - now.getTime(),
    10 * 60 * 1000,
  );
  assert.ok(
    preview[FSRS.Rating.Good].card.due.getTime() >
      preview[FSRS.Rating.Again].card.due.getTime(),
  );
});

test("FSRS 卡片序列化后能恢复日期字段", () => {
  const now = new Date("2026-08-20T00:00:00Z");
  const card = FSRS.createEmptyCard(now);
  const serialized = Core.serializeFsrsCard(card);
  const restored = Core.deserializeFsrsCard(serialized);
  assert.ok(restored.due instanceof Date);
  assert.equal(restored.due.getTime(), now.getTime());
});

test("到期记录按到期时间排序", () => {
  const sorted = Core.sortDueRecords([
    { cardId: "b", due: 20 },
    { cardId: "a", due: 20 },
    { cardId: "c", due: 10 },
  ]);
  assert.deepEqual(
    sorted.map((item) => item.cardId),
    ["c", "a", "b"],
  );
});

test("备份格式校验拒绝不兼容版本", () => {
  assert.equal(Core.validateBackup({}).valid, false);
  assert.equal(
    Core.validateBackup({
      format: Core.backupFormat,
      formatVersion: Core.backupFormatVersion,
      reviewCards: [],
      reviewLogs: [],
      metaEntries: [],
    }).valid,
    true,
  );
});

function validBackup() {
  const bookId = "book-a";
  const wordKey = "alpha";
  const cardId = Core.createCardId(bookId, wordKey);
  return {
    format: Core.backupFormat,
    formatVersion: Core.backupFormatVersion,
    reviewCards: [
      {
        cardId,
        bookId,
        wordKey,
        displayWord: "Alpha",
        fsrsCard: { due: 1000 },
        state: 1,
        due: 1000,
        stability: 1,
        difficulty: 5,
        elapsedDays: 0,
        scheduledDays: 1,
        reps: 1,
        lapses: 0,
        lastReviewAt: 500,
        updatedAt: 1000,
      },
    ],
    reviewLogs: [
      {
        logId: "log-a",
        cardId,
        bookId,
        wordKey,
        rating: 3,
        reviewedAt: 500,
        dueBefore: 500,
        dueAfter: 1000,
      },
    ],
    metaEntries: [
      ["memory-settings", { dailyNew: 10 }],
      ["daily:book-a:2026-08-20", { wordKeys: ["alpha"] }],
    ],
  };
}

test("备份校验接受一致卡片、日志和白名单元数据", () => {
  assert.equal(Core.validateBackup(validBackup()).valid, true);
});

test("备份校验拒绝卡片 ID 不一致、数值越界和未知元数据", () => {
  const inconsistent = validBackup();
  inconsistent.reviewCards[0].cardId = "other::alpha";
  assert.match(Core.validateBackup(inconsistent).reason, /ID/);

  const invalidDifficulty = validBackup();
  invalidDifficulty.reviewCards[0].difficulty = 11;
  assert.match(Core.validateBackup(invalidDifficulty).reason, /数值/);

  const unknownMeta = validBackup();
  unknownMeta.metaEntries.push(["unexpected", {}]);
  assert.match(Core.validateBackup(unknownMeta).reason, /元数据键/);
});

test("备份校验拒绝重复 ID 和过深对象", () => {
  const duplicate = validBackup();
  duplicate.reviewLogs.push({ ...duplicate.reviewLogs[0] });
  assert.match(Core.validateBackup(duplicate).reason, /重复的日志 ID/);

  const nested = validBackup();
  let cursor = {};
  nested.metaEntries[0][1] = cursor;
  for (let depth = 0; depth < 14; depth += 1) {
    cursor.next = {};
    cursor = cursor.next;
  }
  assert.match(Core.validateBackup(nested).reason, /嵌套层级/);
});
