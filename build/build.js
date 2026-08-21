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
const { hashedAsset } = require("./output-assets");

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
const webAssetsPath = path.join(projectRoot, "dist", "web", "assets");
const webDataPath = path.join(projectRoot, "dist", "web", "data");
const webDataBooksPath = path.join(webDataPath, "books");
const webManifestPath = path.join(webDataPath, "books.manifest.json");

const wordbooks = buildWordbooks({
  wordbooksPath,
  personalWordbooksPath,
  defaultBookId: "cet-4-vocabulary.html",
  includePersonalWordbooks: process.env.INCLUDE_PERSONAL_WORDBOOKS === "1",
});
const assets = loadBuildAssets(projectRoot);

function bundleDefines(target, wordbookDefine, importWorker) {
  return {
    __BUILD_APP_BUILD_TARGET__: JSON.stringify(target),
    __BUILD_BUILT_IN_BOOKS__: wordbookDefine.BUILT_IN_BOOKS,
    __BUILD_PERSONAL_BOOKS__: wordbookDefine.PERSONAL_BOOKS,
    __BUILD_DEFAULT_BOOK_ID__: wordbookDefine.DEFAULT_BOOK_ID,
    __BUILD_LEGACY_BUILT_IN_BOOK_IDS__: wordbookDefine.LEGACY_BUILT_IN_BOOK_IDS,
    __BUILD_IMPORT_WORKER_SOURCE__:
      target === "offline" ? assets.importWorkerSource : JSON.stringify(""),
    __BUILD_IMPORT_WORKER_URL__:
      target === "web"
        ? JSON.stringify(`./assets/${importWorker.fileName}`)
        : "null",
    __BUILD_BOOKS_MANIFEST_URL__:
      target === "web" ? JSON.stringify("./data/books.manifest.json") : "null",
    __BUILD_FSRS_PACKAGE_VERSION__: JSON.stringify(assets.fsrsPackageVersion),
  };
}

const importWorkerAsset = hashedAsset(
  "import-worker.js",
  assets.importWorkerCode,
);
const offlineBundle = buildBrowserBundle({
  projectRoot,
  define: bundleDefines("offline", wordbooks.offlineDefine, importWorkerAsset),
}).code;
const webBundle = buildBrowserBundle({
  projectRoot,
  define: bundleDefines("web", wordbooks.webDefine, importWorkerAsset),
}).code;
const stylesheetTemplate = fs.readFileSync(
  path.join(projectRoot, "src", "styles", "app.css"),
  "utf8",
);
const playfulAssetFiles = {
  cloudLeft: hashedAsset(
    "playful-cloud-left.png",
    assets.playfulAssets.cloudLeft,
  ),
  cloudRight: hashedAsset(
    "playful-cloud-right.png",
    assets.playfulAssets.cloudRight,
  ),
  sun: hashedAsset("playful-sun.svg", assets.playfulAssets.sun),
};
const offlineStylesheet = renderTemplate(
  stylesheetTemplate,
  assets.stylesheet,
  "offline application stylesheet",
);
const webStylesheet = renderTemplate(
  stylesheetTemplate,
  {
    PLAYFUL_CLOUD_LEFT_DATA_URI: `./${playfulAssetFiles.cloudLeft.fileName}`,
    PLAYFUL_CLOUD_RIGHT_DATA_URI: `./${playfulAssetFiles.cloudRight.fileName}`,
    PLAYFUL_SUN_DATA_URI: `./${playfulAssetFiles.sun.fileName}`,
  },
  "web application stylesheet",
);
const appScriptAsset = hashedAsset("app.js", `${webBundle}\n`);
const appStyleAsset = hashedAsset("app.css", webStylesheet);
const template = fs.readFileSync(
  path.join(projectRoot, "src", "templates", "app.html"),
  "utf8",
);

function renderPage({ target, style, script, wordbookData = "" }) {
  return renderTemplate(
    template,
    {
      APP_STYLE: style,
      APP_SCRIPT: script,
      WORDBOOK_DATA: wordbookData,
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
const offlineHtml = withSecurityPolicy(
  renderPage({
    target: "offline",
    style: `<style>\n${offlineStylesheet}  </style>`,
    script: `<script>${offlineBundle}</script>`,
    wordbookData: wordbooks.offlineDataBlocks,
  }),
);
const webHtml = withSecurityPolicy(
  renderPage({
    target: "web",
    style: `<link rel="stylesheet" href="./assets/${appStyleAsset.fileName}">`,
    script: `<script src="./assets/${appScriptAsset.fileName}"></script>`,
  }).replace(
    '  <meta name="theme-color" content="#edf4fc">',
    '  <meta name="theme-color" content="#edf4fc">\n' + webFileProtocolRedirect,
  ),
);
const webCacheVersion = crypto
  .createHash("sha256")
  .update(wordbooks.manifestJson)
  .update(appScriptAsset.content)
  .update(appStyleAsset.content)
  .digest("hex")
  .slice(0, 16);
const defaultBookArtifact = wordbooks.bookArtifacts.find(
  (artifact) => artifact.book.id === wordbooks.defaultBuiltInBook.id,
);
const serviceWorker = createWebServiceWorker({
  cacheVersion: webCacheVersion,
  coreUrls: [
    "./index.html",
    `./assets/${appScriptAsset.fileName}`,
    `./assets/${appStyleAsset.fileName}`,
    `./assets/${importWorkerAsset.fileName}`,
    `./assets/${playfulAssetFiles.cloudLeft.fileName}`,
    `./assets/${playfulAssetFiles.cloudRight.fileName}`,
    `./assets/${playfulAssetFiles.sun.fileName}`,
    "./data/books.manifest.json",
    `./data/books/${defaultBookArtifact.jsonFileName}`,
  ],
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
  webAssetsPath,
  webAssets: [
    appScriptAsset,
    appStyleAsset,
    importWorkerAsset,
    ...Object.values(playfulAssetFiles),
  ],
  webDataBooksPath,
  webManifestPath,
});

console.log(
  `已生成在线版与单文件离线版，内置 ${wordbooks.builtInBooks.length} 个单词本、我的单词本 ${wordbooks.personalBooks.length} 个，共 ${wordbooks.builtInBooks.concat(wordbooks.personalBooks).reduce((total, book) => total + book.words.length, 0)} 个词条。`,
);
