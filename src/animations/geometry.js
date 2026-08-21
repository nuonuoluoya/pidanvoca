(function attachAnimationGeometry(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root) {
    root.PidanvocaAnimations = Object.assign(
      {},
      root.PidanvocaAnimations || {},
      api,
    );
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createGeometryApi() {
    "use strict";

    function finiteNumber(value, fallback = 0) {
      const number = Number(value);
      return Number.isFinite(number) ? number : fallback;
    }

    function createExitPoint(viewport, random = Math.random) {
      const width = Math.max(1, finiteNumber(viewport?.width, 1));
      const height = Math.max(1, finiteNumber(viewport?.height, 1));
      const angle = Math.PI * (0.58 + random() * 0.84);
      const distance = Math.hypot(width, height) * 1.16;
      return Object.freeze({
        x: Math.round(Math.cos(angle) * distance),
        y: Math.round(Math.sin(angle) * distance),
        rotate: Math.round(-28 + random() * 56),
      });
    }

    function normalizeExitPoint(point) {
      return {
        x: Math.round(finiteNumber(point?.x)),
        y: Math.round(finiteNumber(point?.y)),
        rotate: Math.round(finiteNumber(point?.rotate)),
      };
    }

    function applyExitPoint(element, point) {
      const normalized = normalizeExitPoint(point);
      element.style.setProperty("--fly-x", `${normalized.x}px`);
      element.style.setProperty("--fly-y", `${normalized.y}px`);
      element.style.setProperty("--fly-rotate", `${normalized.rotate}deg`);
      element.dataset.flyX = String(normalized.x);
      element.dataset.flyY = String(normalized.y);
      element.dataset.flyRotate = String(normalized.rotate);
      return normalized;
    }

    function clearExitPoint(element) {
      element.style.removeProperty("--fly-x");
      element.style.removeProperty("--fly-y");
      element.style.removeProperty("--fly-rotate");
      delete element.dataset.flyX;
      delete element.dataset.flyY;
      delete element.dataset.flyRotate;
    }

    return Object.freeze({ createExitPoint, applyExitPoint, clearExitPoint });
  },
);
