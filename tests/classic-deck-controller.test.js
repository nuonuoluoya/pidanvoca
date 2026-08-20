const test = require("node:test");
const assert = require("node:assert/strict");
const {
  ClassicDeckController,
} = require("../src/features/classic-deck/controller");

test("控制器重置时独占卡组、位置和首组状态", () => {
  const controller = new ClassicDeckController();
  controller.reset([2, 0, 1, 3], 2);
  assert.deepEqual(controller.snapshot(), {
    deck: [2, 0, 1, 3],
    position: 0,
    studyGroups: [{ start: 0, end: 2, requestedSize: 2 }],
    studyGroupIndex: 0,
    studyMode: "full",
  });
});

test("移动采用计划和提交两阶段，动画前不改变位置", () => {
  const controller = new ClassicDeckController();
  controller.reset([0, 1, 2], 3);
  const plan = controller.planMove(1);
  assert.equal(controller.state.position, 0);
  controller.prepareMove(plan);
  assert.equal(controller.state.position, 0);
  controller.commitMove(plan);
  assert.equal(controller.state.position, 1);
});

test("组末前进返回完成计划而不越界提交", () => {
  const controller = new ClassicDeckController();
  controller.reset([0, 1], 2);
  controller.state.position = 1;
  const plan = controller.planMove(1);
  assert.equal(plan.type, "complete");
  assert.equal(controller.commitMove(plan), false);
  assert.equal(controller.state.position, 1);
});

test("动画取消会恢复准备阶段修改的组索引", () => {
  const controller = new ClassicDeckController();
  controller.reset([0, 1, 2, 3], 2);
  controller.state.studyGroups.push({ start: 2, end: 4, requestedSize: 2 });
  controller.state.position = 1;
  const plan = controller.planMove(1);
  controller.prepareMove(plan);
  assert.equal(controller.state.studyGroupIndex, 1);
  controller.cancelMove();
  assert.equal(controller.state.studyGroupIndex, 0);
  assert.equal(controller.state.position, 1);
});

test("过渡适配绑定映射旧变量但状态仍由控制器持有", () => {
  const controller = new ClassicDeckController();
  const legacy = {};
  const uninstall = controller.installLegacyBindings(legacy);
  legacy.deck = [3, 2, 1];
  legacy.position = 2;
  legacy.studyMode = "spelling";
  assert.deepEqual(controller.state.deck, [3, 2, 1]);
  assert.equal(controller.state.position, 2);
  assert.equal(controller.state.studyMode, "spelling");
  uninstall();
  assert.equal("deck" in legacy, false);
});
