(function attachStorageMigrationV1(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root) {
    root.PidanvocaStorageMigrations = Object.assign(
      {},
      root.PidanvocaStorageMigrations || {},
      api,
    );
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createStorageMigrationV1Api() {
    "use strict";

    function migrateToV1(database) {
      if (!database.objectStoreNames.contains("state")) {
        database.createObjectStore("state");
      }
    }

    return Object.freeze({ migrateToV1 });
  },
);
