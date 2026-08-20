(function attachAnimationCoordinator(root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  if (root) root.PidanvocaAnimations = api;
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createAnimationApi() {
    "use strict";

    const transitions = Object.freeze({
      idle: new Set([
        "saving-rating",
        "exiting-current",
        "undo-returning",
        "closing-memory",
      ]),
      "saving-rating": new Set(["exiting-current", "cancelled"]),
      "exiting-current": new Set([
        "advancing-stack",
        "revealing-incoming",
        "settling",
        "cancelled",
      ]),
      "advancing-stack": new Set([
        "revealing-incoming",
        "settling",
        "cancelled",
      ]),
      "revealing-incoming": new Set(["settling", "cancelled"]),
      "undo-returning": new Set(["settling", "cancelled"]),
      "closing-memory": new Set(["returning-classic", "settling", "cancelled"]),
      "returning-classic": new Set(["settling", "cancelled"]),
      settling: new Set(["idle", "cancelled"]),
      cancelled: new Set(["idle"]),
    });

    class AnimationTransitionError extends Error {
      constructor(message, code) {
        super(message);
        this.name = "AnimationTransitionError";
        this.code = code;
      }
    }

    class AnimationCoordinator {
      constructor(onStateChange = null) {
        this.state = "idle";
        this.sequence = 0;
        this.active = null;
        this.onStateChange =
          typeof onStateChange === "function" ? onStateChange : null;
      }

      get isIdle() {
        return this.state === "idle";
      }

      begin(initialState, metadata = null) {
        if (!this.isIdle) {
          throw new AnimationTransitionError(
            `Cannot start ${initialState} while ${this.state} is active.`,
            "ANIMATION_IN_PROGRESS",
          );
        }
        const id = ++this.sequence;
        const controller = new AbortController();
        this.active = { id, controller, metadata };
        this.move(id, initialState);
        return Object.freeze({
          id,
          signal: controller.signal,
          move: (nextState) => this.move(id, nextState),
          finish: () => this.finish(id),
          cancel: (reason) => this.cancel(id, reason),
          isActive: () => this.isActive(id),
        });
      }

      isActive(id) {
        return Boolean(this.active && this.active.id === id);
      }

      move(id, nextState) {
        if (!this.isActive(id)) return false;
        const allowed = transitions[this.state];
        if (!allowed || !allowed.has(nextState)) {
          throw new AnimationTransitionError(
            `Invalid animation transition: ${this.state} -> ${nextState}.`,
            "INVALID_ANIMATION_TRANSITION",
          );
        }
        const previousState = this.state;
        this.state = nextState;
        this.onStateChange?.({
          id,
          previousState,
          state: nextState,
          metadata: this.active.metadata,
        });
        return true;
      }

      finish(id) {
        if (!this.isActive(id)) return false;
        if (this.state !== "settling") this.move(id, "settling");
        this.move(id, "idle");
        this.active = null;
        return true;
      }

      cancel(id, reason = "cancelled") {
        if (!this.isActive(id)) return false;
        const active = this.active;
        if (this.state !== "cancelled") this.move(id, "cancelled");
        active.controller.abort(reason);
        this.move(id, "idle");
        this.active = null;
        return true;
      }

      cancelActive(reason = "cancelled") {
        return this.active ? this.cancel(this.active.id, reason) : false;
      }
    }

    return Object.freeze({
      AnimationCoordinator,
      AnimationTransitionError,
      states: Object.freeze(Object.keys(transitions)),
    });
  },
);
