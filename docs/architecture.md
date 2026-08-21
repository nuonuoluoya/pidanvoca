# Pidanvoca 架构

Pidanvoca 保持原生 JavaScript 和静态托管，不依赖应用框架或后端。`build-vocabulary.js` 是兼容构建入口；业务状态与副作用已按功能边界迁移到 `src/`，生成页面只通过这些公开接口编排。

## 运行时模块边界

`src/app/runtime-dependencies.mjs` 是应用模块的唯一组合入口。esbuild 通过 ESM 导入业务模块，`bundle-entry.js` 只在启动 `bootstrap.js` 期间提供唯一的 `PidanvocaRuntime` 依赖对象，随后立即删除它。旧的 `window.Pidanvoca*`、`window.MemoryCurveCore` 和 `window.FSRS` 等公开命名空间不再创建；应用闭包继续持有同一组依赖，因此在线版和离线版不会依赖可变的全局模块对象。

旧页面运行时变量目前仍以不可枚举属性映射到各 Controller 的单一状态，用于兼容尚未完全改写的启动编排。它们不是公开 API，后续删除时应按状态域逐项迁移并保持现有浏览器契约。

## 状态所有权

- `ClassicDeckController` 独占随机卡组、当前位置、学习组和待提交移动。
- `MemoryReviewController` 独占复习队列、评分锁、统计和连续撤销历史。
- `AnimationCoordinator` 独占活动动画 token 与 phase；经典和记忆模式共享同一过渡生命周期。
- `WordbookController` 独占活动词书、合并视图和自定义词书状态。
- `SettingsController` 独占主题与设置面板开合状态。
- `EventScope` 集中注册并释放页面事件，避免重复监听。

DOM 仍由页面视图适配层渲染，但不得直接修改上述控制器的内部字段。旧运行时变量只通过兼容绑定映射到同一状态所有者。

## 数据与存储

`ReviewRepository`、`WordbookRepository` 和 `SettingsRepository` 是 IndexedDB/localStorage 的唯一业务入口。数据库升级按 `src/services/storage/migrations/v*.js` 顺序执行；评分卡和日志在同一事务中提交。

存储状态为：

```text
persistent → retrying → persistent
                    ↘ temporarily-unavailable
                       ↘ volatile-with-user-consent
corrupted
```

瞬时错误只有限重试。无法恢复时不会静默写入内存；用户确认临时会话后才允许继续评分。

## 导入边界

主线程使用 DOM 读取固定表格字段；Worker 负责字段规范化、长度校验、去重和合并。协议包含任务 ID、进度、取消和错误返回，旧任务不能覆盖新导入。文件数量、字节数、单本及总词条数都在处理前或处理中受限。

## 构建产物

- `dist/web/index.html`：在线壳；全部内置词书从 `dist/web/data/books.manifest.json` 按需加载。
- `dist/web/service-worker.js`：以内容 hash 版本化缓存，不在学习中途强制激活。
- `dist/offline/vocabulary-flashcards.html`：包含全部源码、依赖和内置词书的单文件离线版。
- `dist/pages/`：CI 构建的 GitHub Pages Artifact，包含在线站点和 `downloads/` 离线下载。

在线和离线产物共享全部业务源码。构建为脚本与样式生成 SHA-256 CSP 白名单，词书 JSON 中的 `<` 会被转义。

## 质量门禁

- Node 单元/集成测试覆盖纯逻辑、状态机、Repository、迁移、导入与构建契约。
- Playwright 覆盖桌面、移动端、reduced-motion、在线按需加载和 `file://` 离线启动。
- ESLint、Prettier、JSDoc 类型检查和可复现生成文件检查在 CI 中执行。
- `performance-budgets.json` 约束产物体积、20,000 词洗牌、50,000 词导入以及可见卡片 DOM 数。
- 浏览器启动契约额外断言旧模块命名空间不会残留在 `window` 上。
