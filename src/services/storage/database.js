(function attachDatabase(root, factory) {
  const dependencyApi =
    typeof module === "object" && module.exports
      ? Object.assign(
          {},
          require("./availability"),
          require("./migrations/v1"),
          require("./migrations/v2"),
        )
      : Object.assign(
          {},
          root?.PidanvocaStorage,
          root?.PidanvocaStorageMigrations,
        );
  const api = factory(dependencyApi);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PidanvocaStorage = Object.assign({}, root.PidanvocaStorage || {}, api);
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createDatabaseApi(dependencies) {
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
      { version: 1, run: dependencies?.migrateToV1 },
      { version: 2, run: dependencies?.migrateToV2 },
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
      onStateChange,
      onBlocked = () => {},
      onVersionChange = () => {},
    }) {
      let openPromise = null;
      const recovery = dependencies.createStorageRecoveryController({
        onStateChange,
      });

      function openOnce() {
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
              onVersionChange();
            };
            resolve(database);
          };
          request.onerror = () => {
            openPromise = null;
            reject(request.error || new Error("IndexedDB open failed"));
          };
          request.onblocked = () => {
            openPromise = null;
            const error = new Error("IndexedDB upgrade blocked");
            error.name = "BlockedError";
            onBlocked(error);
            reject(error);
          };
        });
        return openPromise;
      }

      function open() {
        return recovery.run(openOnce, { beforeRetry: close });
      }

      function runTransaction(storeNames, mode, operation) {
        return recovery.run(
          async () => {
            const database = await openOnce();
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
          },
          {
            beforeRetry: close,
          },
        );
      }

      async function close() {
        if (!openPromise) return;
        const database = await openPromise.catch(() => null);
        database?.close();
        openPromise = null;
      }

      return Object.freeze({
        open,
        runTransaction,
        close,
        useVolatileWithUserConsent: recovery.useVolatileWithUserConsent,
        markCorrupted: recovery.markCorrupted,
        get storageState() {
          return recovery.state;
        },
        get storageError() {
          return recovery.lastError;
        },
      });
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
