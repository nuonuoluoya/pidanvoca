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
