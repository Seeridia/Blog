# Seeridia's Blog

基于 Astro、astro-pure 和 UnoCSS 的静态博客，使用 Bun 管理依赖。

## 开发与检查

使用 `.node-version` 和 `.bun-version` 中的版本，执行：

```sh
bun install --frozen-lockfile
bun run dev
bun run verify
```

`verify` 包括 ESLint、已跟踪代码的格式检查、RSS 测试、部署脚本测试、Astro 类型检查、构建及产物校验。`bun run format:code` 只格式化受维护的代码，不改写文章。新增代码需要先加入 Git 暂存区才能进入格式检查范围。

## 项目边界

- `src/components`、`src/layouts`、`src/styles/app.css`：本站交互、布局和主题变量。正文、辅助文字、强调色与装饰取色分别管理。
- `src/utils/content.ts`：文章过滤、排序与标签；`feed.ts`：RSS 中的 Markdown/MDX 转换和清理。
- `src/components/content/Mermaid.astro` 和 `src/components/waline/Comment.astro`：按需加载图表与评论；阅读数单独加载。
- `src/utils/remote-cache.ts`：链接预览和统计的构建缓存，默认七天有效，五秒超时，失败回退旧数据。`REFRESH_REMOTE=1` 强制刷新；`BLOG_OFFLINE=1` 仅让这两类组件使用缓存，不保证其他第三方组件完全离线。
- `patches/`：上游兼容补丁，详见 [补丁说明](patches/README.md)。

## 验收

运行 `bun run build && bun run preview`，检查首页签名及入口、文章目录、搜索、RSS，以及含 Mermaid 的文章。在窄屏下检查菜单和目录，使用 Tab/Escape 检查焦点；切换浅色、深色、系统主题和系统“减少动态效果”。评论滚动到可视区域后加载，远程服务不可用时应保留正文和回退提示。

工作流与首次服务器迁移见 [部署文档](docs/deployment.md)。
