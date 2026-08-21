/**
 * @param {any} root
 * @param {() => Record<string, unknown>} factory
 */
(function attachMemoryCurveCore(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root) /** @type {any} */ (root).MemoryCurveCore = api;
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createMemoryCurveCore() {
    "use strict";

    const backupFormat = "pidanvoca-memory-progress";
    const backupFormatVersion = 1;
    const defaultDailyNew = 20;
    const backlogThreshold = 50;

    /** @param {unknown} value */
    function normalizeWordKey(value) {
      return String(value || "")
        .normalize("NFKC")
        .trim()
        .replace(/\s+/g, " ")
        .toLowerCase();
    }

    /**
     * @param {unknown} bookId
     * @param {unknown} word
     */
    function createCardId(bookId, word) {
      return String(bookId || "") + "::" + normalizeWordKey(word);
    }

    /** @param {Date | string | number} dateInput */
    function localDateKey(dateInput) {
      const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, "0");
      const day = String(date.getDate()).padStart(2, "0");
      return year + "-" + month + "-" + day;
    }

    /** @param {unknown} value */
    function hashString(value) {
      let hash = 2166136261;
      const source = String(value || "");
      for (let index = 0; index < source.length; index += 1) {
        hash ^= source.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }
      return hash >>> 0;
    }

    /** @param {number} seed */
    function seededRandom(seed) {
      let state = seed >>> 0;
      return function nextRandom() {
        state += 0x6d2b79f5;
        let value = state;
        value = Math.imul(value ^ (value >>> 15), value | 1);
        value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
        return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
      };
    }

    /**
     * @template T
     * @param {T[]} values
     * @param {unknown} seedText
     * @returns {T[]}
     */
    function seededShuffle(values, seedText) {
      const result = values.slice();
      const random = seededRandom(hashString(seedText));
      for (let index = result.length - 1; index > 0; index -= 1) {
        const target = Math.floor(random() * (index + 1));
        [result[index], result[target]] = [result[target], result[index]];
      }
      return result;
    }

    /** @param {unknown} value */
    function clampDailyNew(value) {
      if (value === null || value === undefined || value === "")
        return defaultDailyNew;
      const numericValue = Math.round(Number(value));
      if (!Number.isFinite(numericValue)) return defaultDailyNew;
      return Math.min(600, Math.max(0, numericValue));
    }

    /**
     * @param {{ word?: unknown }[]} words
     * @param {Set<string> | Iterable<string> | null | undefined} learnedWordKeys
     * @param {unknown} bookId
     * @param {unknown} dateKey
     * @param {unknown} limit
     * @returns {{ index: number, wordKey: string }[]}
     */
    function selectDailyNewWords(
      words,
      learnedWordKeys,
      bookId,
      dateKey,
      limit,
    ) {
      const learned =
        learnedWordKeys instanceof Set
          ? learnedWordKeys
          : new Set(learnedWordKeys || []);
      const seen = new Set();
      /** @type {{ index: number, wordKey: string }[]} */
      const candidates = [];
      words.forEach((entry, index) => {
        const wordKey = normalizeWordKey(entry && entry.word);
        if (!wordKey || learned.has(wordKey) || seen.has(wordKey)) return;
        seen.add(wordKey);
        candidates.push({ index, wordKey });
      });
      return seededShuffle(
        candidates,
        String(bookId) + ":" + String(dateKey),
      ).slice(0, clampDailyNew(limit));
    }

    /**
     * Resize a saved daily selection without removing words already learned
     * from that selection. Pending words are trimmed from the tail or new
     * deterministic candidates are appended until the daily target is met.
     * @param {{ word?: unknown }[]} words
     * @param {Set<string> | Iterable<string> | null | undefined} learnedWordKeys
     * @param {Iterable<string> | null | undefined} savedWordKeys
     * @param {unknown} bookId
     * @param {unknown} dateKey
     * @param {unknown} limit
     * @returns {string[]}
     */
    function resizeDailyNewWordKeys(
      words,
      learnedWordKeys,
      savedWordKeys,
      bookId,
      dateKey,
      limit,
    ) {
      const learned = new Set(
        Array.from(learnedWordKeys || [], normalizeWordKey).filter(Boolean),
      );
      const available = new Set(
        words
          .map((entry) => normalizeWordKey(entry && entry.word))
          .filter(Boolean),
      );
      const seen = new Set();
      const existing = [];
      for (const value of savedWordKeys || []) {
        const wordKey = normalizeWordKey(value);
        if (!wordKey || !available.has(wordKey) || seen.has(wordKey)) continue;
        seen.add(wordKey);
        existing.push(wordKey);
      }

      const completedCount = existing.filter((wordKey) =>
        learned.has(wordKey),
      ).length;
      const pendingTarget = Math.max(0, clampDailyNew(limit) - completedCount);
      const keptPending = new Set(
        existing
          .filter((wordKey) => !learned.has(wordKey))
          .slice(0, pendingTarget),
      );
      const resized = existing.filter(
        (wordKey) => learned.has(wordKey) || keptPending.has(wordKey),
      );
      const shortfall = Math.max(0, pendingTarget - keptPending.size);
      if (shortfall === 0) return resized;

      const excluded = new Set([...learned, ...existing]);
      const additions = selectDailyNewWords(
        words,
        excluded,
        bookId,
        dateKey,
        shortfall,
      );
      additions.forEach((item) => resized.push(item.wordKey));
      return resized;
    }

    /** @param {(Record<string, any> & { due?: Date | number, last_review?: Date | number | null }) | null | undefined} card */
    function serializeFsrsCard(card) {
      if (!card || typeof card !== "object") return null;
      return {
        ...card,
        due: card.due instanceof Date ? card.due.getTime() : Number(card.due),
        last_review:
          card.last_review instanceof Date
            ? card.last_review.getTime()
            : card.last_review == null
              ? null
              : Number(card.last_review),
      };
    }

    /** @param {(Record<string, any> & { due?: Date | number, last_review?: Date | number | null }) | null | undefined} card */
    function deserializeFsrsCard(card) {
      if (
        !card ||
        typeof card !== "object" ||
        !Number.isFinite(Number(card.due))
      )
        return null;
      return {
        ...card,
        due: new Date(Number(card.due)),
        last_review:
          card.last_review == null
            ? undefined
            : new Date(Number(card.last_review)),
      };
    }

    /**
     * @param {Date | string | number} fromInput
     * @param {Date | string | number} dueInput
     */
    function intervalLabel(fromInput, dueInput) {
      const milliseconds = Math.max(
        0,
        new Date(dueInput).getTime() - new Date(fromInput).getTime(),
      );
      const minutes = Math.max(1, Math.round(milliseconds / 60000));
      if (minutes < 60) return minutes + " 分钟";
      const hours = Math.round(minutes / 60);
      if (hours < 24) return hours + " 小时";
      const days = Math.round(hours / 24);
      if (days < 30) return days + " 天";
      const months = Math.round(days / 30);
      if (months < 12) return months + " 个月";
      const years = Math.round((days / 365) * 10) / 10;
      return years + " 年";
    }

    /**
     * @param {(Record<string, any> & { due: Date | number, cardId?: unknown })[]} records
     * @returns {(Record<string, any> & { due: Date | number, cardId?: unknown })[]}
     */
    function sortDueRecords(records) {
      return records
        .slice()
        .sort(
          (left, right) =>
            Number(left.due) - Number(right.due) ||
            String(left.cardId).localeCompare(String(right.cardId)),
        );
    }

    /** @param {unknown} payload */
    function validateBackup(payload) {
      if (!payload || typeof payload !== "object")
        return { valid: false, reason: "文件内容不是有效对象。" };
      const candidate = /** @type {Record<string, unknown>} */ (payload);
      if (
        candidate.format !== backupFormat ||
        candidate.formatVersion !== backupFormatVersion
      ) {
        return { valid: false, reason: "进度文件格式或版本不兼容。" };
      }
      if (
        !Array.isArray(candidate.reviewCards) ||
        !Array.isArray(candidate.reviewLogs) ||
        !Array.isArray(candidate.metaEntries)
      ) {
        return { valid: false, reason: "进度文件缺少必要数据。" };
      }
      const reviewCards = candidate.reviewCards;
      const reviewLogs = candidate.reviewLogs;
      const metaEntries = candidate.metaEntries;
      if (reviewCards.length > 100000)
        return { valid: false, reason: "进度文件卡片数量超过 100000。" };
      if (reviewLogs.length > 500000)
        return { valid: false, reason: "进度文件日志数量超过 500000。" };
      if (metaEntries.length > 1000)
        return { valid: false, reason: "进度文件元数据数量超过 1000。" };

      /** @type {(value: unknown, maximum?: number) => boolean} */
      const validString = (value, maximum = 512) =>
        typeof value === "string" &&
        value.length > 0 &&
        value.length <= maximum;
      /** @type {(value: unknown, minimum?: number, maximum?: number) => boolean} */
      const validNumber = (value, minimum = 0, maximum = 8640000000000000) => {
        const number = Number(value);
        return (
          Number.isFinite(number) && number >= minimum && number <= maximum
        );
      };
      const cardIds = new Set();
      for (const rawCard of reviewCards) {
        if (!rawCard || typeof rawCard !== "object")
          return { valid: false, reason: "进度文件包含无效卡片。" };
        const card = /** @type {Record<string, any>} */ (rawCard);
        if (
          !validString(card.cardId) ||
          !validString(card.bookId) ||
          !validString(card.wordKey) ||
          !validString(card.displayWord, 200) ||
          card.cardId !== createCardId(card.bookId, card.wordKey) ||
          card.wordKey !== normalizeWordKey(card.wordKey)
        ) {
          return { valid: false, reason: "进度文件卡片 ID 或单词键不一致。" };
        }
        if (cardIds.has(card.cardId))
          return { valid: false, reason: "进度文件包含重复的卡片 ID。" };
        cardIds.add(card.cardId);
        if (
          !validNumber(card.due) ||
          !validNumber(card.updatedAt) ||
          !validNumber(card.stability, 0, 10000000) ||
          !validNumber(card.difficulty, 0, 10) ||
          !Number.isInteger(Number(card.state)) ||
          Number(card.state) < 0 ||
          Number(card.state) > 3 ||
          !validNumber(card.elapsedDays, 0, 10000000) ||
          !validNumber(card.scheduledDays, 0, 10000000) ||
          !validNumber(card.reps, 0, 10000000) ||
          !validNumber(card.lapses, 0, 10000000) ||
          (card.lastReviewAt != null && !validNumber(card.lastReviewAt)) ||
          !card.fsrsCard ||
          typeof card.fsrsCard !== "object" ||
          !validNumber(card.fsrsCard.due)
        ) {
          return { valid: false, reason: "进度文件卡片数值超出允许范围。" };
        }
      }

      const logIds = new Set();
      for (const rawLog of reviewLogs) {
        if (!rawLog || typeof rawLog !== "object")
          return { valid: false, reason: "进度文件包含无效复习日志。" };
        const log = /** @type {Record<string, any>} */ (rawLog);
        if (
          !validString(log.logId) ||
          !validString(log.cardId) ||
          !validString(log.bookId) ||
          !validString(log.wordKey) ||
          log.cardId !== createCardId(log.bookId, log.wordKey)
        ) {
          return { valid: false, reason: "进度文件日志 ID 或卡片关联不一致。" };
        }
        if (logIds.has(log.logId))
          return { valid: false, reason: "进度文件包含重复的日志 ID。" };
        logIds.add(log.logId);
        if (
          !Number.isInteger(Number(log.rating)) ||
          Number(log.rating) < 1 ||
          Number(log.rating) > 4 ||
          !validNumber(log.reviewedAt) ||
          !validNumber(log.dueBefore) ||
          !validNumber(log.dueAfter)
        ) {
          return { valid: false, reason: "进度文件日志数值超出允许范围。" };
        }
      }

      const metaKeys = new Set();
      for (const entry of metaEntries) {
        if (
          !Array.isArray(entry) ||
          entry.length !== 2 ||
          !validString(entry[0])
        ) {
          return { valid: false, reason: "进度文件包含无效元数据。" };
        }
        const key = entry[0];
        if (
          key !== "memory-settings" &&
          key !== "memory-system" &&
          !/^daily:[^:]{1,512}:\d{4}-\d{2}-\d{2}$/.test(key)
        ) {
          return { valid: false, reason: "进度文件包含不允许的元数据键。" };
        }
        if (metaKeys.has(key))
          return { valid: false, reason: "进度文件包含重复的元数据键。" };
        metaKeys.add(key);
      }

      let inspectedNodes = 0;
      /** @type {{ value: unknown, depth: number }[]} */
      const pending = [{ value: payload, depth: 0 }];
      const seen = new Set();
      while (pending.length) {
        const current = pending.pop();
        if (!current) continue;
        const { value, depth } = current;
        if (!value || typeof value !== "object" || seen.has(value)) continue;
        if (depth > 12)
          return { valid: false, reason: "进度文件嵌套层级过深。" };
        seen.add(value);
        inspectedNodes += 1;
        if (inspectedNodes > 1000000)
          return { valid: false, reason: "进度文件对象数量过多。" };
        Object.values(value).forEach((child) =>
          pending.push({ value: child, depth: depth + 1 }),
        );
      }
      return { valid: true, reason: "" };
    }

    return {
      backupFormat,
      backupFormatVersion,
      defaultDailyNew,
      backlogThreshold,
      normalizeWordKey,
      createCardId,
      localDateKey,
      seededShuffle,
      clampDailyNew,
      selectDailyNewWords,
      resizeDailyNewWordKeys,
      serializeFsrsCard,
      deserializeFsrsCard,
      intervalLabel,
      sortDueRecords,
      validateBackup,
    };
  },
);
