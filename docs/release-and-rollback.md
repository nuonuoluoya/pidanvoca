# 发布与回滚

## 发布前检查

在干净的 `main` 分支执行：

```bash
npm ci
npm run release:check
```

`release:check` 会运行静态检查、85 项以上的 Node 测试、在线/离线构建、性能预算、桌面与移动端浏览器回归，并确认生成文件已经提交。检查通过后推送 `main`；GitHub Pages 继续从仓库入口 `index.html` 打开在线产物。

发布前同时确认：

- `git status --short` 为空。
- `data/books.manifest.json` 的词条数量、稳定 ID 和 hash 变化符合预期。
- 未设置 `INCLUDE_PERSONAL_WORDBOOKS=1`，生成文件中不包含私人词书。
- 涉及记忆数据格式时，先用页面导出一份 JSON 进度备份并验证可重新导入。

## 回滚应用版本

1. 在 GitHub 中找到上一条通过 CI 的提交。
2. 使用 `git revert <bad-commit>` 创建反向提交，不重写 `main` 历史。
3. 运行 `npm run release:check`。
4. 推送反向提交。Service Worker 会发现新的内容版本；用户完成当前学习并刷新后切换。

若只是生成文件漏提交，重新运行 `npm run build` 并提交产物，不要手工修改 `dist/` 或根目录单文件。

## 数据兼容与恢复

- 当前数据库迁移只新增 store/索引，不删除旧记录；旧 `bookId` 和备份格式保持兼容。
- 不支持直接把已升级的 IndexedDB 降级到更低 schema。回滚代码前若新版本包含破坏性迁移，必须先提供向下兼容读取或让用户导出 JSON 备份。
- 存储显示 `temporarily-unavailable` 时先关闭其他标签页并重试；不要清空站点数据。
- 只有备份已经验证可导入时，才考虑清除损坏数据库并从 JSON 恢复。

## 紧急验证

回滚后至少手动确认：经典模式前后切卡、记忆模式评分与撤销、设置切换词书、导入一个小词书、在线按需加载，以及下载后的单文件离线启动。
