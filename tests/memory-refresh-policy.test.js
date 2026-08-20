const assert = require("node:assert/strict");
const test = require("node:test");
const {
  nextRefreshDelay,
  hasSignificantClockRollback,
} = require("../src/features/memory-review/refresh-policy");

test("summary refresh waits for the next due boundary", () => {
  const now = 1_000_000;
  assert.equal(nextRefreshDelay(now, now + 60_000), 60_250);
});

test("summary refresh respects minimum and maximum intervals", () => {
  const now = 1_000_000;
  assert.equal(nextRefreshDelay(now, now + 1_000), 15_000);
  assert.equal(nextRefreshDelay(now, now + 600_000), 300_000);
  assert.equal(nextRefreshDelay(now, null), 300_000);
});

test("clock rollback detection ignores ordinary clock drift", () => {
  const previous = 2_000_000;
  assert.equal(hasSignificantClockRollback(previous, previous - 60_000), false);
  assert.equal(hasSignificantClockRollback(previous, previous - 300_001), true);
});
