(function attachReviewSession(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PidanvocaMemoryReview = Object.assign(
      {},
      root.PidanvocaMemoryReview || {},
      api,
    );
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createReviewSessionApi() {
    "use strict";

    function createWordMap(words, normalizeWordKey) {
      const map = new Map();
      words.forEach((word) => {
        const key = normalizeWordKey(word?.word);
        if (key && !map.has(key)) map.set(key, word);
      });
      return map;
    }

    function buildReviewQueue(
      words,
      dueRecords,
      selectedNewKeys,
      normalizeWordKey,
    ) {
      const wordMap = createWordMap(words, normalizeWordKey);
      const dueItems = dueRecords
        .map((record) => ({
          word: wordMap.get(record.wordKey),
          record,
          isNew: false,
        }))
        .filter((item) => item.word);
      const dueKeys = new Set(
        dueItems.map((item) => normalizeWordKey(item.word.word)),
      );
      const newItems = [];
      const seenNew = new Set();
      selectedNewKeys.forEach((wordKey) => {
        const normalizedKey = normalizeWordKey(wordKey);
        const word = wordMap.get(normalizedKey);
        if (!word || dueKeys.has(normalizedKey) || seenNew.has(normalizedKey))
          return;
        seenNew.add(normalizedKey);
        newItems.push({ word, record: null, isNew: true });
      });
      return {
        items: dueItems.concat(newItems),
        dueCount: dueItems.length,
        newCount: newItems.length,
      };
    }

    function applyRating(state, payload) {
      const action = Object.freeze({
        logId: payload.logId,
        beforeRecord: payload.beforeRecord ? { ...payload.beforeRecord } : null,
        afterRecord: payload.afterRecord,
        queueIndex: state.index,
        wasNew: Boolean(payload.wasNew),
        exitPoint: payload.exitPoint,
      });
      return {
        index: state.index + 1,
        reviewed: state.reviewed + (action.wasNew ? 0 : 1),
        learnedNew: state.learnedNew + (action.wasNew ? 1 : 0),
        action,
      };
    }

    function undoRating(state, action) {
      return {
        index: action.queueIndex,
        reviewed: Math.max(0, state.reviewed - (action.wasNew ? 0 : 1)),
        learnedNew: Math.max(0, state.learnedNew - (action.wasNew ? 1 : 0)),
      };
    }

    return Object.freeze({
      createWordMap,
      buildReviewQueue,
      applyRating,
      undoRating,
    });
  },
);
