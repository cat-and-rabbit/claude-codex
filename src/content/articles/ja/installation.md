---
title: "インストールと初期設定"
description: "Claude Code を手元の環境で使えるようにする最初の30分。"
chapter: liber-1
order: 2
lastVerified: 2026-04-29
targetVersion: "2.x"
estimatedMinutes: 30
---

Claude Code を使い始めるには、まず手元の環境にインストールする必要がある。本章では、Node.js のセットアップから最初のサインインまでを案内する。

## 前提条件

Claude Code は Node.js が必要である。バージョン 22 以上を推奨する。

## インストール

npm を使ってグローバルにインストールする：

```bash
npm install -g @anthropic-ai/claude-code
```

インストール後、`claude --version` で確認できる。

## サインイン

初回起動時にブラウザが開き、認証フローが始まる。