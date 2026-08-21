# 发布与回滚

## 发布前检查

在干净的 `main` 分支执行：

```bash
npm ci
npm run release:check
```

`release:check` 会运行静态检查、85 项以上的 Node 测试、在线/离线构建、确定性构建、性能预算，以及桌面与移动端浏览器回归。检查通过后推送 `main`；CI 会上传 `dist/pages` 作为 GitHub Pages Artifact，并在质量任务成功后部署。

发布前同时确认：

- `git status --short` 只包含预期的源码与文档修改；`dist/` 不进入版本控制。
- 构建后的 `dist/web/data/books.manifest.json` 中词条数量、稳定 ID 和 hash 变化符合预期。
- 未设置 `INCLUDE_PERSONAL_WORDBOOKS=1`，生成文件中不包含私人词书。
- 涉及记忆数据格式时，先用页面导出一份 JSON 进度备份并验证可重新导入。

## 回滚应用版本

1. 在 GitHub Actions 中找到上一条成功的 Pages 部署及对应提交。
2. 使用 `git revert <bad-commit>` 创建反向提交，不重写 `main` 历史。
3. 运行 `npm run release:check`。
4. 推送反向提交，等待新的 Pages Artifact 部署完成。Service Worker 会发现新的内容版本；用户完成当前学习并刷新后切换。

构建产物不提交到仓库。若只是 Artifact 生成失败，修复构建或工作流后重新运行失败任务；不要手工修改 `dist/`。

## 数据兼容与恢复

- 当前数据库迁移只新增 store/索引，不删除旧记录；旧 `bookId` 和备份格式保持兼容。
- 不支持直接把已升级的 IndexedDB 降级到更低 schema。回滚代码前若新版本包含破坏性迁移，必须先提供向下兼容读取或让用户导出 JSON 备份。
- 存储显示 `temporarily-unavailable` 时先关闭其他标签页并重试；不要清空站点数据。
- 只有备份已经验证可导入时，才考虑清除损坏数据库并从 JSON 恢复。

## 紧急验证

回滚后至少手动确认：经典模式前后切卡、记忆模式评分与撤销、设置切换词书、导入一个小词书、在线按需加载，以及下载后的单文件离线启动。
