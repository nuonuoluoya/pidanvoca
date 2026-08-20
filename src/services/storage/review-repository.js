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

      return Object.freeze({
        readAll,
        readMeta,
        writeMeta,
        cardsForBook,
        dueCardsForBook,
        saveReview,
        undoReview,
      });
    }

    return Object.freeze({ createReviewRepository });
  },
);
