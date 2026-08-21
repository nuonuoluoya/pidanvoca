const test = require("node:test");
const assert = require("node:assert/strict");
const { indexedDB } = require("fake-indexeddb");
const storageContract = require("./fixtures/storage-contract-v2.json");
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

function normalizeKeyPath(keyPath) {
  if (keyPath === null || typeof keyPath === "string") return keyPath;
  return Array.from(keyPath);
}

function readDatabaseContract(database) {
  const storeNames = Array.from(database.objectStoreNames);
  const transaction = database.transaction(storeNames, "readonly");
  const stores = Object.fromEntries(
    storeNames.map((storeName) => {
      const store = transaction.objectStore(storeName);
      const indexes = Object.fromEntries(
        Array.from(store.indexNames).map((indexName) => [
          indexName,
          normalizeKeyPath(store.index(indexName).keyPath),
        ]),
      );
      return [storeName, { keyPath: normalizeKeyPath(store.keyPath), indexes }];
    }),
  );
  return { transaction, contract: { version: database.version, stores } };
}

test("新数据库建立全部存储区和查询索引", async () => {
  const client = createDatabaseClient({
    indexedDB,
    name: databaseName("fresh"),
  });
  const database = await client.open();
  const { transaction, contract } = readDatabaseContract(database);
  assert.deepEqual(contract, storageContract);
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

test("数据库打开遇到瞬时错误时只重试一次并恢复", async () => {
  let attempts = 0;
  const flakyIndexedDatabase = {
    open(...args) {
      attempts += 1;
      if (attempts === 1) {
        const error = new Error("temporary open failure");
        error.name = "UnknownError";
        throw error;
      }
      return indexedDB.open(...args);
    },
  };
  const client = createDatabaseClient({
    indexedDB: flakyIndexedDatabase,
    name: databaseName("retry-open"),
  });
  const database = await client.open();
  assert.equal(attempts, 2);
  assert.equal(client.storageState, "persistent");
  assert.equal(database.objectStoreNames.contains("reviewCards"), true);
  await client.close();
});
