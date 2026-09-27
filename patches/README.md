# astro-pure 兼容补丁

`astro-pure@1.4.7.patch` 由 Bun 的 `patchedDependencies` 应用，保留两项兼容调整：

1. `PostPreview.astro` 的条件 class 返回空字符串，避免布尔值引起类型错误，不改变视觉效果。
2. `index.ts` 将旧版 Markdown 插件配置接入 Astro 7 的 unified processor，并保留调用方已有插件。

本站布局、主题色、目录和交互均在 `src/` 中维护，不增加视觉定制补丁。升级 Astro/astro-pure 时逐项确认上游是否已修复，再移除对应补丁；运行 `bun install --frozen-lockfile` 和 `bun run verify`，另检查代码高亮、数学公式和 MDX 组件。
