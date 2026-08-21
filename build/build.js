const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { parseWordbook } = require("../src/features/wordbooks/parser");
const { renderTemplate } = require("./render-template");
const { renderRuntime } = require("./render-runtime");
const { withSecurityPolicy } = require("./csp");
const { createWebServiceWorker } = require("./service-worker");
const { writeArtifacts } = require("./write-artifacts");

const projectRoot = path.join(__dirname, "..");

const wordbooksPath = path.join(projectRoot, "wordbooks");
const personalWordbooksPath = path.join(wordbooksPath, "my");
const defaultBookId = "cet-4-vocabulary.html";
const outputPath = path.join(projectRoot, "vocabulary-flashcards.html");
const dataPath = path.join(projectRoot, "data");
const dataBooksPath = path.join(dataPath, "books");
const appTemplatePath = path.join(projectRoot, "src", "templates", "app.html");
const appStylesheetPath = path.join(projectRoot, "src", "styles", "app.css");
const appRuntimePath = path.join(projectRoot, "src", "app", "bootstrap.js");
const playfulCloudLeftPath = path.join(
  projectRoot,
  "assets",
  "playful-paper-cloud.png",
);
const playfulCloudRightPath = path.join(
  projectRoot,
  "assets",
  "playful-paper-cloud-right.png",
);
const playfulSunPath = path.join(
  projectRoot,
  "assets",
  "playful-paper-sun.svg",
);
const playfulCloudLeftDataUri = `data:image/png;base64,${fs
  .readFileSync(playfulCloudLeftPath)
  .toString("base64")}`;
const playfulCloudRightDataUri = `data:image/png;base64,${fs
  .readFileSync(playfulCloudRightPath)
  .toString("base64")}`;
const playfulSunDataUri = `data:image/svg+xml;base64,${fs
  .readFileSync(playfulSunPath)
  .toString("base64")}`;
const webOutputPath = path.join(projectRoot, "dist", "web", "index.html");
const webServiceWorkerPath = path.join(
  projectRoot,
  "dist",
  "web",
  "service-worker.js",
);
const offlineOutputPath = path.join(
  projectRoot,
  "dist",
  "offline",
  "vocabulary-flashcards.html",
);
const memoryCorePath = path.join(
  projectRoot,
  "src",
  "features",
  "memory-review",
  "core.js",
);
const animationCoordinatorPath = path.join(
  projectRoot,
  "src",
  "animations",
  "animation-coordinator.js",
);
const animationGeometryPath = path.join(
  projectRoot,
  "src",
  "animations",
  "geometry.js",
);
const cardTransitionPath = path.join(
  projectRoot,
  "src",
  "animations",
  "card-transition.js",
);
const wordbookParserPath = path.join(
  projectRoot,
  "src",
  "features",
  "wordbooks",
  "parser.js",
);
const wordbookControllerPath = path.join(
  projectRoot,
  "src",
  "features",
  "wordbooks",
  "controller.js",
);
const classicDeckModelPath = path.join(
  projectRoot,
  "src",
  "features",
  "classic-deck",
  "model.js",
);
const classicDeckControllerPath = path.join(
  projectRoot,
  "src",
  "features",
  "classic-deck",
  "controller.js",
);
const reviewSessionPath = path.join(
  projectRoot,
  "src",
  "features",
  "memory-review",
  "review-session.js",
);
const memoryReviewControllerPath = path.join(
  projectRoot,
  "src",
  "features",
  "memory-review",
  "controller.js",
);
const memoryRefreshPolicyPath = path.join(
  projectRoot,
  "src",
  "features",
  "memory-review",
  "refresh-policy.js",
);
const databaseModulePath = path.join(
  projectRoot,
  "src",
  "services",
  "storage",
  "database.js",
);
const storageAvailabilityPath = path.join(
  projectRoot,
  "src",
  "services",
  "storage",
  "availability.js",
);
const storageMigrationV1Path = path.join(
  projectRoot,
  "src",
  "services",
  "storage",
  "migrations",
  "v1.js",
);
const storageMigrationV2Path = path.join(
  projectRoot,
  "src",
  "services",
  "storage",
  "migrations",
  "v2.js",
);
const reviewRepositoryPath = path.join(
  projectRoot,
  "src",
  "services",
  "storage",
  "review-repository.js",
);
const wordbookRepositoryPath = path.join(
  projectRoot,
  "src",
  "services",
  "storage",
  "wordbook-repository.js",
);
const settingsRepositoryPath = path.join(
  projectRoot,
  "src",
  "services",
  "storage",
  "settings-repository.js",
);
const settingsControllerPath = path.join(
  projectRoot,
  "src",
  "features",
  "settings",
  "controller.js",
);
const appEventsPath = path.join(projectRoot, "src", "app", "events.js");
const importProcessorPath = path.join(
  projectRoot,
  "src",
  "services",
  "import",
  "processor.js",
);
const importWorkerPath = path.join(
  projectRoot,
  "src",
  "services",
  "import",
  "import-worker.js",
);
const fsrsEntryPath = require.resolve("ts-fsrs");
const fsrsBrowserBundlePath = path.join(
  path.dirname(fsrsEntryPath),
  "index.umd.js",
);
const fsrsPackagePath = path.join(
  path.dirname(fsrsEntryPath),
  "..",
  "package.json",
);
const builtInBookDefinitions = [
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
];
const legacyBuiltInBookIds = {
  "大学英语六级单词本.html": "cet-6-vocabulary.html",
  "大学英语四级单词本.html": "cet-4-vocabulary.html",
  "高考英语单词本.html": "college-entrance-exam-vocabulary.html",
  "考研英语单词本.html": "postgraduate-entrance-exam-vocabulary.html",
  "小学英语单词本.html": "primary-school-vocabulary.html",
  "雅思英语单词本.html": "ielts-vocabulary.html",
  "中考英语单词本.html": "junior-high-school-entrance-exam-vocabulary.html",
};

if (!fs.existsSync(wordbooksPath)) {
  throw new Error("未找到 wordbooks 文件夹。");
}

function listHtmlFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) return [];
  return fs
    .readdirSync(directoryPath)
    .filter((fileName) => /\.html?$/i.test(fileName))
    .sort((left, right) => left.localeCompare(right, "zh-CN"));
}

function listJsonFiles(directoryPath) {
  if (!fs.existsSync(directoryPath)) return [];
  return fs
    .readdirSync(directoryPath)
    .filter((fileName) => /\.json$/i.test(fileName))
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
  return (
    "custom:" +
    encodeURIComponent(
      String(fileName || "")
        .trim()
        .toLocaleLowerCase(),
    )
  );
}

const wordbookFileNames = listJsonFiles(wordbooksPath);

if (!wordbookFileNames.length) {
  throw new Error("wordbooks 文件夹中没有 JSON 生词本。");
}

const missingBuiltInBooks = builtInBookDefinitions
  .map((book) => book.sourceFileName)
  .filter((fileName) => !wordbookFileNames.includes(fileName));

if (missingBuiltInBooks.length) {
  throw new Error(`缺少内置生词本文件：${missingBuiltInBooks.join(", ")}`);
}

const definedBookFileNames = new Set(
  builtInBookDefinitions.map((book) => book.sourceFileName),
);
const additionalBookDefinitions = wordbookFileNames
  .filter((fileName) => !definedBookFileNames.has(fileName))
  .map((sourceFileName) => ({ sourceFileName }));
const builtInBooks = builtInBookDefinitions
  .concat(additionalBookDefinitions)
  .map((definition) =>
    readJsonWordbook(wordbooksPath, definition.sourceFileName, definition),
  );
const bookArtifacts = builtInBooks.map((book) => {
  const jsonFileName = book.sourceFileName;
  const payload = {
    formatVersion: 1,
    id: book.id,
    name: book.name,
    words: book.words,
  };
  const json = JSON.stringify(payload) + "\n";
  return {
    book,
    jsonFileName,
    json,
    contentHash:
      "sha256-" +
      crypto
        .createHash("sha256")
        .update(JSON.stringify(book.words))
        .digest("hex"),
  };
});
const booksManifest = {
  formatVersion: 1,
  books: bookArtifacts.map(({ book, jsonFileName, contentHash }) => ({
    id: book.id,
    name: book.name,
    url: "./books/" + jsonFileName,
    wordCount: book.words.length,
    contentHash,
    schemaVersion: 1,
  })),
};
const manifestJson = JSON.stringify(booksManifest, null, 2) + "\n";
const webCacheVersion = crypto
  .createHash("sha256")
  .update(manifestJson)
  .digest("hex")
  .slice(0, 16);
const includePersonalWordbooks = process.env.INCLUDE_PERSONAL_WORDBOOKS === "1";
const personalSourceFileNames = includePersonalWordbooks
  ? listJsonFiles(personalWordbooksPath).concat(
      listHtmlFiles(personalWordbooksPath),
    )
  : [];
const personalBooks = personalSourceFileNames.map((sourceFileName) => {
  if (/\.json$/i.test(sourceFileName)) {
    const book = readJsonWordbook(personalWordbooksPath, sourceFileName);
    return {
      ...book,
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
      fs.readFileSync(path.join(personalWordbooksPath, sourceFileName), "utf8"),
      sourceFileName,
    ),
  };
});
const defaultBuiltInBook =
  builtInBooks.find((book) => book.id === defaultBookId) || builtInBooks[0];
const embeddedBuiltInBooks = JSON.stringify(builtInBooks).replace(
  /</g,
  "\\u003c",
);
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
    url: "../../data/books/" + artifact.jsonFileName,
  };
});
const embeddedOnlineBuiltInBooks = JSON.stringify(onlineBuiltInBooks).replace(
  /</g,
  "\\u003c",
);
const embeddedPersonalBooks = JSON.stringify(personalBooks).replace(
  /</g,
  "\\u003c",
);
const embeddedDefaultBookId = JSON.stringify(defaultBuiltInBook.id);
const embeddedLegacyBuiltInBookIds = JSON.stringify(legacyBuiltInBookIds);
const embeddedMemoryCore = fs
  .readFileSync(memoryCorePath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedAnimationCoordinator = fs
  .readFileSync(animationCoordinatorPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedAnimationGeometry = fs
  .readFileSync(animationGeometryPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedCardTransition = fs
  .readFileSync(cardTransitionPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedWordbookParser = fs
  .readFileSync(wordbookParserPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedWordbookController = fs
  .readFileSync(wordbookControllerPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedClassicDeckModel = fs
  .readFileSync(classicDeckModelPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedClassicDeckController = fs
  .readFileSync(classicDeckControllerPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedReviewSession = fs
  .readFileSync(reviewSessionPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedMemoryReviewController = fs
  .readFileSync(memoryReviewControllerPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedMemoryRefreshPolicy = fs
  .readFileSync(memoryRefreshPolicyPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedDatabaseModule = fs
  .readFileSync(databaseModulePath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedStorageAvailability = fs
  .readFileSync(storageAvailabilityPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedStorageMigrationV1 = fs
  .readFileSync(storageMigrationV1Path, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedStorageMigrationV2 = fs
  .readFileSync(storageMigrationV2Path, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedReviewRepository = fs
  .readFileSync(reviewRepositoryPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedWordbookRepository = fs
  .readFileSync(wordbookRepositoryPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedSettingsRepository = fs
  .readFileSync(settingsRepositoryPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedSettingsController = fs
  .readFileSync(settingsControllerPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedAppEvents = fs
  .readFileSync(appEventsPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedImportProcessor = fs
  .readFileSync(importProcessorPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedImportWorker = fs
  .readFileSync(importWorkerPath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const embeddedImportWorkerSource = JSON.stringify(
  embeddedImportProcessor + "\n" + embeddedImportWorker,
).replace(/</g, "\\u003c");
const embeddedFsrsBundle = fs
  .readFileSync(fsrsBrowserBundlePath, "utf8")
  .replace(/[ \t]+$/gm, "")
  .replace(/<\/script/gi, "<\\/script");
const fsrsPackageVersion = JSON.parse(
  fs.readFileSync(fsrsPackagePath, "utf8"),
).version;
const embeddedFsrsPackageVersion = JSON.stringify(fsrsPackageVersion);

const renderedAppCss = renderTemplate(
  fs.readFileSync(appStylesheetPath, "utf8"),
  {
    PLAYFUL_CLOUD_LEFT_DATA_URI: playfulCloudLeftDataUri,
    PLAYFUL_CLOUD_RIGHT_DATA_URI: playfulCloudRightDataUri,
    PLAYFUL_SUN_DATA_URI: playfulSunDataUri,
  },
  "application stylesheet",
);
const renderedAppRuntime = renderRuntime(
  fs.readFileSync(appRuntimePath, "utf8"),
  {
    APP_BUILD_TARGET: "'offline'",
    BUILT_IN_BOOKS: embeddedBuiltInBooks,
    PERSONAL_BOOKS: embeddedPersonalBooks,
    DEFAULT_BOOK_ID: embeddedDefaultBookId,
    LEGACY_BUILT_IN_BOOK_IDS: embeddedLegacyBuiltInBookIds,
    IMPORT_WORKER_SOURCE: embeddedImportWorkerSource,
    FSRS_PACKAGE_VERSION: embeddedFsrsPackageVersion,
  },
);
const output = renderTemplate(
  fs.readFileSync(appTemplatePath, "utf8"),
  {
    APP_CSS: renderedAppCss,
    APP_RUNTIME: renderedAppRuntime,
    EMBEDDED_MEMORY_CORE: embeddedMemoryCore,
    EMBEDDED_ANIMATION_COORDINATOR: embeddedAnimationCoordinator,
    EMBEDDED_ANIMATION_GEOMETRY: embeddedAnimationGeometry,
    EMBEDDED_CARD_TRANSITION: embeddedCardTransition,
    EMBEDDED_WORDBOOK_PARSER: embeddedWordbookParser,
    EMBEDDED_WORDBOOK_CONTROLLER: embeddedWordbookController,
    EMBEDDED_CLASSIC_DECK_MODEL: embeddedClassicDeckModel,
    EMBEDDED_CLASSIC_DECK_CONTROLLER: embeddedClassicDeckController,
    EMBEDDED_REVIEW_SESSION: embeddedReviewSession,
    EMBEDDED_MEMORY_REVIEW_CONTROLLER: embeddedMemoryReviewController,
    EMBEDDED_MEMORY_REFRESH_POLICY: embeddedMemoryRefreshPolicy,
    EMBEDDED_STORAGE_AVAILABILITY: embeddedStorageAvailability,
    EMBEDDED_STORAGE_MIGRATION_V1: embeddedStorageMigrationV1,
    EMBEDDED_STORAGE_MIGRATION_V2: embeddedStorageMigrationV2,
    EMBEDDED_DATABASE_MODULE: embeddedDatabaseModule,
    EMBEDDED_REVIEW_REPOSITORY: embeddedReviewRepository,
    EMBEDDED_WORDBOOK_REPOSITORY: embeddedWordbookRepository,
    EMBEDDED_SETTINGS_REPOSITORY: embeddedSettingsRepository,
    EMBEDDED_SETTINGS_CONTROLLER: embeddedSettingsController,
    EMBEDDED_APP_EVENTS: embeddedAppEvents,
    EMBEDDED_IMPORT_PROCESSOR: embeddedImportProcessor,
    EMBEDDED_FSRS_BUNDLE: `/* ts-fsrs ${fsrsPackageVersion}, MIT License */\n${embeddedFsrsBundle}`,
  },
  "application template",
);

const webFileProtocolRedirect = `  <script>
    if (window.location.protocol === 'file:') {
      window.location.replace('../offline/vocabulary-flashcards.html' + window.location.search + window.location.hash);
    }
  </script>`;

const webOutput = output
  .replace(
    '  <meta name="theme-color" content="#edf4fc">',
    '  <meta name="theme-color" content="#edf4fc">\n' + webFileProtocolRedirect,
  )
  .replace(
    "const APP_BUILD_TARGET = 'offline';",
    "const APP_BUILD_TARGET = 'web';",
  )
  .replace(
    `const BUILT_IN_BOOKS = ${embeddedBuiltInBooks};`,
    `const BUILT_IN_BOOKS = ${embeddedOnlineBuiltInBooks};`,
  );

const securedOfflineOutput = withSecurityPolicy(output);
const securedWebOutput = withSecurityPolicy(webOutput);
const defaultBookArtifact = bookArtifacts.find(
  (artifact) => artifact.book.id === defaultBuiltInBook.id,
);
const webServiceWorker = createWebServiceWorker({
  cacheVersion: webCacheVersion,
  defaultBookFileName: defaultBookArtifact.jsonFileName,
});

writeArtifacts({
  bookArtifacts,
  dataBooksPath,
  manifestPath: path.join(dataPath, "books.manifest.json"),
  manifestJson,
  rootOfflinePath: outputPath,
  offlinePath: offlineOutputPath,
  offlineHtml: securedOfflineOutput,
  webPath: webOutputPath,
  webHtml: securedWebOutput,
  serviceWorkerPath: webServiceWorkerPath,
  serviceWorker: webServiceWorker,
});
console.log(
  `已生成在线版与单文件离线版，内置 ${builtInBooks.length} 个单词本、我的单词本 ${personalBooks.length} 个，共 ${builtInBooks.concat(personalBooks).reduce((total, book) => total + book.words.length, 0)} 个词条。`,
);
