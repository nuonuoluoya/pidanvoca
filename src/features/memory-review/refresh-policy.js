(function attachMemoryRefreshPolicy(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PidanvocaMemoryRefresh = Object.assign(
      {},
      root.PidanvocaMemoryRefresh || {},
      api,
    );
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createMemoryRefreshPolicyApi() {
    "use strict";

    const defaultMinimumDelay = 15_000;
    const defaultMaximumDelay = 5 * 60_000;
    const dueBoundaryPadding = 250;

    function nextRefreshDelay(
      now,
      nextDue,
      minimumDelay = defaultMinimumDelay,
      maximumDelay = defaultMaximumDelay,
    ) {
      const currentTime = Number(now);
      const dueTime = Number(nextDue);
      const minimum = Math.max(0, Number(minimumDelay) || 0);
      const maximum = Math.max(minimum, Number(maximumDelay) || minimum);
      const untilNextDue =
        Number.isFinite(dueTime) && dueTime > currentTime
          ? dueTime - currentTime + dueBoundaryPadding
          : maximum;
      return Math.max(minimum, Math.min(maximum, untilNextDue));
    }

    function hasSignificantClockRollback(
      previousTime,
      currentTime,
      tolerance = 5 * 60_000,
    ) {
      return Number(currentTime) < Number(previousTime) - Number(tolerance);
    }

    return Object.freeze({
      defaultMinimumDelay,
      defaultMaximumDelay,
      nextRefreshDelay,
      hasSignificantClockRollback,
    });
  },
);
