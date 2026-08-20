(function attachCardTransition(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PidanvocaAnimations = Object.assign(
      {},
      root.PidanvocaAnimations || {},
      api,
    );
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createTransitionApi() {
    "use strict";

    function waitForElementTransition(
      element,
      propertyName,
      fallbackMilliseconds,
      clock = globalThis,
    ) {
      return new Promise((resolve) => {
        let settled = false;
        let fallbackTimer = 0;
        const finish = () => {
          if (settled) return;
          settled = true;
          element.removeEventListener("transitionend", handleTransitionEnd);
          element.removeEventListener("transitioncancel", finish);
          clock.clearTimeout(fallbackTimer);
          resolve();
        };
        const handleTransitionEnd = (event) => {
          if (event.target === element && event.propertyName === propertyName) {
            finish();
          }
        };
        element.addEventListener("transitionend", handleTransitionEnd);
        element.addEventListener("transitioncancel", finish);
        fallbackTimer = clock.setTimeout(
          finish,
          Math.max(0, Number(fallbackMilliseconds) || 0),
        );
      });
    }

    function afterTwoAnimationFrames(
      callback,
      frame = globalThis.requestAnimationFrame,
    ) {
      frame(() => frame(callback));
    }

    return Object.freeze({ waitForElementTransition, afterTwoAnimationFrames });
  },
);
