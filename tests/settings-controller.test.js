const test = require("node:test");
const assert = require("node:assert/strict");
const { SettingsController } = require("../src/features/settings/controller");

test("设置控制器规范化并切换主题", () => {
  const controller = new SettingsController({ theme: "unknown" });
  assert.equal(controller.state.theme, "classic");
  assert.equal(controller.toggleTheme(), "playful");
  assert.equal(controller.toggleTheme(), "classic");
});

test("设置抽屉、词本和记忆设置拥有独立开合状态", () => {
  const controller = new SettingsController();
  controller.setSettingsOpen(true);
  controller.setWordbookOpen(true);
  controller.setMemorySettingsOpen(true);
  assert.deepEqual(controller.snapshot(), {
    theme: "classic",
    settingsOpen: true,
    wordbookOpen: true,
    memorySettingsOpen: true,
  });
});
