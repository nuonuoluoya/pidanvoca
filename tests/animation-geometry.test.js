const test = require("node:test");
const assert = require("node:assert/strict");
const {
  applyExitPoint,
  clearExitPoint,
  createExitPoint,
} = require("../src/animations/geometry");
const {
  afterTwoAnimationFrames,
  waitForElementTransition,
} = require("../src/animations/card-transition");

function createStyleTarget() {
  const values = new Map();
  return {
    dataset: {},
    style: {
      setProperty: (name, value) => values.set(name, value),
      removeProperty: (name) => values.delete(name),
      getPropertyValue: (name) => values.get(name) || "",
    },
  };
}

test("飞出点固定落在左半屏轨迹且支持确定性随机源", () => {
  const values = [0, 0.5];
  const point = createExitPoint({ width: 1280, height: 720 }, () =>
    values.shift(),
  );
  assert.ok(point.x < 0);
  assert.ok(Number.isFinite(point.y));
  assert.equal(point.rotate, 0);
  assert.ok(Math.hypot(point.x, point.y) > Math.hypot(1280, 720));
});

test("飞出几何应用与清理使用同一组 CSS 变量和数据属性", () => {
  const element = createStyleTarget();
  applyExitPoint(element, { x: -801.4, y: 230.6, rotate: -12.2 });
  assert.equal(element.style.getPropertyValue("--fly-x"), "-801px");
  assert.equal(element.style.getPropertyValue("--fly-y"), "231px");
  assert.equal(element.dataset.flyRotate, "-12");

  clearExitPoint(element);
  assert.equal(element.style.getPropertyValue("--fly-x"), "");
  assert.equal("flyRotate" in element.dataset, false);
});

test("过渡结束事件是主完成信号", async () => {
  const element = new EventTarget();
  const clock = {
    setTimeout: () => 17,
    clearTimeout: () => {},
  };
  const finished = waitForElementTransition(element, "transform", 500, clock);
  const event = new Event("transitionend");
  Object.defineProperty(event, "propertyName", { value: "transform" });
  element.dispatchEvent(event);
  await finished;
});

test("双帧调度不会在第一帧提前执行", () => {
  const queued = [];
  let calls = 0;
  afterTwoAnimationFrames(
    () => {
      calls += 1;
    },
    (callback) => queued.push(callback),
  );
  assert.equal(calls, 0);
  queued.shift()();
  assert.equal(calls, 0);
  queued.shift()();
  assert.equal(calls, 1);
});
