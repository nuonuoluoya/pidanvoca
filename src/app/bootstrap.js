    const APP_BUILD_TARGET = __BUILD_APP_BUILD_TARGET__;
    const BUILT_IN_BOOKS = __BUILD_BUILT_IN_BOOKS__;
    const PROJECT_PERSONAL_BOOKS = __BUILD_PERSONAL_BOOKS__;
    const DEFAULT_BOOK_ID = __BUILD_DEFAULT_BOOK_ID__;
    const LEGACY_BUILT_IN_BOOK_IDS = __BUILD_LEGACY_BUILT_IN_BOOK_IDS__;
    const DEFAULT_BOOK = BUILT_IN_BOOKS.find((book) => book.id === DEFAULT_BOOK_ID) || BUILT_IN_BOOKS[0];
    const DEFAULT_WORDS = DEFAULT_BOOK.words;
    const IMPORT_WORKER_SOURCE = __BUILD_IMPORT_WORKER_SOURCE__;
    const IMPORT_WORKER_URL = __BUILD_IMPORT_WORKER_URL__;
    const BOOKS_MANIFEST_URL = __BUILD_BOOKS_MANIFEST_URL__;
    const vocabularyStorageKey = 'random-vocabulary:last-import:v1';
    const studySizeStorageKey = 'random-vocabulary:study-size:v1';
    const studySizePreferencesStorageKey = 'random-vocabulary:study-sizes:v2';
    const themeStorageKey = 'random-vocabulary:theme:v1';
    const defaultStudySize = 30;
    const presetStudySizes = [10, 20, 30, 50, 100];
    const vocabularyDatabaseName = 'random-vocabulary';
    const vocabularyDatabaseVersion = 2;
    const vocabularyDatabaseRecord = 'last-import';
    const memoryCardStore = 'reviewCards';
    const memoryLogStore = 'reviewLogs';
    const memorySchedulerVersion = 'FSRS-6';
    const memoryPackageVersion = __BUILD_FSRS_PACKAGE_VERSION__;
    const memoryParameterVersion = 'default-0.90-v1';
    const memoryAppVersion = '1.1.0';
    const memoryCore = window.MemoryCurveCore;
    const memoryScheduler = window.FSRS.fsrs({
      request_retention: 0.9,
      enable_short_term: true,
      learning_steps: ['10m'],
      relearning_steps: ['10m'],
      enable_fuzz: true
    });
    const vocabularyDatabase = window.PidanvocaStorage.createDatabaseClient({
      indexedDB: window.indexedDB,
      name: vocabularyDatabaseName,
      version: vocabularyDatabaseVersion,
      onStateChange: ({ state }) => {
        if (state === 'persistent') memoryStorageAvailable = true;
        if (state === 'temporarily-unavailable' || state === 'corrupted') memoryStorageAvailable = false;
      },
      onBlocked: () => showImportStatus('数据库升级正被另一个旧页面占用，请关闭其他单词本标签页后重试。', true, true),
      onVersionChange: () => showImportStatus('检测到新版本数据库，当前连接已安全关闭；下次操作会自动重连。', false, true)
    });
    const reviewRepository = window.PidanvocaStorage.createReviewRepository({
      databaseClient: vocabularyDatabase,
      keyRange: window.IDBKeyRange
    });
    const wordbookRepository = window.PidanvocaStorage.createWordbookRepository({
      databaseClient: vocabularyDatabase,
      recordKey: vocabularyDatabaseRecord
    });
    const settingsRepository = window.PidanvocaStorage.createSettingsRepository({
      storage: (() => {
        try { return window.localStorage; } catch { return null; }
      })(),
      studySizeKey: studySizeStorageKey,
      studySizesKey: studySizePreferencesStorageKey,
      themeKey: themeStorageKey,
      legacyBookIds: LEGACY_BUILT_IN_BOOK_IDS,
      defaultStudySize
    });
    const settingsController = new window.PidanvocaSettings.SettingsController({
      theme: document.documentElement.dataset.theme
    });
    function normalizeStudySize(value) {
      return window.PidanvocaStorage.normalizeStudySize(value, defaultStudySize);
    }

    function loadStudySizePreference() {
      return settingsRepository.readLegacyStudySize();
    }

    function loadStudySizePreferences() {
      return settingsRepository.readStudySizes();
    }

    function studySizePreferenceForBook(bookId) {
      return Object.prototype.hasOwnProperty.call(studySizePreferences, bookId)
        ? normalizeStudySize(studySizePreferences[bookId])
        : legacyStudySizePreference;
    }

    function saveStudySizePreference(bookId, value) {
      studySizePreferences[bookId] = value;
      settingsRepository.writeStudySizes(studySizePreferences);
    }

    function studySizeLabel(value, spaced = true) {
      if (value === Infinity) return '全部';
      return String(value) + (spaced ? ' 词' : '词');
    }

    function normalizeStoredWord(entry) {
      if (!entry || typeof entry !== 'object' || typeof entry.word !== 'string' || !entry.word.trim()) return null;
      return {
        word: entry.word.trim(),
        phonetic: typeof entry.phonetic === 'string' ? entry.phonetic : '',
        meaning: typeof entry.meaning === 'string' ? entry.meaning : '',
        note: typeof entry.note === 'string' ? entry.note : ''
      };
    }

    function bookWordCount(book) {
      return Array.isArray(book?.words) ? book.words.length : Number(book?.wordCount) || 0;
    }

    async function fetchWithTimeout(url, options = {}, timeoutMilliseconds = 8000) {
      const controller = new AbortController();
      const timer = window.setTimeout(() => controller.abort(), timeoutMilliseconds);
      try {
        return await window.fetch(url, { ...options, signal: controller.signal });
      } finally {
        window.clearTimeout(timer);
      }
    }

    async function fetchWithRetry(url, options) {
      let lastError = null;
      for (let attempt = 0; attempt < 2; attempt += 1) {
        try {
          const response = await fetchWithTimeout(url, options);
          if (!response.ok) throw new Error('HTTP ' + response.status);
          return response;
        } catch (error) {
          lastError = error;
          if (attempt === 0) await new Promise((resolve) => window.setTimeout(resolve, 250));
        }
      }
      throw lastError || new Error('请求失败。');
    }

    async function loadBooksManifest() {
      if (APP_BUILD_TARGET !== 'web' || !BOOKS_MANIFEST_URL) return;
      const response = await fetchWithRetry(BOOKS_MANIFEST_URL, { cache: 'force-cache' });
      const manifest = await response.json();
      if (!manifest || manifest.formatVersion !== 1 || !Array.isArray(manifest.books)) throw new Error('词库清单格式不兼容。');
      const manifestBase = new URL(BOOKS_MANIFEST_URL, window.location.href);
      manifest.books.forEach((entry) => {
        const book = BUILT_IN_BOOKS.find((candidate) => candidate.id === entry.id);
        if (!book || Number(entry.wordCount) !== book.wordCount || typeof entry.url !== 'string') return;
        book.url = new URL(entry.url, manifestBase).href;
        book.contentHash = entry.contentHash;
      });
      if (BUILT_IN_BOOKS.some((book) => !book.url)) throw new Error('词库清单缺少内置词书。');
    }

    async function ensureBuiltInBookWords(bookId) {
      const book = BUILT_IN_BOOKS.find((entry) => entry.id === bookId);
      if (!book) return null;
      if (Array.isArray(book.words)) return book;
      if (!book.url || APP_BUILD_TARGET !== 'web') throw new Error('词库数据不可用，请重新构建应用。');
      let response;
      try {
        response = await fetchWithRetry(book.url, { cache: 'force-cache' });
      } catch {
        const message = window.location.protocol === 'file:'
          ? '当前打开的是在线版，浏览器无法直接读取词库文件；请打开单文件离线版 vocabulary-flashcards.html。'
          : '词库加载失败，请检查网络连接，或确认 data/books 目录已完整部署。';
        throw new Error(message);
      }
      const payload = await response.json();
      if (!payload || payload.formatVersion !== 1 || payload.id !== book.id || !Array.isArray(payload.words)) {
        throw new Error('词库数据格式不兼容。');
      }
      const words = payload.words.map(normalizeStoredWord).filter(Boolean);
      if (words.length !== book.wordCount) throw new Error('词库词条数量校验失败。');
      book.words = words;
      return book;
    }

    function createCustomBookId(fileName) {
      return 'custom:' + encodeURIComponent(String(fileName || '').trim().toLocaleLowerCase());
    }

    function jsonWordbookFileName(fileName) {
      const normalized = String(fileName || '').trim() || '我的单词本.html';
      if (/\.html?$/i.test(normalized)) return normalized.replace(/\.html?$/i, '.json');
      return /\.json$/i.test(normalized) ? normalized : normalized + '.json';
    }

    const PROJECT_PERSONAL_BOOK_IDS = new Set(PROJECT_PERSONAL_BOOKS.map((book) => book.id));

    function normalizeCustomBook(book) {
      if (!book || typeof book !== 'object' || !Array.isArray(book.words)) return null;
      const words = book.words.map(normalizeStoredWord).filter(Boolean);
      if (!words.length) return null;
      const originalFileName = typeof book.fileName === 'string' && book.fileName.trim() ? book.fileName.trim() : '我的单词本.html';
      const sourceFileName = typeof book.sourceFileName === 'string' && book.sourceFileName.trim()
        ? book.sourceFileName.trim()
        : (/\.html?$/i.test(originalFileName) ? originalFileName : '');
      const identityFileName = sourceFileName || originalFileName;
      const fileName = jsonWordbookFileName(originalFileName);
      return {
        formatVersion: 1,
        id: typeof book.id === 'string' && book.id ? book.id : createCustomBookId(identityFileName),
        name: typeof book.name === 'string' && book.name.trim() ? book.name.trim() : identityFileName.replace(/\.(?:html?|json)$/i, ''),
        fileName,
        sourceFileName,
        sourceFormat: book.sourceFormat === 'html' || /\.html?$/i.test(sourceFileName) ? 'html' : 'json',
        words
      };
    }

    function mergeProjectPersonalBooks(savedBooks = [], deletedProjectBookIds = []) {
      const deletedIds = new Set(deletedProjectBookIds);
      const bookMap = new Map(savedBooks.filter((book) => !deletedIds.has(book.id)).map((book) => [book.id, book]));
      PROJECT_PERSONAL_BOOKS.forEach((book) => {
        if (!deletedIds.has(book.id)) bookMap.set(book.id, book);
      });
      return Array.from(bookMap.values());
    }

    function normalizeRememberedPayload(saved) {
      if (!saved || saved.version !== 1) return null;
      const fileNames = Array.isArray(saved.fileNames) ? saved.fileNames.filter((name) => typeof name === 'string' && name.trim()) : [];
      const rememberedBuiltInBookId = typeof saved.builtInBookId === 'string'
        ? (LEGACY_BUILT_IN_BOOK_IDS[saved.builtInBookId] || saved.builtInBookId)
        : null;
      const builtInBook = rememberedBuiltInBookId
        ? BUILT_IN_BOOKS.find((book) => book.id === rememberedBuiltInBookId)
        : null;
      const rememberedWords = Array.isArray(saved.words) ? saved.words.map(normalizeStoredWord).filter(Boolean) : [];
      const savedCustomBooks = Array.isArray(saved.customBooks)
        ? saved.customBooks.map(normalizeCustomBook).filter(Boolean)
        : [];
      const deletedProjectPersonalBookIds = Array.isArray(saved.deletedProjectPersonalBookIds)
        ? saved.deletedProjectPersonalBookIds.filter((id) => typeof id === 'string' && PROJECT_PERSONAL_BOOK_IDS.has(id))
        : [];
      const customBooks = mergeProjectPersonalBooks(savedCustomBooks, deletedProjectPersonalBookIds);
      let customBook = typeof saved.customBookId === 'string'
        ? customBooks.find((book) => book.id === saved.customBookId)
        : null;

      if (!builtInBook && !customBook && fileNames.length === 1) {
        customBook = customBooks.find((book) => book.id === createCustomBookId(fileNames[0])) || null;
      }

      if (!builtInBook && !customBook && !savedCustomBooks.length && fileNames.length) {
        if (!rememberedWords.length) return null;
        const legacyFileName = fileNames.length === 1 ? fileNames[0] : '已导入的 ' + fileNames.length + ' 个单词本.html';
        customBook = {
          formatVersion: 1,
          id: createCustomBookId(legacyFileName),
          name: legacyFileName.replace(/\.html?$/i, ''),
          fileName: jsonWordbookFileName(legacyFileName),
          sourceFileName: legacyFileName,
          sourceFormat: 'html',
          words: rememberedWords
        };
        customBooks.push(customBook);
      }

      if (!builtInBook && !customBook && !rememberedWords.length) return null;

      return {
        words: builtInBook ? builtInBook.words : (customBook ? customBook.words : rememberedWords),
        builtInBookId: builtInBook ? builtInBook.id : null,
        customBookId: customBook ? customBook.id : null,
        customBooks,
        deletedProjectPersonalBookIds,
        fileNames
      };
    }

    function rememberedPayloadNeedsJsonMigration(saved) {
      const hasLegacyBooks = Array.isArray(saved?.customBooks) && saved.customBooks.some((book) => {
        if (!book || typeof book !== 'object') return true;
        return book.formatVersion !== 1
          || typeof book.fileName !== 'string'
          || !/\.json$/i.test(book.fileName)
          || (book.sourceFormat !== 'html' && book.sourceFormat !== 'json');
      });
      const hasLegacyFileNames = Array.isArray(saved?.fileNames)
        && saved.fileNames.some((fileName) => typeof fileName === 'string' && /\.html?$/i.test(fileName));
      return hasLegacyBooks || hasLegacyFileNames;
    }

    function jsonRememberedPayload(vocabulary) {
      return {
        version: 1,
        builtInBookId: vocabulary.builtInBookId,
        customBookId: vocabulary.customBookId,
        customBooks: vocabulary.customBooks,
        deletedProjectPersonalBookIds: vocabulary.deletedProjectPersonalBookIds,
        fileNames: vocabulary.fileNames.map(jsonWordbookFileName),
        savedAt: new Date().toISOString(),
        words: vocabulary.builtInBookId ? [] : vocabulary.words
      };
    }

    async function readRememberedPayload() {
      return wordbookRepository.readLastImport();
    }

    async function writeRememberedPayload(payload) {
      return wordbookRepository.writeLastImport(payload);
    }

    async function memoryReadAll(storeName) {
      return reviewRepository.readAll(storeName);
    }

    async function memoryReadMeta(key) {
      return reviewRepository.readMeta(key);
    }

    async function memoryWriteMeta(key, value) {
      return reviewRepository.writeMeta(key, value);
    }

    async function memoryCardsForBook(bookId) {
      return reviewRepository.cardsForBook(bookId);
    }

    async function memoryDueCardsForBook(bookId, now) {
      return reviewRepository.dueCardsForBook(bookId, now);
    }

    function settleWithin(promise, milliseconds) {
      return new Promise((resolve, reject) => {
        const timeout = window.setTimeout(() => reject(new Error('Storage write timed out')), milliseconds);
        promise.then((value) => {
          window.clearTimeout(timeout);
          resolve(value);
        }, (error) => {
          window.clearTimeout(timeout);
          reject(error);
        });
      });
    }

    function loadRememberedVocabularyFromLocalStorage() {
      try {
        return JSON.parse(window.localStorage.getItem(vocabularyStorageKey) || 'null');
      } catch {
        return null;
      }
    }

    async function loadRememberedVocabulary() {
      try {
        const saved = await readRememberedPayload();
        const savedBuiltInBookId = typeof saved?.builtInBookId === 'string'
          ? (LEGACY_BUILT_IN_BOOK_IDS[saved.builtInBookId] || saved.builtInBookId)
          : null;
        if (savedBuiltInBookId) await ensureBuiltInBookWords(savedBuiltInBookId);
        const rememberedVocabulary = normalizeRememberedPayload(saved);
        if (rememberedVocabulary) {
          if (rememberedPayloadNeedsJsonMigration(saved)) {
            await writeRememberedPayload(jsonRememberedPayload(rememberedVocabulary));
          }
          return rememberedVocabulary;
        }
      } catch {
        // File URLs and privacy modes may not expose IndexedDB; use the compatible fallback.
      }
      const localPayload = loadRememberedVocabularyFromLocalStorage();
      const localBuiltInBookId = typeof localPayload?.builtInBookId === 'string'
        ? (LEGACY_BUILT_IN_BOOK_IDS[localPayload.builtInBookId] || localPayload.builtInBookId)
        : null;
      if (localBuiltInBookId) await ensureBuiltInBookWords(localBuiltInBookId);
      const localVocabulary = normalizeRememberedPayload(localPayload);
      if (localVocabulary) {
        writeRememberedPayload(jsonRememberedPayload(localVocabulary)).then(() => {
          try { window.localStorage.removeItem(vocabularyStorageKey); } catch { /* Keep the compatible copy. */ }
        }).catch(() => {});
      }
      return localVocabulary;
    }

    const app = document.querySelector('.app');
    const deckStage = document.querySelector('.deck-stage');
    const cardLayer = document.getElementById('cardLayer');
    const previousButton = document.getElementById('previousButton');
    const nextButton = document.getElementById('nextButton');
    const themeButton = document.getElementById('themeButton');
    const themeColorMeta = document.querySelector('meta[name="theme-color"]');
    const settingsButton = document.getElementById('settingsButton');
    const settingsDrawer = document.getElementById('settingsDrawer');
    const wordbookButton = document.getElementById('wordbookButton');
    const wordbookPanel = document.getElementById('wordbookPanel');
    const studySizePanel = document.getElementById('studySizePanel');
    const studySizeValue = document.getElementById('studySizeValue');
    const studySizeHint = document.getElementById('studySizeHint');
    const studySizePresets = document.getElementById('studySizePresets');
    const studySizeCustom = document.getElementById('studySizeCustom');
    const studySizeInput = document.getElementById('studySizeInput');
    const studySizeDecrease = document.getElementById('studySizeDecrease');
    const studySizeIncrease = document.getElementById('studySizeIncrease');
    const studySizeApply = document.getElementById('studySizeApply');
    const studySizeDelete = document.getElementById('studySizeDelete');
    const builtInWordbookList = document.getElementById('builtInWordbookList');
    const customWordbookSection = document.getElementById('customWordbookSection');
    const customWordbookList = document.getElementById('customWordbookList');
    const importButton = document.getElementById('importButton');
    const importInput = document.getElementById('importInput');
    const importStatus = document.getElementById('importStatus');
    const shuffleButton = document.getElementById('shuffleButton');
    const studyCompleteBackdrop = document.getElementById('studyCompleteBackdrop');
    const studyCompleteTitle = document.getElementById('studyCompleteTitle');
    const studyCompleteScore = document.getElementById('studyCompleteScore');
    const studyCompleteDetail = document.getElementById('studyCompleteDetail');
    const studyCompleteContinue = document.getElementById('studyCompleteContinue');
    const studyCompleteAdjust = document.getElementById('studyCompleteAdjust');
    const memoryButton = document.getElementById('memoryButton');
    const memoryBadge = document.getElementById('memoryBadge');
    const memorySettingsButton = document.getElementById('memorySettingsButton');
    const memorySettingsPanel = document.getElementById('memorySettingsPanel');
    const memorySummary = document.getElementById('memorySummary');
    const memoryDailyNewInput = document.getElementById('memoryDailyNewInput');
    const memoryDailyPresets = document.getElementById('memoryDailyPresets');
    const memoryExportButton = document.getElementById('memoryExportButton');
    const memoryImportButton = document.getElementById('memoryImportButton');
    const memoryImportInput = document.getElementById('memoryImportInput');
    const memoryImportMode = document.getElementById('memoryImportMode');
    const memoryResetBookButton = document.getElementById('memoryResetBookButton');
    const memoryResetAllButton = document.getElementById('memoryResetAllButton');
    const memoryBackdrop = document.getElementById('memoryBackdrop');
    const memoryPanel = document.querySelector('.memory-panel');
    const memoryModeButton = document.getElementById('memoryModeButton');
    const memoryUndoButton = document.getElementById('memoryUndoButton');
    const memoryProgressText = document.getElementById('memoryProgressText');
    const memoryProgressFill = document.getElementById('memoryProgressFill');
    const memoryQueueText = document.getElementById('memoryQueueText');
    const memoryCard = document.getElementById('memoryCard');
    const memoryCardWord = document.getElementById('memoryCardWord');
    const memorySoundButton = document.getElementById('memorySoundButton');
    const memoryCardPrompt = document.getElementById('memoryCardPrompt');
    const memoryAnswer = document.getElementById('memoryAnswer');
    const memoryPhonetic = document.getElementById('memoryAnswerPhonetic');
    const memoryMeaning = document.getElementById('memoryAnswerMeaning');
    const memoryNote = document.getElementById('memoryAnswerNote');
    const memorySpelling = document.getElementById('memorySpelling');
    const memorySpellingInput = document.getElementById('memorySpellingInput');
    const memorySpellingFeedback = document.getElementById('memorySpellingFeedback');
    const memoryRevealButton = document.getElementById('memoryRevealButton');
    const memoryRatingActions = document.getElementById('memoryRatingActions');
    const memoryAgainButton = document.getElementById('memoryAgainButton');
    const memoryGoodButton = document.getElementById('memoryGoodButton');
    const memoryAgainInterval = document.getElementById('memoryAgainInterval');
    const memoryGoodInterval = document.getElementById('memoryGoodInterval');
    const memoryComplete = document.getElementById('memoryComplete');
    const memoryCompleteDetail = document.getElementById('memoryCompleteDetail');
    const memoryReturnButton = document.getElementById('memoryReturnButton');
    deckStage.append(memoryBackdrop);
    const memoryReviewView = new window.PidanvocaViews.MemoryReviewView({
      panel: memoryPanel,
      elements: {
        complete: memoryComplete,
        completeDetail: memoryCompleteDetail,
        card: memoryCard,
        ratingActions: memoryRatingActions,
        progressText: memoryProgressText,
        progressFill: memoryProgressFill,
        queueText: memoryQueueText,
        word: memoryCardWord,
        prompt: memoryCardPrompt,
        phonetic: memoryPhonetic,
        meaning: memoryMeaning,
        note: memoryNote,
        answer: memoryAnswer,
        spelling: memorySpelling,
        spellingInput: memorySpellingInput,
        spellingFeedback: memorySpellingFeedback,
        againInterval: memoryAgainInterval,
        goodInterval: memoryGoodInterval
      }
    });
    const studyModes = ['full', 'word-only', 'spelling'];
    const studyModeLabels = {
      full: '完整显示',
      'word-only': '只显示单词',
      spelling: '拼写练习'
    };

    previousButton.disabled = true;
    nextButton.disabled = true;
    wordbookButton.disabled = true;
    importButton.disabled = true;
    shuffleButton.disabled = true;
    memoryButton.disabled = true;

    const classicDeckController = new window.PidanvocaClassicDeck.ClassicDeckController();
    classicDeckController.installLegacyBindings(window);
    const memoryReviewController = new window.PidanvocaMemoryReview.MemoryReviewController();
    memoryReviewController.installLegacyBindings(window);
    const legacyStudySizePreference = loadStudySizePreference();
    let studySizePreferences = loadStudySizePreferences();
    const wordbookController = new window.PidanvocaWordbooks.WordbookController({
      builtInBooks: BUILT_IN_BOOKS,
      defaultBook: DEFAULT_BOOK,
      projectPersonalBooks: PROJECT_PERSONAL_BOOKS,
      projectPersonalBookIds: PROJECT_PERSONAL_BOOK_IDS,
      studySizeForBook: studySizePreferenceForBook
    });
    wordbookController.installLegacyBindings(window);
    let isStudyCompleteOpen = false;
    let statusTimer = 0;
    let isTransitioning = false;
    let isReady = false;
    let isImporting = false;
    let activeImportWorker = null;
    let activeImportTaskId = null;
    let spellingAdvanceTimer = 0;
    let memoryDailyNew = memoryCore.defaultDailyNew;
    let memoryStorageAvailable = true;
    let memoryVolatileConsent = false;
    const memoryVolatileCards = new Map();
    const memoryVolatileLogs = new Map();
    let memoryModeLoading = false;
    let memorySessionNeedsRebuild = false;
    let memorySettingsSaveQueue = Promise.resolve();
    let memoryBlockedShakeTimer = 0;
    let memoryPreview = null;
    let memoryPreviewTime = null;
    let memoryRevealed = false;
    let memorySpellingWasWrong = false;
    let memorySpellingAccepted = false;
    let memorySpellingAdvanceTimer = 0;
    let memorySummaryToken = 0;
    let memorySummaryRefreshTimer = 0;
    let memoryLastClock = Date.now();
    const memoryOverviewCache = new Map();
      const animationCoordinator = new window.PidanvocaAnimations.AnimationCoordinator(({ state }) => {
        deckStage.dataset.animationState = state;
      });
      deckStage.dataset.animationState = animationCoordinator.state;
      const visibleRadius = 3;
      const exitPoints = new Map();
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
      const mobileClassicLayout = window.matchMedia('(max-width: 700px)');
      const stackedCardPointer = window.matchMedia('(min-width: 701px) and (hover: hover) and (pointer: fine)');
      let classicSwipeGesture = null;
      const settingsView = new window.PidanvocaViews.SettingsView({
        window,
        document,
        app,
        button: settingsButton,
        drawer: settingsDrawer,
        themeButton,
        themeMeta: themeColorMeta
      });
      const wordbookView = new window.PidanvocaViews.WordbookView({
        document,
        button: wordbookButton,
        panel: wordbookPanel,
        builtInList: builtInWordbookList,
        customSection: customWordbookSection,
        customList: customWordbookList,
        studySizePanel,
        deleteButton: studySizeDelete,
        reducedMotion
      });
      const completionView = new window.PidanvocaViews.CompletionView({
        window,
        backdrop: studyCompleteBackdrop,
        title: studyCompleteTitle,
        score: studyCompleteScore,
        detail: studyCompleteDetail,
        continueButton: studyCompleteContinue,
        adjustButton: studyCompleteAdjust
      });

    function activeStudyBookKey() {
      return wordbookController.activeBookKey();
    }

    function activeMemoryBookId() {
      return activeBuiltInBookId || activeCustomBookId || null;
    }

    function memoryUuid() {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
      return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
    }

    function ensureVolatileMemoryConsent() {
      if (memoryStorageAvailable || memoryVolatileConsent) return true;
      const consent = window.confirm('当前浏览器暂时无法保存记忆曲线进度。\n\n是否继续使用临时会话？本次评分会在关闭页面后丢失。');
      if (!consent) return false;
      memoryVolatileConsent = vocabularyDatabase.useVolatileWithUserConsent(true);
      if (memoryVolatileConsent) showImportStatus('已进入临时记忆会话；关闭页面前可导出备份。', true, true);
      return memoryVolatileConsent;
    }

    function memoryWordMap() {
      return window.PidanvocaMemoryReview.createWordMap(WORDS, memoryCore.normalizeWordKey);
    }

    function memoryRecordFromCard(bookId, word, card) {
      const serialized = memoryCore.serializeFsrsCard(card);
      return {
        cardId: memoryCore.createCardId(bookId, word.word),
        bookId,
        wordKey: memoryCore.normalizeWordKey(word.word),
        displayWord: word.word,
        fsrsCard: serialized,
        state: card.state,
        due: card.due.getTime(),
        stability: card.stability,
        difficulty: card.difficulty,
        elapsedDays: card.elapsed_days,
        scheduledDays: card.scheduled_days,
        reps: card.reps,
        lapses: card.lapses,
        lastReviewAt: card.last_review ? card.last_review.getTime() : null,
        updatedAt: Date.now(),
        schedulerVersion: memorySchedulerVersion,
        packageVersion: memoryPackageVersion,
        parameterVersion: memoryParameterVersion
      };
    }

    function memorySerializeLog(log) {
      if (!log || typeof log !== 'object') return null;
      return {
        ...log,
        due: log.due instanceof Date ? log.due.getTime() : Number(log.due),
        review: log.review instanceof Date ? log.review.getTime() : Number(log.review)
      };
    }

    function setMemorySettingsOpen(isOpen) {
      isOpen = settingsController.setMemorySettingsOpen(isOpen);
      memorySettingsButton.setAttribute('aria-expanded', String(isOpen));
      memorySettingsButton.setAttribute('aria-label', isOpen ? '隐藏记忆曲线设置' : '显示记忆曲线设置');
      memorySettingsPanel.hidden = !isOpen;
      if (isOpen) refreshMemorySummary();
    }

    async function loadMemorySettings() {
      try {
        const settings = await memoryReadMeta('memory-settings');
        memoryDailyNew = memoryCore.clampDailyNew(settings && settings.dailyNew);
        await memoryWriteMeta('memory-system', {
          formatVersion: memoryCore.backupFormatVersion,
          schedulerName: memorySchedulerVersion,
          fsrsVersion: '6',
          packageVersion: memoryPackageVersion,
          parameterVersion: memoryParameterVersion,
          requestRetention: 0.9,
          databaseVersion: vocabularyDatabaseVersion,
          migrationStatus: 'ready',
          checkedAt: Date.now()
        });
      } catch {
        memoryStorageAvailable = false;
        memoryDailyNew = memoryCore.defaultDailyNew;
      }
      memoryDailyNewInput.value = String(memoryDailyNew);
    }

    function saveMemorySettings() {
      const requestedDailyNew = memoryCore.clampDailyNew(memoryDailyNewInput.value);
      memoryDailyNewInput.value = String(requestedDailyNew);
      memorySettingsSaveQueue = memorySettingsSaveQueue
        .catch(() => {})
        .then(() => persistMemorySettings(requestedDailyNew));
      return memorySettingsSaveQueue;
    }

    async function persistMemorySettings(requestedDailyNew) {
      memoryDailyNew = requestedDailyNew;
      const bookId = activeMemoryBookId();
      try {
        await memoryWriteMeta('memory-settings', { dailyNew: memoryDailyNew, updatedAt: Date.now() });
        memoryStorageAvailable = true;
        showImportStatus('每日新词已设为 ' + memoryDailyNew + ' 个');
      } catch {
        memoryStorageAvailable = false;
        showImportStatus('浏览器无法保存记忆曲线设置，本次调整仅在当前页面有效。', true);
      }
      invalidateMemoryOverview(bookId);
      if (memoryIsOpen) memorySessionNeedsRebuild = true;
      else invalidateMemorySessionHistory(bookId);
      await refreshMemorySummary();
    }

    async function memoryOverview(bookId) {
      if (!bookId) return { records: [], due: [], learned: new Set(), newWords: [] };
      const cached = memoryOverviewCache.get(bookId);
      if (cached && cached.expiresAt > Date.now()) return cached.value;
      const now = Date.now();
      const records = memoryStorageAvailable
        ? await memoryCardsForBook(bookId)
        : Array.from(memoryVolatileCards.values()).filter((record) => record.bookId === bookId);
      const wordMap = memoryWordMap();
      const relevant = records.filter((record) => wordMap.has(record.wordKey));
      const indexedDue = memoryStorageAvailable
        ? await memoryDueCardsForBook(bookId, now)
        : relevant.filter((record) => Number(record.due) <= now);
      const due = memoryCore.sortDueRecords(indexedDue.filter((record) => wordMap.has(record.wordKey)));
      const learned = new Set(relevant.map((record) => record.wordKey));
      const newWords = due.length >= memoryCore.backlogThreshold
        ? []
        : memoryCore.selectDailyNewWords(WORDS, learned, bookId, memoryCore.localDateKey(new Date()), memoryDailyNew);
      const value = { records: relevant, due, learned, newWords };
      memoryOverviewCache.set(bookId, { value, expiresAt: now + 30000 });
      return value;
    }

    function invalidateMemoryOverview(bookId = null) {
      if (bookId) memoryOverviewCache.delete(bookId);
      else memoryOverviewCache.clear();
    }

    function scheduleMemorySummaryRefresh(nextDue = null) {
      window.clearTimeout(memorySummaryRefreshTimer);
      memorySummaryRefreshTimer = 0;
      if (document.hidden) return;
      const now = Date.now();
      const delay = window.PidanvocaMemoryRefresh.nextRefreshDelay(now, nextDue);
      memorySummaryRefreshTimer = window.setTimeout(() => {
        const currentTime = Date.now();
        if (window.PidanvocaMemoryRefresh.hasSignificantClockRollback(memoryLastClock, currentTime)) {
          showImportStatus('检测到设备时间明显回拨；已有复习时间未被改写，请确认系统时钟。', true);
        }
        memoryLastClock = currentTime;
        invalidateMemoryOverview();
        refreshMemorySummary();
      }, delay);
    }

    async function refreshMemorySummary() {
      const token = ++memorySummaryToken;
      const bookId = activeMemoryBookId();
      if (!bookId) {
        memorySummary.textContent = '合并查看模式不能建立稳定进度，请先选择一个具体单词本。';
        memoryButton.disabled = !isReady || memoryModeLoading;
        memoryBadge.hidden = true;
        memoryResetBookButton.disabled = true;
        scheduleMemorySummaryRefresh();
        return;
      }
      try {
        const overview = await memoryOverview(bookId);
        const dailySelection = await memoryDailySelection(bookId, overview);
        if (token !== memorySummaryToken) return;
        const paused = overview.due.length >= memoryCore.backlogThreshold;
        const now = Date.now();
        const nextDue = overview.records.map((record) => Number(record.due)).filter((due) => due > now).sort((left, right) => left - right)[0];
        const upcoming = nextDue && nextDue - now <= 60 * 60 * 1000 ? '；最近重学 ' + memoryCore.intervalLabel(now, nextDue) + '后到期' : '';
        memorySummary.textContent = '共 ' + WORDS.length + ' 词 · 今日待复习 ' + overview.due.length + ' · 今日新词 ' + dailySelection.length + ' · 已学习 ' + overview.learned.size + upcoming + (paused ? '；积压较多，已暂停新词' : '') + (memoryStorageAvailable ? '' : '；当前为临时会话，进度不会保存');
        memoryBadge.textContent = overview.due.length > 99 ? '99+' : String(overview.due.length);
        memoryBadge.hidden = overview.due.length === 0;
        memoryButton.title = memoryIsOpen ? '返回经典模式（Esc）' : overview.due.length + ' 个待复习，' + dailySelection.length + ' 个今日新词';
        memoryButton.disabled = !isReady || memoryModeLoading;
        memoryResetBookButton.disabled = overview.records.length === 0;
        scheduleMemorySummaryRefresh(nextDue || null);
      } catch {
        if (token !== memorySummaryToken) return;
        memoryStorageAvailable = false;
        memorySummary.textContent = '当前浏览器无法使用 IndexedDB，记忆曲线进度不会保存。';
        memoryButton.disabled = !isReady || memoryModeLoading;
        memoryBadge.hidden = true;
        memoryResetBookButton.disabled = true;
        scheduleMemorySummaryRefresh();
      }
    }

    async function memoryDailySelection(bookId, overview) {
      const dateKey = memoryCore.localDateKey(new Date());
      const metaKey = 'daily:' + bookId + ':' + dateKey;
      const wordMap = memoryWordMap();
      let selectedKeys = [];
      let hasSavedSelection = false;
      if (overview.due.length >= memoryCore.backlogThreshold) return selectedKeys;
      if (!memoryStorageAvailable) {
        return memoryCore.selectDailyNewWords(WORDS, overview.learned, bookId, dateKey, memoryDailyNew).map((item) => item.wordKey);
      }
      try {
        const saved = await memoryReadMeta(metaKey);
        if (saved && Array.isArray(saved.wordKeys)) {
          hasSavedSelection = true;
          const resizedKeys = memoryCore.resizeDailyNewWordKeys(
            WORDS,
            overview.learned,
            saved.wordKeys,
            bookId,
            dateKey,
            memoryDailyNew
          );
          const savedLimit = memoryCore.clampDailyNew(saved.limit);
          const selectionChanged = savedLimit !== memoryDailyNew
            || resizedKeys.length !== saved.wordKeys.length
            || resizedKeys.some((key, index) => key !== saved.wordKeys[index]);
          if (selectionChanged) {
            await memoryWriteMeta(metaKey, {
              ...saved,
              bookId,
              dateKey,
              wordKeys: resizedKeys,
              limit: memoryDailyNew,
              updatedAt: Date.now()
            });
          }
          selectedKeys = resizedKeys.filter((key) => wordMap.has(key) && !overview.learned.has(key));
        }
        if (!hasSavedSelection && overview.due.length < memoryCore.backlogThreshold) {
          selectedKeys = memoryCore.selectDailyNewWords(WORDS, overview.learned, bookId, dateKey, memoryDailyNew).map((item) => item.wordKey);
          await memoryWriteMeta(metaKey, { bookId, dateKey, wordKeys: selectedKeys, limit: memoryDailyNew, createdAt: Date.now() });
        }
      } catch {
        memoryStorageAvailable = false;
        throw new Error('无法读取复习进度，记忆曲线未启动。');
      }
      return selectedKeys;
    }

    async function buildMemoryQueue() {
      const bookId = activeMemoryBookId();
      if (!bookId) throw new Error('请先在“单词本”中选择一个具体词库。');
      const overview = await memoryOverview(bookId);
      const selectedKeys = await memoryDailySelection(bookId, overview);
      return {
        ...window.PidanvocaMemoryReview.buildReviewQueue(
          WORDS,
          overview.due,
          selectedKeys,
          memoryCore.normalizeWordKey
        ),
        learnedCount: overview.learned.size
      };
    }

    function memoryCurrentItem() {
      return memoryReviewController.currentItem();
    }

    function cancelMemorySpellingAdvance() {
      window.clearTimeout(memorySpellingAdvanceTimer);
      memorySpellingAdvanceTimer = 0;
    }

    function syncMemoryModeButton() {
      const isSpelling = memoryStudyMode === 'spelling';
      const description = isSpelling
        ? '当前：拼写练习；点击切换到回忆模式'
        : '当前：回忆模式；点击切换到拼写练习';
      memoryModeButton.dataset.memoryStudyMode = memoryStudyMode;
      memoryModeButton.setAttribute('aria-pressed', String(isSpelling));
      memoryModeButton.setAttribute('aria-label', description);
      memoryModeButton.title = description;
    }

    function clearMemoryActionHistory() {
      memoryReviewController.clearHistory();
      memoryUndoButton.disabled = true;
    }

    function invalidateMemorySessionHistory(bookId = null) {
      if (!memoryReviewController.invalidateSession(bookId)) return;
      memoryUndoButton.disabled = true;
    }

    function syncMemoryUndoButton() {
      memoryUndoButton.disabled = memoryRatingPending || memoryActionHistory.length === 0;
    }

    function syncMemoryRatingButtons() {
      const hasItem = Boolean(memoryCurrentItem());
      const isSpelling = memoryStudyMode === 'spelling';
      memoryAgainButton.disabled = !hasItem || memoryRatingPending || memorySpellingAccepted;
      memoryGoodButton.disabled = !hasItem || memoryRatingPending || isSpelling;
      memoryRevealButton.disabled = !hasItem || memoryRatingPending || memorySpellingAccepted;
      memoryModeButton.disabled = !hasItem || memoryRatingPending || memorySpellingAccepted;
      document.body.classList.toggle('memory-good-enabled', memoryIsOpen && hasItem && !memoryGoodButton.disabled);
    }

    function shakeBlockedMemoryGood() {
      if (!memoryCurrentItem() || memoryRatingPending || memoryBackdrop.classList.contains('is-transitioning')) return;
      window.clearTimeout(memoryBlockedShakeTimer);
      memoryPanel.classList.remove('is-good-blocked');
      void memoryPanel.offsetWidth;
      memoryPanel.classList.add('is-good-blocked');
      memoryBlockedShakeTimer = window.setTimeout(() => {
        memoryPanel.classList.remove('is-good-blocked');
        memoryBlockedShakeTimer = 0;
      }, 440);
    }

    function revealMemoryAnswer() {
      if (!memoryCurrentItem() || memoryRevealed) return;
      if (memoryStudyMode === 'spelling') {
        cancelMemorySpellingAdvance();
        memorySpellingAccepted = false;
        memorySpellingWasWrong = true;
        memoryCardWord.textContent = memoryCurrentItem().word.word;
        memorySpellingInput.readOnly = true;
        if (!memorySpellingFeedback.textContent) memorySpellingFeedback.textContent = '已查看答案，本词请按“忘记”继续。';
        memorySpellingFeedback.className = 'memory-spelling-feedback is-error';
        memoryAgainButton.querySelector('strong').textContent = '继续';
      }
      memoryRevealed = true;
      memoryAnswer.hidden = false;
      memoryCard.classList.add('is-revealed');
      syncMemoryRatingButtons();
      memoryRevealButton.querySelector('strong').textContent = '收起答案';
      memoryRevealButton.querySelector('small').textContent = '再次点击';
      memoryAgainButton.focus();
    }

    function hideMemoryAnswer() {
      if (!memoryCurrentItem() || !memoryRevealed || memoryRatingPending) return;
      memoryRevealed = false;
      memoryAnswer.hidden = true;
      memoryCard.classList.remove('is-revealed');
      if (memoryStudyMode === 'spelling') memoryCardWord.textContent = '';
      syncMemoryRatingButtons();
      memoryRevealButton.querySelector('strong').textContent = '查看答案';
      memoryRevealButton.querySelector('small').textContent = 'Space';
      memoryRevealButton.focus();
    }

    function toggleMemoryAnswer() {
      if (memoryRevealed) hideMemoryAnswer();
      else revealMemoryAnswer();
    }

    function memoryPreviewCard(item) {
      if (item.record) {
        const card = memoryCore.deserializeFsrsCard(item.record.fsrsCard);
        if (card) return card;
      }
      return window.FSRS.createEmptyCard(memoryPreviewTime);
    }

    function focusMemorySurface() {
      if (!memoryIsOpen) return;
      if (!memoryCurrentItem()) memoryReturnButton.focus();
      else if (memoryStudyMode === 'spelling') memorySpellingInput.focus();
      else memoryCard.focus();
    }

    function setMemoryStudyMode(nextMode) {
      if (!['recall', 'spelling'].includes(nextMode) || nextMode === memoryStudyMode || memoryRatingPending || memorySpellingAccepted) return;
      cancelMemorySpellingAdvance();
      if (!memoryReviewController.setStudyMode(nextMode)) return;
      syncMemoryModeButton();
      if (memoryCurrentItem()) renderMemoryCard();
    }

    function toggleMemoryStudyMode() {
      setMemoryStudyMode(memoryStudyMode === 'spelling' ? 'recall' : 'spelling');
    }

    function renderMemoryCard(shouldFocus = true) {
      const item = memoryCurrentItem();
      syncMemoryUndoButton();
      if (!item) {
        cancelMemorySpellingAdvance();
        memoryModeButton.disabled = true;
        memoryReviewView.render({
          hasItem: false,
          progressText: memoryQueue.length + ' / ' + memoryQueue.length,
          progressPercent: 100,
          queueText: '今日完成',
          completeDetail: '完成 ' + memorySessionReviewed + ' 次复习，学习 ' + memorySessionNew + ' 个新词。正在计算下一次复习…'
        });
        refreshMemoryCompletion();
        return;
      }
      memoryRevealed = false;
      memorySpellingWasWrong = false;
      memorySpellingAccepted = false;
      cancelMemorySpellingAdvance();
      memoryPreviewTime = new Date();
      memoryPreview = memoryScheduler.repeat(memoryPreviewCard(item), memoryPreviewTime);
      memoryReviewView.render(memoryPresentation(item, memoryPreviewTime, memoryPreview));
      syncMemoryRatingButtons();
      syncMemoryModeButton();
      memoryAgainButton.querySelector('strong').textContent = '忘记';
      memoryRevealButton.querySelector('strong').textContent = '查看答案';
      memoryRevealButton.querySelector('small').textContent = 'Space';
      if (shouldFocus) window.setTimeout(focusMemorySurface, 80);
    }

    function memoryPresentation(item, previewTime = new Date(), preview = null) {
      if (!item) {
        return {
          hasItem: false,
          progressText: memoryQueue.length + ' / ' + memoryQueue.length,
          progressPercent: 100,
          queueText: '今日完成',
          completeDetail: '完成 ' + memorySessionReviewed + ' 次复习，学习 ' + memorySessionNew + ' 个新词。'
        };
      }
      const schedule = preview || memoryScheduler.repeat(memoryPreviewCard(item), previewTime);
      const isSpelling = memoryStudyMode === 'spelling';
      return {
        hasItem: true,
        progressText: (memoryIndex + 1) + ' / ' + memoryQueue.length,
        progressPercent: Math.round(memoryIndex / Math.max(1, memoryQueue.length) * 100),
        queueText: item.isNew ? '今日新词' : '到期复习',
        isSpelling,
        word: isSpelling ? '' : item.word.word,
        prompt: isSpelling ? (item.word.meaning || '根据释义拼写单词') : '回想后直接评分，或查看答案',
        phonetic: item.word.phonetic || '',
        meaning: item.word.meaning || '暂无释义',
        note: item.word.note || '',
        againInterval: memoryCore.intervalLabel(previewTime, schedule[window.FSRS.Rating.Again].card.due),
        goodInterval: memoryCore.intervalLabel(previewTime, schedule[window.FSRS.Rating.Good].card.due)
      };
    }

    function cloneMemoryPanelForTransition(...classNames) {
      return memoryReviewView.clonePanel(...classNames);
    }

    function populateMemoryTransitionPanel(panel) {
      const item = memoryCurrentItem();
      const previewTime = new Date();
      const preview = item ? memoryScheduler.repeat(memoryPreviewCard(item), previewTime) : null;
      memoryReviewView.populateClone(panel, memoryPresentation(item, previewTime, preview));
    }

    function waitForElementTransition(element, propertyName, fallbackMilliseconds) {
      return window.PidanvocaAnimations.waitForElementTransition(element, propertyName, fallbackMilliseconds, window);
    }

    function afterTwoAnimationFrames(callback) {
      window.PidanvocaAnimations.afterTwoAnimationFrames(callback, window.requestAnimationFrame.bind(window));
    }

    function prepareMemoryStackAdvance() {
      const target = position + 1;
      if (target >= deck.length) return null;
      return deckTransitionView.prepareMemoryAdvance(position, target);
    }

    function startMemoryStackAdvance(advance) {
      deckTransitionView.startMemoryAdvance(advance, position);
    }

    function finishMemoryStackAdvance(advance) {
      deckTransitionView.finishMemoryAdvance(advance, position);
    }

    function prepareMemoryStackRetreat() {
      return deckTransitionView.prepareMemoryRetreat(position);
    }

    function startMemoryStackRetreat(retreat) {
      deckTransitionView.startMemoryRetreat(retreat, position);
    }

    function finishMemoryStackRetreat(retreat) {
      deckTransitionView.finishMemoryRetreat(retreat, position);
    }

    async function transitionMemoryCardAfterRating(exitPoint, advanceFromStack, transition) {
      if (reducedMotion.matches) {
        renderMemoryCard();
        transition.finish();
        return;
      }
      const incomingPanel = cloneMemoryPanelForTransition('memory-panel--incoming');
      populateMemoryTransitionPanel(incomingPanel);
      const stackAdvance = advanceFromStack ? prepareMemoryStackAdvance() : null;
      memoryPanel.classList.add('memory-panel--flight');
      applyExitPoint(memoryPanel, exitPoint || createExitPoint());
      memoryBackdrop.append(incomingPanel);
      memoryBackdrop.classList.add('is-transitioning');
      const outgoingFinished = waitForElementTransition(memoryPanel, 'transform', 560);
      const incomingFinished = waitForElementTransition(incomingPanel, 'transform', 760);
      void incomingPanel.offsetWidth;
      const incomingStartRect = incomingPanel.getBoundingClientRect();
      incomingPanel.dataset.transitionStartCenter = String(incomingStartRect.left + incomingStartRect.width / 2);
      try {
        await new Promise((resolve) => {
          afterTwoAnimationFrames(() => {
            memoryPanel.classList.add('is-flying-out');
            if (stackAdvance) {
              transition.move('advancing-stack');
              startMemoryStackAdvance(stackAdvance);
            }
            transition.move('revealing-incoming');
            memoryBackdrop.classList.add('is-card-advancing');
            Promise.all([outgoingFinished, incomingFinished]).then(resolve);
          });
        });
      } finally {
        memoryPanel.style.visibility = 'hidden';
        memoryPanel.classList.add('is-transition-reset');
        memoryPanel.classList.remove('memory-panel--flight', 'is-flying-out');
        clearExitPoint(memoryPanel);
        renderMemoryCard(false);
        finishMemoryStackAdvance(stackAdvance);
        memoryBackdrop.classList.remove('is-transitioning', 'is-card-advancing');
        incomingPanel.remove();
        void memoryPanel.offsetWidth;
        memoryPanel.style.removeProperty('visibility');
        void memoryPanel.offsetWidth;
        memoryPanel.classList.remove('is-transition-reset');
        if (transition.isActive()) transition.finish();
      }
      focusMemorySurface();
    }

    async function transitionMemoryCardAfterUndo(exitPoint, transition) {
      if (reducedMotion.matches) {
        renderMemoryCard();
        transition.finish();
        return;
      }
      const yieldingPanel = cloneMemoryPanelForTransition('memory-panel--yielding');
      memoryBackdrop.append(yieldingPanel);
      const stackRetreat = prepareMemoryStackRetreat();
      // The live memory panel is already rendered at the center. Snap it to the
      // recorded exit point before enabling its return transition; otherwise the
      // browser starts an outward transition and shortens the reversed return.
      memoryPanel.classList.add('is-transition-reset');
      applyExitPoint(memoryPanel, exitPoint || createExitPoint());
      memoryPanel.classList.add('memory-panel--returning');
      memoryBackdrop.classList.add('is-transitioning');
      renderMemoryCard(false);
      void memoryPanel.offsetWidth;
      memoryPanel.classList.remove('is-transition-reset');
      void memoryPanel.offsetWidth;
      try {
        const returningFinished = waitForElementTransition(memoryPanel, 'transform', 760);
        const yieldingFinished = waitForElementTransition(yieldingPanel, 'transform', 760);
        const stackFinished = stackRetreat.leadingCard
          ? waitForElementTransition(stackRetreat.leadingCard, 'transform', 760)
          : Promise.resolve();
        await new Promise((resolve) => {
          afterTwoAnimationFrames(() => {
            memoryBackdrop.classList.add('is-undo-returning');
            startMemoryStackRetreat(stackRetreat);
            Promise.all([returningFinished, yieldingFinished, stackFinished]).then(resolve);
          });
        });
      } finally {
        yieldingPanel.remove();
        finishMemoryStackRetreat(stackRetreat);
        memoryPanel.classList.remove('memory-panel--returning', 'is-transition-reset');
        clearExitPoint(memoryPanel);
        memoryBackdrop.classList.remove('is-transitioning', 'is-undo-returning');
        if (transition.isActive()) transition.finish();
      }
      focusMemorySurface();
    }

    function cancelActiveCardTransition(reason = 'interrupted') {
      if (animationCoordinator.isIdle) return false;
      animationCoordinator.cancelActive(reason);
      memoryBackdrop.querySelectorAll('.memory-panel--incoming, .memory-panel--yielding').forEach((panel) => panel.remove());
      memoryPanel.classList.remove(
        'memory-panel--flight',
        'memory-panel--incoming',
        'memory-panel--returning',
        'is-flying-out',
        'is-transition-reset'
      );
      memoryPanel.style.removeProperty('visibility');
      clearExitPoint(memoryPanel);
      memoryBackdrop.classList.remove('is-transitioning', 'is-card-advancing', 'is-undo-returning');
      deckTransitionView.resetTransitionClasses();
      isTransitioning = false;
      classicDeckController.cancelMove();
      if (memoryIsOpen) renderMemoryCard(false);
      renderStable();
      return true;
    }

    async function refreshMemoryCompletion() {
      if (!memoryIsOpen || memoryCurrentItem()) return;
      try {
        const overview = await memoryOverview(activeMemoryBookId());
        const now = Date.now();
        const nextDue = overview.records.map((record) => Number(record.due)).filter((due) => due > now).sort((left, right) => left - right)[0];
        const savedText = memoryStorageAvailable ? '进度已保存。' : '当前为临时会话，关闭页面后进度会丢失。';
        memoryCompleteDetail.textContent = '完成 ' + memorySessionReviewed + ' 次复习，学习 ' + memorySessionNew + ' 个新词。' + (nextDue ? '下一张预计 ' + new Date(nextDue).toLocaleString() + ' 到期。' : '当前没有未来任务。') + savedText;
      } catch {
        memoryCompleteDetail.textContent = '完成 ' + memorySessionReviewed + ' 次复习，学习 ' + memorySessionNew + ' 个新词。';
      }
    }

    async function openMemoryReview() {
      if (memoryIsOpen || memoryModeLoading || !animationCoordinator.isIdle || !isReady) return;
      memoryModeLoading = true;
      memoryButton.disabled = true;
      try {
        const bookId = activeMemoryBookId();
        if (!bookId) throw new Error('请先在“单词本”中选择一个具体词库。');
        if (!ensureVolatileMemoryConsent()) throw new Error('已取消临时记忆会话。');
        const dateKey = memoryCore.localDateKey(new Date());
        const canResume = memoryReviewController.canResume(bookId, dateKey);
        if (!canResume) {
          const built = await buildMemoryQueue();
          memoryReviewController.startSession(built.items, {
            sessionId: memoryUuid(),
            bookId,
            dateKey
          });
        }
        memoryReviewController.setOpen(true);
        setSettingsOpen(false);
        closeStudyComplete();
        document.body.classList.add('memory-mode');
        memoryButton.setAttribute('aria-pressed', 'true');
        memoryButton.setAttribute('aria-label', '返回经典模式');
        memoryButton.title = '返回经典模式（Esc）';
        cardLayer.setAttribute('aria-hidden', 'true');
        memoryBackdrop.setAttribute('aria-hidden', 'false');
        memoryBackdrop.hidden = false;
        window.requestAnimationFrame(() => memoryBackdrop.classList.add('is-visible'));
        renderMemoryCard();
        document.title = '今日复习 · 随机单词本';
      } catch (error) {
        showImportStatus(error instanceof Error ? error.message : '记忆曲线无法启动。', true);
      } finally {
        memoryModeLoading = false;
        memoryButton.disabled = !isReady;
      }
    }

    function finishMemoryReviewClose() {
      cancelMemorySpellingAdvance();
      memoryReviewController.setOpen(false);
      if (memorySessionNeedsRebuild) {
        invalidateMemorySessionHistory(activeMemoryBookId());
        memorySessionNeedsRebuild = false;
      }
      window.clearTimeout(memoryBlockedShakeTimer);
      memoryBlockedShakeTimer = 0;
      memoryPanel.classList.remove('is-good-blocked');
      document.body.classList.remove('memory-mode', 'memory-good-enabled');
      memoryButton.setAttribute('aria-pressed', 'false');
      memoryButton.setAttribute('aria-label', '打开今日复习');
      memoryButton.disabled = !isReady;
      memoryReturnButton.disabled = false;
      settingsButton.disabled = !isReady;
      cardLayer.setAttribute('aria-hidden', 'false');
      memoryBackdrop.setAttribute('aria-hidden', 'true');
      memoryBackdrop.classList.remove('is-visible');
      memoryBackdrop.hidden = true;
      memoryBackdrop.querySelectorAll('.memory-panel--flight, .memory-panel--incoming, .memory-panel--yielding').forEach((panel) => {
        if (panel !== memoryPanel) panel.remove();
      });
      memoryPanel.classList.remove('memory-panel--flight', 'memory-panel--incoming', 'memory-panel--returning', 'is-flying-out', 'is-transition-reset');
      memoryPanel.style.removeProperty('visibility');
      clearExitPoint(memoryPanel);
      cardLayer.classList.remove('is-transitioning', 'is-memory-advancing', 'is-memory-retreating');
      renderStable();
      refreshMemorySummary();
      syncChrome();
      memoryButton.focus();
    }

    function closeMemoryReview() {
      if (!memoryIsOpen || memoryRatingPending || !animationCoordinator.isIdle) return;
      finishMemoryReviewClose();
    }

    async function rateMemoryCard(rating) {
      const item = memoryCurrentItem();
      if (!item || !memoryPreview || memoryRatingPending || !animationCoordinator.isIdle || (rating !== window.FSRS.Rating.Again && rating !== window.FSRS.Rating.Good)) return;
      if (!ensureVolatileMemoryConsent()) return;
      if (memoryStudyMode === 'spelling') {
        if (rating === window.FSRS.Rating.Good && !memorySpellingAccepted) return;
      }
      cancelMemorySpellingAdvance();
      if (!memoryReviewController.beginRating()) return;
      memoryAgainButton.disabled = true;
      memoryRevealButton.disabled = true;
      memoryGoodButton.disabled = true;
      document.body.classList.remove('memory-good-enabled');
      const transition = animationCoordinator.begin('saving-rating', { mode: 'memory', direction: 'forward' });
      try {
        const result = memoryPreview[rating];
        const bookId = activeMemoryBookId();
        if (!bookId) throw new Error('当前词库已变化。');
        const afterRecord = memoryRecordFromCard(bookId, item.word, result.card);
        const reviewedAt = memoryPreviewTime.getTime();
        const logId = memoryUuid();
        const logRecord = {
          logId,
          sessionId: memorySessionId,
          cardId: afterRecord.cardId,
          bookId,
          wordKey: afterRecord.wordKey,
          rating,
          reviewedAt,
          dueBefore: item.record ? item.record.due : reviewedAt,
          dueAfter: afterRecord.due,
          scheduledDays: afterRecord.scheduledDays,
          elapsedDays: afterRecord.elapsedDays,
          stateBefore: item.record ? item.record.state : window.FSRS.State.New,
          stateAfter: afterRecord.state,
          beforeRecord: item.record ? { ...item.record } : null,
          afterRecord: { ...afterRecord },
          fsrsLog: memorySerializeLog(result.log),
          timezoneOffsetMinutes: new Date(reviewedAt).getTimezoneOffset(),
          schedulerVersion: memorySchedulerVersion,
          packageVersion: memoryPackageVersion,
          parameterVersion: memoryParameterVersion
        };
        if (memoryStorageAvailable) {
          await reviewRepository.saveReview(afterRecord, logRecord);
        } else {
          memoryVolatileCards.set(afterRecord.cardId, afterRecord);
          memoryVolatileLogs.set(logId, logRecord);
        }
        const exitPoint = createExitPoint();
        memoryReviewController.applyRating({
          logId,
          beforeRecord: item.record,
          afterRecord,
          wasNew: item.isNew,
          exitPoint
        });
        if (transition.isActive()) {
          transition.move('exiting-current');
          await transitionMemoryCardAfterRating(exitPoint, rating === window.FSRS.Rating.Good, transition);
        } else {
          renderMemoryCard(false);
        }
        invalidateMemoryOverview(bookId);
        refreshMemorySummary();
      } catch (error) {
        transition.cancel('rating-failed');
        if (memoryStudyMode === 'spelling' && rating === window.FSRS.Rating.Good) {
          memorySpellingAccepted = false;
          memorySpellingInput.readOnly = false;
          memorySpellingInput.classList.remove('is-correct');
          memorySpellingFeedback.textContent = '进度保存失败，请按 Enter 重试。';
          memorySpellingFeedback.className = 'memory-spelling-feedback is-error';
        }
        showImportStatus(error instanceof Error ? error.message : '学习进度未保存，请重试。', true);
      } finally {
        if (transition.isActive()) transition.cancel('rating-finished-without-settling');
        memoryReviewController.finishRating();
        memoryRevealButton.disabled = !memoryCurrentItem();
        syncMemoryRatingButtons();
        syncMemoryUndoButton();
      }
    }

    async function undoMemoryRating() {
      const action = memoryActionHistory.at(-1);
      if (!action || memoryRatingPending || !animationCoordinator.isIdle) return;
      if (!memoryReviewController.beginUndo()) return;
      memoryUndoButton.disabled = true;
      memoryAgainButton.disabled = true;
      memoryRevealButton.disabled = true;
      memoryGoodButton.disabled = true;
      const transition = animationCoordinator.begin('undo-returning', { mode: 'memory', direction: 'backward' });
      try {
        if (memoryStorageAvailable) {
          await reviewRepository.undoReview(action);
        } else {
          if (action.beforeRecord) memoryVolatileCards.set(action.beforeRecord.cardId, action.beforeRecord);
          else memoryVolatileCards.delete(action.afterRecord.cardId);
          memoryVolatileLogs.delete(action.logId);
        }
      } catch {
        transition.cancel('undo-save-failed');
        showImportStatus('撤销失败，原评分仍然保留。', true);
        memoryReviewController.finishRating();
        syncMemoryRatingButtons();
        syncMemoryUndoButton();
        return;
      }

      memoryReviewController.applyUndo(action);
      try {
        if (transition.isActive()) await transitionMemoryCardAfterUndo(action.exitPoint, transition);
        else renderMemoryCard(false);
      } catch {
        transition.cancel('undo-animation-failed');
        renderMemoryCard(false);
      } finally {
        if (transition.isActive()) transition.cancel('undo-finished-without-settling');
        memoryReviewController.finishRating();
        memoryRevealButton.disabled = !memoryCurrentItem();
        syncMemoryRatingButtons();
        syncMemoryUndoButton();
      }
      invalidateMemoryOverview(activeMemoryBookId());
      refreshMemorySummary();
      showImportStatus('已撤销上次评分');
    }

    function checkMemorySpelling(markWrong = false) {
      const item = memoryCurrentItem();
      if (!item || memoryStudyMode !== 'spelling' || memoryRatingPending || memorySpellingAccepted || memorySpellingWasWrong) return;
      const answer = normalizeSpelling(memorySpellingInput.value);
      if (!answer) return;
      const correct = answer === normalizeSpelling(item.word.word);
      if (correct) {
        memorySpellingAccepted = true;
        memorySpellingInput.readOnly = true;
        memorySpellingInput.classList.add('is-correct');
        memorySpellingFeedback.textContent = '拼写正确，正在进入下一个单词…';
        memorySpellingFeedback.className = 'memory-spelling-feedback is-success';
        syncMemoryRatingButtons();
        memorySpellingAdvanceTimer = window.setTimeout(() => {
          memorySpellingAdvanceTimer = 0;
          rateMemoryCard(window.FSRS.Rating.Good);
        }, 600);
        return;
      }
      if (!markWrong) return;
      memorySpellingWasWrong = true;
      memorySpellingInput.readOnly = true;
      memorySpellingFeedback.textContent = '拼写错误，答案是 ' + item.word.word + '。请按“忘记”继续。';
      memorySpellingFeedback.className = 'memory-spelling-feedback is-error';
      revealMemoryAnswer();
      memoryAgainButton.querySelector('strong').textContent = '继续';
      syncMemoryRatingButtons();
    }

    async function exportMemoryProgress() {
      try {
        const storedProgress = memoryStorageAvailable
          ? await reviewRepository.exportProgress()
          : {
              reviewCards: Array.from(memoryVolatileCards.values()),
              reviewLogs: Array.from(memoryVolatileLogs.values()),
              metaEntries: [['memory-settings', { dailyNew: memoryDailyNew }]]
            };
        const { reviewCards, reviewLogs, metaEntries: metaValues } = storedProgress;
        const bookIds = new Set(reviewCards.map((card) => card.bookId));
        const books = BUILT_IN_BOOKS.concat(customBooks).filter((book) => bookIds.has(book.id)).map((book) => ({ id: book.id, name: book.name, fileName: book.fileName, wordCount: bookWordCount(book) }));
        const payload = {
          format: memoryCore.backupFormat,
          formatVersion: memoryCore.backupFormatVersion,
          exportedAt: new Date().toISOString(),
          appVersion: memoryAppVersion,
          schedulerName: memorySchedulerVersion,
          fsrsVersion: '6',
          packageVersion: memoryPackageVersion,
          parameterVersion: memoryParameterVersion,
          parameters: { requestRetention: 0.9, enableShortTerm: true, learningSteps: ['10m'], relearningSteps: ['10m'] },
          settings: { dailyNew: memoryDailyNew },
          books,
          scheduler: { name: memorySchedulerVersion, package: 'ts-fsrs', packageVersion: memoryPackageVersion, parameterVersion: memoryParameterVersion, requestRetention: 0.9 },
          reviewCards,
          reviewLogs,
          metaEntries: metaValues
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'pidanvoca-memory-progress-' + memoryCore.localDateKey(new Date()) + '.json';
        link.click();
        window.setTimeout(() => URL.revokeObjectURL(url), 1000);
        showImportStatus('学习进度已导出');
      } catch {
        showImportStatus('学习进度导出失败。', true);
      }
    }

    async function importMemoryProgress(file) {
      if (!file) return;
      try {
        if (file.size > 25 * 1024 * 1024) throw new Error('进度文件超过 25 MB，请确认文件是否正确。');
        const payload = JSON.parse(await file.text());
        const validation = memoryCore.validateBackup(payload);
        if (!validation.valid) throw new Error(validation.reason);
        if (payload.fsrsVersion && String(payload.fsrsVersion) !== '6') throw new Error('该进度使用不兼容的 FSRS 主版本，已停止导入。');
        const incomingParameterVersion = payload.parameterVersion || (payload.scheduler && payload.scheduler.parameterVersion);
        if (incomingParameterVersion && incomingParameterVersion !== memoryParameterVersion) throw new Error('该进度使用不同的调度参数版本，已停止导入。');
        const cardIds = new Set();
        const logIds = new Set();
        payload.reviewCards.forEach((card) => {
          if (!card || typeof card.cardId !== 'string' || typeof card.bookId !== 'string' || !Number.isFinite(Number(card.due)) || !card.fsrsCard) throw new Error('进度文件包含无效卡片。');
          if (cardIds.has(card.cardId)) throw new Error('进度文件包含重复的卡片 ID。');
          cardIds.add(card.cardId);
        });
        payload.reviewLogs.forEach((log) => {
          if (!log || typeof log.logId !== 'string' || !Number.isFinite(Number(log.reviewedAt))) throw new Error('进度文件包含无效复习日志。');
          if (logIds.has(log.logId)) throw new Error('进度文件包含重复的日志 ID。');
          logIds.add(log.logId);
        });
        const existingCards = await memoryReadAll(memoryCardStore);
        const existingLogs = await memoryReadAll(memoryLogStore);
        const existingCardIds = new Set(existingCards.map((card) => card.cardId));
        const existingLogIds = new Set(existingLogs.map((log) => log.logId));
        const conflicts = payload.reviewCards.filter((card) => existingCardIds.has(card.cardId)).length;
        const duplicateLogs = payload.reviewLogs.filter((log) => existingLogIds.has(log.logId)).length;
        const bookCount = new Set(payload.reviewCards.map((card) => card.bookId)).size;
        const reviewTimes = payload.reviewLogs.map((log) => Number(log.reviewedAt)).filter(Number.isFinite).sort((left, right) => left - right);
        const replace = memoryImportMode.value === 'replace';
        const summary = bookCount + ' 个词库、' + payload.reviewCards.length + ' 张卡片、' + payload.reviewLogs.length + ' 条记录';
        const timeRange = reviewTimes.length ? '\n记录时间：' + new Date(reviewTimes[0]).toLocaleString() + ' 至 ' + new Date(reviewTimes[reviewTimes.length - 1]).toLocaleString() : '';
        const conflictText = '\n卡片冲突 ' + conflicts + ' 个；重复日志 ' + duplicateLogs + ' 条。';
        if (!window.confirm((replace ? '替换会先清空现有全部学习进度。' : '将按更新时间合并进度。') + '\n\n准备导入：' + summary + timeRange + conflictText + '\n是否继续？')) return;
        await reviewRepository.importProgress(payload, { replace });
        invalidateMemorySessionHistory();
        invalidateMemoryOverview();
        await loadMemorySettings();
        await refreshMemorySummary();
        showImportStatus('已导入 ' + summary);
      } catch (error) {
        showImportStatus(error instanceof Error ? error.message : '学习进度导入失败。', true);
      } finally {
        memoryImportInput.value = '';
      }
    }

    async function resetMemoryProgress(bookId) {
      const scope = bookId ? '当前词库的' : '全部';
      try {
        const allCards = memoryStorageAvailable ? await memoryReadAll(memoryCardStore) : Array.from(memoryVolatileCards.values());
        const allLogs = memoryStorageAvailable ? await memoryReadAll(memoryLogStore) : Array.from(memoryVolatileLogs.values());
        const affectedCards = bookId ? allCards.filter((record) => record.bookId === bookId) : allCards;
        const affectedLogs = bookId ? allLogs.filter((record) => record.bookId === bookId) : allLogs;
        if (!window.confirm('确定重置' + scope + '记忆曲线进度吗？\n\n将删除 ' + affectedCards.length + ' 张卡片状态和 ' + affectedLogs.length + ' 条复习日志，不会删除词库内容。此操作无法撤销，建议先导出备份。')) return;
        if (!memoryStorageAvailable) {
          affectedCards.forEach((record) => memoryVolatileCards.delete(record.cardId));
          affectedLogs.forEach((record) => memoryVolatileLogs.delete(record.logId));
          invalidateMemorySessionHistory(bookId);
          invalidateMemoryOverview(bookId);
          await refreshMemorySummary();
          showImportStatus('已重置' + scope + '临时记忆曲线进度');
          return;
        }
        await reviewRepository.resetProgress(bookId);
        invalidateMemorySessionHistory(bookId);
        invalidateMemoryOverview(bookId);
        if (!bookId) {
          memoryDailyNew = memoryCore.defaultDailyNew;
          memoryDailyNewInput.value = String(memoryDailyNew);
        }
        await refreshMemorySummary();
        showImportStatus('已重置' + scope + '记忆曲线进度');
      } catch {
        showImportStatus('重置失败，原进度未改变。', true);
      }
    }

    function createExitPoint() {
      return window.PidanvocaAnimations.createExitPoint({ width: window.innerWidth, height: window.innerHeight });
    }

    function exitPointFor(deckPosition) {
      if (!exitPoints.has(deckPosition)) exitPoints.set(deckPosition, createExitPoint());
      return exitPoints.get(deckPosition);
    }

    function applyExitPoint(card, point) {
      window.PidanvocaAnimations.applyExitPoint(card, point);
    }

    function clearExitPoint(card) {
      window.PidanvocaAnimations.clearExitPoint(card);
    }

    const importedEntityDecoder = document.createElement('textarea');
    const importBatchSize = 100;
    const importLimits = window.PidanvocaImport.DEFAULT_IMPORT_LIMITS;

    function decodeImportedEntities(value) {
      importedEntityDecoder.innerHTML = value;
      return importedEntityDecoder.value;
    }

    function yieldToMainThread() {
      return new Promise((resolve) => window.requestAnimationFrame(() => resolve()));
    }

    function importedHtmlToText(html) {
      return window.PidanvocaWordbooks.htmlToText(String(html), decodeImportedEntities);
    }

    function extractImportedNote(explanationHtml) {
      return window.PidanvocaWordbooks.extractNote(explanationHtml);
    }

    function extractImportedMeaning(explanationHtml, note) {
      return window.PidanvocaWordbooks.extractMeaning(explanationHtml, note, importedHtmlToText);
    }

    function collectImportedRows(root, entries) {
      root.querySelectorAll('tbody tr').forEach((row) => {
        const cells = row.querySelectorAll('td');
        if (cells.length < 5) return;
        const explanationRoot = cells[4].querySelector('.expDiv') || cells[4];
        const explanationHtml = explanationRoot.innerHTML;
        const note = extractImportedNote(explanationHtml);
        const entry = {
          word: (cells[1].textContent || '').trim(),
          phonetic: (cells[2].textContent || '').replace(/\s+/g, ' ').trim(),
          meaning: extractImportedMeaning(explanationHtml, note),
          note
        };
        if (entry.word) entries.push(entry);
      });
    }

    async function parseImportedBook(html, onProgress) {
      const sourceHtml = String(html);
      const entries = [];
      const parser = new DOMParser();
      const rowPattern = /<tr[^>]*>[\s\S]*?<\/tr>/gi;
      const batch = [];
      let match;
      let discoveredRows = 0;
      const bodyOpen = /<tbody[^>]*>/i.exec(sourceHtml);
      const scanStart = bodyOpen ? bodyOpen.index + bodyOpen[0].length : 0;
      rowPattern.lastIndex = scanStart;

      while ((match = rowPattern.exec(sourceHtml))) {
        batch.push(match[0]);
        discoveredRows += 1;
        if (batch.length < importBatchSize) continue;
        const batchDocument = parser.parseFromString('<table><tbody>' + batch.join('') + '</tbody></table>', 'text/html');
        collectImportedRows(batchDocument, entries);
        if (entries.length > importLimits.maxBookEntries) throw new Error('单个生词本超过 ' + importLimits.maxBookEntries + ' 个词条。');
        batch.length = 0;
        if (onProgress) onProgress(discoveredRows);
        await yieldToMainThread();
      }

      if (batch.length) {
        const batchDocument = parser.parseFromString('<table><tbody>' + batch.join('') + '</tbody></table>', 'text/html');
        collectImportedRows(batchDocument, entries);
        if (onProgress) onProgress(discoveredRows);
      }
      if (!discoveredRows) {
        collectImportedRows(parser.parseFromString(sourceHtml, 'text/html'), entries);
      }
      if (entries.length > importLimits.maxBookEntries) throw new Error('单个生词本超过 ' + importLimits.maxBookEntries + ' 个词条。');
      return entries;
    }

    function validateImportFiles(files) {
      return window.PidanvocaImport.validateFileSelection(files, importLimits);
    }

    function cancelImportTask() {
      if (!activeImportWorker || !activeImportTaskId) return false;
      activeImportWorker.postMessage({ type: 'cancel', taskId: activeImportTaskId });
      return true;
    }

    function processImportedBooks(books, onProgress) {
      if (!('Worker' in window)) {
        return window.PidanvocaImport.processImportedBooks(books, {
          limits: importLimits,
          onProgress,
          yieldControl: yieldToMainThread
        });
      }
      const workerUrl = IMPORT_WORKER_URL || URL.createObjectURL(new Blob([IMPORT_WORKER_SOURCE], { type: 'text/javascript' }));
      const worker = new Worker(workerUrl);
      const taskId = memoryUuid();
      activeImportWorker = worker;
      activeImportTaskId = taskId;
      return new Promise((resolve, reject) => {
        const cleanup = () => {
          worker.terminate();
          if (!IMPORT_WORKER_URL) URL.revokeObjectURL(workerUrl);
          if (activeImportWorker === worker) activeImportWorker = null;
          if (activeImportTaskId === taskId) activeImportTaskId = null;
        };
        worker.addEventListener('message', (event) => {
          const message = event.data || {};
          if (message.taskId !== taskId) return;
          if (message.type === 'progress') {
            onProgress(message.progress);
            return;
          }
          cleanup();
          if (message.type === 'complete') resolve(message.result);
          else reject(new Error(message.message || (message.type === 'cancelled' ? '导入已取消。' : '导入处理失败。')));
        });
        worker.addEventListener('error', () => {
          cleanup();
          reject(new Error('导入 Worker 运行失败。'));
        }, { once: true });
        worker.postMessage({ type: 'process', taskId, books, limits: importLimits });
      });
    }

    async function rememberVocabulary({
      builtInBookId = activeBuiltInBookId,
      customBookId = activeCustomBookId,
      fileNames = []
    } = {}) {
      const payload = {
        version: 1,
        builtInBookId,
        customBookId,
        customBooks,
        deletedProjectPersonalBookIds,
        fileNames,
        savedAt: new Date().toISOString(),
        words: builtInBookId ? [] : WORDS
      };

      try {
        await settleWithin(writeRememberedPayload(payload), 1800);
        try { window.localStorage.removeItem(vocabularyStorageKey); } catch { /* IndexedDB already succeeded. */ }
        return true;
      } catch {
        try {
          window.localStorage.setItem(vocabularyStorageKey, JSON.stringify(payload));
          return true;
        } catch {
          return false;
        }
      }
    }

    let rememberedSelectionQueue = Promise.resolve(true);

    function queueRememberedSelection(options) {
      rememberedSelectionQueue = rememberedSelectionQueue
        .catch(() => false)
        .then(() => rememberVocabulary(options));
      return rememberedSelectionQueue;
    }

    function showImportStatus(message, isError = false, keepVisible = false) {
      window.clearTimeout(statusTimer);
      importStatus.textContent = message;
      importStatus.classList.toggle('is-error', isError);
      importStatus.classList.add('is-visible');
      if (!keepVisible) {
        statusTimer = window.setTimeout(() => importStatus.classList.remove('is-visible'), 4200);
      }
    }

    function storeImportedBooks(importedBooks) {
      return wordbookController.storeImportedBooks(importedBooks, createCustomBookId, WORDS);
    }

    async function importBooks(files) {
      if (!files.length) return;
      try {
        validateImportFiles(files);
      } catch (error) {
        showImportStatus(error instanceof Error ? error.message : '导入文件超出限制。', true);
        importInput.value = '';
        return;
      }
      isImporting = true;
      importButton.disabled = true;
      showImportStatus('正在读取 ' + files.length + ' 个生词本…', false, true);

      try {
        const books = [];
        for (let fileIndex = 0; fileIndex < files.length; fileIndex += 1) {
          const file = files[fileIndex];
          showImportStatus('正在读取第 ' + (fileIndex + 1) + ' / ' + files.length + ' 个生词本…', false, true);
          const html = await file.text();
          const entries = await parseImportedBook(html, (parsedRows) => {
            showImportStatus('正在解析第 ' + (fileIndex + 1) + ' / ' + files.length + ' 个生词本，已处理 ' + parsedRows + ' 行…', false, true);
          });
          books.push({ fileName: file.name, entries });
          await yieldToMainThread();
        }
        const processed = await processImportedBooks(books, ({ processedEntries }) => {
          showImportStatus('正在校验并合并词条，已处理 ' + processedEntries + ' 条…', false, true);
        });
        const validBooks = processed.books;
        if (!validBooks.length) throw new Error('未在所选文件中识别到生词表，请选择 HTML 格式的导出生词本。');

        WORDS = processed.combinedWords;
        const total = WORDS.length;
        const storedBooks = storeImportedBooks(validBooks);
        renderWordbookLists();
        const remembered = await rememberVocabulary({ fileNames: storedBooks.map((book) => book.fileName) });
        const skipped = files.length - validBooks.length;
        shuffle();
        refreshMemorySummary();
        let message = '已载入 ' + validBooks.length + ' 个生词本，共 ' + total + ' 个词条';
        if (skipped) message += '；忽略 ' + skipped + ' 个无法识别的文件';
        message += remembered ? '；已转换为 JSON 保存，下次打开将自动恢复' : '；浏览器未能保存，下次打开会恢复默认词库';
        showImportStatus(message);
      } catch (error) {
        showImportStatus(error instanceof Error ? error.message : '导入失败，请检查文件格式。', true);
      } finally {
        isImporting = false;
        importInput.value = '';
        syncChrome();
      }
    }

    const randomValueBuffer = new Uint32Array(1);

    function randomIndex(max) {
      if (window.crypto?.getRandomValues) {
        const limit = Math.floor(0x100000000 / max) * max;
        do window.crypto.getRandomValues(randomValueBuffer); while (randomValueBuffer[0] >= limit);
        return randomValueBuffer[0] % max;
      }
      return Math.floor(Math.random() * max);
    }

    function createDeck() {
      return window.PidanvocaClassicDeck.createShuffledDeck(WORDS.length, randomIndex);
    }

    function cancelSpellingAdvance() {
      window.clearTimeout(spellingAdvanceTimer);
      spellingAdvanceTimer = 0;
    }

    function normalizeSpelling(value) {
      return window.PidanvocaClassicDeck.normalizeSpelling(value);
    }

    function appendMeaningText(element, value) {
      const text = String(value);
      const tensePattern = /时\s*态\s*[:：][^\r\n]*/g;
      let cursor = 0;
      for (const match of text.matchAll(tensePattern)) {
        if (match.index > cursor) element.append(document.createTextNode(text.slice(cursor, match.index)));
        const tense = document.createElement('span');
        tense.className = 'card-tense-info';
        tense.textContent = match[0];
        element.append(tense);
        cursor = match.index + match[0].length;
      }
      if (cursor < text.length) element.append(document.createTextNode(text.slice(cursor)));
    }

    function syncStudyModeButton(button) {
      const currentIndex = studyModes.indexOf(studyMode);
      const nextMode = studyModes[(currentIndex + 1) % studyModes.length];
      const description = '当前：' + studyModeLabels[studyMode] + '；点击切换到' + studyModeLabels[nextMode];
      button.title = description;
      button.setAttribute('aria-label', description);
    }

    function syncStudyModeButtons() {
      cardLayer.querySelectorAll('.study-mode-button').forEach(syncStudyModeButton);
    }

    function resetSpellingInputs() {
      cardLayer.querySelectorAll('.card-spelling-input').forEach((input) => {
        input.value = '';
        input.readOnly = false;
        input.classList.remove('is-correct');
        input.removeAttribute('data-accepted');
        input.setAttribute('aria-label', '输入当前单词');
      });
    }

    function focusCurrentSpellingInput() {
      if (studyMode !== 'spelling' || isTransitioning) return;
      const input = cardLayer.querySelector('.deck-card[data-offset="0"] .card-spelling-input:not([readonly])');
      if (input) input.focus({ preventScroll: true });
    }

    function setStudyMode(nextMode) {
      if (!studyModes.includes(nextMode) || nextMode === studyMode) return;
      cancelSpellingAdvance();
      studyMode = nextMode;
      document.body.dataset.studyMode = studyMode;
      resetSpellingInputs();
      syncStudyModeButtons();
      if (studyMode === 'spelling') window.requestAnimationFrame(focusCurrentSpellingInput);
    }

    function cycleStudyMode() {
      if (isTransitioning || isImporting) return;
      const currentIndex = studyModes.indexOf(studyMode);
      setStudyMode(studyModes[(currentIndex + 1) % studyModes.length]);
    }

    function checkSpellingInput(input) {
      if (studyMode !== 'spelling' || isTransitioning || input.dataset.accepted === 'true') return;
      const card = input.closest('.deck-card[data-offset="0"]');
      if (!card) return;
      const deckPosition = Number(card.dataset.deckPosition);
      if (deckPosition !== position) return;
      const answer = WORDS[deck[deckPosition]].word;
      if (normalizeSpelling(input.value) !== normalizeSpelling(answer)) return;

      input.dataset.accepted = 'true';
      input.readOnly = true;
      input.classList.add('is-correct');
      input.setAttribute('aria-label', '拼写正确，正在切换到下一个单词');
      cancelSpellingAdvance();
      spellingAdvanceTimer = window.setTimeout(() => {
        spellingAdvanceTimer = 0;
        if (studyMode === 'spelling' && position === deckPosition) next();
      }, 600);
    }

    const classicDeckView = new window.PidanvocaViews.ClassicDeckView({
      document,
      cardLayer,
      getEntry: (deckPosition) => WORDS[deck[deckPosition]],
      getProgress: (deckPosition) => studyProgressFor(deckPosition),
      getDeckLength: () => deck.length,
      getGroupNumber: (group) => Math.max(1, studyGroups.indexOf(group) + 1),
      syncStudyModeButton,
      appendMeaningText,
      now: () => performance.now()
    });
    const deckTransitionView = new window.PidanvocaAnimations.DeckTransitionView({
      cardLayer,
      synchronizeCards: (...args) => synchronizeCards(...args),
      setCardOffset: (card, offset) => setCardOffset(card, offset),
      bringCurrentForward: (cards) => bringCurrentCardForward(cards),
      applyExitPoint: (card, point) => applyExitPoint(card, point)
    });

    function setCardOffset(card, offset) {
      classicDeckView.setCardOffset(card, offset);
    }

    function createStudyGroup(start, requestedSize = studySize) {
      return window.PidanvocaClassicDeck.createStudyGroup(deck.length, start, requestedSize);
    }

    function currentStudyGroup() {
      return studyGroups[studyGroupIndex] || null;
    }

    function studyGroupForPosition(deckPosition) {
      return window.PidanvocaClassicDeck.studyGroupForPosition(studyGroups, studyGroupIndex, deckPosition);
    }

    function studyProgressFor(deckPosition) {
      return window.PidanvocaClassicDeck.studyProgress(deck.length, studyGroups, studyGroupIndex, deckPosition);
    }

    function updateStudySizeControls() {
      const group = currentStudyGroup();
      const hasPendingSize = Boolean(group && studyGroupIndex === studyGroups.length - 1 && position > group.start && group.requestedSize !== studySize);
      studySizeValue.textContent = hasPendingSize ? '下组 ' + studySizeLabel(studySize, false) : studySizeLabel(studySize);
      studySizeHint.textContent = hasPendingSize
        ? '当前组保持 ' + studySizeLabel(group.requestedSize) + '，新数量从下一组生效。'
        : '完整词序按组推进，整轮结束前不会重复。';

      studySizePresets.querySelectorAll('[data-study-size]').forEach((button) => {
        const buttonValue = button.dataset.studySize === 'all' ? Infinity : Number(button.dataset.studySize);
        const isSelected = buttonValue === studySize;
        button.classList.toggle('is-selected', isSelected);
        button.setAttribute('aria-pressed', String(isSelected));
      });

      studySizeCustom.classList.toggle('is-selected', studySize !== Infinity && !presetStudySizes.includes(studySize));

      if (studySize !== Infinity) studySizeInput.value = String(studySize);
    }

    function refreshCurrentCard() {
      const currentCard = cardLayer.querySelector('.deck-card[data-offset="0"]');
      if (currentCard) stripCardContent(currentCard);
      renderStable();
    }

    function setStudySizePreference(value) {
      const nextStudySize = normalizeStudySize(value);
      studySize = nextStudySize;
      saveStudySizePreference(activeStudyBookKey(), studySize);

      const group = currentStudyGroup();
      const canApplyImmediately = Boolean(group && studyGroupIndex === studyGroups.length - 1 && position === group.start);
      if (canApplyImmediately) {
        studyGroups[studyGroupIndex] = createStudyGroup(group.start, studySize);
        updateStudySizeControls();
        refreshCurrentCard();
        showImportStatus('本组已调整为' + studySizeLabel(studyGroups[studyGroupIndex].end - studyGroups[studyGroupIndex].start));
        setSettingsOpen(false);
        return;
      }

      updateStudySizeControls();
      if (group) showImportStatus('已设为每组' + studySizeLabel(studySize) + '，将从下一组生效');
      setSettingsOpen(false);
    }

    function mountCardContent(card, deckPosition) {
      classicDeckView.mountCardContent(card, deckPosition);
    }

    function stripCardContent(card) {
      classicDeckView.stripCardContent(card);
    }

    function resetCardFlightState(card) {
      classicDeckView.resetCardFlightState(card);
    }

    function createCard(deckPosition, offset, includeContent = false) {
      return classicDeckView.createCard(deckPosition, offset, includeContent);
    }

    function synchronizeCards(center, direction = 0, contentPositions = new Set([center])) {
      return classicDeckView.synchronize(center, cardPositions(center, direction), contentPositions);
    }

    function cardPositions(center, direction = 0) {
      const first = direction < 0 ? Math.max(0, center - 1) : center;
      const last = Math.min(deck.length - 1, center + visibleRadius + (direction > 0 ? 1 : 0));
      const positions = [];
      for (let deckPosition = first; deckPosition <= last; deckPosition += 1) positions.push(deckPosition);
      return positions;
    }

    function closeStudyComplete(restoreFocus = false) {
      isStudyCompleteOpen = false;
      completionView.hide();
      if (restoreFocus) nextButton.focus();
      syncChrome();
    }

    function showStudyComplete() {
      const group = currentStudyGroup();
      if (!group || isStudyCompleteOpen) return;
      const groupTotal = Math.max(0, group.end - group.start);
      const remaining = Math.max(0, deck.length - group.end);
      const isRoundComplete = remaining === 0;
      const nextGroupTotal = studySize === Infinity ? remaining : Math.min(studySize, remaining);

      setSettingsOpen(false);
      isStudyCompleteOpen = true;
      completionView.show({
        isRoundComplete,
        groupTotal,
        remaining,
        deckTotal: deck.length,
        nextGroupTotal
      });
      syncChrome();
    }

    function continueAfterStudyComplete() {
      const group = currentStudyGroup();
      if (!group) return;
      if (group.end >= deck.length) {
        closeStudyComplete();
        shuffle();
        showImportStatus('已重新随机排序，开始新一轮');
        return;
      }

      studyGroups.splice(studyGroupIndex + 1);
      studyGroups.push(createStudyGroup(group.end, studySize));
      closeStudyComplete();
      updateStudySizeControls();
      moveDeck(1);
    }

    function adjustStudySizeAfterComplete() {
      closeStudyComplete();
      setSettingsOpen(true);
      setWordbookPanelOpen(true);
      expandedStudyBookId = activeStudyBookKey();
      renderWordbookLists();
      updateStudySizeControls();
      window.setTimeout(() => {
        scrollExpandedStudyBook();
        const activeOption = document.querySelector('.wordbook-option-stack[data-book-id="' + CSS.escape(expandedStudyBookId) + '"] .wordbook-option');
        if (activeOption instanceof HTMLButtonElement) activeOption.focus();
      }, 80);
    }

    function syncChrome() {
      shuffleButton.disabled = !isReady || isTransitioning || isImporting;
      importButton.disabled = !isReady || isTransitioning || isImporting;
      wordbookButton.disabled = !isReady || isTransitioning || isImporting;
      studySizePanel.querySelectorAll('button, input').forEach((control) => {
        control.disabled = !isReady || isTransitioning || isImporting;
      });
      cardLayer.querySelectorAll('.study-mode-button').forEach((button) => {
        button.disabled = !isReady || isTransitioning || isImporting;
      });
      if (!deck.length) {
        previousButton.disabled = true;
        nextButton.disabled = true;
        nextButton.classList.remove('is-completion');
        return;
      }
      const entry = WORDS[deck[position]];
      if (!entry) {
        previousButton.disabled = true;
        nextButton.disabled = true;
        nextButton.classList.remove('is-completion');
        document.title = '随机单词本';
        return;
      }
      const group = studyGroupForPosition(position);
      const isLatestGroup = studyGroupIndex === studyGroups.length - 1;
      const isGroupEnd = Boolean(group && position === group.end - 1 && isLatestGroup);
      const isRoundEnd = isGroupEnd && group.end === deck.length;
      previousButton.disabled = isTransitioning || isStudyCompleteOpen || position === 0;
      nextButton.disabled = isTransitioning || isStudyCompleteOpen;
      nextButton.classList.toggle('is-completion', isGroupEnd);
      nextButton.setAttribute('aria-label', isRoundEnd ? '完成本轮' : (isGroupEnd ? '完成本组' : '下一个单词'));
      nextButton.title = isRoundEnd ? '完成本轮（→）' : (isGroupEnd ? '完成本组（→）' : '下一个单词（→）');
      document.title = entry.word + ' · 随机单词本';
      updateStudySizeControls();
    }

    function bringCurrentCardForward(cards) {
      classicDeckView.bringCurrentForward(cards);
    }

    function renderStable() {
      isTransitioning = false;
      cardLayer.classList.remove('is-transitioning');
      const cards = synchronizeCards(position);
      cardLayer.replaceChildren(...cards);
      bringCurrentCardForward(cards);
      cardLayer.setAttribute('aria-busy', 'false');
      syncChrome();
      window.requestAnimationFrame(focusCurrentSpellingInput);
    }

    function moveDeck(direction) {
      if (isTransitioning || isStudyCompleteOpen || !animationCoordinator.isIdle) return;
      cancelSpellingAdvance();
      const movePlan = classicDeckController.planMove(direction);
      if (movePlan.type === 'blocked') return;
      if (movePlan.type === 'complete') return showStudyComplete();
      classicDeckController.prepareMove(movePlan);
      const target = movePlan.target;

      if (reducedMotion.matches) {
        if (direction > 0) exitPointFor(position);
        classicDeckController.commitMove(movePlan);
        renderStable();
        return;
      }

      const transition = animationCoordinator.begin(direction > 0 ? 'exiting-current' : 'undo-returning', {
        mode: 'classic',
        direction: direction > 0 ? 'forward' : 'backward'
      });
      isTransitioning = true;
      cardLayer.setAttribute('aria-busy', 'true');
      const cards = synchronizeCards(position, direction, new Set([position, target]));
      const currentCard = cards.find((card) => Number(card.dataset.deckPosition) === position);
      const incomingCard = cards.find((card) => Number(card.dataset.deckPosition) === target);
      const currentWaterLevel = studyProgressFor(position).progressValue;
      const { incomingWater, targetWaterLevel } = deckTransitionView.prepareClassicMove({
        cards,
        currentCard,
        incomingCard,
        direction,
        exitPoint: exitPointFor(direction > 0 ? position : target),
        currentWaterLevel
      });
      syncChrome();
      const deckTransitionFinished = waitForElementTransition(incomingCard, 'transform', 760);
      void cardLayer.offsetWidth;

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          deckTransitionView.startClassicMove(cards, target, incomingWater, targetWaterLevel);
          if (direction > 0) {
            transition.move('advancing-stack');
            transition.move('revealing-incoming');
          }
          syncChrome();
          deckTransitionFinished.then(() => {
            if (!transition.isActive()) return;
            classicDeckController.commitMove(movePlan);
            transition.finish();
            renderStable();
          });
        });
      });
    }

    function shuffle() {
      cancelSpellingAdvance();
      closeStudyComplete();
      isTransitioning = false;
      exitPoints.clear();
      cardLayer.replaceChildren();
      classicDeckController.reset(createDeck(), studySize);
      updateStudySizeControls();
      renderStable();
    }

    function next() { moveDeck(1); }
    function previous() { moveDeck(-1); }

    function handleStackedCardAdvance(event) {
      if (!stackedCardPointer.matches || !(event.target instanceof Element)) return false;
      const stackedCard = event.target.closest('.deck-card[data-offset="1"]');
      if (!(stackedCard instanceof HTMLElement) || !cardLayer.contains(stackedCard)) return false;
      event.preventDefault();
      if (memoryIsOpen) {
        if (!memoryCurrentItem()) return true;
        if (memoryGoodButton.disabled || memoryRatingPending || memoryBackdrop.classList.contains('is-transitioning')) {
          shakeBlockedMemoryGood();
          return true;
        }
        rateMemoryCard(window.FSRS.Rating.Good);
        return true;
      }
      if (!isTransitioning && !isStudyCompleteOpen && !document.body.classList.contains('settings-open')) next();
      return true;
    }

    function isClassicSwipeControl(target) {
      return target instanceof Element && Boolean(target.closest('button, a, input, textarea, select, label, [contenteditable="true"]'));
    }

    function clearClassicSwipe(pointerId) {
      if (deckStage.hasPointerCapture?.(pointerId)) deckStage.releasePointerCapture(pointerId);
      classicSwipeGesture = null;
    }

    function startClassicSwipe(event) {
      if (!mobileClassicLayout.matches || event.isPrimary === false || event.button !== 0) return;
      if (memoryIsOpen || isTransitioning || isStudyCompleteOpen || document.body.classList.contains('settings-open')) return;
      if (isClassicSwipeControl(event.target)) return;
      classicSwipeGesture = {
        pointerId: event.pointerId,
        x: event.clientX,
        y: event.clientY,
        startedAt: window.performance.now()
      };
      deckStage.setPointerCapture?.(event.pointerId);
    }

    function finishClassicSwipe(event) {
      const gesture = classicSwipeGesture;
      if (!gesture || gesture.pointerId !== event.pointerId) return;
      const deltaX = event.clientX - gesture.x;
      const deltaY = event.clientY - gesture.y;
      const elapsed = window.performance.now() - gesture.startedAt;
      const minimumDistance = Math.max(44, Math.min(64, window.innerWidth * 0.13));
      clearClassicSwipe(event.pointerId);
      if (elapsed > 850 || Math.abs(deltaX) < minimumDistance || Math.abs(deltaX) <= Math.abs(deltaY) * 1.2) return;
      event.preventDefault();
      if (deltaX < 0) next();
      else previous();
    }

    function cancelClassicSwipe(event) {
      if (classicSwipeGesture?.pointerId === event.pointerId) clearClassicSwipe(event.pointerId);
    }

    function syncThemeButton() {
      const isPlayful = document.documentElement.dataset.theme === 'playful';
      settingsView.renderTheme(isPlayful);
    }

    function setTheme(theme) {
      theme = settingsController.setTheme(theme);
      if (theme === 'playful') document.documentElement.dataset.theme = 'playful';
      else delete document.documentElement.dataset.theme;
      settingsRepository.writeTheme(theme);
      syncThemeButton();
    }

    function setSettingsOpen(isOpen) {
      const wasOpen = settingsController.state.settingsOpen;
      isOpen = settingsController.setSettingsOpen(isOpen);
      settingsView.renderOpen(isOpen, wasOpen);
    }

    function handleSettingsPageTransitionEnd(event) {
      settingsView.handlePageTransitionEnd(event, settingsController.state.settingsOpen);
    }

    function setWordbookPanelOpen(isOpen) {
      isOpen = settingsController.setWordbookOpen(isOpen);
      wordbookView.renderOpen(isOpen);
    }

    function scrollExpandedStudyBook() {
      wordbookView.scrollExpanded(expandedStudyBookId);
    }

    function setExpandedStudyBook(bookId, isOpen) {
      wordbookController.setExpanded(bookId, isOpen);
      renderWordbookLists();
      updateStudySizeControls();
      if (expandedStudyBookId) window.setTimeout(scrollExpandedStudyBook, 80);
    }

    function stepStudySizeInput(direction) {
      const currentValue = normalizeStudySize(studySizeInput.value || (studySize === Infinity ? defaultStudySize : studySize));
      const numericValue = currentValue === Infinity ? defaultStudySize : currentValue;
      studySizeInput.value = String(normalizeStudySize(numericValue + direction * 5));
    }

    function applyCustomStudySize() {
      setStudySizePreference(studySizeInput.value);
    }

    function renderWordbookLists() {
      const model = window.PidanvocaViews.createWordbookPresentation({
        builtInBooks: BUILT_IN_BOOKS,
        customBooks,
        activeBuiltInBookId,
        activeCustomBookId,
        combinedWords: WORDS
      });
      wordbookView.render(model, expandedStudyBookId, bookWordCount);
    }

    async function selectBuiltInBook(bookId) {
      if (!isReady || isTransitioning || isImporting) return;
      isImporting = true;
      syncChrome();
      try {
        await ensureBuiltInBookWords(bookId);
      } catch (error) {
        isImporting = false;
        syncChrome();
        showImportStatus(error instanceof Error ? error.message : '词库加载失败，请稍后重试。', true);
        return;
      }
      const selection = wordbookController.selectBuiltIn(bookId);
      if (selection.type === 'missing') {
        isImporting = false;
        syncChrome();
        return;
      }
      const book = selection.book;
      if (selection.type === 'toggled') {
        renderWordbookLists();
        updateStudySizeControls();
        if (expandedStudyBookId) window.setTimeout(scrollExpandedStudyBook, 80);
        isImporting = false;
        syncChrome();
        return;
      }

      renderWordbookLists();
      shuffle();
      window.setTimeout(scrollExpandedStudyBook, 80);
      isImporting = false;
      syncChrome();
      refreshMemorySummary();

      const remembered = await queueRememberedSelection({
        builtInBookId: book.id,
        customBookId: null,
        fileNames: [book.fileName]
      });
      if (activeBuiltInBookId !== book.id) return;
      showImportStatus('已切换到“' + book.name + '”，共 ' + bookWordCount(book) + ' 个词条；请选择每组数量' + (remembered ? '' : '；浏览器未能保存本次选择'));
    }

    async function selectCustomBook(bookId) {
      if (!isReady || isTransitioning || isImporting) return;
      const selection = wordbookController.selectCustom(bookId);
      if (selection.type === 'missing') return;
      const book = selection.book;
      if (selection.type === 'toggled') {
        renderWordbookLists();
        updateStudySizeControls();
        if (expandedStudyBookId) window.setTimeout(scrollExpandedStudyBook, 80);
        return;
      }

      isImporting = true;
      renderWordbookLists();
      shuffle();
      window.setTimeout(scrollExpandedStudyBook, 80);
      isImporting = false;
      syncChrome();
      refreshMemorySummary();

      const remembered = await queueRememberedSelection({
        builtInBookId: null,
        customBookId: book.id,
        fileNames: [book.fileName]
      });
      if (activeCustomBookId !== book.id) return;
      showImportStatus('已切换到“' + book.name + '”，共 ' + bookWordCount(book) + ' 个词条；请选择每组数量' + (remembered ? '' : '；浏览器未能保存本次选择'));
    }

    async function deleteCustomBook(bookId) {
      if (!isReady || isTransitioning || isImporting) return;
      const book = customBooks.find((entry) => entry.id === bookId);
      if (!book) return;

      const isProjectBook = PROJECT_PERSONAL_BOOK_IDS.has(book.id);
      const warning = isProjectBook
        ? '确定从“我的单词本”中移除“' + book.name + '”吗？项目中的源文件不会被删除。'
        : '确定删除“' + book.name + '”吗？删除后需要重新导入才能恢复。';
      if (!window.confirm(warning)) return;

      isImporting = true;
      const deletion = wordbookController.deleteCustom(bookId);
      const wasActive = deletion.wasActive;
      if (wasActive) shuffle();
      renderWordbookLists();

      const activeBook = wordbookController.activeBook();
      const remembered = await rememberVocabulary({
        fileNames: activeBook ? [activeBook.fileName] : []
      });
      showImportStatus('已删除“' + book.name + '”' + (wasActive ? '，并切换到默认内置词库' : '') + (remembered ? '' : '；浏览器未能保存本次删除'));
      isImporting = false;
      syncChrome();
      refreshMemorySummary();
    }

    function speak() {
      if (!('speechSynthesis' in window)) return;
      window.speechSynthesis.cancel();
      const memoryItem = memoryIsOpen ? memoryCurrentItem() : null;
      const activeWord = memoryItem ? memoryItem.word : WORDS[deck[position]];
      if (!activeWord) return;
      const utterance = new SpeechSynthesisUtterance(activeWord.word);
      utterance.lang = 'en-US';
      utterance.rate = 0.88;
      window.speechSynthesis.speak(utterance);
    }

    const appEventScope = new window.PidanvocaAppEvents.EventScope();
    appEventScope.bind([
      { target: previousButton, type: 'click', listener: previous },
      { target: nextButton, type: 'click', listener: next },
      { target: deckStage, type: 'pointerdown', listener: startClassicSwipe },
      { target: deckStage, type: 'pointerup', listener: finishClassicSwipe },
      { target: deckStage, type: 'pointercancel', listener: cancelClassicSwipe },
      {
        target: document,
        type: 'visibilitychange',
        listener: () => {
          if (document.hidden) {
            cancelActiveCardTransition('document-hidden');
            window.clearTimeout(memorySummaryRefreshTimer);
            memorySummaryRefreshTimer = 0;
            return;
          }
          invalidateMemoryOverview();
          refreshMemorySummary();
        }
      },
      {
        target: window,
        type: 'pagehide',
        listener: () => {
          cancelActiveCardTransition('page-hidden');
          cancelImportTask();
          window.clearTimeout(memorySummaryRefreshTimer);
          memorySummaryRefreshTimer = 0;
        }
      },
      { target: themeButton, type: 'click', listener: () => setTheme(settingsController.toggleTheme()) },
      { target: app, type: 'transitionend', listener: handleSettingsPageTransitionEnd },
      {
        target: settingsButton,
        type: 'click',
        listener: () => setSettingsOpen(!settingsController.state.settingsOpen)
      },
      {
        target: wordbookButton,
        type: 'click',
        listener: () => setWordbookPanelOpen(!settingsController.state.wordbookOpen)
      },
      {
        target: memorySettingsButton,
        type: 'click',
        listener: () => setMemorySettingsOpen(!settingsController.state.memorySettingsOpen)
      }
    ]);
    memoryDailyNewInput.addEventListener('change', saveMemorySettings);
    memoryDailyPresets.addEventListener('click', (event) => {
      const button = event.target instanceof Element ? event.target.closest('[data-memory-daily]') : null;
      if (!(button instanceof HTMLButtonElement)) return;
      memoryDailyNewInput.value = button.dataset.memoryDaily;
      saveMemorySettings();
    });
    memoryDailyNewInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      saveMemorySettings();
    });
    memoryButton.addEventListener('click', () => {
      if (memoryIsOpen) closeMemoryReview();
      else openMemoryReview();
    });
    memoryReturnButton.addEventListener('click', closeMemoryReview);
    memoryModeButton.addEventListener('click', toggleMemoryStudyMode);
    memoryRevealButton.addEventListener('click', toggleMemoryAnswer);
    memorySoundButton.addEventListener('click', (event) => { event.stopPropagation(); speak(); });
    memoryCard.addEventListener('click', (event) => {
      if (!(event.target instanceof HTMLInputElement)) revealMemoryAnswer();
    });
    memoryAgainButton.addEventListener('click', () => rateMemoryCard(window.FSRS.Rating.Again));
    memoryGoodButton.addEventListener('click', () => rateMemoryCard(window.FSRS.Rating.Good));
    memoryUndoButton.addEventListener('click', undoMemoryRating);
    memorySpellingInput.addEventListener('input', () => checkMemorySpelling(false));
    memorySpellingInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      checkMemorySpelling(true);
    });
    memoryExportButton.addEventListener('click', exportMemoryProgress);
    memoryImportButton.addEventListener('click', () => memoryImportInput.click());
    memoryImportInput.addEventListener('change', () => importMemoryProgress(memoryImportInput.files && memoryImportInput.files[0]));
    memoryResetBookButton.addEventListener('click', () => resetMemoryProgress(activeMemoryBookId()));
    memoryResetAllButton.addEventListener('click', () => resetMemoryProgress(null));
    studySizePresets.addEventListener('click', (event) => {
      const option = event.target instanceof Element ? event.target.closest('[data-study-size]') : null;
      if (!(option instanceof HTMLButtonElement)) return;
      setStudySizePreference(option.dataset.studySize === 'all' ? Infinity : option.dataset.studySize);
    });
    studySizeDecrease.addEventListener('click', () => stepStudySizeInput(-1));
    studySizeIncrease.addEventListener('click', () => stepStudySizeInput(1));
    studySizeApply.addEventListener('click', applyCustomStudySize);
    studySizeDelete.addEventListener('click', () => {
      if (studySizeDelete.dataset.deleteBookId) deleteCustomBook(studySizeDelete.dataset.deleteBookId);
    });
    studySizeInput.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') return;
      event.preventDefault();
      applyCustomStudySize();
    });
    function handleWordbookOptionClick(event) {
      const option = event.target instanceof Element ? event.target.closest('.wordbook-option') : null;
      if (option instanceof HTMLButtonElement && option.dataset.bookId) {
        if (option.dataset.bookSource === 'combined') {
          setExpandedStudyBook(option.dataset.bookId, expandedStudyBookId !== option.dataset.bookId);
        } else if (option.dataset.bookSource === 'custom') {
          selectCustomBook(option.dataset.bookId);
        } else {
          selectBuiltInBook(option.dataset.bookId);
        }
      }
    }
    builtInWordbookList.addEventListener('click', handleWordbookOptionClick);
    customWordbookList.addEventListener('click', handleWordbookOptionClick);
    cardLayer.addEventListener('click', (event) => {
      if (!(event.target instanceof Element)) return;
      if (handleStackedCardAdvance(event)) return;
      if (event.target.closest('.study-mode-button')) {
        cycleStudyMode();
        return;
      }
      if (event.target.closest('.sound-button')) speak();
    });
    cardLayer.addEventListener('input', (event) => {
      if (event.target instanceof HTMLInputElement && event.target.matches('.card-spelling-input')) {
        checkSpellingInput(event.target);
      }
    });
    importButton.addEventListener('click', () => importInput.click());
    importInput.addEventListener('change', () => importBooks(Array.from(importInput.files || [])));
    shuffleButton.addEventListener('click', shuffle);
    studyCompleteContinue.addEventListener('click', continueAfterStudyComplete);
    studyCompleteAdjust.addEventListener('click', adjustStudySizeAfterComplete);

    window.addEventListener('keydown', (event) => {
      if (memoryIsOpen) {
        if (settingsController.state.settingsOpen) {
          if (event.key === 'Escape') {
            event.preventDefault();
            setSettingsOpen(false);
            settingsButton.focus();
          }
          return;
        }
        if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
          event.preventDefault();
          undoMemoryRating();
          return;
        }
        if (event.key === 'Escape') {
          event.preventDefault();
          closeMemoryReview();
          return;
        }
        const isMemoryInput = event.target instanceof HTMLInputElement;
        if (isMemoryInput) return;
        if (event.key === ' ' && !memoryRevealed) {
          event.preventDefault();
          revealMemoryAnswer();
          return;
        }
        if (event.key === '1' || event.key === 'ArrowLeft') {
          event.preventDefault();
          rateMemoryCard(window.FSRS.Rating.Again);
          return;
        }
        if (memoryStudyMode !== 'spelling' && (event.key === '2' || event.key === 'ArrowRight')) {
          event.preventDefault();
          rateMemoryCard(window.FSRS.Rating.Good);
          return;
        }
        return;
      }
      if (isStudyCompleteOpen && event.key === 'Tab') {
        completionView.trapTab(event, document.activeElement);
        return;
      }
      if (event.key === 'Escape' && isStudyCompleteOpen) {
        event.preventDefault();
        closeStudyComplete(true);
        return;
      }
      if (event.key === 'Escape' && settingsController.state.settingsOpen) {
        event.preventDefault();
        setSettingsOpen(false);
        settingsButton.focus();
        return;
      }
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const isTextEntry = event.target instanceof HTMLElement && Boolean(event.target.closest('input, textarea, [contenteditable="true"]'));
      if (isTextEntry) return;
      const isInteractive = event.target instanceof HTMLElement && Boolean(event.target.closest('button, input, a'));
      if (isInteractive && (event.key === ' ' || event.key === 'Enter')) return;
      if (event.key === 'ArrowRight' || event.key === ' ' || event.key === 'Enter') {
        event.preventDefault();
        next();
      } else if (event.key === 'ArrowLeft') {
        event.preventDefault();
        previous();
      } else if (event.key.toLowerCase() === 'r') {
        if (shuffleButton.disabled) return;
        event.preventDefault();
        shuffle();
      }
    });

    syncThemeButton();

    async function initializeVocabulary() {
      await loadBooksManifest();
      const rememberedVocabulary = await loadRememberedVocabulary();
      if (rememberedVocabulary) {
        WORDS = rememberedVocabulary.words;
        activeBuiltInBookId = rememberedVocabulary.builtInBookId;
        activeCustomBookId = rememberedVocabulary.customBookId;
        customBooks = rememberedVocabulary.customBooks;
        deletedProjectPersonalBookIds = rememberedVocabulary.deletedProjectPersonalBookIds;
      } else {
        const defaultBook = await ensureBuiltInBookWords(DEFAULT_BOOK.id);
        if (!defaultBook) throw new Error('默认词库不存在。');
        WORDS = defaultBook.words;
      }
      studySize = studySizePreferenceForBook(activeStudyBookKey());
      renderWordbookLists();
      await loadMemorySettings();
      isReady = true;
      shuffle();
      refreshMemorySummary();
    }

    initializeVocabulary().catch((error) => {
      if (!Array.isArray(DEFAULT_WORDS)) {
        showImportStatus(error instanceof Error ? error.message + ' 请检查网络后刷新重试。' : '词库加载失败，请刷新重试。', true, true);
        return;
      }
      WORDS = DEFAULT_WORDS;
      activeBuiltInBookId = DEFAULT_BOOK.id;
      activeCustomBookId = null;
      customBooks = PROJECT_PERSONAL_BOOKS.slice();
      deletedProjectPersonalBookIds = [];
      studySize = studySizePreferenceForBook(DEFAULT_BOOK.id);
      renderWordbookLists();
      isReady = true;
      shuffle();
      loadMemorySettings().finally(refreshMemorySummary);
    });
    function registerOnlineServiceWorker() {
      if (APP_BUILD_TARGET !== 'web' || !('serviceWorker' in navigator)) return;
      navigator.serviceWorker.register('./service-worker.js').then((registration) => {
        const announceUpdate = () => showImportStatus('发现新版本；完成当前学习后刷新页面即可更新。', false, true);
        if (registration.waiting && navigator.serviceWorker.controller) announceUpdate();
        registration.addEventListener('updatefound', () => {
          const worker = registration.installing;
          if (!worker) return;
          worker.addEventListener('statechange', () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) announceUpdate();
          });
        });
      }).catch(() => {
        // The online app remains usable when private browsing blocks Service Worker.
      });
    }
    window.addEventListener('load', registerOnlineServiceWorker, { once: true });
