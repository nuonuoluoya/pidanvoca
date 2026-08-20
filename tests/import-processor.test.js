const test = require("node:test");
const assert = require("node:assert/strict");
const {
  DEFAULT_IMPORT_LIMITS,
  ImportCancelledError,
  processImportedBooks,
  validateFileSelection,
} = require("../src/services/import/processor");

test("读取文件前拒绝错误扩展名、单文件和合计大小超限", () => {
  assert.throws(
    () => validateFileSelection([{ name: "words.txt", size: 10 }]),
    /不是 HTML/,
  );
  assert.throws(
    () =>
      validateFileSelection([{ name: "large.html", size: 11 }], {
        ...DEFAULT_IMPORT_LIMITS,
        maxFileBytes: 10,
      }),
    /单文件大小限制/,
  );
  assert.throws(
    () =>
      validateFileSelection(
        [
          { name: "a.html", size: 6 },
          { name: "b.html", size: 6 },
        ],
        { ...DEFAULT_IMPORT_LIMITS, maxTotalBytes: 10 },
      ),
    /总大小限制/,
  );
});

test("Worker 处理边界规范字段并合并重复词条", async () => {
  const result = await processImportedBooks([
    {
      fileName: "a.html",
      entries: [
        { word: " Lucid ", phonetic: "/a/", meaning: "清晰", note: "note A" },
        { word: "lucid", phonetic: "", meaning: "明白", note: "note B" },
      ],
    },
  ]);
  assert.equal(result.books[0].entries.length, 2);
  assert.deepEqual(result.combinedWords, [
    {
      word: "Lucid",
      phonetic: "/a/",
      meaning: "清晰\n\n明白",
      note: "note A\n\nnote B",
    },
  ]);
});

test("处理器拒绝超长字段、单本和总词条超限", async () => {
  await assert.rejects(
    processImportedBooks([
      {
        fileName: "bad.html",
        entries: [
          { word: "x".repeat(DEFAULT_IMPORT_LIMITS.maxWordLength + 1) },
        ],
      },
    ]),
    /单词超过/,
  );
  await assert.rejects(
    processImportedBooks(
      [{ fileName: "large.html", entries: [{ word: "a" }, { word: "b" }] }],
      {
        limits: { maxBookEntries: 1 },
      },
    ),
    /超过 1 个词条/,
  );
});

test("分批让出执行权后能响应取消", async () => {
  let cancelled = false;
  await assert.rejects(
    processImportedBooks(
      [
        {
          fileName: "cancel.html",
          entries: Array.from({ length: 3 }, (_, index) => ({
            word: `word-${index}`,
          })),
        },
      ],
      {
        limits: { yieldEvery: 1 },
        isCancelled: () => cancelled,
        yieldControl: async () => {
          cancelled = true;
        },
      },
    ),
    ImportCancelledError,
  );
});
