---
title: "MCP サーバーを繋ぐ"
description: "外部ツール (GitHub・Notion・DB・Figma 等) を Claude に接続する。MCP の仕組み、claude mcp add、人気のサーバー。"
chapter: liber-4
order: 5
lastVerified: 2026-05-01
targetVersion: "2.x"
estimatedMinutes: 14
---

「JIRA からチケットを引いてきて」「Sentry のエラーをスタックトレースで見て」「Figma のデザインを参照して」── こうした**外部ツールとの連携**を Claude にやらせるのが MCP (Model Context Protocol) である。Claude Code は MCP を通じて数百の外部ツール・データソースに接続できる。

## MCP とは何か

MCP は AI ツール統合のためのオープン標準である。各サービスが MCP サーバーを公開していれば、Claude Code はそれに接続して、そのサービスのツールを呼び出せる。

「別のツールから Claude のチャットにデータを貼り付けている」「貼り付けた状態を Claude に作業させている」── このループが頻繁にあるなら、MCP サーバーを繋ぐタイミングである。Claude が**そのシステムを直接読み書き**できるようになる。

## できることの例

公式が挙げる典型例:

- **チケットからの実装** ─ 「JIRA の ENG-4521 の機能を実装して、PR を作って」
- **監視データの分析** ─ 「Sentry と Statsig をチェックして、ENG-4521 の使用状況を確認して」
- **DB クエリ** ─ 「PostgreSQL に基づいて ENG-4521 を使った 10 人のユーザーのメールを抽出して」
- **デザイン統合** ─ 「Slack に投稿された新しい Figma デザインに基づいて、メールテンプレートを更新して」

## サーバーの追加方法

MCP サーバーには三つのトランスポート種別があり、それぞれ追加方法が違う。

### HTTP サーバー (推奨)

クラウドサービスに接続する標準的な方法。

```bash
# 構文
claude mcp add --transport http <name> <url>

# 例: Notion に接続
claude mcp add --transport http notion https://mcp.notion.com/mcp

# Bearer トークン付き
claude mcp add --transport http secure-api https://api.example.com/mcp \
  --header "Authorization: Bearer your-token"
```

### Stdio サーバー (ローカルプロセス)

マシン上でローカルプロセスとして実行されるサーバー。npm パッケージで提供されることが多い。

```bash
# 構文
claude mcp add [options] <name> -- <command> [args...]

# 例: Airtable サーバー
claude mcp add --transport stdio --env AIRTABLE_API_KEY=YOUR_KEY airtable \
  -- npx -y airtable-mcp-server
```

`--` (ダブルダッシュ) より前に Claude のフラグ、後にサーバーのコマンドと引数を書く。

## サーバーの管理

```bash
# 設定済みサーバー一覧
claude mcp list

# 詳細
claude mcp get github

# 削除
claude mcp remove github

# (Claude Code 内) ステータス確認
/mcp
```

## スコープの選び方

`--scope` で設定の保存場所を選べる。

| スコープ | 影響範囲 | 共有 | 保存場所 |
|---|---|---|---|
| `local` (デフォルト) | 現プロジェクトのみ | しない | `~/.claude.json` |
| `project` | 現プロジェクトのみ | git で共有 | プロジェクトの `.mcp.json` |
| `user` | 全プロジェクト | しない | `~/.claude.json` |

```bash
# プロジェクト全体で共有 (チーム向け)
claude mcp add --transport http paypal --scope project https://mcp.paypal.com/mcp
```

`--scope project` で追加すると `.mcp.json` ファイルが作られる。これを git にコミットすると、チームメンバー全員が同じ MCP サーバーを使える。

ただしセキュリティの都合で、`.mcp.json` 経由のサーバーは**初回使用時に承認ダイアログが出る**。チームメンバーが「このプロジェクトのこのサーバーを信頼する」と一度許可してから使われる。

## 認証 (OAuth)

クラウド系の MCP サーバーは多くが OAuth 認証を要求する。手順は単純:

```bash
# 1. サーバーを追加
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp

# 2. Claude Code 内で /mcp
/mcp
```

`/mcp` メニューから対象サーバーを選んで認証を開始すると、ブラウザが開いてログインフローが始まる。完了すると認証情報が安全に保存され、自動更新される。

トークンを取り消したい時は `/mcp` メニューの「Clear authentication」から。

## 使い始めの三つの実例

### Sentry でエラー調査

```bash
claude mcp add --transport http sentry https://mcp.sentry.dev/mcp
# /mcp で認証
```

```
過去 24 時間で最も一般的なエラーは何?
エラー ID abc123 のスタックトレースを表示して
どのデプロイメントがこの新しいエラーを導入した?
```

### GitHub に接続

```bash
claude mcp add --transport http github https://api.githubcopilot.com/mcp/ \
  --header "Authorization: Bearer $GITHUB_PAT"
```

```
PR #456 をレビューして改善案を出して
見つけたバグの新しい issue を作って
自分にアサインされている全 PR を表示して
```

### PostgreSQL のクエリ

```bash
claude mcp add --transport stdio db -- npx -y @bytebase/dbhub \
  --dsn "postgresql://readonly:pass@prod.db.com:5432/analytics"
```

```
今月の総収益はいくら?
orders テーブルのスキーマを表示して
過去 90 日に購入していない顧客を検索して
```

## MCP リソースを `@` で参照する

MCP サーバーが**リソース**を公開していれば、ファイルと同じように `@` で参照できる。

```
@github:issue://123 を分析して修正案を出して
@docs:file://api/authentication の API ドキュメントをレビューして
```

`@server:protocol://path` という形式。複数のリソースを一つのプロンプトで参照することもできる。

## MCP プロンプトをコマンドとして使う

MCP サーバーが**プロンプト**を公開していれば、それは `/mcp__server__prompt` という形のスラッシュコマンドとして使える。

```
/mcp__github__list_prs
/mcp__github__pr_review 456
```

`/` メニューを見ると、接続中の MCP サーバーから来ているプロンプトが並ぶ。

## ツール検索 (デフォルトで遅延読み込み)

MCP サーバーをたくさん繋ぐと、ツール定義が**コンテキストを食う**問題がある。Claude Code はデフォルトで**ツール定義を遅延読み込み**する仕組みを持っており、セッション開始時はツール名だけが乗り、必要時に Claude が `ToolSearch` で検索して読み込む。

ただし常に使うサーバーは事前読み込みしたい ── その場合は `.mcp.json` で `alwaysLoad: true` を指定する:

```json
{
  "mcpServers": {
    "core-tools": {
      "type": "http",
      "url": "https://mcp.example.com/mcp",
      "alwaysLoad": true
    }
  }
}
```

## セキュリティの注意

> サードパーティの MCP サーバーは自己責任で使用してください。Anthropic はこれらすべてのサーバーの正確性またはセキュリティを検証していません。

公式が明示的に警告している通り、**信頼できるサーバーだけ繋ぐ**のが基本。特に「外部の信頼できないコンテンツを取り込む可能性のあるサーバー」(SNS、メール、外部 web 等) は **プロンプトインジェクション**のリスクが大きい。

社内導入では、信頼できるサーバーのみを許可する [`allowedMcpServers`](https://code.claude.com/docs/ja/mcp) のような管理設定を組み合わせる。

---

次章は、ここまで扱った Skills / Subagents / Hooks / MCP を**一つにまとめて配布する**仕組みとして **Plugins** に入る。

---

## 参考情報

- [MCP (公式)](https://code.claude.com/docs/ja/mcp) — 接続方法・認証・人気サーバー一覧
- [MCP プロトコル仕様](https://modelcontextprotocol.io/introduction) — MCP の標準仕様
