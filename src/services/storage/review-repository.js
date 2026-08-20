(function attachReviewRepository(root, factory) {
  const storage =
    typeof module === "object" && module.exports
      ? require("./database")
      : root.PidanvocaStorage;
  const api = factory(storage);
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PidanvocaStorage = Object.assign({}, root.PidanvocaStorage || {}, api);
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createReviewRepositoryApi(storage) {
    "use strict";

    const stores = storage.schema.stores;

    function createReviewRepository({ databaseClient, keyRange }) {
      async function readAll(storeName) {
        return databaseClient.runTransaction(
          storeName,
          "readonly",
          (transaction) =>
            storage.requestResult(transaction.objectStore(storeName).getAll()),
        );
      }

      async function readMeta(key) {
        return databaseClient.runTransaction(
          stores.reviewMeta,
          "readonly",
          (transaction) =>
            storage.requestResult(
              transaction.objectStore(stores.reviewMeta).get(key),
            ),
        );
      }

      async function writeMeta(key, value) {
        return databaseClient.runTransaction(
          stores.reviewMeta,
          "readwrite",
          (transaction) => {
            transaction.objectStore(stores.reviewMeta).put(value, key);
          },
        );
      }

      async function cardsForBook(bookId) {
        return databaseClient.runTransaction(
          stores.reviewCards,
          "readonly",
          (transaction) => {
            const index = transaction
              .objectStore(stores.reviewCards)
              .index("bookDue");
            const range = keyRange.bound(
              [bookId, 0],
              [bookId, Number.MAX_SAFE_INTEGER],
            );
            return storage.requestResult(index.getAll(range));
          },
        );
      }

      async function dueCardsForBook(bookId, now) {
        return databaseClient.runTransaction(
          stores.reviewCards,
          "readonly",
          (transaction) => {
            const index = transaction
              .objectStore(stores.reviewCards)
              .index("bookDue");
            const range = keyRange.bound([bookId, 0], [bookId, Number(now)]);
            return storage.requestResult(index.getAll(range));
          },
        );
      }

      async function saveReview(card, log) {
        return databaseClient.runTransaction(
          [stores.reviewCards, stores.reviewLogs],
          "readwrite",
          (transaction) => {
            transaction.objectStore(stores.reviewCards).put(card);
            transaction.objectStore(stores.reviewLogs).put(log);
          },
        );
      }

      async function undoReview(action) {
        return databaseClient.runTransaction(
          [stores.reviewCards, stores.reviewLogs],
          "readwrite",
          (transaction) => {
            const cardStore = transaction.objectStore(stores.reviewCards);
            if (action.beforeRecord) cardStore.put(action.beforeRecord);
            else cardStore.delete(action.afterRecord.cardId);
            transaction.objectStore(stores.reviewLogs).delete(action.logId);
          },
        );
      }

      async function exportProgress() {
        return databaseClient.runTransaction(
          [stores.reviewCards, stores.reviewLogs, stores.reviewMeta],
          "readonly",
          async (transaction) => {
            const cardStore = transaction.objectStore(stores.reviewCards);
            const logStore = transaction.objectStore(stores.reviewLogs);
            const metaStore = transaction.objectStore(stores.reviewMeta);
            const [reviewCards, reviewLogs, metaKeys, metaValues] =
              await Promise.all([
                storage.requestResult(cardStore.getAll()),
                storage.requestResult(logStore.getAll()),
                storage.requestResult(metaStore.getAllKeys()),
                storage.requestResult(metaStore.getAll()),
              ]);
            return {
              reviewCards,
              reviewLogs,
              metaEntries: metaKeys.map((key, index) => [
                key,
                metaValues[index],
              ]),
            };
          },
        );
      }

      async function importProgress(payload, { replace = false } = {}) {
        return databaseClient.runTransaction(
          [stores.reviewCards, stores.reviewLogs, stores.reviewMeta],
          "readwrite",
          async (transaction) => {
            const cardStore = transaction.objectStore(stores.reviewCards);
            const logStore = transaction.objectStore(stores.reviewLogs);
            const metaStore = transaction.objectStore(stores.reviewMeta);
            if (replace) {
              cardStore.clear();
              logStore.clear();
              metaStore.clear();
            }
            const existingCards = replace
              ? []
              : await storage.requestResult(cardStore.getAll());
            const existingById = new Map(
              existingCards.map((card) => [card.cardId, card]),
            );
            payload.reviewCards.forEach((card) => {
              const existing = existingById.get(card.cardId);
              if (
                replace ||
                !existing ||
                Number(card.updatedAt) >= Number(existing.updatedAt)
              ) {
                cardStore.put(card);
              }
            });
            payload.reviewLogs.forEach((log) => logStore.put(log));
            payload.metaEntries.forEach(([key, value]) =>
              metaStore.put(value, key),
            );
          },
        );
      }

      async function resetProgress(bookId = null) {
        return databaseClient.runTransaction(
          [stores.reviewCards, stores.reviewLogs, stores.reviewMeta],
          "readwrite",
          async (transaction) => {
            const cardStore = transaction.objectStore(stores.reviewCards);
            const logStore = transaction.objectStore(stores.reviewLogs);
            const metaStore = transaction.objectStore(stores.reviewMeta);
            if (!bookId) {
              cardStore.clear();
              logStore.clear();
              metaStore.clear();
              return;
            }
            const [cards, logs, metaKeys] = await Promise.all([
              storage.requestResult(cardStore.getAll()),
              storage.requestResult(logStore.getAll()),
              storage.requestResult(metaStore.getAllKeys()),
            ]);
            cards
              .filter((record) => record.bookId === bookId)
              .forEach((record) => cardStore.delete(record.cardId));
            logs
              .filter((record) => record.bookId === bookId)
              .forEach((record) => logStore.delete(record.logId));
            metaKeys
              .filter((key) => String(key).startsWith(`daily:${bookId}:`))
              .forEach((key) => metaStore.delete(key));
          },
        );
      }

      return Object.freeze({
        readAll,
        readMeta,
        writeMeta,
        cardsForBook,
        dueCardsForBook,
        saveReview,
        undoReview,
        exportProgress,
        importProgress,
        resetProgress,
      });
    }

    return Object.freeze({ createReviewRepository });
  },
);
