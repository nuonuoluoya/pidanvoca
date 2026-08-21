(function attachWordbookController(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root) {
    root.PidanvocaWordbooks = Object.assign(
      {},
      root.PidanvocaWordbooks || {},
      api,
    );
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createWordbookControllerApi() {
    "use strict";

    function jsonFileName(fileName) {
      const normalized = String(fileName || "").trim() || "我的单词本.html";
      return /\.html?$/i.test(normalized)
        ? normalized.replace(/\.html?$/i, ".json")
        : /\.json$/i.test(normalized)
          ? normalized
          : normalized + ".json";
    }

    class WordbookController {
      constructor(options) {
        this.builtInBooks = options.builtInBooks;
        this.defaultBook = options.defaultBook;
        this.projectPersonalBookIds = options.projectPersonalBookIds;
        this.studySizeForBook = options.studySizeForBook;
        this.state = {
          words: options.defaultBook.words,
          activeBuiltInBookId: options.defaultBook.id,
          activeCustomBookId: null,
          customBooks: options.projectPersonalBooks.slice(),
          deletedProjectPersonalBookIds: [],
          studySize: options.studySizeForBook(options.defaultBook.id),
          expandedStudyBookId: null,
        };
      }

      activeBookKey() {
        return (
          this.state.activeBuiltInBookId ||
          this.state.activeCustomBookId ||
          "combined-import"
        );
      }

      activeBook() {
        if (this.state.activeBuiltInBookId) {
          return (
            this.builtInBooks.find(
              (book) => book.id === this.state.activeBuiltInBookId,
            ) || null
          );
        }
        return (
          this.state.customBooks.find(
            (book) => book.id === this.state.activeCustomBookId,
          ) || null
        );
      }

      setExpanded(bookId, isOpen) {
        this.state.expandedStudyBookId = isOpen ? bookId : null;
      }

      selectBuiltIn(bookId) {
        const book = this.builtInBooks.find((entry) => entry.id === bookId);
        if (!book) return Object.freeze({ type: "missing" });
        if (this.state.activeBuiltInBookId === book.id) {
          this.setExpanded(
            book.id,
            this.state.expandedStudyBookId !== book.id,
          );
          return Object.freeze({ type: "toggled", book });
        }
        this.state.words = book.words;
        this.state.activeBuiltInBookId = book.id;
        this.state.activeCustomBookId = null;
        this.state.studySize = this.studySizeForBook(book.id);
        this.state.expandedStudyBookId = book.id;
        return Object.freeze({ type: "selected", book });
      }

      selectCustom(bookId) {
        const book = this.state.customBooks.find(
          (entry) => entry.id === bookId,
        );
        if (!book) return Object.freeze({ type: "missing" });
        if (this.state.activeCustomBookId === book.id) {
          this.setExpanded(
            book.id,
            this.state.expandedStudyBookId !== book.id,
          );
          return Object.freeze({ type: "toggled", book });
        }
        this.state.words = book.words;
        this.state.activeBuiltInBookId = null;
        this.state.activeCustomBookId = book.id;
        this.state.studySize = this.studySizeForBook(book.id);
        this.state.expandedStudyBookId = book.id;
        return Object.freeze({ type: "selected", book });
      }

      storeImportedBooks(
        importedBooks,
        createCustomBookId,
        combinedWords = importedBooks.flatMap((book) => book.entries),
      ) {
        const bookMap = new Map(
          this.state.customBooks.map((book) => [book.id, book]),
        );
        const storedBooks = importedBooks.map((book) => {
          const sourceFileName = String(book.fileName || "").trim();
          const customBook = {
            formatVersion: 1,
            id: createCustomBookId(sourceFileName),
            name: sourceFileName.replace(/\.html?$/i, ""),
            fileName: jsonFileName(sourceFileName),
            sourceFileName,
            sourceFormat: "html",
            words: book.entries,
          };
          bookMap.set(customBook.id, customBook);
          return customBook;
        });
        this.state.customBooks = Array.from(bookMap.values());
        const restoredIds = new Set(storedBooks.map((book) => book.id));
        this.state.deletedProjectPersonalBookIds =
          this.state.deletedProjectPersonalBookIds.filter(
            (id) => !restoredIds.has(id),
          );
        this.state.words = combinedWords;
        this.state.activeBuiltInBookId = null;
        this.state.activeCustomBookId =
          storedBooks.length === 1 ? storedBooks[0].id : null;
        this.state.studySize = this.studySizeForBook(this.activeBookKey());
        this.state.expandedStudyBookId = this.activeBookKey();
        return storedBooks;
      }

      deleteCustom(bookId) {
        const book = this.state.customBooks.find(
          (entry) => entry.id === bookId,
        );
        if (!book) return Object.freeze({ type: "missing" });
        const wasActive = this.state.activeCustomBookId === book.id;
        this.state.customBooks = this.state.customBooks.filter(
          (entry) => entry.id !== book.id,
        );
        if (
          this.projectPersonalBookIds.has(book.id) &&
          !this.state.deletedProjectPersonalBookIds.includes(book.id)
        ) {
          this.state.deletedProjectPersonalBookIds.push(book.id);
        }
        if (wasActive) {
          this.state.words = this.defaultBook.words;
          this.state.activeBuiltInBookId = this.defaultBook.id;
          this.state.activeCustomBookId = null;
          this.state.studySize = this.studySizeForBook(this.defaultBook.id);
          this.state.expandedStudyBookId = null;
        }
        return Object.freeze({ type: "deleted", book, wasActive });
      }

      installLegacyBindings(target) {
        const controller = this;
        const propertyMap = {
          WORDS: "words",
          activeBuiltInBookId: "activeBuiltInBookId",
          activeCustomBookId: "activeCustomBookId",
          customBooks: "customBooks",
          deletedProjectPersonalBookIds: "deletedProjectPersonalBookIds",
          studySize: "studySize",
          expandedStudyBookId: "expandedStudyBookId",
        };
        Object.entries(propertyMap).forEach(([legacyName, stateName]) => {
          Object.defineProperty(target, legacyName, {
            configurable: true,
            enumerable: false,
            get: () => controller.state[stateName],
            set: (value) => {
              controller.state[stateName] = value;
            },
          });
        });
        return () => {
          Object.keys(propertyMap).forEach((name) => delete target[name]);
        };
      }
    }

    return Object.freeze({ WordbookController });
  },
);
