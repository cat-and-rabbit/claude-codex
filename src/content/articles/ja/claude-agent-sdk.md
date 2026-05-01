---
title: "Claude Agent SDK"
description: "Claude Code の基盤となる Python/TypeScript ライブラリ。CI や本番自動化、自分用エージェントを組むための入口を概観する。"
chapter: liber-5
order: 7
lastVerified: 2026-05-01
targetVersion: "2.x"
estimatedMinutes: 11
---

前章の `claude -p` で見た「ヘッドレス Claude Code」の延長線上に、**Claude Agent SDK** がある。`claude -p` を bash で叩く代わりに、Python か TypeScript のコードから同じエージェントループを呼ぶための公式ライブラリである。Claude Code を「製品」ではなく「**部品**」として組み込みたい時の入口になる。

## SDK と Claude Code の関係

最初に位置関係をはっきりさせる。

|  | Claude Code (CLI / 拡張) | Claude Agent SDK |
|---|---|---|
| 形態 | エンドユーザ向けの製品 | ライブラリ |
| 起動 | `claude` コマンド、VSCode 拡張 | `import` してコードから呼ぶ |
| 言語 | ─ | Python / TypeScript |
| 想定読者 | 開発者本人が対話する | アプリケーション開発者が組み込む |
| 認証 | claude.ai サブスクリプション可 | **API キーが必要** |

中身のエージェントループ ── Read / Write / Edit / Bash / Glob / Grep などの組み込みツール、コンテキスト管理、サブエージェント、Hooks、MCP ── は **Claude Code と同じものが SDK でも使える**。Claude Code は「この SDK でできた完成品の一つ」と捉えると見通しが良い。

なお、もともと「Claude Code SDK」と呼ばれていた SDK が「Claude Agent SDK」に改名された経緯がある。古い名前で書かれた記事を読む時は同じものを指していると思って良い。

## いつ手を伸ばすか

`claude -p` で済む粒度の自動化なら、わざわざ SDK を引き入れる必要はない。SDK が効いてくるのは次のような場面である。

- **CI/CD パイプライン** ── テスト失敗時に Claude が自動修正 PR を出す、リリースノート生成、etc.
- **本番環境の自動化** ── サーバ常駐のジョブ、バッチ処理、長時間ワークフロー
- **カスタムアプリケーション** ── 自社プロダクトに「Claude Code 的な」エージェントを組み込む。メールアシスタント、リサーチエージェント、社内ツール
- **エージェント実験** ── 独自の権限制御や Hooks を Python/TypeScript のロジックで動かしたい時

逆に **対話的な日々の開発は CLI / VSCode 拡張のまま**で良い。SDK で REPL を再発明する意味はない。公式の指針も「インタラクティブは CLI、CI と本番は SDK」と明確である。

## インストールと最初の一歩

両言語ともパッケージマネージャから入る。

```bash
# TypeScript
npm install @anthropic-ai/claude-agent-sdk

# Python
pip install claude-agent-sdk
```

TypeScript SDK は Claude Code バイナリをオプション依存として同梱しているので、別途 `claude` をインストールする必要はない。

API キーを環境変数にセットする:

```bash
export ANTHROPIC_API_KEY=sk-...
```

Anthropic Console (`platform.claude.com`) でキーを発行する。**claude.ai の Pro / Max サブスクリプションは SDK では使えない** ── これは公式が明示しており、サードパーティ開発者には API キー認証のみが許可されている。Bedrock / Vertex AI / Azure 経由の認証もサポートされる。

### Hello World (Python)

```python
import asyncio
from claude_agent_sdk import query, ClaudeAgentOptions


async def main():
    async for message in query(
        prompt="What files are in this directory?",
        options=ClaudeAgentOptions(allowed_tools=["Bash", "Glob"]),
    ):
        if hasattr(message, "result"):
            print(message.result)


asyncio.run(main())
```

### Hello World (TypeScript)

```typescript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: "What files are in this directory?",
  options: { allowedTools: ["Bash", "Glob"] }
})) {
  if ("result" in message) console.log(message.result);
}
```

どちらも、**`query()` を呼ぶとメッセージのストリームが返ってくる**という同じ構造である。エージェントループ (ツール呼び出し → 結果返却 → 次の判断) は SDK 側が回してくれるので、「自分でツール実装ループを書く」必要はない。これが素の Anthropic Client SDK との一番の違いになる。

## SDK で使える Claude Code の機能

Claude Code を強くしているもの ── 応用の章で扱った要素 ── はそのまま SDK でも利用できる。代表的なものを並べると:

- **組み込みツール**: Read / Write / Edit / Bash / Glob / Grep / WebSearch / WebFetch など
- **Hooks**: `PreToolUse`、`PostToolUse`、`SessionStart` などのライフサイクルフックでカスタムロジックを差し込める
- **サブエージェント**: 特化エージェントを定義して委譲できる
- **MCP**: Playwright や DB など、外部システムとの接続
- **権限制御**: `allowed_tools` でホワイトリスト、`permission_mode` で対話レベルを制御
- **セッション**: `session_id` を保存して会話を再開できる
- **ファイルベース設定**: `.claude/skills/`、`.claude/commands/`、`CLAUDE.md` も読み込まれる (`setting_sources` で範囲制御)

つまり「**応用の章で身につけた知識がそのまま SDK でも効く**」。Skills や Subagents の書き方は CLI と SDK で共通である。

## 注意しておきたい点

実際に SDK で組み始める前に、いくつか頭に入れておきたい。

### コストの主体は自分

CLI を Pro / Max プランで使っている時は「定額の中」だが、SDK は API キー従量課金になる。長時間ループや大規模コードベースの全件処理を組む時は、**料金計算を先にする**こと。`max_turns` のような上限設定や Hooks による打ち切り条件を入れておくと、暴走時の被害を抑えられる。

### 本番に出す前に Managed Agents も見る

Anthropic は別系統の **Managed Agents** という、ホスト型の REST API も提供している。エージェントとサンドボックスを Anthropic 側で動かしてくれる仕組みで、長時間実行や非同期セッションが求められる本番ユースケースに向く。「Agent SDK でローカルにプロトタイプ → 本番で Managed Agents に移行」が公式が示す典型パスである。インフラを自分で持ちたいなら SDK のまま、持ちたくないなら Managed Agents、と切り分けると良い。

### バージョン要件

最新のモデル (例: Opus 4.7) を使うには SDK もそれなりに新しい必要がある。`thinking.type.enabled` のような API エラーが出たら、まず SDK を上げてみる。

### ブランド規約

SDK で組んだエージェントを公開製品にする時、**「Claude Code」「Claude Code Agent」という名前は使えない**。「Claude Agent」「Powered by Claude」など、Anthropic のブランドガイドラインに沿った表記が要る。

---

## 結 ── 写本を閉じるにあたって

ここまでで本書の全章を通った。

- **序 (Liber I)** ── Claude Code とは何で、どう手元に入れるか
- **基礎 (Liber II)** ── プロンプトの書き方、コンテキストの渡し方、最初の `CLAUDE.md`
- **実践 (Liber III)** ── 大きなタスクの分割、レビューの目、Plan モード、ロールバック、失敗からの回復
- **応用 (Liber IV)** ── Skills、Subagents、MCP、Hooks、Plugins。Claude Code を自分の環境に組み上げる
- **フロンティア (Liber V)** ── Sandbox、Auto モード、Agent Teams、クラウド、ヘッドレス、そして Agent SDK

最初は VSCode のサイドバーで Claude と一言交わすところから始まり、最後はコードから Claude Code の中身そのものを呼び出すところまで来た。手の延長として始まった道具が、最終的には **道具を組み立てる素材** にまで降りていく ── この往復こそが Claude Code を使う面白さの大半を占めている、と編者は思っている。

ただし、本書が扱っている世界 ── Claude Code とその周辺 ── は、紙の本のような落ち着き方をしていない。**毎月のように新しい機能が出て、コマンドが増え、たまに名前すら変わる**。本書も「lastVerified」のスタンプを各記事に押しているのは、そのためである。読者が本書を開いた時点で、すでに古びている記述があるかもしれない。怪しいと思った時は、各記事末尾の「参考情報」から公式ドキュメントへ渡って、最新の挙動を確認してほしい。

本書 ── 「Claude Code 写本」 ── は、読者の手に馴染むペースで、これからも更新を続けていく。Claude Code が進化を止めない限り、写本も書き継がれる。読み終えたあなたの手元で、この道具がよく働くことを願って、ひとまずここで筆を置く。

---

## 参考情報

- [Claude Agent SDK の概要 (公式)](https://code.claude.com/docs/ja/agent-sdk) — SDK 全体の入口
- [Agent SDK クイックスタート](https://code.claude.com/docs/ja/agent-sdk/quickstart) — 数分で動くエージェントを作るチュートリアル
- [エージェントの例 (GitHub)](https://github.com/anthropics/claude-agent-sdk-demos) — メールアシスタントやリサーチエージェントなど実装例
