const test = require("node:test");
const assert = require("node:assert/strict");
const { indexedDB } = require("fake-indexeddb");
const {
  createDatabaseClient,
  requestResult,
  schema,
  transactionDone,
  upgradeSchema,
} = require("../src/services/storage/database");

function databaseName(label) {
  return `pidanvoca-test-${label}-${Date.now()}-${Math.random()}`;
}

function openVersionOne(name) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, 1);
    request.onupgradeneeded = () => request.result.createObjectStore("state");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

test("新数据库建立全部存储区和查询索引", async () => {
  const client = createDatabaseClient({
    indexedDB,
    name: databaseName("fresh"),
  });
  const database = await client.open();
  assert.deepEqual(Array.from(database.objectStoreNames), [
    "reviewCards",
    "reviewLogs",
    "reviewMeta",
    "state",
  ]);
  const transaction = database.transaction("reviewCards", "readonly");
  assert.deepEqual(
    Array.from(transaction.objectStore("reviewCards").indexNames),
    ["bookDue", "bookState", "updatedAt"],
  );
  await transactionDone(transaction);
  await client.close();
});

test("从 v1 升级到当前版本时保留原状态记录", async () => {
  const name = databaseName("migration");
  const legacy = await openVersionOne(name);
  const write = legacy.transaction("state", "readwrite");
  write
    .objectStore("state")
    .put({ version: 1, words: ["keep"] }, "last-import");
  await transactionDone(write);
  legacy.close();

  const client = createDatabaseClient({
    indexedDB,
    name,
    version: schema.version,
  });
  const database = await client.open();
  const read = database.transaction("state", "readonly");
  const saved = await requestResult(
    read.objectStore("state").get("last-import"),
  );
  assert.deepEqual(saved, { version: 1, words: ["keep"] });
  assert.equal(database.objectStoreNames.contains("reviewCards"), true);
  await client.close();
});

test("事务操作抛错时统一中止且不留下部分写入", async () => {
  const client = createDatabaseClient({
    indexedDB,
    name: databaseName("abort"),
  });
  await assert.rejects(
    client.runTransaction(
      ["reviewCards", "reviewLogs"],
      "readwrite",
      (transaction) => {
        transaction.objectStore("reviewCards").put({
          cardId: "book::alpha",
          bookId: "book",
          due: 1,
          state: 1,
          updatedAt: 1,
        });
        throw new Error("simulated failure");
      },
    ),
    /simulated failure/,
  );
  const database = await client.open();
  const read = database.transaction("reviewCards", "readonly");
  const cards = await requestResult(read.objectStore("reviewCards").getAll());
  assert.deepEqual(cards, []);
  await client.close();
});

test("迁移按版本边界执行且重复校验不会破坏现有索引", async () => {
  const name = databaseName("versioned-migrations");
  const legacy = await openVersionOne(name);
  legacy.close();

  const client = createDatabaseClient({ indexedDB, name });
  const database = await client.open();
  const transaction = database.transaction(
    ["state", "reviewCards", "reviewLogs", "reviewMeta"],
    "readonly",
  );
  assert.doesNotThrow(() => upgradeSchema(database, transaction, 2, 2));
  assert.deepEqual(
    Array.from(transaction.objectStore("reviewLogs").indexNames),
    ["bookReview", "cardReview", "sessionId"],
  );
  await transactionDone(transaction);
  await client.close();
});
