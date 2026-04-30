---
title: "はじめての対話"
description: "インストール後、最初の claude コマンドから VSCode 拡張での操作まで、実際に手を動かす。"
chapter: liber-1
order: 6
lastVerified: 2026-04-30
targetVersion: "2.x"
estimatedMinutes: 15
---

セットアップが終わったら、実際に動かしてみよう。まずはターミナルから、次に VSCode から、同じような操作を試してみる。

## ターミナルから試す

任意のプロジェクトディレクトリに移動して、`claude` を起動する。

```bash
cd ~/path/to/your-project
claude
```

対話モードが始まる。プロンプトが表示されたら、日本語で話しかけてよい。

```
> このディレクトリの構成を簡単に教えてほしい
```

Claude Code はファイルを読み、内容をまとめて返す。これが基本の操作である。

終了するには `Ctrl + C` を押すか、`exit` と入力する。

## VSCode から試す

VSCode でプロジェクトを開き、左サイドバーの Claude Code アイコンをクリックする。パネルが開いたら、ターミナルと同じように話しかけることができる。

```
> このプロジェクトの構成を簡単に教えてほしい
```

エディタで開いているファイルの内容は、Claude Code が自動的に認識する。

## 気づくこと

ターミナルでも VSCode 拡張でも、Claude Code がやることは同じである。ファイルを読み、考え、応答する。

違いは操作の文脈にある。ターミナルでは自分でディレクトリを移動して向きを決める必要があるが、VSCode では開いているプロジェクトがそのまま文脈になる。コードを眺めながら Claude Code に相談できるため、開発の流れを止めずに使えるのが VSCode 拡張の利点である。

---

## 参考情報

- [Claude Code クイックスタート](https://code.claude.com/docs/ja/quickstart) — 最初の操作の公式手順 <!-- パス /docs/ja/quickstart は推測。要確認 -->
- [Claude Code 公式ドキュメント](https://code.claude.com/docs/ja/overview) — 機能の全体像 <!-- パス /docs/ja/overview は推測。要確認 -->
