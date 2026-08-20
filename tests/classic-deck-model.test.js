const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createShuffledDeck,
  createStudyGroup,
  normalizeSpelling,
  studyGroupForPosition,
  studyProgress,
} = require("../src/features/classic-deck/model");

test("洗牌结果是完整且无重复的索引排列", () => {
  const choices = [0, 1, 0, 1];
  const deck = createShuffledDeck(5, () => choices.shift());
  assert.deepEqual(
    deck.slice().sort((left, right) => left - right),
    [0, 1, 2, 3, 4],
  );
  assert.equal(new Set(deck).size, 5);
});

test("洗牌拒绝越界随机索引", () => {
  assert.throws(() => createShuffledDeck(3, (max) => max), RangeError);
});

test("学习组支持固定数量和整轮模式", () => {
  assert.deepEqual(createStudyGroup(10, 3, 4), {
    start: 3,
    end: 7,
    requestedSize: 4,
  });
  assert.deepEqual(createStudyGroup(10, 3, Infinity), {
    start: 3,
    end: 10,
    requestedSize: Infinity,
  });
});

test("分组定位与水位进度在组内单调到达 100%", () => {
  const groups = [createStudyGroup(10, 0, 3), createStudyGroup(10, 3, 3)];
  assert.equal(studyGroupForPosition(groups, 1, 4), groups[1]);
  assert.equal(studyProgress(10, groups, 1, 3).progressValue, 0);
  assert.equal(studyProgress(10, groups, 1, 4).progressValue, 50);
  assert.equal(studyProgress(10, groups, 1, 5).progressValue, 100);
});

test("拼写比较统一大小写、首尾与连续空白", () => {
  assert.equal(normalizeSpelling("  Ice   Cream "), "ice cream");
});
