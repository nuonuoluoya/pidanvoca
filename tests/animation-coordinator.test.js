const test = require("node:test");
const assert = require("node:assert/strict");
const {
  AnimationCoordinator,
  AnimationTransitionError,
} = require("../src/animations/animation-coordinator");

test("动画协调器按显式状态推进并回到 idle", () => {
  const observed = [];
  const coordinator = new AnimationCoordinator(({ state }) =>
    observed.push(state),
  );
  const transition = coordinator.begin("saving-rating", { mode: "memory" });

  transition.move("exiting-current");
  transition.move("advancing-stack");
  transition.move("revealing-incoming");
  assert.equal(transition.finish(), true);

  assert.equal(coordinator.state, "idle");
  assert.deepEqual(observed, [
    "saving-rating",
    "exiting-current",
    "advancing-stack",
    "revealing-incoming",
    "settling",
    "idle",
  ]);
});

test("活动过渡期间拒绝第二个过渡", () => {
  const coordinator = new AnimationCoordinator();
  const transition = coordinator.begin("exiting-current");

  assert.throws(
    () => coordinator.begin("undo-returning"),
    (error) =>
      error instanceof AnimationTransitionError &&
      error.code === "ANIMATION_IN_PROGRESS",
  );
  transition.cancel();
});

test("非法状态跳转被拒绝", () => {
  const coordinator = new AnimationCoordinator();
  const transition = coordinator.begin("saving-rating");

  assert.throws(
    () => transition.move("undo-returning"),
    (error) =>
      error instanceof AnimationTransitionError &&
      error.code === "INVALID_ANIMATION_TRANSITION",
  );
  transition.cancel();
});

test("旧 token 无法清理更新的动画", () => {
  const coordinator = new AnimationCoordinator();
  const first = coordinator.begin("exiting-current");
  first.cancel();
  const second = coordinator.begin("undo-returning");

  assert.equal(first.finish(), false);
  assert.equal(first.cancel(), false);
  assert.equal(second.isActive(), true);
  assert.equal(coordinator.state, "undo-returning");
  second.finish();
});

test("取消会中止 signal 并统一恢复 idle", () => {
  const coordinator = new AnimationCoordinator();
  const transition = coordinator.begin("exiting-current");

  assert.equal(transition.cancel("mode-changed"), true);
  assert.equal(transition.signal.aborted, true);
  assert.equal(transition.signal.reason, "mode-changed");
  assert.equal(coordinator.state, "idle");
});
