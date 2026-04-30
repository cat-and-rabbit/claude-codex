---
title: "Claude Code の種類と本書の対象"
description: "CLI・VSCode 拡張・Desktop アプリ・Web 版の違いと、本書が何を扱うかの整理。"
chapter: liber-1
order: 3
lastVerified: 2026-04-30
targetVersion: "2.x"
estimatedMinutes: 8
---

Claude Code にはいくつかの形がある。本書を読み進める前に、どれが対象かを明確にしておきたい。

## 種類の整理

### ターミナル（CLI）

ターミナルから `claude` コマンドで呼び出す、最も基本となる形である。すべての機能を使える。設定ファイル、カスタムコマンド、MCP との連携など、本書で扱う内容の多くはここを前提とする。

### VSCode 拡張

VSCode のサイドバーから Claude Code を呼び出せる拡張機能である。内部では CLI が動いており、できることは CLI と変わらない。エディタの中でコードを見ながら操作できるため、多くのエンジニアにとって自然な使い方になる。

### Desktop アプリ

Mac・Windows 向けのネイティブアプリとして提供されている。CLI のインストールなしに使い始めることができ、GUI で直感的に操作できる。ただし、設定ファイルや MCP などの高度な機能を使うには CLI と組み合わせることになる。

### Web（claude.ai/code）

ブラウザから使える版である。ローカル環境へのアクセスはなく、自分のコードベースに直接触ることはできない。

## 本書が扱う範囲

本書の中心は **CLI と VSCode 拡張** の2つである。

CLI はすべての機能の土台であるため、まずここを押さえてほしい。その上で、日々の開発では VSCode 拡張を主な操作窓口として使う想定で書き進める。

Desktop アプリと Web 版については、基本的な考え方は共通するため、CLI の知識がそのまま役に立つ。ただし操作手順の細部は異なるため、本書では個別には扱わない。

---

## 参考情報

- [Claude Code 公式ドキュメント](https://code.claude.com/docs/ja/overview) — 一次情報 <!-- パス /docs/ja/overview は推測。要確認 -->
- [IDE 連携（VSCode・Cursor 拡張）](https://code.claude.com/docs/ja/vs-code) — IDE 拡張の公式案内
- [claude.ai/code](https://claude.ai/code) — Web 版
