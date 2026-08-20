(function exposeMemoryCurveCore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.MemoryCurveCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function createMemoryCurveCore() {
  'use strict';

  const backupFormat = 'pidanvoca-memory-progress';
  const backupFormatVersion = 1;
  const defaultDailyNew = 10;
  const backlogThreshold = 50;

  function normalizeWordKey(value) {
    return String(value || '')
      .normalize('NFKC')
      .trim()
      .replace(/\s+/g, ' ')
      .toLowerCase();
  }

  function createCardId(bookId, word) {
    return String(bookId || '') + '::' + normalizeWordKey(word);
  }

  function localDateKey(dateInput) {
    const date = dateInput instanceof Date ? dateInput : new Date(dateInput);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return year + '-' + month + '-' + day;
  }

  function hashString(value) {
    let hash = 2166136261;
    const source = String(value || '');
    for (let index = 0; index < source.length; index += 1) {
      hash ^= source.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function seededRandom(seed) {
    let state = seed >>> 0;
    return function nextRandom() {
      state += 0x6D2B79F5;
      let value = state;
      value = Math.imul(value ^ value >>> 15, value | 1);
      value ^= value + Math.imul(value ^ value >>> 7, value | 61);
      return ((value ^ value >>> 14) >>> 0) / 4294967296;
    };
  }

  function seededShuffle(values, seedText) {
    const result = values.slice();
    const random = seededRandom(hashString(seedText));
    for (let index = result.length - 1; index > 0; index -= 1) {
      const target = Math.floor(random() * (index + 1));
      [result[index], result[target]] = [result[target], result[index]];
    }
    return result;
  }

  function clampDailyNew(value) {
    if (value === null || value === undefined || value === '') return defaultDailyNew;
    const numericValue = Math.round(Number(value));
    if (!Number.isFinite(numericValue)) return defaultDailyNew;
    return Math.min(100, Math.max(0, numericValue));
  }

  function selectDailyNewWords(words, learnedWordKeys, bookId, dateKey, limit) {
    const learned = learnedWordKeys instanceof Set ? learnedWordKeys : new Set(learnedWordKeys || []);
    const seen = new Set();
    const candidates = [];
    words.forEach((entry, index) => {
      const wordKey = normalizeWordKey(entry && entry.word);
      if (!wordKey || learned.has(wordKey) || seen.has(wordKey)) return;
      seen.add(wordKey);
      candidates.push({ index, wordKey });
    });
    return seededShuffle(candidates, String(bookId) + ':' + String(dateKey)).slice(0, clampDailyNew(limit));
  }

  function serializeFsrsCard(card) {
    if (!card || typeof card !== 'object') return null;
    return {
      ...card,
      due: card.due instanceof Date ? card.due.getTime() : Number(card.due),
      last_review: card.last_review instanceof Date ? card.last_review.getTime() : (card.last_review == null ? null : Number(card.last_review))
    };
  }

  function deserializeFsrsCard(card) {
    if (!card || typeof card !== 'object' || !Number.isFinite(Number(card.due))) return null;
    return {
      ...card,
      due: new Date(Number(card.due)),
      last_review: card.last_review == null ? undefined : new Date(Number(card.last_review))
    };
  }

  function intervalLabel(fromInput, dueInput) {
    const milliseconds = Math.max(0, new Date(dueInput).getTime() - new Date(fromInput).getTime());
    const minutes = Math.max(1, Math.round(milliseconds / 60000));
    if (minutes < 60) return minutes + ' 分钟';
    const hours = Math.round(minutes / 60);
    if (hours < 24) return hours + ' 小时';
    const days = Math.round(hours / 24);
    if (days < 30) return days + ' 天';
    const months = Math.round(days / 30);
    if (months < 12) return months + ' 个月';
    const years = Math.round(days / 365 * 10) / 10;
    return years + ' 年';
  }

  function sortDueRecords(records) {
    return records.slice().sort((left, right) => Number(left.due) - Number(right.due) || String(left.cardId).localeCompare(String(right.cardId)));
  }

  function validateBackup(payload) {
    if (!payload || typeof payload !== 'object') return { valid: false, reason: '文件内容不是有效对象。' };
    if (payload.format !== backupFormat || payload.formatVersion !== backupFormatVersion) {
      return { valid: false, reason: '进度文件格式或版本不兼容。' };
    }
    if (!Array.isArray(payload.reviewCards) || !Array.isArray(payload.reviewLogs) || !Array.isArray(payload.metaEntries)) {
      return { valid: false, reason: '进度文件缺少必要数据。' };
    }
    return { valid: true, reason: '' };
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
    serializeFsrsCard,
    deserializeFsrsCard,
    intervalLabel,
    sortDueRecords,
    validateBackup
  };
});
