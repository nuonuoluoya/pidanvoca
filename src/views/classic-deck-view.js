(function attachClassicDeckView(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root)
    root.PidanvocaViews = Object.assign({}, root.PidanvocaViews || {}, api);
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createClassicDeckViewApi() {
    "use strict";

    const waterWaves = Array.from({ length: 6 }, (_, index) => {
      const names = ["six", "five", "four", "three", "two", "one"];
      return (
        '<svg class="card-water-progress__wave card-water-progress__wave--band card-water-progress__wave--band-' +
        names[index] +
        '" viewBox="0 0 1200 720" preserveAspectRatio="none"><path d="M0 14C50 2 100 2 150 14s100 12 150 0 100-12 150 0 100 12 150 0V720H0ZM600 14c50-12 100-12 150 0s100 12 150 0 100-12 150 0 100 12 150 0V720H600Z"/></svg>'
      );
    }).join("");

    class ClassicDeckView {
      constructor({
        document,
        cardLayer,
        getEntry,
        getProgress,
        getDeckLength,
        getGroupNumber,
        syncStudyModeButton,
        appendMeaningText,
        now = () => performance.now(),
      }) {
        this.document = document;
        this.cardLayer = cardLayer;
        this.getEntry = getEntry;
        this.getProgress = getProgress;
        this.getDeckLength = getDeckLength;
        this.getGroupNumber = getGroupNumber;
        this.syncStudyModeButton = syncStudyModeButton;
        this.appendMeaningText = appendMeaningText;
        this.now = now;
      }

      setCardOffset(card, offset) {
        const isCurrent = offset === 0;
        card.dataset.offset = String(offset);
        card.setAttribute("aria-hidden", String(!isCurrent));
        const heading = card.querySelector(".card-word");
        if (heading) heading.setAttribute("aria-level", isCurrent ? "1" : "2");
        card
          .querySelectorAll(
            ".sound-button, .dictionary-button, .study-mode-button, .card-spelling-input",
          )
          .forEach((control) => {
            control.tabIndex = isCurrent ? 0 : -1;
          });
      }

      createProgressCount(deckPosition) {
        const metrics = this.getProgress(deckPosition);
        const progress = this.document.createElement("div");
        progress.className = "card-progress-count";
        progress.setAttribute("aria-hidden", "true");
        const current = this.document.createElement("strong");
        current.textContent = metrics.current;
        const separator = this.document.createElement("span");
        separator.textContent = "/";
        const total = this.document.createElement("span");
        total.textContent = metrics.total;
        progress.append(current, separator, total);
        return progress;
      }

      createWaterProgress(deckPosition) {
        const metrics = this.getProgress(deckPosition);
        const progressValue = metrics.progressValue;
        const progressLabel =
          progressValue >= 100
            ? "100%"
            : progressValue >= 10
              ? Math.round(progressValue) + "%"
              : progressValue.toFixed(1) + "%";
        const water = this.document.createElement("div");
        water.className = "card-water-progress";
        water.setAttribute("role", "progressbar");
        water.setAttribute("aria-label", "学习进度");
        water.setAttribute("aria-valuemin", "0");
        water.setAttribute("aria-valuemax", "100");
        water.setAttribute(
          "aria-valuenow",
          String(Math.round(progressValue * 10) / 10),
        );
        water.setAttribute(
          "aria-valuetext",
          "第 " +
            this.getGroupNumber(metrics.group) +
            " 组，第 " +
            metrics.current +
            " 个，共 " +
            metrics.total +
            " 个；整个词本 " +
            this.getDeckLength() +
            " 个，完成 " +
            progressLabel,
        );
        water.style.setProperty("--water-level", progressValue + "%");
        water.style.setProperty("--wave-phase", -this.now() + "ms");
        water.innerHTML =
          '<div class="card-water-progress__fill" aria-hidden="true">' +
          waterWaves +
          "</div>";
        return water;
      }

      mountCardContent(card, deckPosition) {
        if (
          card.dataset.contentPosition === String(deckPosition) &&
          card.querySelector(".card-scroll")
        )
          return;
        const entry = this.getEntry(deckPosition);
        card.replaceChildren();
        card.dataset.contentPosition = String(deckPosition);
        const content = this.document.createElement("div");
        content.className = "card-scroll";
        content.append(this.createProgressCount(deckPosition));
        card.append(this.createWaterProgress(deckPosition), content);

        const wordRow = this.document.createElement("div");
        wordRow.className = "card-word-row";
        const heading = this.document.createElement("h2");
        heading.className = "card-word";
        heading.setAttribute("role", "heading");
        heading.textContent = entry.word;
        const sound = this.document.createElement("button");
        sound.className = "sound-button";
        sound.type = "button";
        sound.title = "朗读单词";
        sound.setAttribute("aria-label", "朗读 " + entry.word);
        sound.innerHTML =
          '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M11 5 6 9H2v6h4l5 4V5Z"></path><path d="M15.5 8.5a5 5 0 0 1 0 7"></path><path d="M18 6a8.5 8.5 0 0 1 0 12"></path></svg>';
        const dictionary = this.document.createElement("a");
        dictionary.className = "dictionary-button";
        dictionary.href =
          "https://dictionary.cambridge.org/dictionary/english/" +
          encodeURIComponent(
            entry.word.trim().toLowerCase().replace(/\s+/g, "-"),
          );
        dictionary.title = "在 Cambridge Dictionary 中查询";
        dictionary.setAttribute(
          "aria-label",
          "在 Cambridge Dictionary 中查询 " + entry.word,
        );
        dictionary.innerHTML =
          '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11a3 3 0 0 1 3 3v14a3 3 0 0 0-3-3H6.5A2.5 2.5 0 0 0 4 19.5v-14Z"></path><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H14v17a3 3 0 0 1 3-3h.5a2.5 2.5 0 0 1 2.5 2.5v-14Z"></path></svg>';
        const modeButton = this.document.createElement("button");
        modeButton.className = "study-mode-button";
        modeButton.type = "button";
        modeButton.innerHTML =
          '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true"><g class="study-mode-icon study-mode-icon--full"><path d="M5 6h14M5 12h14M5 18h10"></path></g><g class="study-mode-icon study-mode-icon--word"><path d="m7 18 3.4-12h3.2L17 18M8.5 14h7"></path></g><g class="study-mode-icon study-mode-icon--spelling"><path d="m5 16-.7 3.7L8 19l10.6-10.6-3-3L5 16Z"></path><path d="M4 21h16"></path></g></svg>';
        this.syncStudyModeButton(modeButton);
        const spellingForm = this.document.createElement("div");
        spellingForm.className = "card-spelling-form";
        const spellingInput = this.document.createElement("input");
        spellingInput.className = "card-spelling-input";
        spellingInput.type = "text";
        spellingInput.autocomplete = "off";
        spellingInput.autocapitalize = "none";
        spellingInput.spellcheck = false;
        spellingInput.setAttribute("aria-label", "输入当前单词");
        spellingForm.append(spellingInput);
        wordRow.append(heading, spellingForm, sound, dictionary, modeButton);
        content.append(wordRow);

        if (entry.phonetic)
          this.appendText(content, "p", "card-phonetic", entry.phonetic);
        if (entry.meaning) {
          const meaning = this.document.createElement("p");
          meaning.className = "card-meaning";
          this.appendMeaningText(meaning, entry.meaning);
          content.append(meaning);
        }
        if (entry.note) {
          const notes = this.document.createElement("section");
          notes.className = "card-notes";
          this.appendText(notes, "h3", "", "我的笔记");
          this.appendText(notes, "p", "", entry.note);
          content.append(notes);
        }
      }

      appendText(parent, tagName, className, value) {
        const element = this.document.createElement(tagName);
        if (className) element.className = className;
        element.textContent = value;
        parent.append(element);
        return element;
      }

      stripCardContent(card) {
        if (!card.childElementCount) return;
        card.replaceChildren();
        delete card.dataset.contentPosition;
      }

      resetCardFlightState(card) {
        card.className = "deck-card";
        ["--fly-x", "--fly-y", "--fly-rotate"].forEach((name) =>
          card.style.removeProperty(name),
        );
        delete card.dataset.flyX;
        delete card.dataset.flyY;
        delete card.dataset.flyRotate;
      }

      createCard(deckPosition, offset, includeContent = false) {
        const card = this.document.createElement("article");
        card.className = "deck-card";
        card.dataset.deckPosition = String(deckPosition);
        if (includeContent) this.mountCardContent(card, deckPosition);
        this.setCardOffset(card, offset);
        return card;
      }

      synchronize(center, positions, contentPositions = new Set([center])) {
        const existing = new Map(
          Array.from(this.cardLayer.querySelectorAll(".deck-card")).map(
            (card) => [Number(card.dataset.deckPosition), card],
          ),
        );
        return positions.map((deckPosition) => {
          const card =
            existing.get(deckPosition) ||
            this.createCard(deckPosition, deckPosition - center);
          this.resetCardFlightState(card);
          card.dataset.deckPosition = String(deckPosition);
          if (contentPositions.has(deckPosition))
            this.mountCardContent(card, deckPosition);
          else this.stripCardContent(card);
          this.setCardOffset(card, deckPosition - center);
          return card;
        });
      }

      bringCurrentForward(cards) {
        const currentCard = cards.find((card) => card.dataset.offset === "0");
        if (currentCard) this.cardLayer.append(currentCard);
      }
    }

    return Object.freeze({ ClassicDeckView });
  },
);
