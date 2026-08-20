const assert = require("node:assert/strict");
const test = require("node:test");
const {
  createStorageRecoveryController,
  storageStates,
} = require("../src/services/storage/availability");

test("临时存储错误有限重试后恢复持久状态", async () => {
  const transitions = [];
  const controller = createStorageRecoveryController({
    onStateChange: ({ state }) => transitions.push(state),
  });
  let calls = 0;
  const result = await controller.run(() => {
    calls += 1;
    if (calls === 1) {
      const error = new Error("temporary");
      error.name = "UnknownError";
      throw error;
    }
    return "saved";
  });
  assert.equal(result, "saved");
  assert.equal(calls, 2);
  assert.deepEqual(transitions, [
    storageStates.retrying,
    storageStates.persistent,
  ]);
});

test("非瞬时错误不会重试或静默进入内存模式", async () => {
  const controller = createStorageRecoveryController();
  let calls = 0;
  await assert.rejects(
    controller.run(() => {
      calls += 1;
      throw new TypeError("invalid payload");
    }),
    /invalid payload/,
  );
  assert.equal(calls, 1);
  assert.equal(controller.state, storageStates.temporarilyUnavailable);
  assert.equal(controller.useVolatileWithUserConsent(false), false);
  assert.equal(controller.state, storageStates.temporarilyUnavailable);
  assert.equal(controller.useVolatileWithUserConsent(true), true);
  assert.equal(controller.state, storageStates.volatileWithUserConsent);
});

test("损坏状态与普通临时不可用保持可区分", () => {
  const controller = createStorageRecoveryController();
  const error = new Error("corrupt record");
  controller.markCorrupted(error);
  assert.equal(controller.state, storageStates.corrupted);
  assert.equal(controller.lastError, error);
});
