---
title: "Hooks で自動化する"
description: "ツール実行ライフサイクルにシェルコマンドを差し込む。PreToolUse/PostToolUse/SessionStart など、典型ユースケースと書き方。"
chapter: liber-4
order: 4
lastVerified: 2026-05-01
targetVersion: "2.x"
estimatedMinutes: 15
---

CLAUDE.md は**指示**で、Skill は**手順書**だった。Hook はその先 ── **Claude Code のライフサイクル上の特定イベントで、こちらの定義したシェルコマンドを必ず走らせる**仕組みである。「ファイル編集後に必ず lint を走らせる」「`rm -rf` をブロックする」のような、**決定論的に効かせたい自動化**に使う。

## CLAUDE.md・Skill との違い

| | CLAUDE.md | Skill | Hook |
|---|---|---|---|
| 性質 | 指示 (Claude が読む) | 手順書 (Claude が呼ぶ) | スクリプト (ハーネスが実行) |
| 確実性 | 「読んでくれる」程度 | 呼ばれた時だけ実行 | **必ず実行される** |
| 実行主体 | Claude | Claude | Claude Code 本体 |

「**これだけは絶対に毎回起きてほしい**」というアクションは Hook で実装する。CLAUDE.md に「ファイル編集後は lint を走らせて」と書いても、Claude が忘れる可能性はある。Hook なら Claude の意思に関係なく走る。

## 主要なフックイベント

| イベント | 発火タイミング |
|---|---|
| `SessionStart` | セッション開始/再開時 |
| `UserPromptSubmit` | ユーザのプロンプト送信時、処理前 |
| `PreToolUse` | ツール呼び出し前 (ブロック可能) |
| `PostToolUse` | ツール呼び出し成功後 |
| `Stop` | Claude が応答を終えた時 |
| `SubagentStart` / `SubagentStop` | サブエージェントの開始/終了 |

ツール実行系の `PreToolUse` / `PostToolUse` が一番使い道が多い。

## settings.json での書き方

`.claude/settings.json` (もしくは `~/.claude/settings.json`) に書く。

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/security-check.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/run-linter.sh"
          }
        ]
      }
    ]
  }
}
```

- `matcher` ─ どのツールに反応するか (`Bash` `Write|Edit` など。正規表現相当)
- `command` ─ 実行されるシェルコマンド
- `$CLAUDE_PROJECT_DIR` ─ プロジェクトルートを指す環境変数

## フック入力 (stdin から JSON)

フックコマンドには、イベント情報が **stdin に JSON で渡される**。

```json
{
  "session_id": "abc123",
  "transcript_path": "/path/to/transcript.jsonl",
  "cwd": "/path/to/project",
  "permission_mode": "default",
  "hook_event_name": "PreToolUse",
  "tool_name": "Bash",
  "tool_input": {
    "command": "rm -rf /tmp/build"
  }
}
```

シェルでは `jq` でパースするのが定番:

```bash
#!/bin/bash
INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')
```

## 終了コードの意味

| 終了コード | 意味 | 動作 |
|---|---|---|
| **0** | 成功 | stdout の JSON があれば処理 |
| **2** | ブロッキングエラー | イベント固有の動作 (ツール実行をブロック等) |
| その他 | 非ブロッキングエラー | stderr がログに残り、実行継続 |

`PreToolUse` で `exit 2` するとツール呼び出しがブロックされる。stderr に出したメッセージが Claude にフィードバックとして渡る。

## 典型例 1: 危険な bash コマンドをブロック

```bash
#!/bin/bash
# .claude/hooks/block-rm.sh

INPUT=$(cat)
COMMAND=$(echo "$INPUT" | jq -r '.tool_input.command')

if echo "$COMMAND" | grep -qE 'rm -rf\s+/'; then
  echo "ルートを巻き込む rm -rf はブロックします" >&2
  exit 2
fi

exit 0
```

settings.json:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/block-rm.sh" }
        ]
      }
    ]
  }
}
```

## 典型例 2: 編集後に lint を走らせる

```bash
#!/bin/bash
# .claude/hooks/run-linter.sh

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path')

if [[ "$FILE_PATH" == *.ts ]]; then
  npx eslint "$FILE_PATH" 2>&1 || true
fi

exit 0
```

settings.json:

```json
{
  "hooks": {
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          { "type": "command", "command": "$CLAUDE_PROJECT_DIR/.claude/hooks/run-linter.sh" }
        ]
      }
    ]
  }
}
```

`exit 0` のままにして lint エラーを Claude に見せ、Claude に直してもらうのが一般的なパターン。

## 典型例 3: SessionStart でブランチ情報を渡す

セッション開始時にプロジェクトのコンテキストを自動投入する例:

```bash
#!/bin/bash
# .claude/hooks/load-context.sh

BRANCH=$(git rev-parse --abbrev-ref HEAD)
ISSUES=$(gh issue list -L 5 --json title,number 2>/dev/null || echo "")

jq -n --arg branch "$BRANCH" --arg issues "$ISSUES" '{
  hookSpecificOutput: {
    hookEventName: "SessionStart",
    additionalContext: "現在のブランチ: \($branch)\nオープン issue:\n\($issues)"
  }
}'
```

`additionalContext` に出した文字列がセッション開始時に Claude に渡される。**「今ブランチ何だっけ?」を Claude に毎回確認させる必要がなくなる**。

## JSON 出力で細かく制御

終了コード 0 で stdout に JSON を出すと、より細かい制御ができる。

```json
{
  "continue": true,
  "suppressOutput": false,
  "systemMessage": "警告メッセージ",
  "hookSpecificOutput": {
    "hookEventName": "PreToolUse",
    "permissionDecision": "allow|deny|ask|defer",
    "permissionDecisionReason": "理由",
    "additionalContext": "Claude に追加するコンテキスト",
    "updatedInput": { "field": "新しい値" }
  }
}
```

代表的な使い方:

- `permissionDecision: "deny"` ─ ツール呼び出しを拒否 (`exit 2` の json 版)
- `permissionDecision: "allow"` ─ 確認なしで自動承認
- `updatedInput` ─ ツール入力を書き換える (例: `npm test` を `npm test -- --bail` に変える)

## hooks のスコープ

設定ファイルの場所でスコープが決まる:

- `~/.claude/settings.json` ─ 全プロジェクトに適用
- `.claude/settings.json` ─ そのプロジェクトのみ (git にコミット可)
- `.claude/settings.local.json` ─ そのプロジェクトのみ (gitignore 推奨)

チームで共有したい hook は `.claude/settings.json` に、自分専用は `~/.claude/settings.json` に置く。

## subagent と Skills 内の hooks

Hook は subagent や skill の YAML フロントマター内にも書ける。**「この subagent / skill が動いている間だけ」発火するスコープ付き hook** になる ── 詳細はそれぞれの章を参照。

## 注意点

- **Hook はシェルを実行する**ので、信頼できないリポジトリの settings.json には警告ダイアログが出る。安易に承認しないこと
- **Hook が遅いとセッションが遅くなる**。`PreToolUse` で重い処理を走らせると毎回そのレイテンシが乗る
- **Hook がエラーで `exit 2` を多用するとブロックループに陥る**。`exit 2` は本当にブロックすべき場面に絞る

---

次章は、Claude Code を**外部ツールに繋ぐ**仕組み ── MCP サーバーに入る。

---

## 参考情報

- [Hooks (公式)](https://code.claude.com/docs/ja/hooks) — 全イベント・全フィールドのリファレンス
