---
title: "Subagents を定義する"
description: "自分専用の subagent を作る。フロントマターの全項目、ツール制限、permissionMode、永続メモリ、hooks。"
chapter: liber-4
order: 3
lastVerified: 2026-05-01
targetVersion: "2.x"
estimatedMinutes: 18
---

実践の最終章で、組み込みサブエージェント (Explore / Plan / general-purpose) の**呼び出し方**を扱った。本章はその先 ── **自分の subagent を定義する**側に入る。プロジェクト固有のレビュアー、デバッガー、データ分析役を持てるようになると、Claude Code の作業範囲が一段広がる。

## なぜ自分で定義するか

組み込みのサブエージェントだけでも多くは賄える。それでも自前で定義する価値が出る場面は:

- **特定のドメイン知識** をシステムプロンプトに埋め込みたい (例: 自社 API の規約)
- **使えるツールを制限** したい (読み取り専用の調査役、bash 限定のスクリプト実行役など)
- **コストを制御** したい (Haiku で安く回したいタスク)
- **再利用** したい (毎回同じ指示をプロンプトに書きたくない)
- **プロジェクト全体で共有** したい (チームでレビュー観点を揃える)

## 最小限の subagent 定義

`.claude/agents/` または `~/.claude/agents/` に Markdown ファイルを置く。

```markdown
---
name: code-reviewer
description: コードの品質・セキュリティ・ベストプラクティスをレビューする。コード変更後に積極的に使う
tools: Read, Glob, Grep, Bash
model: sonnet
---

あなたは品質とセキュリティの高い基準を保証するシニアコードレビュアーである。

呼び出されたら:
1. `git diff` で最近の変更を確認
2. 変更されたファイルに焦点を当てる
3. すぐにレビューを開始

レビュー観点:
- コードが明確で読みやすいか
- 関数・変数命名が適切か
- 重複がないか
- エラーハンドリング
- 露出した secret や API キーがないか
- 入力検証
- テストカバレッジ

優先度別にフィードバックを出す:
- Critical (必修正)
- Warning (修正推奨)
- Suggestion (改善案)

各 issue に具体的な修正例を含める。
```

これで `.claude/agents/code-reviewer.md` という一個のファイルだけで `code-reviewer` というサブエージェントができる。`/agents` コマンドの UI から対話的に作ることもできる。

## 配置スコープと優先順位

| 場所 | スコープ | 優先 |
|---|---|---|
| 管理設定 | 組織全体 | 1 (最高) |
| `--agents` CLI フラグ | そのセッションのみ | 2 |
| `.claude/agents/` | 現プロジェクト | 3 |
| `~/.claude/agents/` | 全プロジェクト | 4 |
| プラグインの `agents/` | プラグイン有効範囲 | 5 (最低) |

同名 subagent があれば優先度の高い方が勝つ。チーム共有なら `.claude/agents/` (git で共有)、個人なら `~/.claude/agents/` を使い分ける。

## フロントマター主要フィールド

`name` と `description` 以外は全て省略可能。主要フィールドを表で:

| フィールド | 用途 |
|---|---|
| `name` | 識別子。小文字とハイフン |
| `description` | 自動委譲の判定材料。**最重要** |
| `tools` | 許可ツール一覧。省略時はメインから全継承 |
| `disallowedTools` | 拒否ツール |
| `model` | `sonnet`/`opus`/`haiku`/フルID/`inherit` |
| `permissionMode` | `default`/`acceptEdits`/`auto`/`plan` 等 |
| `maxTurns` | 自動停止までのターン数上限 |
| `skills` | スタートアップ時に注入するスキル名一覧 |
| `mcpServers` | この subagent 用の MCP サーバー (インライン定義可) |
| `hooks` | この subagent ライフサイクル用の hooks |
| `memory` | `user`/`project`/`local` ─ 永続メモリスコープ |
| `effort` | このセッション中の推論労力レベル |
| `isolation` | `worktree` で git worktree に隔離 |
| `color` | UI 表示色 |

「自動委譲を促す」ためには `description` に「use proactively」相当のフレーズを入れるとよい。

## ツール制限のかけ方

`tools` (許可リスト) と `disallowedTools` (拒否リスト) で制御する。

### 読み取り専用エージェント

```yaml
---
name: safe-researcher
description: 制限された権限の調査エージェント
tools: Read, Grep, Glob, Bash
---
```

`Edit` `Write` `MCP` ツールは継承しない。Bash は使えるが、サンドボックスが効いていればそこも安全に保てる。

### 書き込みだけ禁止

```yaml
---
name: no-writes
description: 書き込み以外は全部使える
disallowedTools: Write, Edit
---
```

`tools` を省略するとメインから全継承され、そこから `disallowedTools` で削る。両方指定した場合は `disallowedTools` が先に適用される。

## permissionMode で挙動を変える

Subagent は親の権限コンテキストを継承するが、`permissionMode` で上書きできる。

```yaml
---
name: test-runner
description: テストを走らせる
permissionMode: acceptEdits
tools: Bash, Read
---
```

ただし**親が `bypassPermissions` または `acceptEdits` の時は、それが優先される**。親が `auto` の時は subagent は auto を継承し、`permissionMode` は無視される ── という制約がある。

## 永続メモリで学習を残す

`memory` フィールドを設定すると、subagent が会話間で**自分のメモを書き残せる**。

```yaml
---
name: code-reviewer
description: コードの品質をレビュー
memory: project
---

あなたはコードレビュアーである。レビューしながら、発見したパターン・規約・繰り返し起きる問題を agent memory に更新する。
```

スコープは三つ:

| スコープ | 場所 | 用途 |
|---|---|---|
| `user` | `~/.claude/agent-memory/<name>/` | 全プロジェクト共通の学び |
| `project` | `.claude/agent-memory/<name>/` | プロジェクト固有 (git 共有可) |
| `local` | `.claude/agent-memory-local/<name>/` | プロジェクト固有 (gitignore) |

`memory` を有効にすると、subagent のシステムプロンプトに自動でメモリ操作の指示が追加され、`MEMORY.md` の最初の 200 行が読み込まれる。Read/Write/Edit ツールも自動的に有効化される。

**「タスク開始前にメモリを確認して、終わった後に学んだことを保存して」** とプロンプトで明示すると、時間とともに subagent の知識ベースが育っていく。

## サブエージェントごとの hooks

`hooks` フィールドで、その subagent がアクティブな間だけ動くフックを定義できる。

```yaml
---
name: code-reviewer
description: 自動 lint 付きレビュー
hooks:
  PreToolUse:
    - matcher: "Bash"
      hooks:
        - type: command
          command: "./scripts/validate-command.sh"
  PostToolUse:
    - matcher: "Edit|Write"
      hooks:
        - type: command
          command: "./scripts/run-linter.sh"
---
```

これで「この subagent が Bash を実行する前に検証スクリプトを走らせる」のような細かい制御ができる。`Stop` hook は自動的に `SubagentStop` イベントに変換される。

## MCP サーバーをスコープする

メイン会話には MCP サーバーを乗せたくないが、特定の subagent には使わせたい ─ という時は `mcpServers` で範囲を絞れる。

```yaml
---
name: browser-tester
description: Playwright で実ブラウザでの機能テスト
mcpServers:
  - playwright:
      type: stdio
      command: npx
      args: ["-y", "@playwright/mcp@latest"]
  - github  # 既設定の参照
---

Playwright のツールを使ってナビゲーション、スクリーンショット、ページとのやり取りを行う。
```

インライン定義は subagent 開始時に接続され、終了時に切断される。文字列参照は親セッションの接続を共有する。

**MCP のツール定義はコンテキストを食う**ので、メインに乗せず subagent に閉じ込めるパターンは context 効率の改善に効く。

## isolation: worktree で隔離する

`isolation: worktree` を設定すると、subagent は **一時的な git worktree** で動く。リポジトリのコピーが分離されるので、subagent の編集が現在のチェックアウトに混ざらない。

```yaml
---
name: experimenter
description: 実験的な変更を試す
isolation: worktree
---
```

subagent が変更を加えなかった場合、worktree は自動的にクリーンアップされる。「並列で複数のアプローチを試して、よさそうなものだけ採用する」みたいな使い方に向く。

## 既存の skill との組み合わせ

`skills` フィールドで、起動時にスキルを subagent のコンテキストに**プリロード**できる。

```yaml
---
name: api-developer
description: チーム規約に従って API エンドポイントを実装
skills:
  - api-conventions
  - error-handling-patterns
---

API エンドポイントを実装する。プリロードされたスキルから規約とパターンを参照する。
```

各スキルの本文がシステムプロンプトに注入されるので、subagent はスキルを「呼び出す」のではなく、最初から知っている状態になる。**ドメイン知識を毎回検索しなくて済む**ので、応答が早くなり、コンテキスト効率も上がる。

## 例: セキュリティレビュアー

実用的な例として、コミット前に走らせるセキュリティレビュアーを定義してみる。

```markdown
---
name: security-reviewer
description: 認証、データ取り扱い、injection 観点でセキュリティレビューする。コミット前・PR 作成前に積極的に使う
tools: Read, Grep, Glob, Bash
model: opus
permissionMode: plan
---

あなたはシニアセキュリティエンジニアである。コードを以下の観点でレビューする:

- Injection 脆弱性 (SQL、XSS、コマンド injection)
- 認証・認可の欠陥
- コードに含まれた secret や認証情報
- 安全でないデータ取り扱い
- 入力検証

各 issue について:
- 重大度 (Critical / High / Medium / Low)
- 該当ファイルと行番号
- 具体的な修正案

を出力する。
```

`permissionMode: plan` でコードを変更しない読み取り専用にし、`model: opus` で深い推論を使う。`Bash` を許可するのは `git diff` などのリポジトリ調査用。

`/agents` から呼ぶか、「security-reviewer サブエージェントで認証モジュールを監査して」と書けば動く。

---

次章は、subagent や skill とは別軸の拡張機構 ── ツール実行のライフサイクルにフックする **Hooks** を扱う。

---

## 参考情報

- [Subagents (公式)](https://code.claude.com/docs/ja/sub-agents) — フロントマター全項目とパターン例
- [権限モード](https://code.claude.com/docs/ja/permission-modes) — `permissionMode` の挙動
