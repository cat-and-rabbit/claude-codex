---
title: "複数の CLAUDE.md と auto-memory"
description: "プロジェクトルート以外の置き場所、@import 構文、.claude/rules/ による分割、auto-memory による自動蓄積。"
chapter: liber-4
order: 1
lastVerified: 2026-05-01
targetVersion: "2.x"
estimatedMinutes: 13
---

基礎で扱った CLAUDE.md は「プロジェクトルートに一枚」までだった。応用ではその一枚を超えて、**複数の CLAUDE.md を組み合わせる方法**と、Claude が自分で書く **auto-memory** を扱う。

## 配置場所のスコープ階層

CLAUDE.md は複数の場所に置け、それぞれ異なるスコープを持つ。

| スコープ | 場所 | 共有範囲 |
|---|---|---|
| **管理ポリシー** | `/Library/Application Support/ClaudeCode/CLAUDE.md` (macOS) など | 組織全体 |
| **プロジェクト** | `./CLAUDE.md` または `./.claude/CLAUDE.md` | git で共有 |
| **ユーザー** | `~/.claude/CLAUDE.md` | 自分の全プロジェクト |
| **ローカル** | `./CLAUDE.local.md` | 自分・現プロジェクト (gitignore) |

ワーキングディレクトリより上のディレクトリ階層内の CLAUDE.md は、起動時に**全部読み込まれる**。サブディレクトリ内のものは Claude がそのディレクトリのファイルを読むときにオンデマンドで読まれる。

`./CLAUDE.local.md` は git にチェックインしたくない個人的な好みを書く場所として用意されていて、`/init` で対話的に作ると `.gitignore` に追加してくれる。

## モノレポでの活用

モノレポでは、各サブプロジェクトに固有の CLAUDE.md を置ける。

```
monorepo/
├── CLAUDE.md              ← 全体規約
├── packages/
│   ├── frontend/
│   │   └── CLAUDE.md      ← React 規約
│   └── backend/
│       └── CLAUDE.md      ← Go 規約
```

Claude Code はワーキングディレクトリから上のディレクトリの CLAUDE.md を全部読み、サブディレクトリのものを必要時に拾う。**「全プロジェクト共通」「サブパッケージ固有」を分けて書ける**ようになる。

他チームの CLAUDE.md がノイズになる場合は、`claudeMdExcludes` で特定のファイルをスキップできる。

```json
{
  "claudeMdExcludes": [
    "**/monorepo/CLAUDE.md",
    "/path/to/other-team/.claude/rules/**"
  ]
}
```

## `@import` 構文で分割する

CLAUDE.md は `@path/to/file` 構文で他のファイルを取り込める。

```markdown
プロジェクト概要は @README.md を参照、利用可能な npm コマンドは @package.json を参照。

# 追加の指示
- git ワークフロー: @docs/git-instructions.md
- 個人的なオーバーライド: @~/.claude/my-project-instructions.md
```

相対パスはインポート元ファイルに相対、絶対パス・チルダ展開もサポートされる。再帰インポートは最大 5 段階。

ただしインポートされたファイルは**起動時にコンテキストへ展開される**ので、コンテキスト節約にはならない。「整理」のための仕組みであって「遅延読み込み」ではない、と理解しておく。

## `.claude/rules/` で構造化する

大きなプロジェクトでは、CLAUDE.md を一枚に詰め込むより `.claude/rules/` 以下に分けたほうが保守しやすい。

```
your-project/
├── .claude/
│   ├── CLAUDE.md
│   └── rules/
│       ├── code-style.md
│       ├── testing.md
│       └── security.md
```

`.claude/rules/*.md` は全て再帰的に発見され、`.claude/CLAUDE.md` と同じ優先度で読み込まれる。

### パススコープルール (条件付き読み込み)

`.claude/rules/` の各ファイルには、`paths` フィールドの YAML フロントマターを付けて**特定のファイルにスコープ**できる。

```markdown
---
paths:
  - "src/api/**/*.ts"
---

# API 開発ルール

- すべての API エンドポイントは入力検証を含めること
- 標準エラー応答形式を使う
- OpenAPI ドキュメントコメントを含める
```

このルールは、Claude が `src/api/**/*.ts` のファイルを読むときだけコンテキストに入る。**全セッションで読まれる必要がない指示を絞り込める**ので、ノイズ削減に効く。

`paths` のないルールは無条件で読み込まれる。

## auto-memory ─ Claude が自分で書くメモ

CLAUDE.md は**こちらが書く**メモだが、**Claude が自分で書く**メモの仕組みもある。これが auto-memory である。

Claude は作業中に「この情報は将来の会話で役立つ」と判断したものを自動的にメモに保存する。ビルドコマンド、デバッグの洞察、アーキテクチャの傾向、コードスタイルの好みなど。

### 有効/無効の切り替え

デフォルトで有効。`/memory` 内のトグルか、設定で切り替えられる。

```json
{
  "autoMemoryEnabled": false
}
```

環境変数 `CLAUDE_CODE_DISABLE_AUTO_MEMORY=1` でも無効化できる。

### 保存場所

各プロジェクトは `~/.claude/projects/<project>/memory/` に独自のメモリディレクトリを持つ。

```
~/.claude/projects/<project>/memory/
├── MEMORY.md          ← インデックス、全セッションで読まれる
├── debugging.md       ← デバッグパターンの詳細
├── api-conventions.md ← API 設計の決定
└── ...
```

`MEMORY.md` の最初の 200 行 (もしくは 25KB) が全会話の開始時に読み込まれる。詳細は別トピックファイルに分けられ、必要時に Claude が自分で読みにいく。

### 監査・編集

`/memory` で、現セッションに読み込まれた CLAUDE.md・ルール・auto-memory を一覧でき、エディタで開ける。auto-memory の中身を見て、おかしな学習があれば手で消す ─ という運用ができる。

## CLAUDE.md と auto-memory の使い分け

両者は補完関係にある。

| | CLAUDE.md | auto-memory |
|---|---|---|
| 書き手 | あなた | Claude |
| 内容 | 指示・ルール | 学習・パターン |
| スコープ | プロジェクト/ユーザー/組織 | ワーキングツリーごと |
| 用途 | 規約、ワークフロー、アーキテクチャ | ビルドコマンド、デバッグ知見、好み |

**「Claude にこう動いてほしい」と指示したい**なら CLAUDE.md。**こちらが何度か直したことを Claude に学んでほしい**なら auto-memory に任せる、という分業が自然である。

---

ここまでで「プロジェクトの前提を Claude に伝える」仕組みの全体像が見えた。次章では、繰り返し呼び出せるワークフローとして **Skills** を自分で作る方法に入る。

---

## 参考情報

- [Claude があなたのプロジェクトを記憶する方法 (公式)](https://code.claude.com/docs/ja/memory) — CLAUDE.md と auto-memory の完全リファレンス
- [Claude Code 設定: claudeMdExcludes](https://code.claude.com/docs/ja/settings) — 特定の CLAUDE.md を除外する
