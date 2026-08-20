(function attachDatabase(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PidanvocaStorage = Object.assign({}, root.PidanvocaStorage || {}, api);
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createDatabaseApi() {
    "use strict";

    const schema = Object.freeze({
      version: 2,
      stores: Object.freeze({
        state: "state",
        reviewCards: "reviewCards",
        reviewLogs: "reviewLogs",
        reviewMeta: "reviewMeta",
      }),
    });

    function requestResult(request) {
      return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () =>
          reject(request.error || new Error("IndexedDB request failed"));
      });
    }

    function transactionDone(transaction) {
      return new Promise((resolve, reject) => {
        transaction.oncomplete = () => resolve();
        transaction.onerror = () =>
          reject(
            transaction.error || new Error("IndexedDB transaction failed"),
          );
        transaction.onabort = () =>
          reject(
            transaction.error || new Error("IndexedDB transaction aborted"),
          );
      });
    }

    function ensureIndex(store, name, keyPath, options = { unique: false }) {
      if (!store.indexNames.contains(name))
        store.createIndex(name, keyPath, options);
    }

    function upgradeSchema(database, transaction) {
      const stateStore = database.objectStoreNames.contains(schema.stores.state)
        ? transaction.objectStore(schema.stores.state)
        : database.createObjectStore(schema.stores.state);
      const cardStore = database.objectStoreNames.contains(
        schema.stores.reviewCards,
      )
        ? transaction.objectStore(schema.stores.reviewCards)
        : database.createObjectStore(schema.stores.reviewCards, {
            keyPath: "cardId",
          });
      const logStore = database.objectStoreNames.contains(
        schema.stores.reviewLogs,
      )
        ? transaction.objectStore(schema.stores.reviewLogs)
        : database.createObjectStore(schema.stores.reviewLogs, {
            keyPath: "logId",
          });
      if (!database.objectStoreNames.contains(schema.stores.reviewMeta)) {
        database.createObjectStore(schema.stores.reviewMeta);
      }

      ensureIndex(cardStore, "bookDue", ["bookId", "due"]);
      ensureIndex(cardStore, "bookState", ["bookId", "state"]);
      ensureIndex(cardStore, "updatedAt", "updatedAt");
      ensureIndex(logStore, "cardReview", ["cardId", "reviewedAt"]);
      ensureIndex(logStore, "bookReview", ["bookId", "reviewedAt"]);
      ensureIndex(logStore, "sessionId", "sessionId");
      return stateStore;
    }

    function createDatabaseClient({
      indexedDB,
      name = "random-vocabulary",
      version = schema.version,
    }) {
      let openPromise = null;

      function open() {
        if (!indexedDB)
          return Promise.reject(new Error("IndexedDB unavailable"));
        if (openPromise) return openPromise;
        openPromise = new Promise((resolve, reject) => {
          const request = indexedDB.open(name, version);
          request.onupgradeneeded = () => {
            upgradeSchema(request.result, request.transaction);
          };
          request.onsuccess = () => {
            const database = request.result;
            database.onversionchange = () => {
              database.close();
              openPromise = null;
            };
            resolve(database);
          };
          request.onerror = () => {
            openPromise = null;
            reject(request.error || new Error("IndexedDB open failed"));
          };
          request.onblocked = () => {
            openPromise = null;
            reject(new Error("IndexedDB upgrade blocked"));
          };
        });
        return openPromise;
      }

      async function runTransaction(storeNames, mode, operation) {
        const database = await open();
        const transaction = database.transaction(storeNames, mode);
        const completed = transactionDone(transaction);
        let result;
        try {
          result = await operation(transaction);
        } catch (error) {
          try {
            transaction.abort();
          } catch {
            // The transaction may already be inactive after a request failure.
          }
          await completed.catch(() => {});
          throw error;
        }
        await completed;
        return result;
      }

      async function close() {
        if (!openPromise) return;
        const database = await openPromise.catch(() => null);
        database?.close();
        openPromise = null;
      }

      return Object.freeze({ open, runTransaction, close });
    }

    return Object.freeze({
      schema,
      requestResult,
      transactionDone,
      upgradeSchema,
      createDatabaseClient,
    });
  },
);
