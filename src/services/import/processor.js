(function attachImportProcessor(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PidanvocaImport = api;
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createImportProcessorApi() {
    "use strict";

    const DEFAULT_IMPORT_LIMITS = Object.freeze({
      maxFiles: 20,
      maxFileBytes: 10 * 1024 * 1024,
      maxTotalBytes: 50 * 1024 * 1024,
      maxBookEntries: 20000,
      maxTotalEntries: 50000,
      maxWordLength: 200,
      maxPhoneticLength: 500,
      maxMeaningLength: 10000,
      maxNoteLength: 10000,
      yieldEvery: 250,
    });

    class ImportCancelledError extends Error {
      constructor() {
        super("导入已取消。");
        this.name = "ImportCancelledError";
      }
    }

    function normalizeText(value) {
      return typeof value === "string" ? value.trim() : "";
    }

    function validateLength(label, value, maximum) {
      if (value.length > maximum) {
        throw new Error(`${label}超过 ${maximum} 个字符。`);
      }
    }

    function normalizeEntry(entry, limits = DEFAULT_IMPORT_LIMITS) {
      const word = normalizeText(entry?.word);
      const phonetic = normalizeText(entry?.phonetic);
      const meaning = normalizeText(entry?.meaning);
      const note = normalizeText(entry?.note);
      if (!word) return null;
      validateLength("单词", word, limits.maxWordLength);
      validateLength("音标", phonetic, limits.maxPhoneticLength);
      validateLength("中文释义", meaning, limits.maxMeaningLength);
      validateLength("英文笔记", note, limits.maxNoteLength);
      return { word, phonetic, meaning, note };
    }

    function validateFileSelection(files, limits = DEFAULT_IMPORT_LIMITS) {
      if (!Array.isArray(files) || files.length > limits.maxFiles) {
        throw new Error(`一次最多导入 ${limits.maxFiles} 个生词本。`);
      }
      let totalBytes = 0;
      files.forEach((file) => {
        if (!/\.html?$/i.test(file?.name || "")) {
          throw new Error(`“${file?.name || "未命名文件"}”不是 HTML 生词本。`);
        }
        if (!Number.isFinite(file.size) || file.size < 0) {
          throw new Error(`“${file.name}”的文件大小无效。`);
        }
        if (file.size > limits.maxFileBytes) {
          throw new Error(`“${file.name}”超过单文件大小限制。`);
        }
        totalBytes += file.size;
      });
      if (totalBytes > limits.maxTotalBytes) {
        throw new Error("所选文件合计超过总大小限制。");
      }
      return Object.freeze({ fileCount: files.length, totalBytes });
    }

    function mergeDistinctText(currentValue, incomingValue) {
      if (!incomingValue) return currentValue;
      if (!currentValue) return incomingValue;
      if (
        currentValue === incomingValue ||
        currentValue.includes(incomingValue)
      )
        return currentValue;
      if (incomingValue.includes(currentValue)) return incomingValue;
      return `${currentValue}\n\n${incomingValue}`;
    }

    function mergeEntry(wordMap, entry) {
      const key = entry.word.toLocaleLowerCase();
      const existing = wordMap.get(key);
      if (!existing) {
        wordMap.set(key, { ...entry });
        return;
      }
      existing.phonetic = existing.phonetic || entry.phonetic;
      existing.meaning = mergeDistinctText(existing.meaning, entry.meaning);
      existing.note = mergeDistinctText(existing.note, entry.note);
    }

    async function processImportedBooks(books, options = {}) {
      const limits = { ...DEFAULT_IMPORT_LIMITS, ...(options.limits || {}) };
      if (!Array.isArray(books) || books.length > limits.maxFiles) {
        throw new Error(`一次最多处理 ${limits.maxFiles} 个生词本。`);
      }
      const processedBooks = [];
      const combined = new Map();
      let processedEntries = 0;
      let sourceEntries = 0;
      for (const book of books) {
        if (options.isCancelled?.()) throw new ImportCancelledError();
        const source = Array.isArray(book?.entries) ? book.entries : [];
        if (source.length > limits.maxBookEntries) {
          throw new Error(
            `“${book?.fileName || "未命名词本"}”超过 ${limits.maxBookEntries} 个词条。`,
          );
        }
        sourceEntries += source.length;
        if (sourceEntries > limits.maxTotalEntries) {
          throw new Error(`合计词条数超过 ${limits.maxTotalEntries}。`);
        }
        const entries = [];
        for (const rawEntry of source) {
          const entry = normalizeEntry(rawEntry, limits);
          if (entry) {
            entries.push(entry);
            mergeEntry(combined, entry);
          }
          processedEntries += 1;
          if (processedEntries % limits.yieldEvery === 0) {
            options.onProgress?.({ processedEntries, sourceEntries });
            await (options.yieldControl?.() || Promise.resolve());
            if (options.isCancelled?.()) throw new ImportCancelledError();
          }
        }
        if (entries.length) {
          processedBooks.push({ fileName: book.fileName, entries });
        }
      }
      options.onProgress?.({ processedEntries, sourceEntries });
      return {
        books: processedBooks,
        combinedWords: Array.from(combined.values()),
        sourceEntries,
      };
    }

    return Object.freeze({
      DEFAULT_IMPORT_LIMITS,
      ImportCancelledError,
      validateFileSelection,
      normalizeEntry,
      mergeDistinctText,
      processImportedBooks,
    });
  },
);
