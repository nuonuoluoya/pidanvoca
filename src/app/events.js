(function attachAppEvents(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root) root.PidanvocaAppEvents = api;
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createAppEventsApi() {
    "use strict";

    class EventScope {
      constructor() {
        this.cleanups = [];
      }

      on(target, type, listener, options) {
        if (!target || typeof target.addEventListener !== "function") {
          throw new TypeError(`Cannot bind ${type} without an EventTarget`);
        }
        target.addEventListener(type, listener, options);
        const cleanup = () =>
          target.removeEventListener(type, listener, options);
        this.cleanups.push(cleanup);
        return cleanup;
      }

      bind(bindings) {
        bindings.forEach(({ target, type, listener, options }) => {
          this.on(target, type, listener, options);
        });
        return () => this.clear();
      }

      clear() {
        this.cleanups
          .splice(0)
          .reverse()
          .forEach((cleanup) => cleanup());
      }
    }

    return Object.freeze({ EventScope });
  },
);
