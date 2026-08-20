const test = require("node:test");
const assert = require("node:assert/strict");
const { indexedDB, IDBKeyRange } = require("fake-indexeddb");
const { createDatabaseClient } = require("../src/services/storage/database");
const {
  createReviewRepository,
} = require("../src/services/storage/review-repository");
const {
  createWordbookRepository,
} = require("../src/services/storage/wordbook-repository");

function createRepositories(label) {
  const databaseClient = createDatabaseClient({
    indexedDB,
    name: `pidanvoca-repository-${label}-${Date.now()}-${Math.random()}`,
  });
  return {
    databaseClient,
    reviews: createReviewRepository({ databaseClient, keyRange: IDBKeyRange }),
    wordbooks: createWordbookRepository({ databaseClient }),
  };
}

function card(cardId, due) {
  return {
    cardId,
    bookId: "book-a",
    due,
    state: 1,
    updatedAt: due,
  };
}

function log(logId, cardId, reviewedAt) {
  return { logId, cardId, bookId: "book-a", reviewedAt, sessionId: "s1" };
}

test("词本 Repository 往返保存上次词本状态", async () => {
  const { databaseClient, wordbooks } = createRepositories("wordbooks");
  const payload = { version: 1, builtInBookId: "cet-4-vocabulary.html" };
  assert.equal(await wordbooks.readLastImport(), null);
  await wordbooks.writeLastImport(payload);
  assert.deepEqual(await wordbooks.readLastImport(), payload);
  await databaseClient.close();
});

test("评分事务原子保存卡片与日志并支持到期查询", async () => {
  const { databaseClient, reviews } = createRepositories("rating");
  await reviews.saveReview(
    card("book-a::alpha", 100),
    log("l1", "book-a::alpha", 10),
  );
  await reviews.saveReview(
    card("book-a::beta", 300),
    log("l2", "book-a::beta", 20),
  );
  assert.equal((await reviews.cardsForBook("book-a")).length, 2);
  assert.deepEqual(
    (await reviews.dueCardsForBook("book-a", 150)).map((item) => item.cardId),
    ["book-a::alpha"],
  );
  await databaseClient.close();
});

test("撤销评分恢复旧卡并删除对应日志", async () => {
  const { databaseClient, reviews } = createRepositories("undo");
  const beforeRecord = card("book-a::alpha", 100);
  const afterRecord = card("book-a::alpha", 500);
  await reviews.saveReview(afterRecord, log("l1", afterRecord.cardId, 50));
  await reviews.undoReview({ logId: "l1", beforeRecord, afterRecord });
  assert.equal((await reviews.cardsForBook("book-a"))[0].due, 100);
  assert.deepEqual(await reviews.readAll("reviewLogs"), []);
  await databaseClient.close();
});

test("无效日志导致评分事务整体回滚", async () => {
  const { databaseClient, reviews } = createRepositories("rollback");
  await assert.rejects(reviews.saveReview(card("book-a::alpha", 100), {}));
  assert.deepEqual(await reviews.readAll("reviewCards"), []);
  await databaseClient.close();
});

test("元数据 Repository 支持设置往返", async () => {
  const { databaseClient, reviews } = createRepositories("meta");
  await reviews.writeMeta("memory-settings", { dailyNew: 20 });
  assert.deepEqual(await reviews.readMeta("memory-settings"), { dailyNew: 20 });
  await databaseClient.close();
});

test("进度导出与替换导入保持卡片、日志和元数据一致", async () => {
  const source = createRepositories("export-source");
  await source.reviews.saveReview(
    card("book-a::alpha", 100),
    log("l1", "book-a::alpha", 10),
  );
  await source.reviews.writeMeta("memory-settings", { dailyNew: 12 });
  const payload = await source.reviews.exportProgress();

  const target = createRepositories("export-target");
  await target.reviews.saveReview(
    card("book-a::stale", 1),
    log("stale", "book-a::stale", 1),
  );
  await target.reviews.importProgress(payload, { replace: true });
  assert.deepEqual(await target.reviews.exportProgress(), payload);
  await source.databaseClient.close();
  await target.databaseClient.close();
});

test("合并导入只用较新的卡片覆盖，日志按 ID 幂等写入", async () => {
  const { databaseClient, reviews } = createRepositories("merge");
  await reviews.saveReview(
    { ...card("book-a::alpha", 500), updatedAt: 500 },
    log("existing-log", "book-a::alpha", 10),
  );
  await reviews.importProgress({
    reviewCards: [
      { ...card("book-a::alpha", 100), updatedAt: 100 },
      { ...card("book-a::beta", 300), updatedAt: 300 },
    ],
    reviewLogs: [log("existing-log", "book-a::alpha", 10)],
    metaEntries: [],
  });
  const cards = await reviews.cardsForBook("book-a");
  assert.equal(cards.find((item) => item.cardId.endsWith("alpha")).due, 500);
  assert.equal(cards.find((item) => item.cardId.endsWith("beta")).due, 300);
  assert.equal((await reviews.readAll("reviewLogs")).length, 1);
  await databaseClient.close();
});

test("按词本重置仅删除目标词本和对应每日选择", async () => {
  const { databaseClient, reviews } = createRepositories("reset-book");
  await reviews.saveReview(
    card("book-a::alpha", 100),
    log("a", "book-a::alpha", 1),
  );
  await reviews.saveReview(
    { ...card("book-b::beta", 200), bookId: "book-b" },
    { ...log("b", "book-b::beta", 2), bookId: "book-b" },
  );
  await reviews.writeMeta("daily:book-a:2026-08-20", { wordKeys: ["alpha"] });
  await reviews.writeMeta("memory-settings", { dailyNew: 10 });
  await reviews.resetProgress("book-a");
  assert.deepEqual(
    (await reviews.readAll("reviewCards")).map((item) => item.bookId),
    ["book-b"],
  );
  assert.equal(await reviews.readMeta("daily:book-a:2026-08-20"), undefined);
  assert.deepEqual(await reviews.readMeta("memory-settings"), { dailyNew: 10 });
  await databaseClient.close();
});
