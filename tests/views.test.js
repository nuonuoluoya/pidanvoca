const test = require("node:test");
const assert = require("node:assert/strict");
const { createWordbookPresentation } = require("../src/views/wordbook-view");

test("词本视图模型区分内置、单本导入和合并导入", () => {
  const builtIn = [{ id: "built", name: "内置" }];
  const custom = [{ id: "custom", name: "我的" }];
  const selected = createWordbookPresentation({
    builtInBooks: builtIn,
    customBooks: custom,
    activeBuiltInBookId: "built",
    activeCustomBookId: null,
    combinedWords: [],
  });
  assert.equal(selected.builtIn[0].isActive, true);
  assert.equal(selected.custom[0].source, "custom");
  assert.equal(selected.showCustomSection, true);

  const combined = createWordbookPresentation({
    builtInBooks: builtIn,
    customBooks: [],
    activeBuiltInBookId: null,
    activeCustomBookId: null,
    combinedWords: [{ word: "alpha" }],
  });
  assert.equal(combined.custom[0].book.id, "combined-import");
  assert.equal(combined.custom[0].isActive, true);
  assert.equal(combined.showCustomSection, true);
});
