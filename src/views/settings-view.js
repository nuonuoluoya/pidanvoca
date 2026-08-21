(function attachSettingsView(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PidanvocaViews = Object.assign({}, root.PidanvocaViews || {}, api);
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createSettingsViewApi() {
    "use strict";

    class SettingsView {
      constructor({
        window,
        document,
        app,
        button,
        drawer,
        themeButton,
        themeMeta,
      }) {
        this.window = window;
        this.document = document;
        this.app = app;
        this.button = button;
        this.drawer = drawer;
        this.themeButton = themeButton;
        this.themeMeta = themeMeta;
        this.shadowTimer = 0;
      }

      renderTheme(isPlayful) {
        this.themeButton.setAttribute("aria-pressed", String(isPlayful));
        this.themeButton.setAttribute(
          "aria-label",
          isPlayful ? "恢复经典主题" : "启用童趣主题",
        );
        this.themeButton.title = isPlayful ? "恢复经典主题" : "启用童趣主题";
        if (this.themeMeta) {
          this.themeMeta.content = isPlayful ? "#78c7ed" : "#edf4fc";
        }
      }

      renderOpen(isOpen, wasOpen) {
        this.window.clearTimeout(this.shadowTimer);
        this.shadowTimer = 0;
        if (isOpen) {
          this.document.body.classList.remove("settings-closing");
        } else if (wasOpen) {
          this.document.body.classList.add("settings-closing");
          this.shadowTimer = this.window.setTimeout(
            () => this.releaseClosingShadow(),
            900,
          );
        }
        this.document.body.classList.toggle("settings-open", isOpen);
        this.button.setAttribute("aria-expanded", String(isOpen));
        this.button.setAttribute(
          "aria-label",
          isOpen ? "关闭设置" : "打开设置",
        );
        this.button.title = isOpen ? "关闭设置" : "打开设置";
        this.drawer.setAttribute("aria-hidden", String(!isOpen));
        this.drawer.inert = !isOpen;
      }

      releaseClosingShadow() {
        this.window.clearTimeout(this.shadowTimer);
        this.shadowTimer = 0;
        this.document.body.classList.remove("settings-closing");
      }

      handlePageTransitionEnd(event, isOpen) {
        if (
          event.target !== this.app ||
          event.propertyName !== "transform" ||
          isOpen
        ) {
          return;
        }
        this.releaseClosingShadow();
      }
    }

    return Object.freeze({ SettingsView });
  },
);
