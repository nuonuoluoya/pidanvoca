const test = require("node:test");
const assert = require("node:assert/strict");
const { EventScope } = require("../src/app/events");

test("事件作用域绑定多个监听器并统一解绑", () => {
  const scope = new EventScope();
  const target = new EventTarget();
  let count = 0;
  scope.bind([
    { target, type: "first", listener: () => (count += 1) },
    { target, type: "second", listener: () => (count += 10) },
  ]);
  target.dispatchEvent(new Event("first"));
  target.dispatchEvent(new Event("second"));
  assert.equal(count, 11);
  scope.clear();
  target.dispatchEvent(new Event("first"));
  assert.equal(count, 11);
});

test("缺少事件目标时立即报告绑定错误", () => {
  const scope = new EventScope();
  assert.throws(() => scope.on(null, "click", () => {}), /EventTarget/);
});
