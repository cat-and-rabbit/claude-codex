---
title: "自動化と CI 連携"
description: "claude -p による非対話実行、Routines によるクラウドでの定期実行、ローカルのバックグラウンドタスク。外部から Claude を呼び出す三つの道具。"
chapter: liber-5
order: 6
lastVerified: 2026-05-01
targetVersion: "2.x"
estimatedMinutes: 14
---

前章で扱ったクラウド型ワークフローは、Claude が主体となって動く方向の話だった。本章は逆方向 ── **外部のスクリプトや CI が Claude を呼び出す**側の話である。CI のステップから一行で実行する `claude -p`、Anthropic 側のクラウドで定期実行する Routines、開いているセッション内で並走させる Background tasks の三つを順に見ていく。

## Headless モード ── `claude -p`

`-p` (`--print`) フラグを付けると、Claude Code は対話 UI を立ち上げず、プロンプトを受けて応答を標準出力に書き出して終了する。CI のステップ、Git のプリコミットフック、シェルスクリプトから Claude を呼び出す基本形である。

```bash
claude -p "auth.py のバグを見つけて直して" --allowedTools "Read,Edit,Bash"
```

すべての CLI オプションが `-p` でも有効に働く。以下、CI で必要になるものを順に押さえる。

<!-- 公式が「以前 headless mode と呼ばれていた」と明記しているので、慣用名として「Headless モード」を使い続ける -->

### `--bare` で起動を最小化する

何も付けないと `claude -p` は対話セッションと同じだけの文脈を読み込む。作業ディレクトリの CLAUDE.md、`~/.claude` の設定、hooks、skills、plugins、MCP サーバー、auto memory ── すべて自動でロードされる。これは手元では便利だが、CI では**実行マシンごとに結果が変わる**原因になる。

`--bare` を渡すとそれらの自動検出をすべてスキップする。読み込まれるのは「明示的にフラグで渡したもの」だけ。

```bash
claude --bare -p "このファイルを要約して" --allowedTools "Read"
```

ベアモードで使えるのは Bash、ファイル読み取り、ファイル編集の基本ツール。追加で文脈を渡したい時は明示的にフラグを付ける:

| 読み込みたいもの | 使うフラグ |
|---|---|
| システムプロンプト追加 | `--append-system-prompt` `--append-system-prompt-file` |
| 設定 | `--settings <file-or-json>` |
| MCP サーバー | `--mcp-config <file-or-json>` |
| カスタムエージェント | `--agents <json>` |
| プラグインディレクトリ | `--plugin-dir <path>` |

ベアモードは OAuth とキーチェーン参照もスキップする。Anthropic API の認証は `ANTHROPIC_API_KEY` 環境変数か、`--settings` 内の `apiKeyHelper` から取得する必要がある。Bedrock / Vertex / Foundry を使う場合は通常のプロバイダ認証情報がそのまま使える。

公式は **CI とスクリプト呼び出しの推奨モードがベアモード**としており、将来のリリースでは `-p` のデフォルトになる予定である。新規スクリプトはベアモード前提で書いておくと移行が楽になる。

### `--allowedTools` で権限を事前承認

対話セッションでは権限プロンプトが出るところを、`-p` では事前にホワイトリスト化しておく必要がある。プロンプトに答える人間がいないからである。

```bash
claude -p "テストを実行して失敗を直して" \
  --allowedTools "Bash,Read,Edit"
```

より細かく Bash の特定コマンドだけ許可することもできる。許可ルール構文 (応用の章で扱った Hooks と同じ構文) を使う:

```bash
claude -p "ステージされた変更を見て、適切なコミットを作成して" \
  --allowedTools "Bash(git diff *),Bash(git log *),Bash(git status *),Bash(git commit *)"
```

末尾の ` *` (前のスペース込み) でプレフィックス一致になる。スペースを入れ忘れて `Bash(git diff*)` と書くと `git diff-index` にもマッチしてしまうので注意。

ロックダウンしたい CI 実行では、個別ツールを並べる代わりに `--permission-mode dontAsk` を渡す手もある。これは `permissions.allow` ルールと[読み取り専用コマンドセット](https://code.claude.com/docs/ja/permissions#read-only-commands)に列挙されたもの**以外を全部拒否する**モードである。

なお `/commit` のようなユーザ呼び出しのスキルや組み込みコマンドは対話モード専用で、`-p` では使えない。代わりに「やってほしい作業」を自然文で書く。

### `--output-format` で構造化出力を取る

`--output-format` には三つの値がある:

| 値 | 用途 |
|---|---|
| `text` (デフォルト) | プレーンテキスト |
| `json` | 結果・セッション ID・メタデータを含む構造化 JSON |
| `stream-json` | 改行区切り JSON のリアルタイムストリーミング |

JSON 出力をパイプして他のスクリプトに渡すのが、CI 連携で最も使う形になる。例えば `jq` で結果フィールドだけ抜き出す:

```bash
claude -p "このプロジェクトを要約して" --output-format json | jq -r '.result'
```

特定のスキーマで返してほしい時は `--json-schema` も併用する。応答の `structured_output` フィールドに、スキーマに従った構造で結果が入ってくる:

```bash
claude -p "auth.py から関数名を抽出して" \
  --output-format json \
  --json-schema '{"type":"object","properties":{"functions":{"type":"array","items":{"type":"string"}}},"required":["functions"]}' \
  | jq '.structured_output'
```

`stream-json` はトークンが生成されるそばから流したい時に使う。`--verbose` と `--include-partial-messages` を組み合わせる必要がある:

```bash
claude -p "再帰を説明して" --output-format stream-json --verbose --include-partial-messages | \
  jq -rj 'select(.type == "stream_event" and .event.delta.type? == "text_delta") | .event.delta.text'
```

### `--append-system-prompt` で振る舞いをカスタムする

デフォルトのシステムプロンプトは保ったまま、その末尾に指示を足したい時は `--append-system-prompt` を使う。例えば PR の diff をパイプして、セキュリティ観点でレビューさせる:

```bash
gh pr diff "$1" | claude -p \
  --append-system-prompt "あなたはセキュリティエンジニアである。脆弱性をレビューせよ。" \
  --output-format json
```

完全に置き換えたい場合は `--system-prompt` (append でない方) を使う。これは Claude Code のデフォルト挙動を全部捨てるので、よほど特殊な用途以外では `--append-system-prompt` の方が安全。

### `--continue` `--resume` でセッションを継ぎ足す

CI ステップを跨いで会話を継続したい時は `--continue` か `--resume` を使う。`--continue` は最新のセッション、`--resume <session-id>` は特定のセッションを再開する。

```bash
# 最初のリクエスト
claude -p "このコードベースのパフォーマンス問題をレビューして"

# 最新の会話を継ぐ
claude -p "次は DB クエリに焦点を当てて" --continue
claude -p "見つかった問題のサマリーを出して" --continue
```

複数の会話を同時に走らせる時は、JSON 出力からセッション ID をキャプチャして `--resume` に渡す:

```bash
session_id=$(claude -p "レビューを始めて" --output-format json | jq -r '.session_id')
claude -p "そのレビューを続けて" --resume "$session_id"
```

CI の各ステップが独立して呼ばれる場合、この再開機構は **ステップ間で文脈を保つほぼ唯一の方法**になる。

## Routines ── クラウドで定期実行する

Headless モードは「外側のシステム (CI、cron、Git フック) が Claude を起動する」モデルだった。**Routines は逆に、Anthropic 側のクラウドが時間や外部イベントを監視して Claude を起動する**。ラップトップを閉じても動き続ける、自分で管理しなくていい cron のような存在である。

ルーティンは「プロンプト + 1 つ以上のリポジトリ + コネクタの組み合わせ」を保存した構成で、一度定義しておけばトリガーに応じて自動実行される。

### 三つのトリガー

| トリガー | 起動条件 |
|---|---|
| **Schedule** | 時間ごと・毎日・平日・毎週などの定期実行 |
| **API** | ベアラトークン付きで HTTP POST を専用エンドポイントに送ると起動 |
| **GitHub** | PR の open / merge / リリース作成などのリポジトリイベントに反応 |

一つのルーティンに複数のトリガーを混在させられる。例えば「毎晩走り、デプロイスクリプトからも呼ばれ、新規 PR にも反応する」レビュールーティンが作れる。

### ユースケースの例

トリガータイプと相性のいい作業を組み合わせると、価値が出やすいパターンが見えてくる。

- **バックログメンテナンス** (Schedule): 毎晩、課題追跡ツールを巡回して、新規 issue にラベル付けと担当割り当て、Slack に概要投稿
- **アラートトリアージ** (API): 監視ツールが閾値超過を検知したらルーティンの API を叩く。スタックトレースと最近のコミットを突き合わせ、修正案付きのドラフト PR を開く
- **カスタムコードレビュー** (GitHub `pull_request.opened`): チーム独自のチェックリストを適用してインラインコメント。人間レビュアーは設計に集中できる
- **デプロイ検証** (API): CD パイプラインが本番デプロイ後にルーティンを呼ぶ。スモークテスト実行、エラーログ走査、リリースチャネルに go/no-go を投稿
- **ドキュメントドリフト** (Schedule): 毎週、マージされた PR を走査して、変更された API のドキュメントに更新 PR を出す

共通するのは「**無人で実行可能・繰り返し可能・成果が明確**」という性質。これに当てはまらない作業 (相互の議論や試行錯誤が要るもの) はルーティンには向かず、対話型セッションでやる方がよい。

### 作成と管理

ルーティンは Web、Desktop アプリ、CLI のどこからでも作れる。三つのサーフェスは同じクラウドアカウントに書き込むので、CLI で作ったルーティンも [claude.ai/code/routines](https://claude.ai/code/routines) に即座に表示される。

CLI からは `/schedule` で作成・管理する:

```
/schedule daily PR review at 9am   # その場で説明を渡して作成
/schedule list                      # 全ルーティンを表示
/schedule update                    # 既存ルーティンを変更
/schedule run                       # 即時起動
```

ただし **CLI の `/schedule` で作れるのはスケジュールトリガー型のみ**である。API トリガーや GitHub トリガーを足す時は Web の編集画面に行く必要がある。

### 実行モデル

ルーティンは「完全な Claude Code クラウドセッション」として自律実行される。実行中の権限プロンプトは出ない。シェルコマンドの実行、リポジトリにコミットされたスキルの利用、含めたコネクタの呼び出しがすべて可能で、何ができるかは「選んだリポジトリのブランチプッシュ設定」「環境のネットワークアクセスと環境変数」「含めたコネクタ」の三つで決まる。

デフォルトでは Claude が触れるブランチは `claude/` プレフィックス付きのものに制限されている。保護ブランチを誤って書き換える事故を防ぐためで、必要なリポジトリだけ「Allow unrestricted branch pushes」を有効化する。

### 利用要件

- **プラン**: Pro / Max / Team / Enterprise のいずれか
- **Claude Code on the web** が有効化されていること
- **GitHub トリガー**には Claude GitHub App のインストールが別途必要 (CLI の `/web-setup` だけでは webhook 配信が有効にならない)

ルーティンは個人の claude.ai アカウントに紐付き、チームメイトとは共有されない。アカウントごとに **1 日あたりの実行数上限**があり、現在の残量は [claude.ai/code/routines](https://claude.ai/code/routines) または [claude.ai/settings/usage](https://claude.ai/settings/usage) で確認できる。

API トリガーは Research Preview 段階で、`/fire` エンドポイントは `experimental-cc-routine-2026-04-01` ベータヘッダーの下で出荷されている。リクエスト・応答の形やレート制限は変わる可能性があるので、長期運用に組み込む時は破壊的変更の追従を覚悟する。

## Background tasks ── ローカルで並走させる

最後に短く触れておく。対話セッションの中で長時間タスクを走らせたい時は、`Ctrl+B` でバックグラウンドに送れる。Claude が応答を生成し続けながら、自分は別の指示を出して進められる、という形である。

Headless モードや Routines が「外から Claude を呼ぶ」自動化なのに対し、Background tasks は「**今開いているセッションの中で並列度を上げる**」道具と考えると位置づけが分かりやすい。一つのテストスイートをバックグラウンドで走らせつつ、別のリファクタを依頼する、といった使い方をする。

---

ここまで見てきた `-p` フラグの先には、もう一段プログラム的なレイヤーがある。**Python や TypeScript から Claude Code を呼べる Agent SDK** である。次章ではそこに進む ── `claude -p` で書いていたシェルスクリプトを、構造化された SDK 呼び出しに昇格させる方向を扱う。

---

## 参考情報

- [Claude Code をプログラムで実行する (公式)](https://code.claude.com/docs/ja/headless) — `claude -p` と Agent SDK CLI のリファレンス
- [ルーティンで作業を自動化する (公式)](https://code.claude.com/docs/ja/routines) — Routines の完全リファレンス
- [CLI リファレンス](https://code.claude.com/docs/ja/cli-reference) — 全 CLI フラグと許可ルール構文
