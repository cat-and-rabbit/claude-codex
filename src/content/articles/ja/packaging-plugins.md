---
title: "Plugins でパッケージ化する"
description: "Skills・Subagents・Hooks・MCP を一つの配布単位にまとめる。マニフェスト、ローカルテスト、マーケットプレイス。"
chapter: liber-4
order: 6
lastVerified: 2026-05-01
targetVersion: "2.x"
estimatedMinutes: 12
---

ここまで Skills、Subagents、Hooks、MCP を別々に扱ってきた。これらを**一つのパッケージ**にまとめて配布する仕組みが **Plugin** である。応用の章を閉じる位置づけとして、自分の拡張をパッケージ化する話に入る。

## なぜ Plugin にするか

スタンドアロン (`.claude/` 直接) と Plugin の使い分け:

| | スタンドアロン (`.claude/`) | Plugin |
|---|---|---|
| 共有 | しにくい (手動コピー) | マーケットプレイス経由で簡単 |
| 管理単位 | プロジェクトごとに散在 | 一つのリポジトリにまとまる |
| バージョン管理 | git 任せ | バージョン番号で管理 |
| スキル名 | `/hello` | `/plugin-name:hello` (名前空間付き) |
| 用途 | 個人実験、プロジェクト固有 | チーム共有、コミュニティ配布 |

「自分のリポジトリだけで使う」ならスタンドアロンで十分。**「複数プロジェクトで使い回したい」「チームで共有したい」「公開したい」**となったら Plugin の出番。

## 最小限の Plugin

Plugin はディレクトリ + マニフェスト + コンポーネントの集まり。

```
my-first-plugin/
├── .claude-plugin/
│   └── plugin.json    ← マニフェスト (必須)
└── skills/
    └── hello/
        └── SKILL.md
```

`plugin.json`:

```json
{
  "name": "my-first-plugin",
  "description": "挨拶プラグイン (基本を学ぶ用)",
  "version": "1.0.0",
  "author": {
    "name": "Your Name"
  }
}
```

`SKILL.md`:

```markdown
---
description: ユーザーをフレンドリーに挨拶する
---

ユーザー "$ARGUMENTS" を温かく挨拶し、何を手伝えるか聞く。
```

`name` フィールドがスキル名のプレフィックスになる。この例なら `/my-first-plugin:hello` で呼び出せる (名前空間によりプラグイン間の名前衝突を防ぐ)。

## ローカルでのテスト

開発中は `--plugin-dir` フラグで読み込める。

```bash
claude --plugin-dir ./my-first-plugin
```

セッション内で `/my-first-plugin:hello Alex` のように呼ぶ。スキルの修正後は `/reload-plugins` で再読み込みすると、再起動なしで反映される。

## Plugin に含められるもの

`.claude-plugin/plugin.json` 以外は、すべて**プラグインルート直下**に配置する。

| ディレクトリ / ファイル | 内容 |
|---|---|
| `skills/<name>/SKILL.md` | スキル |
| `commands/*.md` | (旧形式の) スラッシュコマンド。新規には skills を推奨 |
| `agents/<name>.md` | Subagent |
| `hooks/hooks.json` | フック設定 |
| `.mcp.json` | MCP サーバー設定 |
| `bin/` | プラグイン有効中に PATH に追加される実行ファイル |
| `settings.json` | プラグイン有効化時に適用されるデフォルト設定 |

⚠️ `commands/` `agents/` `skills/` `hooks/` を `.claude-plugin/` の中に入れる**のは間違い**。`.claude-plugin/` には `plugin.json` だけ、それ以外はプラグインルート直下に置く。

## 既存の `.claude/` を Plugin に変換する

スタンドアロン設定を Plugin にするのは、ほぼコピーで済む。

```bash
# 1. プラグイン構造を作る
mkdir -p my-plugin/.claude-plugin
echo '{"name":"my-plugin","description":"...","version":"1.0.0"}' \
  > my-plugin/.claude-plugin/plugin.json

# 2. 既存ファイルをコピー
cp -r .claude/commands my-plugin/
cp -r .claude/agents my-plugin/
cp -r .claude/skills my-plugin/
```

Hook は `.claude/settings.json` の `hooks` オブジェクトをコピーして `my-plugin/hooks/hooks.json` に貼り付ける ── 形式は同じ。

## バージョン管理

`plugin.json` の `version` フィールドが、ユーザーに更新を出すタイミングを決める。

- **`version` を明示** ─ ユーザーはこれをバンプした時だけ更新を受け取る
- **`version` を省略** ─ git のコミット SHA が使われ、毎コミットが新バージョン扱い

開発初期はコミット SHA で十分、安定リリースを切るタイミングで semver を入れていく、という流れになる。

## マーケットプレイスで配布する

Plugin を共有するには **マーケットプレイス**を使う。マーケットプレイスは GitHub リポジトリでホストできて、複数のプラグインをまとめて公開できる。

ユーザー側のインストール:

```
/plugin
```

`/plugin` コマンドでマーケットプレイス UI が開き、検索・インストール・有効/無効の切り替えができる。社内チーム向けにはプライベートリポジトリのマーケットプレイスをホストできる。

公式 Anthropic マーケットプレイスへの送信は、claude.ai または Console のフォームから。

## Plugin が提供する MCP サーバー

Plugin は MCP サーバーをバンドルできる。`.mcp.json` をプラグインルートに置く:

```json
{
  "mcpServers": {
    "database-tools": {
      "command": "${CLAUDE_PLUGIN_ROOT}/servers/db-server",
      "args": ["--config", "${CLAUDE_PLUGIN_ROOT}/config.json"]
    }
  }
}
```

`${CLAUDE_PLUGIN_ROOT}` でプラグインのルートを参照できる。プラグインを有効化するとサーバーが自動接続される。

## 信頼性とセキュリティ

Plugin は**他人が書いた Skill・Subagent・Hook・MCP サーバー**を一括導入する仕組みである。Hook は任意のシェルコマンドを実行でき、MCP は外部にデータを送れる。**信頼できる発行元のものだけインストールする**のが基本。

組織導入では、`pluginTrustMessage` (管理設定で警告に追加メッセージを入れる)、`blockedMarketplaces` (信頼できないマーケットプレイスのブロック)、`strictKnownMarketplaces` (許可リスト方式)、`allowManagedHooksOnly` (組織管理の hook のみ許可) など、Plugin 周りの管理設定でガバナンスを敷ける。

---

ここまで応用 (Liber IV) の六つの記事で、CLAUDE.md・Skills・Subagents・Hooks・MCP・Plugins と**自分の Claude Code を組み上げる仕組み**を一通り見てきた。次の章 (Liber V フロンティア) では、**Claude Code 自体の最前線** ── サンドボックス、auto モード、Agent Teams、クラウド、Agent SDK へと進む。

---

## 参考情報

- [プラグインを作成する (公式)](https://code.claude.com/docs/ja/plugins) — マニフェスト・配布・テスト方法
- [プラグインリファレンス](https://code.claude.com/docs/ja/plugins-reference) — 完全な技術仕様
- [プラグインマーケットプレイス](https://code.claude.com/docs/ja/plugin-marketplaces) — 配布の仕組み
