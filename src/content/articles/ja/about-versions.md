---
title: "バージョン表記について"
description: "記事の動作確認済みバージョンの見方と、自分の環境のバージョン確認方法。"
chapter: liber-1
order: 4
lastVerified: 2026-04-30
targetVersion: "2.x"
estimatedMinutes: 5
---

Claude Code はアップデートが頻繁である。記事の内容が自分の環境と合わない場合に備え、バージョンの見方を知っておきたい。

## 各記事の「動作確認済みバージョン」

本書の各記事には、動作を確認したバージョンを記している。たとえば `2.x` であれば、Claude Code 2 系の時点で確認した内容である。メジャーバージョンが変わると動作が変わることがあるため、参考にされたい。

## 自分の環境のバージョン確認

ターミナルで以下を実行する：

```bash
claude --version
```

出力の先頭にバージョン番号が表示される。記事の対象バージョンと照らし合わせてほしい。

## バージョンが異なる場合

記事より新しいバージョンを使っていても、多くの場合は問題なく動く。マイナーバージョンの違いは気にしなくてよい。

ただし、メジャーバージョンが大きく異なる場合は注意が必要である。記事の手順通りに動かない場合は、まずバージョンを確認してほしい。

---

## 参考情報

- [GitHub: anthropics/claude-code リリース](https://github.com/anthropics/claude-code/releases) — リリースごとの変更点
- [Claude Code Changelog](https://github.com/anthropics/claude-code/blob/main/CHANGELOG.md) — 公式の変更履歴
