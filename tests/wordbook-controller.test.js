const test = require("node:test");
const assert = require("node:assert/strict");
const { WordbookController } = require("../src/features/wordbooks/controller");

function createController() {
  const builtInBooks = [
    {
      id: "default.html",
      name: "默认",
      fileName: "default.html",
      words: [{ word: "one" }],
    },
    {
      id: "second.html",
      name: "第二本",
      fileName: "second.html",
      words: [{ word: "two" }],
    },
  ];
  return new WordbookController({
    builtInBooks,
    defaultBook: builtInBooks[0],
    projectPersonalBooks: [
      {
        id: "custom:project",
        name: "项目词本",
        fileName: "project.html",
        words: [{ word: "three" }],
      },
    ],
    projectPersonalBookIds: new Set(["custom:project"]),
    studySizeForBook: (bookId) => (bookId === "second.html" ? 20 : 30),
  });
}

test("选择内置词本原子更新词条、活动 ID 和学习数量", () => {
  const controller = createController();
  const result = controller.selectBuiltIn("second.html");
  assert.equal(result.type, "selected");
  assert.equal(controller.state.words[0].word, "two");
  assert.equal(controller.state.activeBuiltInBookId, "second.html");
  assert.equal(controller.state.activeCustomBookId, null);
  assert.equal(controller.state.studySize, 20);
});

test("重复点击当前词本只切换展开状态", () => {
  const controller = createController();
  assert.equal(controller.selectBuiltIn("default.html").type, "toggled");
  assert.equal(controller.state.expandedStudyBookId, "default.html");
  controller.selectBuiltIn("default.html");
  assert.equal(controller.state.expandedStudyBookId, null);
});

test("多个导入词本合并词条并保持单本与合并身份规则", () => {
  const controller = createController();
  controller.storeImportedBooks(
    [
      { fileName: "a.html", entries: [{ word: "a" }] },
      { fileName: "b.html", entries: [{ word: "b" }] },
    ],
    (fileName) => `custom:${fileName}`,
  );
  assert.deepEqual(
    controller.state.words.map((word) => word.word),
    ["a", "b"],
  );
  assert.equal(controller.activeBookKey(), "combined-import");
  assert.equal(controller.state.activeCustomBookId, null);
});

test("删除活动项目词本时记录隐藏并回退默认词本", () => {
  const controller = createController();
  controller.selectCustom("custom:project");
  const result = controller.deleteCustom("custom:project");
  assert.equal(result.wasActive, true);
  assert.equal(controller.state.activeBuiltInBookId, "default.html");
  assert.deepEqual(controller.state.deletedProjectPersonalBookIds, [
    "custom:project",
  ]);
});

test("兼容绑定把旧运行时字段映射到唯一状态所有者", () => {
  const controller = createController();
  const legacy = {};
  const uninstall = controller.installLegacyBindings(legacy);
  legacy.WORDS = [{ word: "bound" }];
  legacy.studySize = 50;
  assert.equal(controller.state.words[0].word, "bound");
  assert.equal(controller.state.studySize, 50);
  uninstall();
  assert.equal("WORDS" in legacy, false);
});
