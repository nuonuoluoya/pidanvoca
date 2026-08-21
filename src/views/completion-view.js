(function attachCompletionView(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root) {
    root.PidanvocaViews = Object.assign({}, root.PidanvocaViews || {}, api);
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createCompletionViewApi() {
    "use strict";

    class CompletionView {
      constructor({
        window,
        backdrop,
        title,
        score,
        detail,
        continueButton,
        adjustButton,
      }) {
        this.window = window;
        this.backdrop = backdrop;
        this.title = title;
        this.score = score;
        this.detail = detail;
        this.continueButton = continueButton;
        this.adjustButton = adjustButton;
        this.timer = 0;
        this.visible = false;
      }

      show({
        isRoundComplete,
        groupTotal,
        remaining,
        deckTotal,
        nextGroupTotal,
      }) {
        this.window.clearTimeout(this.timer);
        this.title.textContent = isRoundComplete
          ? "这一轮，收下了"
          : "这一组，收下了";
        this.score.textContent = `${groupTotal} / ${groupTotal}`;
        this.detail.textContent = isRoundComplete
          ? `已完成本词本的 ${deckTotal} 个单词，可以重新随机开始。`
          : `词本中还有 ${remaining} 个单词未出现。`;
        this.continueButton.textContent = isRoundComplete
          ? "随机开始新一轮"
          : `再来 ${nextGroupTotal} 词`;
        this.backdrop.hidden = false;
        this.visible = true;
        this.window.requestAnimationFrame(() =>
          this.backdrop.classList.add("is-visible"),
        );
        this.window.setTimeout(() => this.continueButton.focus(), 80);
      }

      hide() {
        this.window.clearTimeout(this.timer);
        this.visible = false;
        this.backdrop.classList.remove("is-visible");
        this.timer = this.window.setTimeout(() => {
          if (!this.visible) this.backdrop.hidden = true;
        }, 230);
      }

      trapTab(event, activeElement) {
        const buttons = [this.continueButton, this.adjustButton];
        const currentIndex = buttons.indexOf(activeElement);
        const nextIndex = event.shiftKey
          ? currentIndex <= 0
            ? buttons.length - 1
            : currentIndex - 1
          : currentIndex >= buttons.length - 1
            ? 0
            : currentIndex + 1;
        event.preventDefault();
        buttons[nextIndex].focus();
      }
    }

    return Object.freeze({ CompletionView });
  },
);
