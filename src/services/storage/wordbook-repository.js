(function attachWordbookRepository(root, factory) {
  const storage =
    typeof module === "object" && module.exports
      ? require("./database")
      : root.PidanvocaStorage;
  const api = factory(storage);
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root) {
    root.PidanvocaStorage = Object.assign({}, root.PidanvocaStorage || {}, api);
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createWordbookRepositoryApi(storage) {
    "use strict";

    function createWordbookRepository({
      databaseClient,
      recordKey = "last-import",
    }) {
      async function readLastImport() {
        return databaseClient.runTransaction(
          storage.schema.stores.state,
          "readonly",
          async (transaction) =>
            (await storage.requestResult(
              transaction
                .objectStore(storage.schema.stores.state)
                .get(recordKey),
            )) || null,
        );
      }

      async function writeLastImport(payload) {
        return databaseClient.runTransaction(
          storage.schema.stores.state,
          "readwrite",
          (transaction) => {
            transaction
              .objectStore(storage.schema.stores.state)
              .put(payload, recordKey);
          },
        );
      }

      return Object.freeze({ readLastImport, writeLastImport });
    }

    return Object.freeze({ createWordbookRepository });
  },
);
