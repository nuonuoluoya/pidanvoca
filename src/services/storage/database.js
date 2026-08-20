(function attachDatabase(root, factory) {
  const migrationApi =
    typeof module === "object" && module.exports
      ? Object.assign(
          {},
          require("./migrations/v1"),
          require("./migrations/v2"),
        )
      : root?.PidanvocaStorageMigrations;
  const api = factory(migrationApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PidanvocaStorage = Object.assign({}, root.PidanvocaStorage || {}, api);
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createDatabaseApi(migrations) {
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

    const migrationSteps = Object.freeze([
      { version: 1, run: migrations?.migrateToV1 },
      { version: 2, run: migrations?.migrateToV2 },
    ]);

    function upgradeSchema(
      database,
      transaction,
      oldVersion = 0,
      targetVersion = schema.version,
    ) {
      migrationSteps.forEach((step) => {
        if (oldVersion < step.version && targetVersion >= step.version) {
          if (typeof step.run !== "function") {
            throw new Error(`Missing database migration v${step.version}`);
          }
          step.run(database, transaction);
        }
      });
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
          request.onupgradeneeded = (event) => {
            upgradeSchema(
              request.result,
              request.transaction,
              event.oldVersion,
              event.newVersion || version,
            );
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
