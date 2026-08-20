(function attachStorageAvailability(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) {
    root.PidanvocaStorage = Object.assign({}, root.PidanvocaStorage || {}, api);
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createStorageAvailabilityApi() {
    "use strict";

    const storageStates = Object.freeze({
      persistent: "persistent",
      retrying: "retrying",
      temporarilyUnavailable: "temporarily-unavailable",
      volatileWithUserConsent: "volatile-with-user-consent",
      corrupted: "corrupted",
    });

    const retryableErrorNames = new Set([
      "AbortError",
      "InvalidStateError",
      "NotReadableError",
      "TimeoutError",
      "TransactionInactiveError",
      "UnknownError",
    ]);

    function defaultRetryable(error) {
      return retryableErrorNames.has(error?.name);
    }

    function createStorageRecoveryController({
      maxAttempts = 2,
      retryDelay = () => Promise.resolve(),
      isRetryable = defaultRetryable,
      onStateChange = () => {},
    } = {}) {
      const attempts = Math.max(1, Math.trunc(Number(maxAttempts)) || 1);
      let state = storageStates.persistent;
      let lastError = null;

      function transition(nextState, error = null) {
        state = nextState;
        lastError = error;
        onStateChange({ state, error });
      }

      async function run(operation, { beforeRetry = () => {} } = {}) {
        for (let attempt = 1; attempt <= attempts; attempt += 1) {
          try {
            const result = await operation(attempt);
            transition(storageStates.persistent);
            return result;
          } catch (error) {
            const canRetry = attempt < attempts && isRetryable(error);
            if (!canRetry) {
              transition(storageStates.temporarilyUnavailable, error);
              throw error;
            }
            transition(storageStates.retrying, error);
            await beforeRetry(error, attempt);
            await retryDelay(attempt);
          }
        }
        throw new Error("Storage retry loop exhausted");
      }

      function useVolatileWithUserConsent(consent) {
        if (consent !== true) return false;
        transition(storageStates.volatileWithUserConsent, lastError);
        return true;
      }

      function markCorrupted(error) {
        transition(storageStates.corrupted, error);
      }

      return Object.freeze({
        run,
        useVolatileWithUserConsent,
        markCorrupted,
        get state() {
          return state;
        },
        get lastError() {
          return lastError;
        },
      });
    }

    return Object.freeze({
      storageStates,
      defaultRetryable,
      createStorageRecoveryController,
    });
  },
);
