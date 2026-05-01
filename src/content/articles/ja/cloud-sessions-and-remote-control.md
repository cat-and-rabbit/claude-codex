---
title: "Claude Code on the web と Remote Control"
description: "クラウド VM で Claude Code を動かす Web 版と、ローカルセッションを別デバイスから操舵する Remote Control。Claude をマシンの外に開放する二つの仕組みと使い分け。"
chapter: liber-5
order: 4
lastVerified: 2026-05-01
targetVersion: "2.x"
estimatedMinutes: 13
---

ここまで複数 Claude をローカルで協調させる Agent Teams を見てきた。本章はもう一段視野を広げ、**Claude Code をローカルマシンの外で動かす**、あるいは**外から動かす**話に入る。Anthropic は二つの仕組みを用意している ── クラウド VM 上でセッションを走らせる **Claude Code on the web** と、ローカル CLI セッションをブラウザ・モバイルから操舵する **Remote Control** である。名前が似ていて混同しやすいので、まず役割の違いから整理する。

## 二つの違いは「どこで Claude が動くか」

| | Claude Code on the web | Remote Control |
|---|---|---|
| Claude が動く場所 | **Anthropic 管理のクラウド VM** | **自分のマシン** (CLI / VS Code) |
| 接続するもの | claude.ai/code 上の新しいセッション | すでに走っているローカルセッション |
| ローカルファイル | クローンした GitHub リポジトリのみ | ローカルファイルシステムそのまま使える |
| MCP サーバー・ツール | リポジトリにコミットされたものだけ | ローカル設定がそのまま効く |
| マシンの稼働 | 不要 (ブラウザを閉じても継続) | 必須 (プロセスが落ちたら終了) |
| プラン | Pro / Max / Team / Enterprise (リサーチプレビュー) | 全プラン (Team/Enterprise は管理者トグル) |

要するに **Web は「クラウドに新しい作業場を借りる」、Remote Control は「手元の作業場の窓を別デバイスに開く」** である。両者とも UI は同じ [claude.ai/code](https://claude.ai/code) を使うが、内側で起きていることはまったく違う。

## Claude Code on the web

### 何が起きるか

Web セッションを開始すると、Anthropic 管理の VM (4 vCPU / 16 GB RAM / 30 GB ディスク) が立ち上がり、指定した GitHub リポジトリがクローンされる。そこに Claude Code がインストールされており、リポジトリの `CLAUDE.md`、`.claude/settings.json`、`.mcp.json`、`.claude/skills/`、`.claude/agents/`、`.claude/commands/` などはすべて読まれる。Python・Node.js・Ruby・Go・Rust・PostgreSQL・Redis・Docker などはプリインストール済み。

VM はブラウザを閉じても動き続けるため、長時間タスクを投げてから出かけ、あとでモバイルアプリから進捗を見るような使い方ができる。

### 何が引き継がれないか

ここが落とし穴である。**ローカルマシンに依存するものは何一つ持ち込まれない**。

- ユーザースコープの `~/.claude/CLAUDE.md`
- `claude mcp add` で個人設定に書いた MCP サーバー
- ローカルのシークレット、API トークン、SSO 認証
- `~/.claude/settings.json` にだけ有効化したプラグイン

これらをクラウドで使いたければ、リポジトリの `.claude/settings.json` や `.mcp.json` にコミットしておくか、環境設定の環境変数に書く。専用シークレットストアはまだ存在しないので、環境変数に置いた値は環境を編集できる人全員から見える点に注意。

### セッションを開始する三つの経路

| 経路 | コマンド / 操作 |
|---|---|
| ターミナルから新規 Web セッション | `claude --remote "..."` |
| ブラウザから直接 | claude.ai/code でタスク入力 |
| プランだけローカルで作って Web に投げる | `--permission-mode plan` で起案 → コミット → `claude --remote "Execute the plan in docs/plan.md"` |

`--remote` はカレントディレクトリの GitHub リモートを現在のブランチでクローンするので、**ローカルコミットがあれば先に push しておく**。GitHub 未接続のリポジトリの場合はローカルバンドルとしてアップロードされるが、その場合は結果を push し戻せない。

### `/teleport` で Web セッションをローカルに引き寄せる

クラウドで動いていたセッションを手元のターミナルで続きをやりたくなったら `/teleport` (短縮 `/tp`) を使う。

```bash
# CLI から直接
claude --teleport              # ピッカーが出る
claude --teleport <session-id> # 直接指定

# 既存セッション内から
/teleport
```

実行すると、Claude はリポジトリ整合性をチェックし、クラウドセッションのブランチを fetch して checkout し、会話履歴をローカルに読み込む。要件:

- 作業ディレクトリが clean (汚れていれば stash を促される)
- 同じリポジトリのチェックアウトから実行 (フォークではダメ)
- クラウドセッションのブランチが GitHub にプッシュされている
- 同じ claude.ai アカウントでログイン済み

**重要な非対称性**: テレポートは **Web → ローカルの一方向**である。ローカルセッションをそのまま Web に「押し出す」ことはできない。Web 側で続けたければ `claude --remote` で**新しい**クラウドセッションを作る、というモデルになる。

### 使い時

- ローカル環境を離れた場所から長時間タスクを回したい
- リポジトリをクローンしていない環境で素早く着手したい
- 複数タスクを並列で投げたい (`claude --remote` を複数回叩く)
- ラップトップのリソースを超えるビルドや CI 修正を回したい

逆に、ローカルの MCP・個人設定・未コミットファイルに依存する作業は Web では辛い。そういうときに登場するのが Remote Control である。

## Remote Control

### 何が起きるか

`claude remote-control` を叩くと、ローカルの Claude Code プロセスが Anthropic API に登録され、リモート接続を待ち受ける。スマホで claude.ai/code を開く (もしくは表示された QR をスキャンする) と、そのローカルプロセスに対してメッセージを送れる。

Claude は**ずっとローカルマシンで動いている**。クラウドに行くのはメッセージのやり取りだけで、ファイル編集・MCP・コマンド実行はすべて手元で起きる。Web/モバイル UI はそのローカルセッションへの「窓」にすぎない。

### 起動の仕方

呼び出しモードが三つあり、要件は Claude Code v2.1.51 以降。

| モード | コマンド | 性格 |
|---|---|---|
| サーバーモード | `claude remote-control` | リモート接続専用。ターミナルではメッセージ入力できない。複数同時セッションも可 |
| 対話型 + リモート | `claude --remote-control` (短縮 `--rc`) | ターミナルからもブラウザからも入力可 |
| 既存セッションを公開 | セッション内で `/remote-control` (短縮 `/rc`) | 進行中の会話をそのままリモート対応に |
| VS Code | プロンプトボックスで `/remote-control` | v2.1.79 以降。バナーから接続状態とブラウザリンクが見える |

サーバーモードでは `--name "My Project"` でセッション名を付けたり、`--spawn worktree` で接続ごとに git worktree を切ったり、`--sandbox` でファイルシステム/ネットワーク隔離を有効にできる。スペースバーで QR コード表示をトグル。

すべての対話型セッションで自動的に有効化したい場合は、`/config` の **Enable Remote Control for all sessions** を `true` にする。

### 接続できる先

- ブラウザで claude.ai/code を開く
- iOS / Android の Claude モバイルアプリ (`/mobile` でダウンロード QR が出る)
- 表示された QR を直接スキャン

接続中のデバイス間で会話が同期されるので、**ターミナルでタイプしながらスマホからも投げる**ような使い方ができる。Claude が長時間タスクの完了タイミングなどでスマホにプッシュ通知を送る機能 (v2.1.110 以降) もあり、`/config` の **Push when Claude decides** で有効化する。

### 認証と要件

- claude.ai 経由のサブスクリプション認証が必須 (API キー、Bedrock、Vertex、Foundry はサポート対象外)
- ワークスペース信頼ダイアログを一度受け入れておく
- Team / Enterprise では管理者が [admin-settings/claude-code](https://claude.ai/admin-settings/claude-code) で **Remote Control** トグルをオンにする必要がある
- `claude setup-token` などの長命トークンは推論専用で Remote Control を確立できない。`claude auth login` でフルスコープのセッショントークンを取る

### 制限

- ローカルプロセスが落ちる (ターミナル閉じる、VS Code 終了、`claude` プロセス停止) と即終了
- 約 10 分以上ネットワークが切れるとタイムアウトしてプロセスが終わる
- `/mcp`、`/plugin`、`/resume` などターミナルのインタラクティブピッカーを開くコマンドはローカル CLI 専用 (Web/モバイルでは使えない)
- ultraplan セッションを開始するとアクティブな Remote Control は切断される (両機能が同じ claude.ai/code 枠を取り合うため)

## 使い分けの目安

| やりたいこと | 選ぶもの |
|---|---|
| ラップトップを閉じて出かけたい | **Web** (VM が動き続ける) |
| 出先からスマホで様子見たい・指示出したい (作業はマシンで) | **Remote Control** |
| ローカルの MCP・個人設定・未コミットファイルが必要 | **Remote Control** |
| 複数タスクを完全並列で回したい | **Web** (`--remote` を複数回) |
| クローンしてないリポジトリでサッと作業したい | **Web** |
| マシンのリソース超えるビルドを回したい | **Web** |
| プランは机で立てて実行は出先で操舵したい | プランモード → `/remote-control` |

両方を組み合わせる手もある。`claude --remote` でクラウドにタスクを投げ、進行中はモバイルアプリから様子を見て、結論が出たら `/teleport` でローカルに引き寄せて仕上げる、といった流れである。

---

ここまで Claude を**動かす基盤**としてのクラウドとリモート制御を見てきた。次はその基盤の上に乗る**ワークフロー** ── `/ultraplan`、`/ultrareview`、`/autofix-pr` といったクラウド前提の組み込みコマンド群に進む。

---

## 参考情報

- [ウェブ上の Claude Code を使用する (公式)](https://code.claude.com/docs/ja/claude-code-on-the-web) — クラウド環境、ネットワークアクセス、`--remote` / `--teleport` の完全リファレンス
- [Remote Control (公式)](https://code.claude.com/docs/ja/remote-control) — 接続、セキュリティ、トラブルシューティング
- [Web クイックスタート](https://code.claude.com/docs/ja/web-quickstart) — GitHub 接続から最初のタスク送信まで
