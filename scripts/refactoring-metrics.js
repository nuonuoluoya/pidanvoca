const fs = require("node:fs");
const path = require("node:path");
const zlib = require("node:zlib");

const projectRoot = path.join(__dirname, "..");
const artifacts = {
  webHtml: path.join("dist", "web", "index.html"),
  offlineHtml: path.join("dist", "offline", "vocabulary-flashcards.html"),
};

function compressedSizes(content) {
  return {
    rawBytes: content.length,
    gzipBytes: zlib.gzipSync(content, { level: 9 }).length,
    brotliBytes: zlib.brotliCompressSync(content, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: 11,
      },
    }).length,
  };
}

function htmlMetrics(relativePath) {
  const content = fs.readFileSync(path.join(projectRoot, relativePath));
  const html = content.toString("utf8");
  return {
    path: relativePath.replaceAll("\\", "/"),
    ...compressedSizes(content),
    scriptBlocks: (html.match(/<script(?:\s[^>]*)?>/gi) || []).length,
    styleBlocks: (html.match(/<style(?:\s[^>]*)?>/gi) || []).length,
  };
}

const manifest = JSON.parse(
  fs.readFileSync(
    path.join(projectRoot, "data", "books.manifest.json"),
    "utf8",
  ),
);
const report = {
  generatedAt: "measured from the current deterministic build",
  nodeMajor: Number(process.versions.node.split(".")[0]),
  artifacts: Object.fromEntries(
    Object.entries(artifacts).map(([name, relativePath]) => [
      name,
      htmlMetrics(relativePath),
    ]),
  ),
  wordbooks: {
    count: manifest.books.length,
    totalWords: manifest.books.reduce(
      (total, book) => total + book.wordCount,
      0,
    ),
  },
};

console.log(JSON.stringify(report, null, 2));
