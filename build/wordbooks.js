const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { parseWordbook } = require("../src/features/wordbooks/parser");

const builtInBookDefinitions = Object.freeze([
  {
    sourceFileName: "cet-6-vocabulary.json",
    id: "cet-6-vocabulary.html",
    name: "大学英语六级单词本",
  },
  {
    sourceFileName: "cet-4-vocabulary.json",
    id: "cet-4-vocabulary.html",
    name: "大学英语四级单词本",
  },
  {
    sourceFileName: "college-entrance-exam-vocabulary.json",
    id: "college-entrance-exam-vocabulary.html",
    name: "高考英语单词本",
  },
  {
    sourceFileName: "postgraduate-entrance-exam-vocabulary.json",
    id: "postgraduate-entrance-exam-vocabulary.html",
    name: "考研英语单词本",
  },
  {
    sourceFileName: "primary-school-vocabulary.json",
    id: "primary-school-vocabulary.html",
    name: "小学英语单词本",
  },
  {
    sourceFileName: "ielts-vocabulary.json",
    id: "ielts-vocabulary.html",
    name: "雅思英语单词本",
  },
  {
    sourceFileName: "junior-high-school-entrance-exam-vocabulary.json",
    id: "junior-high-school-entrance-exam-vocabulary.html",
    name: "中考英语单词本",
  },
]);

const legacyBuiltInBookIds = Object.freeze({
  "大学英语六级单词本.html": "cet-6-vocabulary.html",
  "大学英语四级单词本.html": "cet-4-vocabulary.html",
  "高考英语单词本.html": "college-entrance-exam-vocabulary.html",
  "考研英语单词本.html": "postgraduate-entrance-exam-vocabulary.html",
  "小学英语单词本.html": "primary-school-vocabulary.html",
  "雅思英语单词本.html": "ielts-vocabulary.html",
  "中考英语单词本.html": "junior-high-school-entrance-exam-vocabulary.html",
});

function listFiles(directoryPath, pattern) {
  if (!fs.existsSync(directoryPath)) return [];
  return fs
    .readdirSync(directoryPath)
    .filter((fileName) => pattern.test(fileName))
    .sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function normalizeJsonWord(word, sourceFileName, index) {
  if (!word || typeof word !== "object" || Array.isArray(word)) {
    throw new Error(`${sourceFileName} 的第 ${index + 1} 个词条不是对象。`);
  }
  const value = typeof word.word === "string" ? word.word.trim() : "";
  if (!value) {
    throw new Error(`${sourceFileName} 的第 ${index + 1} 个词条缺少 word。`);
  }
  return {
    word: value,
    phonetic: typeof word.phonetic === "string" ? word.phonetic.trim() : "",
    meaning: typeof word.meaning === "string" ? word.meaning.trim() : "",
    note: typeof word.note === "string" ? word.note.trim() : "",
  };
}

function readJsonWordbook(directoryPath, sourceFileName, expected = {}) {
  let payload;
  try {
    payload = JSON.parse(
      fs.readFileSync(path.join(directoryPath, sourceFileName), "utf8"),
    );
  } catch (error) {
    throw new Error(
      `无法读取 JSON 生词本 ${sourceFileName}：${error instanceof Error ? error.message : error}`,
      { cause: error },
    );
  }
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
    throw new Error(`${sourceFileName} 的根节点必须是对象。`);
  }
  if (payload.formatVersion !== 1) {
    throw new Error(`${sourceFileName} 的 formatVersion 必须为 1。`);
  }
  if (typeof payload.id !== "string" || !payload.id.trim()) {
    throw new Error(`${sourceFileName} 缺少有效的 id。`);
  }
  if (typeof payload.name !== "string" || !payload.name.trim()) {
    throw new Error(`${sourceFileName} 缺少有效的 name。`);
  }
  if (!Array.isArray(payload.words) || !payload.words.length) {
    throw new Error(`${sourceFileName} 的 words 必须是非空数组。`);
  }
  if (expected.id && payload.id !== expected.id) {
    throw new Error(`${sourceFileName} 的 id 与内置词书配置不一致。`);
  }
  if (expected.name && payload.name !== expected.name) {
    throw new Error(`${sourceFileName} 的 name 与内置词书配置不一致。`);
  }
  return {
    formatVersion: 1,
    id: payload.id,
    name: payload.name.trim(),
    fileName: payload.id,
    sourceFileName,
    words: payload.words.map((word, index) =>
      normalizeJsonWord(word, sourceFileName, index),
    ),
  };
}

function createCustomBookId(fileName) {
  return `custom:${encodeURIComponent(
    String(fileName || "")
      .trim()
      .toLocaleLowerCase(),
  )}`;
}

function escapeInlineJson(value) {
  return JSON.stringify(value).replace(/</g, "\\u003c");
}

function buildWordbooks({
  wordbooksPath,
  personalWordbooksPath,
  defaultBookId,
  includePersonalWordbooks,
}) {
  if (!fs.existsSync(wordbooksPath)) {
    throw new Error("未找到 wordbooks 文件夹。");
  }
  const wordbookFileNames = listFiles(wordbooksPath, /\.json$/i);
  if (!wordbookFileNames.length) {
    throw new Error("wordbooks 文件夹中没有 JSON 生词本。");
  }
  const missing = builtInBookDefinitions
    .map((book) => book.sourceFileName)
    .filter((fileName) => !wordbookFileNames.includes(fileName));
  if (missing.length) {
    throw new Error(`缺少内置生词本文件：${missing.join(", ")}`);
  }
  const definedFileNames = new Set(
    builtInBookDefinitions.map((book) => book.sourceFileName),
  );
  const additional = wordbookFileNames
    .filter((fileName) => !definedFileNames.has(fileName))
    .map((sourceFileName) => ({ sourceFileName }));
  const builtInBooks = builtInBookDefinitions
    .concat(additional)
    .map((definition) =>
      readJsonWordbook(wordbooksPath, definition.sourceFileName, definition),
    );
  const bookArtifacts = builtInBooks.map((book) => {
    const payload = {
      formatVersion: 1,
      id: book.id,
      name: book.name,
      words: book.words,
    };
    return {
      book,
      jsonFileName: book.sourceFileName,
      json: `${JSON.stringify(payload)}\n`,
      contentHash: `sha256-${crypto
        .createHash("sha256")
        .update(JSON.stringify(book.words))
        .digest("hex")}`,
    };
  });
  const booksManifest = {
    formatVersion: 1,
    books: bookArtifacts.map(({ book, jsonFileName, contentHash }) => ({
      id: book.id,
      name: book.name,
      url: `./books/${jsonFileName}`,
      wordCount: book.words.length,
      contentHash,
      schemaVersion: 1,
    })),
  };
  const manifestJson = `${JSON.stringify(booksManifest, null, 2)}\n`;

  const personalFiles = includePersonalWordbooks
    ? listFiles(personalWordbooksPath, /\.json$/i).concat(
        listFiles(personalWordbooksPath, /\.html?$/i),
      )
    : [];
  const personalBooks = personalFiles.map((sourceFileName) => {
    if (/\.json$/i.test(sourceFileName)) {
      return {
        ...readJsonWordbook(personalWordbooksPath, sourceFileName),
        fileName: sourceFileName,
        sourceFormat: "json",
      };
    }
    return {
      formatVersion: 1,
      id: createCustomBookId(sourceFileName),
      name: path.basename(sourceFileName, path.extname(sourceFileName)),
      fileName: sourceFileName.replace(/\.html?$/i, ".json"),
      sourceFileName,
      sourceFormat: "html",
      words: parseWordbook(
        fs.readFileSync(
          path.join(personalWordbooksPath, sourceFileName),
          "utf8",
        ),
        sourceFileName,
      ),
    };
  });
  const defaultBuiltInBook =
    builtInBooks.find((book) => book.id === defaultBookId) || builtInBooks[0];
  const onlineBuiltInBooks = builtInBooks.map((book) => {
    const artifact = bookArtifacts.find((entry) => entry.book.id === book.id);
    return {
      id: book.id,
      name: book.name,
      fileName: book.fileName,
      words: book.id === defaultBuiltInBook.id ? book.words : null,
      wordCount: book.words.length,
      contentHash: artifact.contentHash,
      schemaVersion: 1,
      url: `../../data/books/${artifact.jsonFileName}`,
    };
  });
  return {
    builtInBooks,
    personalBooks,
    bookArtifacts,
    manifestJson,
    defaultBuiltInBook,
    offlineDefine: {
      BUILT_IN_BOOKS: escapeInlineJson(builtInBooks),
      PERSONAL_BOOKS: escapeInlineJson(personalBooks),
      DEFAULT_BOOK_ID: JSON.stringify(defaultBuiltInBook.id),
      LEGACY_BUILT_IN_BOOK_IDS: JSON.stringify(legacyBuiltInBookIds),
    },
    webDefine: {
      BUILT_IN_BOOKS: escapeInlineJson(onlineBuiltInBooks),
      PERSONAL_BOOKS: escapeInlineJson(personalBooks),
      DEFAULT_BOOK_ID: JSON.stringify(defaultBuiltInBook.id),
      LEGACY_BUILT_IN_BOOK_IDS: JSON.stringify(legacyBuiltInBookIds),
    },
  };
}

module.exports = {
  builtInBookDefinitions,
  legacyBuiltInBookIds,
  buildWordbooks,
  readJsonWordbook,
};
