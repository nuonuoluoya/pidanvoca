(function attachStorageMigrationV2(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PidanvocaStorageMigrations = Object.assign(
      {},
      root.PidanvocaStorageMigrations || {},
      api,
    );
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createStorageMigrationV2Api() {
    "use strict";

    function ensureIndex(store, name, keyPath, options = { unique: false }) {
      if (!store.indexNames.contains(name)) {
        store.createIndex(name, keyPath, options);
      }
    }

    function migrateToV2(database, transaction) {
      const cardStore = database.objectStoreNames.contains("reviewCards")
        ? transaction.objectStore("reviewCards")
        : database.createObjectStore("reviewCards", { keyPath: "cardId" });
      const logStore = database.objectStoreNames.contains("reviewLogs")
        ? transaction.objectStore("reviewLogs")
        : database.createObjectStore("reviewLogs", { keyPath: "logId" });
      if (!database.objectStoreNames.contains("reviewMeta")) {
        database.createObjectStore("reviewMeta");
      }

      ensureIndex(cardStore, "bookDue", ["bookId", "due"]);
      ensureIndex(cardStore, "bookState", ["bookId", "state"]);
      ensureIndex(cardStore, "updatedAt", "updatedAt");
      ensureIndex(logStore, "cardReview", ["cardId", "reviewedAt"]);
      ensureIndex(logStore, "bookReview", ["bookId", "reviewedAt"]);
      ensureIndex(logStore, "sessionId", "sessionId");
    }

    return Object.freeze({ ensureIndex, migrateToV2 });
  },
);
