const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { loadBuildAssets } = require("./assets");
const { buildBrowserBundle } = require("./bundle");
const { withSecurityPolicy } = require("./csp");
const { renderTemplate } = require("./render-template");
const { createWebServiceWorker } = require("./service-worker");
const { buildWordbooks } = require("./wordbooks");
const { writeArtifacts } = require("./write-artifacts");

const projectRoot = path.join(__dirname, "..");
const wordbooksPath = path.join(projectRoot, "wordbooks");
const personalWordbooksPath = path.join(wordbooksPath, "my");
const dataPath = path.join(projectRoot, "data");
const dataBooksPath = path.join(dataPath, "books");
const rootOfflinePath = path.join(projectRoot, "vocabulary-flashcards.html");
const offlinePath = path.join(
  projectRoot,
  "dist",
  "offline",
  "vocabulary-flashcards.html",
);
const webPath = path.join(projectRoot, "dist", "web", "index.html");
const serviceWorkerPath = path.join(
  projectRoot,
  "dist",
  "web",
  "service-worker.js",
);

const wordbooks = buildWordbooks({
  wordbooksPath,
  personalWordbooksPath,
  defaultBookId: "cet-4-vocabulary.html",
  includePersonalWordbooks: process.env.INCLUDE_PERSONAL_WORDBOOKS === "1",
});
const assets = loadBuildAssets(projectRoot);

function bundleDefines(target, wordbookDefine) {
  return {
    __BUILD_APP_BUILD_TARGET__: JSON.stringify(target),
    __BUILD_BUILT_IN_BOOKS__: wordbookDefine.BUILT_IN_BOOKS,
    __BUILD_PERSONAL_BOOKS__: wordbookDefine.PERSONAL_BOOKS,
    __BUILD_DEFAULT_BOOK_ID__: wordbookDefine.DEFAULT_BOOK_ID,
    __BUILD_LEGACY_BUILT_IN_BOOK_IDS__: wordbookDefine.LEGACY_BUILT_IN_BOOK_IDS,
    __BUILD_IMPORT_WORKER_SOURCE__: assets.importWorkerSource,
    __BUILD_FSRS_PACKAGE_VERSION__: JSON.stringify(assets.fsrsPackageVersion),
  };
}

const offlineBundle = buildBrowserBundle({
  projectRoot,
  define: bundleDefines("offline", wordbooks.offlineDefine),
}).code;
const webBundle = buildBrowserBundle({
  projectRoot,
  define: bundleDefines("web", wordbooks.webDefine),
}).code;
const stylesheet = renderTemplate(
  fs.readFileSync(path.join(projectRoot, "src", "styles", "app.css"), "utf8"),
  assets.stylesheet,
  "application stylesheet",
);
const template = fs.readFileSync(
  path.join(projectRoot, "src", "templates", "app.html"),
  "utf8",
);

function renderPage(bundle, target) {
  return renderTemplate(
    template,
    {
      APP_CSS: stylesheet,
      APP_BUNDLE: bundle,
      PERSONAL_BOOK_COUNT: wordbooks.personalBooks.length,
      BUILD_TARGET: target,
    },
    "application template",
  );
}

const webFileProtocolRedirect = `  <script>
    if (window.location.protocol === 'file:') {
      window.location.replace('../offline/vocabulary-flashcards.html' + window.location.search + window.location.hash);
    }
  </script>`;
const offlineHtml = withSecurityPolicy(renderPage(offlineBundle, "offline"));
const webHtml = withSecurityPolicy(
  renderPage(webBundle, "web").replace(
    '  <meta name="theme-color" content="#edf4fc">',
    '  <meta name="theme-color" content="#edf4fc">\n' + webFileProtocolRedirect,
  ),
);
const webCacheVersion = crypto
  .createHash("sha256")
  .update(wordbooks.manifestJson)
  .update(webBundle)
  .digest("hex")
  .slice(0, 16);
const defaultBookArtifact = wordbooks.bookArtifacts.find(
  (artifact) => artifact.book.id === wordbooks.defaultBuiltInBook.id,
);
const serviceWorker = createWebServiceWorker({
  cacheVersion: webCacheVersion,
  defaultBookFileName: defaultBookArtifact.jsonFileName,
});

writeArtifacts({
  bookArtifacts: wordbooks.bookArtifacts,
  dataBooksPath,
  manifestPath: path.join(dataPath, "books.manifest.json"),
  manifestJson: wordbooks.manifestJson,
  rootOfflinePath,
  offlinePath,
  offlineHtml,
  webPath,
  webHtml,
  serviceWorkerPath,
  serviceWorker,
});

console.log(
  `已生成在线版与单文件离线版，内置 ${wordbooks.builtInBooks.length} 个单词本、我的单词本 ${wordbooks.personalBooks.length} 个，共 ${wordbooks.builtInBooks.concat(wordbooks.personalBooks).reduce((total, book) => total + book.words.length, 0)} 个词条。`,
);
