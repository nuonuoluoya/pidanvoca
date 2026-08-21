(function attachMemoryReviewView(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root)
    root.PidanvocaViews = Object.assign({}, root.PidanvocaViews || {}, api);
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createMemoryReviewViewApi() {
    "use strict";

    class MemoryReviewView {
      constructor({ panel, elements }) {
        this.panel = panel;
        this.elements = elements;
      }

      render(state) {
        const e = this.elements;
        e.complete.hidden = state.hasItem;
        e.card.hidden = !state.hasItem;
        e.ratingActions.hidden = !state.hasItem;
        e.progressText.textContent = state.progressText;
        e.progressFill.style.width = state.progressPercent + "%";
        e.queueText.textContent = state.queueText;
        if (!state.hasItem) {
          e.completeDetail.textContent = state.completeDetail;
          return;
        }

        e.card.classList.remove("is-revealed");
        e.card.classList.toggle("is-spelling", state.isSpelling);
        e.word.textContent = state.word;
        e.prompt.textContent = state.prompt;
        e.phonetic.textContent = state.phonetic;
        e.phonetic.hidden = !state.phonetic;
        e.meaning.textContent = state.meaning;
        e.note.textContent = state.note;
        e.note.hidden = !state.note;
        e.answer.hidden = true;
        e.spelling.hidden = !state.isSpelling;
        e.spellingInput.value = "";
        e.spellingInput.readOnly = false;
        e.spellingInput.classList.remove("is-correct");
        e.spellingFeedback.textContent = "";
        e.spellingFeedback.className = "memory-spelling-feedback";
        e.againInterval.textContent = state.againInterval;
        e.goodInterval.textContent = state.goodInterval;
      }

      clonePanel(...classNames) {
        const panel = this.panel.cloneNode(true);
        panel.querySelectorAll("[id]").forEach((element) => {
          element.dataset.memoryCloneId = element.id;
          element.removeAttribute("id");
        });
        panel.removeAttribute("role");
        panel.removeAttribute("aria-labelledby");
        panel.setAttribute("aria-hidden", "true");
        panel.classList.add(...classNames);
        return panel;
      }

      clonePart(panel, id) {
        return panel.querySelector('[data-memory-clone-id="' + id + '"]');
      }

      populateClone(panel, state) {
        const part = (id) => this.clonePart(panel, id);
        part("memoryComplete").hidden = state.hasItem;
        part("memoryCard").hidden = !state.hasItem;
        part("memoryRatingActions").hidden = !state.hasItem;
        part("memoryProgressText").textContent = state.progressText;
        part("memoryProgressFill").style.width = state.progressPercent + "%";
        part("memoryQueueText").textContent = state.queueText;
        if (!state.hasItem) {
          part("memoryCompleteDetail").textContent = state.completeDetail;
          return;
        }

        const card = part("memoryCard");
        card.classList.remove("is-revealed");
        card.classList.toggle("is-spelling", state.isSpelling);
        part("memoryCardWord").textContent = state.word;
        part("memoryCardPrompt").textContent = state.prompt;
        const phonetic = part("memoryAnswerPhonetic");
        phonetic.textContent = state.phonetic;
        phonetic.hidden = !state.phonetic;
        part("memoryAnswerMeaning").textContent = state.meaning;
        const note = part("memoryAnswerNote");
        note.textContent = state.note;
        note.hidden = !state.note;
        part("memoryAnswer").hidden = true;
        part("memorySpelling").hidden = !state.isSpelling;
        part("memoryAgainInterval").textContent = state.againInterval;
        part("memoryGoodInterval").textContent = state.goodInterval;
      }
    }

    return Object.freeze({ MemoryReviewView });
  },
);
