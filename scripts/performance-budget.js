const fs = require("node:fs");
const path = require("node:path");
const { performance } = require("node:perf_hooks");
const { createShuffledDeck } = require("../src/features/classic-deck/model");
const { processImportedBooks } = require("../src/services/import/processor");
const budgets = require("../performance-budgets.json");

const projectRoot = path.join(__dirname, "..");

function measure(label, operation) {
  const startedAt = performance.now();
  const value = operation();
  return { label, value, duration: performance.now() - startedAt };
}

async function measureAsync(label, operation) {
  const startedAt = performance.now();
  const value = await operation();
  return { label, value, duration: performance.now() - startedAt };
}

function fixedRandomIndex(maximum) {
  return Math.floor(maximum * 0.6180339887498948) % maximum;
}

function createImportFixture(count, offset) {
  return Array.from({ length: count }, (_, index) => ({
    word: `word-${offset + index}`,
    phonetic: `/w${index}/`,
    meaning: `释义 ${index}`,
    note: `note ${index}`,
  }));
}

function assertBudget(label, actual, maximum, unit) {
  const passed = actual <= maximum;
  const formatted = `${label}: ${actual.toFixed(2)} ${unit} / ${maximum} ${unit}`;
  if (!passed) throw new Error(`Performance budget exceeded: ${formatted}`);
  process.stdout.write(`✓ ${formatted}\n`);
}

async function main() {
  const webBytes = fs.statSync(
    path.join(projectRoot, "dist", "web", "index.html"),
  ).size;
  const offlineBytes = fs.statSync(
    path.join(projectRoot, "dist", "offline", "vocabulary-flashcards.html"),
  ).size;
  assertBudget("web HTML", webBytes, budgets.artifactBytes.webHtml, "bytes");
  assertBudget(
    "offline HTML",
    offlineBytes,
    budgets.artifactBytes.offlineHtml,
    "bytes",
  );

  const shuffle = measure("20,000-word shuffle", () =>
    createShuffledDeck(20_000, fixedRandomIndex),
  );
  if (new Set(shuffle.value).size !== 20_000) {
    throw new Error("20,000-word shuffle produced duplicate entries");
  }
  assertBudget(
    shuffle.label,
    shuffle.duration,
    budgets.operationsMs.shuffle20000,
    "ms",
  );

  const books = [
    { fileName: "part-1.html", entries: createImportFixture(20_000, 0) },
    {
      fileName: "part-2.html",
      entries: createImportFixture(20_000, 20_000),
    },
    {
      fileName: "part-3.html",
      entries: createImportFixture(10_000, 40_000),
    },
  ];
  const imported = await measureAsync("50,000-word import merge", () =>
    processImportedBooks(books),
  );
  if (imported.value.combinedWords.length !== 50_000) {
    throw new Error("50,000-word import benchmark lost entries");
  }
  assertBudget(
    imported.label,
    imported.duration,
    budgets.operationsMs.import50000,
    "ms",
  );
}

main().catch((error) => {
  process.stderr.write(`${error.stack || error.message}\n`);
  process.exitCode = 1;
});
