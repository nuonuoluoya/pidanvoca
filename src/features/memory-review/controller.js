(function attachMemoryReviewController(root, factory) {
  const session =
    typeof module === "object" && module.exports
      ? require("./review-session")
      : root.PidanvocaMemoryReview;
  const api = factory(session);
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root) {
    root.PidanvocaMemoryReview = Object.assign(
      {},
      root.PidanvocaMemoryReview || {},
      api,
    );
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createMemoryReviewControllerApi(session) {
    "use strict";

    class MemoryReviewController {
      constructor() {
        this.state = {
          queue: [],
          index: 0,
          studyMode: "recall",
          sessionId: "",
          bookId: null,
          dateKey: null,
          reviewed: 0,
          learnedNew: 0,
          actionHistory: [],
          ratingPending: false,
          isOpen: false,
        };
      }

      currentItem() {
        return this.state.queue[this.state.index] || null;
      }

      canResume(bookId, dateKey) {
        return this.state.bookId === bookId && this.state.dateKey === dateKey;
      }

      startSession(queue, options) {
        this.state.queue = queue.slice();
        this.state.index = 0;
        this.state.sessionId = options.sessionId;
        this.state.bookId = options.bookId;
        this.state.dateKey = options.dateKey;
        this.state.reviewed = 0;
        this.state.learnedNew = 0;
        this.state.actionHistory = [];
        this.state.ratingPending = false;
        return this.snapshot();
      }

      setOpen(isOpen) {
        this.state.isOpen = Boolean(isOpen);
      }

      setStudyMode(mode) {
        if (!["recall", "spelling"].includes(mode)) return false;
        if (this.state.ratingPending || this.state.studyMode === mode)
          return false;
        this.state.studyMode = mode;
        return true;
      }

      beginRating() {
        if (this.state.ratingPending || !this.currentItem()) return false;
        this.state.ratingPending = true;
        return true;
      }

      beginUndo() {
        if (this.state.ratingPending || !this.latestAction()) return false;
        this.state.ratingPending = true;
        return true;
      }

      finishRating() {
        this.state.ratingPending = false;
      }

      applyRating(payload) {
        if (!this.state.ratingPending) return null;
        const item = this.currentItem();
        if (!item) return null;
        const update = session.applyRating(
          {
            index: this.state.index,
            reviewed: this.state.reviewed,
            learnedNew: this.state.learnedNew,
          },
          payload,
        );
        this.state.actionHistory.push(update.action);
        this.state.index = update.index;
        this.state.reviewed = update.reviewed;
        this.state.learnedNew = update.learnedNew;
        item.record = payload.afterRecord;
        return update;
      }

      latestAction() {
        return this.state.actionHistory.at(-1) || null;
      }

      applyUndo(action = this.latestAction()) {
        if (!this.state.ratingPending || !action) return null;
        if (this.latestAction() !== action) return null;
        const restored = session.undoRating(
          {
            index: this.state.index,
            reviewed: this.state.reviewed,
            learnedNew: this.state.learnedNew,
          },
          action,
        );
        this.state.actionHistory.pop();
        this.state.index = restored.index;
        this.state.reviewed = restored.reviewed;
        this.state.learnedNew = restored.learnedNew;
        const item = this.currentItem();
        if (item)
          item.record = action.beforeRecord ? { ...action.beforeRecord } : null;
        return restored;
      }

      clearHistory() {
        this.state.actionHistory.length = 0;
      }

      invalidateSession(bookId = null) {
        if (bookId && bookId !== this.state.bookId) return false;
        this.clearHistory();
        this.state.bookId = null;
        this.state.dateKey = null;
        return true;
      }

      snapshot() {
        return Object.freeze({
          ...this.state,
          queue: this.state.queue.slice(),
          actionHistory: this.state.actionHistory.slice(),
        });
      }

      installLegacyBindings(target) {
        const controller = this;
        const propertyMap = {
          memoryQueue: "queue",
          memoryIndex: "index",
          memoryStudyMode: "studyMode",
          memorySessionId: "sessionId",
          memorySessionBookId: "bookId",
          memorySessionDateKey: "dateKey",
          memorySessionReviewed: "reviewed",
          memorySessionNew: "learnedNew",
          memoryActionHistory: "actionHistory",
          memoryRatingPending: "ratingPending",
          memoryIsOpen: "isOpen",
        };
        Object.entries(propertyMap).forEach(([legacyName, stateName]) => {
          Object.defineProperty(target, legacyName, {
            configurable: true,
            enumerable: false,
            get: () => controller.state[stateName],
            set: (value) => {
              controller.state[stateName] = value;
            },
          });
        });
        return () => {
          Object.keys(propertyMap).forEach((name) => delete target[name]);
        };
      }
    }

    return Object.freeze({ MemoryReviewController });
  },
);
