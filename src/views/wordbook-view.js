(function attachWordbookView(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root) {
    root.PidanvocaViews = Object.assign({}, root.PidanvocaViews || {}, api);
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createWordbookViewApi() {
    "use strict";

    function createWordbookPresentation({
      builtInBooks,
      customBooks,
      activeBuiltInBookId,
      activeCustomBookId,
      combinedWords,
    }) {
      const hasCombinedImport =
        !activeBuiltInBookId && !activeCustomBookId && combinedWords.length > 0;
      return {
        builtIn: builtInBooks.map((book) => ({
          book,
          source: "built-in",
          isActive: book.id === activeBuiltInBookId,
        })),
        custom: [
          ...(hasCombinedImport
            ? [
                {
                  book: {
                    id: "combined-import",
                    name: "合并生词本",
                    words: combinedWords,
                  },
                  source: "combined",
                  isActive: true,
                },
              ]
            : []),
          ...customBooks.map((book) => ({
            book,
            source: "custom",
            isActive: book.id === activeCustomBookId,
          })),
        ],
        showCustomSection: customBooks.length > 0 || hasCombinedImport,
      };
    }

    class WordbookView {
      constructor({
        document,
        button,
        panel,
        builtInList,
        customSection,
        customList,
        studySizePanel,
        deleteButton,
        reducedMotion,
      }) {
        this.document = document;
        this.button = button;
        this.panel = panel;
        this.builtInList = builtInList;
        this.customSection = customSection;
        this.customList = customList;
        this.studySizePanel = studySizePanel;
        this.deleteButton = deleteButton;
        this.reducedMotion = reducedMotion;
      }

      renderOpen(isOpen) {
        this.button.setAttribute("aria-expanded", String(isOpen));
        this.button.setAttribute(
          "aria-label",
          isOpen ? "隐藏单词本列表" : "显示单词本列表",
        );
        this.panel.hidden = !isOpen;
      }

      createOption(book, source, isActive, expandedId, wordCount) {
        const button = this.document.createElement("button");
        button.className = "wordbook-option";
        button.type = "button";
        button.dataset.bookId = book.id;
        button.dataset.bookSource = source;
        button.setAttribute("aria-pressed", String(isActive));
        button.setAttribute(
          "aria-expanded",
          String(isActive && expandedId === book.id),
        );
        button.setAttribute("aria-controls", "studySizePanel");
        button.setAttribute(
          "aria-label",
          `${isActive ? "当前单词本 " : "使用单词本 "}${book.name}，共 ${wordCount} 个词条${isActive ? "；点击设置每组数量" : ""}`,
        );

        const name = this.document.createElement("span");
        name.className = "wordbook-option__name";
        name.textContent = book.name;
        const count = this.document.createElement("span");
        count.className = "wordbook-option__count";
        count.textContent = `${wordCount} 词`;
        const chevron = this.document.createElementNS(
          "http://www.w3.org/2000/svg",
          "svg",
        );
        chevron.classList.add("wordbook-option__chevron");
        chevron.setAttribute("viewBox", "0 0 24 24");
        chevron.setAttribute("aria-hidden", "true");
        chevron.innerHTML = '<path d="m9 6 6 6-6 6"></path>';
        button.append(name, count, chevron);
        return button;
      }

      createOptionStack(item, expandedId, wordCount) {
        const { book, source, isActive } = item;
        const stack = this.document.createElement("div");
        stack.className = "wordbook-option-stack";
        stack.dataset.bookId = book.id;
        stack.append(
          this.createOption(book, source, isActive, expandedId, wordCount),
        );
        if (isActive && expandedId === book.id) {
          const canDelete = source === "custom";
          this.deleteButton.hidden = !canDelete;
          this.deleteButton.dataset.deleteBookId = canDelete ? book.id : "";
          this.deleteButton.setAttribute(
            "aria-label",
            canDelete ? `删除单词本 ${book.name}` : "删除当前单词本",
          );
          this.deleteButton.title = canDelete ? `删除“${book.name}”` : "";
          this.studySizePanel.hidden = false;
          stack.append(this.studySizePanel);
        }
        return stack;
      }

      render(model, expandedId, wordCountForBook) {
        this.studySizePanel.hidden = true;
        this.deleteButton.hidden = true;
        this.deleteButton.dataset.deleteBookId = "";
        const builtInFragment = this.document.createDocumentFragment();
        model.builtIn.forEach((item) => {
          builtInFragment.append(
            this.createOptionStack(
              item,
              expandedId,
              wordCountForBook(item.book),
            ),
          );
        });
        this.builtInList.replaceChildren(builtInFragment);

        const customFragment = this.document.createDocumentFragment();
        model.custom.forEach((item) => {
          customFragment.append(
            this.createOptionStack(
              item,
              expandedId,
              wordCountForBook(item.book),
            ),
          );
        });
        this.customList.replaceChildren(customFragment);
        this.customSection.hidden = !model.showCustomSection;
      }

      scrollExpanded(expandedId) {
        if (!expandedId) return;
        const stack = this.document.querySelector(
          `.wordbook-option-stack[data-book-id="${CSS.escape(expandedId)}"]`,
        );
        if (stack) {
          stack.scrollIntoView({
            block: "nearest",
            behavior: this.reducedMotion.matches ? "auto" : "smooth",
          });
        }
      }
    }

    return Object.freeze({ createWordbookPresentation, WordbookView });
  },
);
