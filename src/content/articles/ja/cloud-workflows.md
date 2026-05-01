---
title: "クラウド型ワークフロー"
description: "/ultraplan・/ultrareview・/autofix-pr ── Claude のクラウド側で長時間動く三つのワークフローを統合的に紹介する。"
chapter: liber-5
order: 5
lastVerified: 2026-05-01
targetVersion: "2.x"
estimatedMinutes: 13
---

前章で見たクラウドセッションと Remote Control は「Claude Code を自分のマシンの外で動かす基盤」だった。本章ではその基盤の上に組まれた**三つの具体的なワークフロー** ── `/ultraplan`、`/ultrareview`、`/autofix-pr` ── を扱う。いずれも「ローカルでやるには重すぎる作業をクラウドへ預ける」点で共通している。

## 三つを一度に見る

|  | 何をするか | 主な使いどころ |
|---|---|---|
| `/ultraplan` | クラウドで深く計画を下書きし、ブラウザでセクションごとにコメントしてレビュー | 大きな設計・移行を、ターミナルが提供するより豊富な画面で詰めたい時 |
| `/ultrareview` | リモートサンドボックスで複数のレビュアーエージェントが並列に変更を探索・検証 | 実質的な変更をマージ前に深くチェックしたい時 |
| `/autofix-pr` | 現在ブランチの PR を監視し、CI 失敗やレビューコメントに自動で修正をプッシュ | レビューの往復を寝ている間に進めたい時 |

共通点は三つ。**(1)** Anthropic 管理の VM 上で動く ── ローカルリソースを食わない。**(2)** 長時間タスクに向く ── ターミナルを閉じても進む。**(3)** いずれもリサーチプレビュー段階で、仕様は変わりうる。

## /ultraplan ── ブラウザでレビュー可能な計画

`/ultraplan <prompt>` を CLI で実行すると、計画作成タスクがクラウド側 (Plan Mode で動くウェブ上の Claude Code セッション) に渡される。下書きが進む間、ターミナルは別の作業に使える。

```
/ultraplan migrate the auth service from sessions to JWTs
```

CLI には進行状況が小さなインジケータで現れる:

| 表示 | 意味 |
|---|---|
| `◇ ultraplan` | コードベースを調査中・計画下書き中 |
| `◇ ultraplan needs your input` | 質問あり。リンクを開いて応答 |
| `◆ ultraplan ready` | ブラウザでレビュー可能 |

準備できたらブラウザで開く。計画は専用ビューに表示され、**任意のパッセージにインラインコメント**を残せる。「全体に返信」ではなく、節ごとに反対意見や修正要求を書き、Claude に対処させて反復する。

レビューが済んだら**実行先を選ぶ**:

- **Approve and start coding** ── 同じクラウドセッションで Claude が実装まで続ける
- **Approve and teleport back to terminal** ── 計画をターミナルに戻し、ローカル環境で実装する

ローカルに戻すパスは、計画フェーズだけ豊富な UI を借りて、実装は手元でやりたい時に効く。

## /ultrareview ── 並列マルチエージェントの深いレビュー

`/ultrareview` は同じくクラウドサンドボックスで動くが、目的はレビューに特化している。引数なしなら現在ブランチとデフォルトブランチの差分、PR 番号を渡せばその PR をレビューする。

```
/ultrareview
/ultrareview 1234
```

ローカルの `/review` との位置づけは公式表で明示されている:

|  | `/review` | `/ultrareview` |
|---|---|---|
| 実行場所 | セッション内ローカル | クラウドサンドボックス |
| 深さ | 単一パス | 独立検証付き複数エージェントフリート |
| 期間 | 数秒〜数分 | 約 5〜10 分 |
| コスト | 通常使用量 | 無料枠後は約 5〜20 ドル/回 |
| 最適 | 反復中の素早いフィードバック | 実質的変更のマージ前の信頼度確保 |

特徴は「**より高いシグナル**」 ── 報告される検出はすべて独立に再現・検証されるので、スタイル提案ではなく実際のバグに焦点が当たる。レビューはバックグラウンドで進み、`/tasks` で追跡できる。

CI に組み込むなら対話なしの `claude ultrareview` サブコマンドを使う。レビュー完了を待ってブロックし、検出を stdout に出して終了コードを返す。`--json` で生ペイロード、`--timeout <分>` で待機時間を制御できる。

### 課金に注意

`/ultrareview` は**プラン使用量とは別の追加使用量 (extra usage) として課金される**プレミアム機能。Pro / Max には 2026 年 5 月 5 日まで 3 回の無料枠があるが、リモートセッションが立ち上がった時点で 1 回消費されるので、誤って起動した分も無料枠から引かれる。起動前に追加使用量を有効化していないとそもそも起動がブロックされる。

## /autofix-pr ── PR を見守って自動修正

`/autofix-pr` は前の二つと毛色が違う。「ある時点の作業を依頼する」のではなく、「**ある PR を見張り続けて、何かあったら反応する**」常駐型のクラウドセッションを生成する。

```
/autofix-pr
/autofix-pr only fix lint and type errors
```

引数なしならすべての CI 失敗とレビューコメントが対象。プロンプトを渡せばスコープを絞れる (上の例では lint / type error 限定)。

CLI で実行する場合、`gh pr view` で現在ブランチに紐づく PR を検出する。**別の PR を監視したいなら、まずそのブランチをチェックアウトしておくこと**。

### Claude が PR イベントにどう反応するか

公式の挙動定義はおおむね三分類:

- **明確な修正** ── 自信があり過去の指示と矛盾しなければ、変更を加えてプッシュし、セッションに何をしたか残す
- **曖昧なリクエスト** ── 複数の解釈ができたり建築的に重要な場合、行動前に確認を求める
- **重複・無アクション** ── 何もしなくていい場合はセッションに記録だけして続行

レビューコメントへの返信はあなたの GitHub アカウントで投稿されるが、各返信に Claude Code 由来であるラベルが付く。レビュアーには「これはエージェントの返答だ」と分かる。

### 前提条件

`/autofix-pr` は他の二つより前提が多い:

- `gh` CLI ([Claude Code on the web](https://code.claude.com/docs/ja/claude-code-on-the-web) と認証が連携していること)
- リポジトリへの **Claude GitHub App** インストール (PR webhook を受けるため必須)
- ターミナルから起動する場合、現在ブランチが PR と紐づいていること

なお、リポジトリが PR コメントをトリガに動く自動化 (Atlantis、Terraform Cloud、`issue_comment` イベントの GitHub Actions など) を使っている場合、Claude の返信がそれらをキックする可能性がある。**特権操作を伴うリポジトリでは autofix を有効にする前に整理する**こと、と公式が明記している。

## どれをいつ使うか

迷ったらこの順で考えると整理しやすい:

- **設計を詰めたい** → `/ultraplan` (ブラウザでセクション単位にコメントできる)
- **マージ前に深く確認したい** → `/ultrareview` (並列エージェントで独立検証)
- **PR の細かい往復を任せたい** → `/autofix-pr` (常駐させて反応してもらう)

「ローカルで素早く済むなら `/plan` `/review` で十分」が原則。クラウド型は**長時間・深い調査・並列・常駐**のいずれかが効く時に選ぶ。

## 共通の利用要件

三つに共通する制約も押さえておく:

- いずれも Anthropic のクラウドインフラで動くため、**Amazon Bedrock / Google Cloud Vertex AI / Microsoft Foundry** 経由で Claude Code を使っている場合は利用不可
- **Zero Data Retention** を有効にしている組織でも利用不可
- API キーのみで認証している場合は `/login` で claude.ai アカウントを通す必要がある
- いずれもリサーチプレビュー段階。バージョン要件は `/ultraplan` が v2.1.91 以降、`/ultrareview` が v2.1.86 以降 ── 古い CLI なら先にアップデートする

---

ここまでのクラウド型ワークフローは、いずれも**「Claude が主体で、人がレビューや承認で介入する」**形だった。次章では立場を逆転させ、**外部スクリプトや CI から Claude を呼び出す** Headless モードと Routines (定期実行) を見ていく。

---

## 参考情報

- [Plan complex changes with ultraplan (公式)](https://code.claude.com/docs/ja/ultraplan) — `/ultraplan` の完全リファレンス
- [Find bugs with ultrareview (公式)](https://code.claude.com/docs/ja/ultrareview) — `/ultrareview` の仕様と価格
- [Auto-fix pull requests (公式)](https://code.claude.com/docs/ja/claude-code-on-the-web#auto-fix-pull-requests) — `/autofix-pr` を含むウェブ環境のリファレンス
