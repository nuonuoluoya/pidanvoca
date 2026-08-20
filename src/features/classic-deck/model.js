(function attachClassicDeckModel(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PidanvocaClassicDeck = Object.assign(
      {},
      root.PidanvocaClassicDeck || {},
      api,
    );
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createClassicDeckModel() {
    "use strict";

    function normalizeSpelling(value) {
      return String(value)
        .trim()
        .toLocaleLowerCase("en-US")
        .replace(/\s+/g, " ");
    }

    function createShuffledDeck(length, randomIndex) {
      const size = Math.max(0, Math.floor(Number(length) || 0));
      const deck = Array.from({ length: size }, (_, index) => index);
      for (let index = deck.length - 1; index > 0; index -= 1) {
        const swapIndex = Number(randomIndex(index + 1));
        if (
          !Number.isInteger(swapIndex) ||
          swapIndex < 0 ||
          swapIndex > index
        ) {
          throw new RangeError(
            `randomIndex(${index + 1}) returned ${swapIndex}.`,
          );
        }
        [deck[index], deck[swapIndex]] = [deck[swapIndex], deck[index]];
      }
      return deck;
    }

    function createStudyGroup(total, start, requestedSize) {
      const safeTotal = Math.max(0, Math.floor(Number(total) || 0));
      const safeStart = Math.min(
        safeTotal,
        Math.max(0, Math.floor(Number(start) || 0)),
      );
      const normalizedSize =
        requestedSize === Infinity
          ? Infinity
          : Math.max(1, Math.floor(Number(requestedSize) || 1));
      const end =
        normalizedSize === Infinity
          ? safeTotal
          : Math.min(safeTotal, safeStart + normalizedSize);
      return Object.freeze({ start: safeStart, end, requestedSize });
    }

    function studyGroupForPosition(groups, currentGroupIndex, position) {
      return (
        groups.find(
          (group) => position >= group.start && position < group.end,
        ) ||
        groups[currentGroupIndex] ||
        null
      );
    }

    function studyProgress(totalEntries, groups, currentGroupIndex, position) {
      const group = studyGroupForPosition(
        groups,
        currentGroupIndex,
        position,
      ) || { start: 0, end: Math.max(0, Number(totalEntries) || 0) };
      const total = Math.max(1, group.end - group.start);
      const current = Math.min(
        total,
        Math.max(1, Number(position) - group.start + 1),
      );
      const progressValue =
        total <= 1 ? 100 : ((current - 1) / (total - 1)) * 100;
      return { group, current, total, progressValue };
    }

    return Object.freeze({
      normalizeSpelling,
      createShuffledDeck,
      createStudyGroup,
      studyGroupForPosition,
      studyProgress,
    });
  },
);
