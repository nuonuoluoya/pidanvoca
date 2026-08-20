(function attachSettingsController(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PidanvocaSettings = Object.assign(
      {},
      root.PidanvocaSettings || {},
      api,
    );
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createSettingsControllerApi() {
    "use strict";

    class SettingsController {
      constructor(options = {}) {
        this.state = {
          theme: options.theme === "playful" ? "playful" : "classic",
          settingsOpen: false,
          wordbookOpen: false,
          memorySettingsOpen: false,
        };
      }

      setTheme(theme) {
        this.state.theme = theme === "playful" ? "playful" : "classic";
        return this.state.theme;
      }

      toggleTheme() {
        return this.setTheme(
          this.state.theme === "playful" ? "classic" : "playful",
        );
      }

      setSettingsOpen(isOpen) {
        this.state.settingsOpen = Boolean(isOpen);
        return this.state.settingsOpen;
      }

      setWordbookOpen(isOpen) {
        this.state.wordbookOpen = Boolean(isOpen);
        return this.state.wordbookOpen;
      }

      setMemorySettingsOpen(isOpen) {
        this.state.memorySettingsOpen = Boolean(isOpen);
        return this.state.memorySettingsOpen;
      }

      snapshot() {
        return Object.freeze({ ...this.state });
      }
    }

    return Object.freeze({ SettingsController });
  },
);
