(function attachSettingsRepository(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root) {
    root.PidanvocaStorage = Object.assign({}, root.PidanvocaStorage || {}, api);
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createSettingsRepositoryApi() {
    "use strict";

    function normalizeStudySize(value, defaultValue = 30) {
      if (value === "all" || value === Infinity) return Infinity;
      const numericValue = Math.round(Number(value));
      if (!Number.isFinite(numericValue)) return defaultValue;
      return Math.min(500, Math.max(5, numericValue));
    }

    function createSettingsRepository({
      storage,
      studySizeKey,
      studySizesKey,
      themeKey,
      legacyBookIds = {},
      defaultStudySize = 30,
    }) {
      function readLegacyStudySize() {
        try {
          const savedValue = storage.getItem(studySizeKey);
          return savedValue === null
            ? defaultStudySize
            : normalizeStudySize(savedValue, defaultStudySize);
        } catch {
          return defaultStudySize;
        }
      }

      function readStudySizes() {
        try {
          const saved = JSON.parse(storage.getItem(studySizesKey) || "{}");
          if (!saved || typeof saved !== "object" || Array.isArray(saved)) {
            return {};
          }
          return Object.fromEntries(
            Object.entries(saved).map(([bookId, value]) => [
              legacyBookIds[bookId] || bookId,
              normalizeStudySize(value, defaultStudySize),
            ]),
          );
        } catch {
          return {};
        }
      }

      function writeStudySizes(preferences) {
        try {
          const serializable = Object.fromEntries(
            Object.entries(preferences).map(([bookId, size]) => [
              bookId,
              size === Infinity
                ? "all"
                : normalizeStudySize(size, defaultStudySize),
            ]),
          );
          storage.setItem(studySizesKey, JSON.stringify(serializable));
          return true;
        } catch {
          return false;
        }
      }

      function writeTheme(theme) {
        const normalized = theme === "playful" ? "playful" : "classic";
        try {
          storage.setItem(themeKey, normalized);
          return true;
        } catch {
          return false;
        }
      }

      return Object.freeze({
        readLegacyStudySize,
        readStudySizes,
        writeStudySizes,
        writeTheme,
      });
    }

    return Object.freeze({ normalizeStudySize, createSettingsRepository });
  },
);
