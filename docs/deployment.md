# 构建与部署

PR 只执行检查；推送 main 在检查通过后部署同一次构建的产物。Node/Bun 版本固定，依赖使用 Bun 锁文件。远程元数据缓存不属于发布产物。

## 服务器约定

保留原有 Secrets：`SERVER_HOST`、`SERVER_USER`、`SSH_PRIVATE_KEY`、`TARGET_DIR`。服务器需要 Python 3；部署用户需有目标父目录的写权限；Web 服务需允许跟随软链接。

`TARGET_DIR` 必须是绝对路径且不能以 `/` 结尾，不能为根目录。目录结构如下：

```text
/var/www/blog -> /var/www/blog.releases/<release-id>
/var/www/blog.previous -> /var/www/blog.releases/<previous-id>
/var/www/blog.releases/<release-id>/
/var/www/blog.deploy/<release-id>/scripts/activate-release.py
```

上传进入独立暂存目录；服务器校验必需页面、搜索索引和所有清单文件的 SHA-256，然后用原子软链接替换切换站点。新版本不会混入旧路由。上传或校验失败不会切换当前站点。

## 首次迁移（推送前完成）

旧工作流直接把文件写进 `TARGET_DIR`。如果它仍是真实目录，新脚本会主动拒绝替换，避免损坏已有内容。请先在服务器上核对路径、备份和 Web 服务软链接配置，再于维护窗口手动迁移。例如：

```sh
# 改为实际路径；仅用于尚未迁移的现有站点
site_target=/var/www/blog
legacy_release="${site_target}.releases/legacy-$(date +%Y%m%d%H%M%S)"
mkdir -p "${site_target}.releases"
mv "$site_target" "$legacy_release"
if ! ln -s "$legacy_release" "$site_target"; then
  mv "$legacy_release" "$site_target"
  exit 1
fi
```

首次移动目录与创建链接之间有短暂空窗；后续发布切换是原子的。网站访问确认正常后再推送。此次代码修改没有连接服务器或执行迁移。

## 回滚与保留

在服务器运行任一保留版本的脚本：

```sh
python3 /var/www/blog.deploy/<release-id>/scripts/activate-release.py /var/www/blog --rollback
```

回滚交换当前与上一版本链接。脚本不自动删除历史版本，确认稳定后可手动清理不再使用的 `.releases/` 和 `.deploy/` 子目录，务必保留当前及 previous 指向的版本。

本地 `bun run test:deploy` 在临时目录验证发布切换、旧路由消失、回滚、校验失败及真实目录保护，不操作服务器。CI 的 SSH 连通性与服务器配置需首次发布时验证。
