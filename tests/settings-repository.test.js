const test = require("node:test");
const assert = require("node:assert/strict");
const {
  createSettingsRepository,
  normalizeStudySize,
} = require("../src/services/storage/settings-repository");

function createStorage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    getItem: (key) => (values.has(key) ? values.get(key) : null),
    setItem: (key, value) => values.set(key, String(value)),
    values,
  };
}

function createRepository(storage) {
  return createSettingsRepository({
    storage,
    studySizeKey: "legacy-size",
    studySizesKey: "sizes-v2",
    themeKey: "theme",
    legacyBookIds: { "旧四级词本.html": "cet-4-vocabulary.html" },
    defaultStudySize: 30,
  });
}

test("学习数量标准化支持整轮并限制 5 到 500", () => {
  assert.equal(normalizeStudySize("all"), Infinity);
  assert.equal(normalizeStudySize(1), 5);
  assert.equal(normalizeStudySize(900), 500);
  assert.equal(normalizeStudySize("bad", 30), 30);
});

test("读取旧设置时迁移旧词本 ID 并恢复整轮值", () => {
  const storage = createStorage({
    "legacy-size": "20",
    "sizes-v2": JSON.stringify({ "旧四级词本.html": "all" }),
  });
  const repository = createRepository(storage);
  assert.equal(repository.readLegacyStudySize(), 20);
  assert.deepEqual(repository.readStudySizes(), {
    "cet-4-vocabulary.html": Infinity,
  });
});

test("写入设置可逆序列化 Infinity 并规范主题", () => {
  const storage = createStorage();
  const repository = createRepository(storage);
  assert.equal(
    repository.writeStudySizes({ book: Infinity, another: 42 }),
    true,
  );
  assert.deepEqual(JSON.parse(storage.values.get("sizes-v2")), {
    book: "all",
    another: 42,
  });
  repository.writeTheme("unknown");
  assert.equal(storage.values.get("theme"), "classic");
});

test("存储不可用时读取回退且写入报告失败", () => {
  const storage = {
    getItem: () => {
      throw new Error("denied");
    },
    setItem: () => {
      throw new Error("denied");
    },
  };
  const repository = createRepository(storage);
  assert.equal(repository.readLegacyStudySize(), 30);
  assert.deepEqual(repository.readStudySizes(), {});
  assert.equal(repository.writeStudySizes({ book: 20 }), false);
  assert.equal(repository.writeTheme("playful"), false);
});
