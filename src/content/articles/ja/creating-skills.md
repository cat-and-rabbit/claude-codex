---
title: "Skills を作る"
description: "再利用可能な手順書としての SKILL.md。フロントマター、ディレクトリ構造、自動 vs 明示呼び出し。"
chapter: liber-4
order: 2
lastVerified: 2026-05-01
targetVersion: "2.x"
estimatedMinutes: 13
---

「同じ手順を毎回プロンプトに貼り付けている」「CLAUDE.md の一節が手順書になってきている」── このサインが見えたら **Skill** に切り出す時である。Skill は Claude Code を**自分の手順で拡張する**最も基本的な仕組みである。

## Skill とは何か

Skill は、Claude が呼び出せる**特化した指示セット**である。`SKILL.md` というマークダウンファイルとフロントマターで定義し、必要に応じて Claude が自動的に読み込むか、`/skill-name` で明示的に呼び出す。

CLAUDE.md との違いは**読み込みのタイミング**:

- **CLAUDE.md** ─ 全セッションの開始時に必ず読まれる
- **Skill** ─ 関連する場面でだけ読み込まれる (description 一覧は常時、本体はオンデマンド)

つまり、**「全会話で必要ではないが、特定の場面で詳細な手順が要る」**ものは Skill にすると、CLAUDE.md を膨らませずに済む。

## 最小限の Skill

最小構成はこうなる。

```
.claude/skills/explain-code/
└── SKILL.md
```

`SKILL.md` の中身:

```markdown
---
description: コードを図解と例えで説明する。コードの動きを聞かれた時、コードベースを学んでいる時、「これどう動く?」と聞かれた時に使う。
---

コードを説明する時は必ず:

1. **例えから始める**: 日常生活の何かに例える
2. **図を描く**: ASCII アートでフローや構造を示す
3. **コードを順を追って解説する**: ステップごとに何が起きるか
4. **ハマりどころを挙げる**: 典型的な勘違いや落とし穴を一つ
```

ディレクトリ名 (`explain-code`) がスキル名になり、`/explain-code` で呼び出せる。`description` を見て Claude が「今のタスクに関連するか」を自動判定し、関連すれば自分で読み込む。

## 配置場所のスコープ

Skill も CLAUDE.md と同様、複数の場所に置ける。

| 場所 | 適用範囲 |
|---|---|
| `~/.claude/skills/<name>/SKILL.md` | 全プロジェクト (個人) |
| `.claude/skills/<name>/SKILL.md` | 現プロジェクト (チーム共有) |
| プラグイン経由 | プラグインがインストールされた場所 |
| 管理設定 | 組織全体 |

優先順は **管理 > 個人 > プロジェクト > プラグイン**。同名スキルがあれば優先度の高い方が勝つ。

## フロントマター主要フィールド

| フィールド | 役割 |
|---|---|
| `description` | Claude が「いつ使うか」を判断する材料。**最重要** |
| `disable-model-invocation: true` | 自動呼び出しを禁止し、`/name` でしか呼べないようにする |
| `user-invocable: false` | `/` メニューに出さず、Claude だけが使う背景知識用 |
| `allowed-tools` | スキル中だけ事前承認するツール (`Read Grep` 等) |
| `model` | このスキル中だけ別モデルに切り替え |
| `paths` | グロブパターンに一致するファイル作業時のみ有効化 |

`description` をどう書くかでスキルが正しく呼び出されるかが決まるので、**「いつ使うべきか」を含めて書く**のがコツ:

```yaml
description: >
  デプロイ手順を実行する。本番デプロイのリクエスト、リリースの準備、
  デプロイ前チェックの依頼があった時に使う。
disable-model-invocation: true
```

## `$ARGUMENTS` で引数を受け取る

スキルは引数を受け取れる。`$ARGUMENTS` プレースホルダーが、呼び出し時の引数で置換される。

```markdown
---
name: fix-issue
description: GitHub の issue を修正する
disable-model-invocation: true
---

GitHub issue $ARGUMENTS をコーディング標準に従って修正する:

1. `gh issue view` で issue の詳細を取得
2. 問題を理解
3. 関連ファイルを検索
4. 修正を実装
5. テストを書いて検証
6. 説明的なメッセージでコミット
7. PR を作成
```

`/fix-issue 1234` で呼ぶと、Claude は「GitHub issue 1234 をコーディング標準に従って修正する...」を受け取る。

位置引数 `$0` `$1` `$2` (もしくは `$ARGUMENTS[0]` `$ARGUMENTS[1]`) で個別アクセスもできる。

## 自動呼び出しか、明示呼び出しか

`disable-model-invocation` フィールドが、両者の使い分けを制御する。

| 設定 | 誰が呼べるか | description のコンテキスト読み込み |
|---|---|---|
| (デフォルト) | 自分 + Claude | 常時 |
| `disable-model-invocation: true` | 自分のみ | 呼び出し時のみ |
| `user-invocable: false` | Claude のみ | 常時 |

判断の目安:

- **副作用のあるワークフロー** (deploy、commit 等) は `disable-model-invocation: true` にして、Claude が勝手にトリガーしないようにする
- **背景知識として使ってほしい** ものは `user-invocable: false` にして、`/` メニューを汚さない
- **一般的な知識** (コーディング規約等) はデフォルトのままで、Claude に判断させる

## 補助ファイルを束ねる

複雑なスキルは、`SKILL.md` だけでなく補助ファイルも持てる。

```
my-skill/
├── SKILL.md           ← 必須、エントリポイント
├── reference.md       ← 詳細な API ドキュメント (必要時に読む)
├── examples.md        ← 使用例
└── scripts/
    └── helper.py      ← 実行用スクリプト
```

`SKILL.md` から「詳細は `reference.md` を参照」のように指示しておくと、Claude が必要時にだけ補助ファイルを読み込む。**SKILL.md を 500 行以下に保ち、詳細リファレンスは別ファイル**、というのが推奨パターンである。

## バンドルスキル

Claude Code には **`/simplify` `/debug` `/loop` `/claude-api`** などのバンドルスキルが最初から入っている。これらは全 Claude Code セッションで使えるスキルで、自分で書くスキルと同じ仕組み (プロンプト駆動) で動いている。

バンドルスキルを `/help` で見ると、自分のスキルと並んで表示される。それぞれが何をするかの description があるので、参考になる。

## どこから始めるか

まず `~/.claude/skills/` に**個人用の小さなスキル**を一つ作るのがおすすめ。「いつも書いている説明テンプレート」「自分独自のレビュー観点」など、頻繁に使うけど CLAUDE.md に入れるほどではないものから始めると、感覚がつかみやすい。

慣れたらプロジェクト固有の `.claude/skills/` に共有スキルを作り、最終的にはチーム全体に配布する **Plugin** へ ─ という順で広げていける。

---

次章は、Skill の隣にあるもう一つの拡張機構 ── **Subagent** を自分で定義する話に入る。

---

## 参考情報

- [Skills (公式)](https://code.claude.com/docs/ja/skills) — SKILL.md のフルリファレンス
- [Agent Skills 標準](https://agentskills.io) — オープン標準としての仕様
