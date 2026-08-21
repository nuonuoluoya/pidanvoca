(function attachClassicDeckController(root, factory) {
  const model =
    typeof module === "object" && module.exports
      ? require("./model")
      : root.PidanvocaClassicDeck;
  const api = factory(model);
  if (typeof module === "object" && module.exports) module.exports = api;
  else if (root) {
    root.PidanvocaClassicDeck = Object.assign(
      {},
      root.PidanvocaClassicDeck || {},
      api,
    );
  }
})(
  typeof globalThis !== "undefined" ? globalThis : this,
  function createControllerApi(model) {
    "use strict";

    class ClassicDeckController {
      constructor() {
        this.state = {
          deck: [],
          position: 0,
          studyGroups: [],
          studyGroupIndex: 0,
          studyMode: "full",
        };
        this.pendingMove = null;
      }

      reset(deck, studySize) {
        this.state.deck = deck.slice();
        this.state.position = 0;
        this.state.studyGroups = deck.length
          ? [model.createStudyGroup(deck.length, 0, studySize)]
          : [];
        this.state.studyGroupIndex = 0;
        this.pendingMove = null;
        return this.snapshot();
      }

      currentGroup() {
        return this.state.studyGroups[this.state.studyGroupIndex] || null;
      }

      planMove(direction) {
        if (this.pendingMove) {
          return Object.freeze({ type: "blocked", reason: "pending" });
        }
        const step = direction > 0 ? 1 : direction < 0 ? -1 : 0;
        if (!step)
          return Object.freeze({ type: "blocked", reason: "direction" });
        const target = this.state.position + step;
        if (target < 0)
          return Object.freeze({ type: "blocked", reason: "start" });
        const group = this.currentGroup();
        let groupIndex = this.state.studyGroupIndex;
        if (step > 0 && group && target >= group.end) {
          if (groupIndex < this.state.studyGroups.length - 1) groupIndex += 1;
          else return Object.freeze({ type: "complete", target });
        } else if (
          step < 0 &&
          group &&
          target < group.start &&
          groupIndex > 0
        ) {
          groupIndex -= 1;
        }
        if (target >= this.state.deck.length) {
          return Object.freeze({ type: "complete", target });
        }
        return Object.freeze({
          type: "move",
          target,
          groupIndex,
          direction: step,
        });
      }

      prepareMove(plan) {
        if (plan.type !== "move") return false;
        this.pendingMove = {
          plan,
          previousGroupIndex: this.state.studyGroupIndex,
        };
        this.state.studyGroupIndex = plan.groupIndex;
        return true;
      }

      commitMove(plan) {
        if (plan.type !== "move") return false;
        if (!this.pendingMove || this.pendingMove.plan !== plan) return false;
        this.state.position = plan.target;
        this.pendingMove = null;
        return true;
      }

      cancelMove() {
        if (!this.pendingMove) return false;
        this.state.studyGroupIndex = this.pendingMove.previousGroupIndex;
        this.pendingMove = null;
        return true;
      }

      setStudyMode(mode) {
        if (!["full", "word-only", "spelling"].includes(mode)) return false;
        this.state.studyMode = mode;
        return true;
      }

      snapshot() {
        return Object.freeze({
          ...this.state,
          deck: this.state.deck.slice(),
          studyGroups: this.state.studyGroups.slice(),
        });
      }

      installLegacyBindings(target) {
        const controller = this;
        const bindings = {
          deck: {
            get: () => controller.state.deck,
            set: (value) => {
              controller.state.deck = value;
            },
          },
          position: {
            get: () => controller.state.position,
            set: (value) => {
              controller.state.position = value;
            },
          },
          studyGroups: {
            get: () => controller.state.studyGroups,
            set: (value) => {
              controller.state.studyGroups = value;
            },
          },
          studyGroupIndex: {
            get: () => controller.state.studyGroupIndex,
            set: (value) => {
              controller.state.studyGroupIndex = value;
            },
          },
          studyMode: {
            get: () => controller.state.studyMode,
            set: (value) => {
              controller.setStudyMode(value);
            },
          },
        };
        Object.entries(bindings).forEach(([name, descriptor]) => {
          Object.defineProperty(target, name, {
            configurable: true,
            enumerable: false,
            ...descriptor,
          });
        });
        return () => {
          Object.keys(bindings).forEach((name) => delete target[name]);
        };
      }
    }

    return Object.freeze({ ClassicDeckController });
  },
);
