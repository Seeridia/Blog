---
title: Surge.sh 预览配置
publishDate: 2025-10-19 01:18:00
description: '为 Surge.sh 网站托管服务配置预览环境，以便在每次提交代码后自动生成预览链接，方便团队协作和反馈。'
tags:
  - Website
  - CI/CD
  - Github Actions
heroImage: { src: './cover.webp', color: '#A8225A' }
language: '中文'
---

Surge.sh 是一个静态网站托管服务，开发者可以快速将静态网站部署上线，方便进行预览和分享。通过配置 Surge.sh 预览环境，可以在每次代码提交后自动生成预览链接，比如可以放在 Pull Request 中，极大地方便了团队协作和反馈。

本文来讲讲如何配置 Surge.sh 预览环境。

## 安装 Surge

```
npm install -g surge

surge --version
```

## 创建 Surge 账号

```
surge
```

命令执行后会提示：

- Email：输入你的注册邮箱。
- Password：第一次会创建账号。
- Project path：默认就是当前目录。
- Domain：你可以使用 .surge.sh 的免费子域名，例如 my-project.surge.sh

## 获取 Surge Token

```
surge token
```

## 配置 GitHub Actions

```yaml
# .github/workflows/pr-preview.yml

name: Deploy PR Preview to Surge.sh

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  deploy-preview:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout repository
        uses: actions/checkout@v4

      - name: Setup Bun # 自行根据项目需要更改
        uses: oven-sh/setup-bun@v1
        with:
          bun-version: latest

      - name: Install dependencies
        run: bun install

      - name: Build project
        run: bun run build

      - name: Install Surge CLI
        run: bun install -g surge

      - name: Deploy to Surge.sh
        run: surge --project ./dist --domain Loomi-Lair-HomePage-pr-${{ github.event.number }}.surge.sh
        env:
          SURGE_LOGIN: ${{ secrets.SURGE_LOGIN }}
          SURGE_TOKEN: ${{ secrets.SURGE_TOKEN }}

      - name: Comment PR with preview URL
        uses: peter-evans/create-or-update-comment@v3
        with:
          issue-number: ${{ github.event.number }}
          body: |
            Preview deployed: https://Loomi-Lair-HomePage-pr-${{ github.event.number }}.surge.sh
```

## 配置 GitHub Secrets

在你的 GitHub 仓库中，进入 `Settings` -> `Secrets and variables` -> `Actions`，添加以下 Secrets：

- `SURGE_LOGIN`：你的 Surge 注册邮箱。
- `SURGE_TOKEN`：你通过刚刚的 `surge token` 命令获取的 Surge Token。

完成以上配置后，每当有 Pull Request 创建或更新时，GitHub Actions 会自动构建项目并部署到 Surge.sh，然后在 Pull Request 中添加预览链接，方便团队成员查看和反馈。

Surge.sh 还有其他高级功能，比如自定义域名、SSL 证书等，可以根据需要进行配置（因为我还没有用到这些功能，懒了，不写了）