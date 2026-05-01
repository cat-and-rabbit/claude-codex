---
title: "インストールと初期設定"
description: "Claude Code CLI のインストールから VSCode 拡張の接続まで、使い始めるための準備。"
chapter: liber-1
order: 5
lastVerified: 2026-04-30
targetVersion: "2.x"
estimatedMinutes: 20
---

Claude Code を使い始めるには、まず CLI をインストールし、次に VSCode 拡張を導入する。本章ではそこまでを案内する。

## CLI のインストール

公式が推奨するのは **ネイティブインストーラー** である。Node.js などの前提環境は不要で、バックグラウンドで自動更新される。かつて使われていた `npm install -g @anthropic-ai/claude-code` は現在は非推奨であり、新しく入れるなら以下の方法を選んでほしい。

### ネイティブインストーラー（推奨）

#### macOS / Linux / WSL

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

#### Windows（PowerShell）

```powershell
irm https://claude.ai/install.ps1 | iex
```

### パッケージマネージャを使う

普段からパッケージマネージャで環境を管理しているなら、こちらでも入れられる。

#### Homebrew（macOS）

```bash
brew install --cask claude-code
```

最新版を追いたい場合は `claude-code@latest` を指定する。

#### WinGet（Windows）

```powershell
winget install Anthropic.ClaudeCode
```

#### Linux のディストリビューション標準

apt / dnf / apk から署名付きリポジトリ経由でインストールできる。

### インストールの確認

いずれかの方法でインストールが完了したら、バージョンを確認する：

```bash
claude --version
```

## サインイン

初回起動時にサインインが必要である。ターミナルで `claude` を実行すると、ブラウザが開いて認証フローが始まる。

```bash
claude
```

Anthropic のアカウント（Claude.ai と共通）でサインインする。認証が完了すると、ターミナルに戻って対話が始められる。

なお、Claude Code は **Claude.ai の無料プランでは使えない**。Pro 以上のサブスクリプション、または API キーのいずれかが必要になる。プランの選び方については、序の最後にある [認証とプランの選び方](/ja/articles/auth-and-plans) を参照されたい。

## VSCode 拡張のインストール

### 拡張機能のインストール

VSCode の拡張機能マーケットプレイスで「Claude Code」を検索し、Anthropic が提供するものをインストールする。

### 接続の確認

拡張機能をインストールすると、VSCode の左サイドバーに Claude Code のアイコンが表示される。クリックするとパネルが開き、CLI と同じように対話できる。CLI のサインイン状態がそのまま引き継がれるため、改めてサインインする必要はない。

## デスクトップアプリという選択肢

ターミナルを開かずに済ませたい場合、macOS・Windows 向けにデスクトップアプリも提供されている。GUI で完結するため初学者にとって入りやすい一方、本書で扱う設定ファイル・MCP・カスタムコマンドなどの応用機能を活かすには CLI 環境が必要になる。本書を通読する目的であれば、CLI のインストールを勧めたい。

---

## 参考情報

- [Claude Code セットアップガイド](https://code.claude.com/docs/ja/setup) — 公式インストール手順 <!-- パス /docs/ja/setup は推測。要確認 -->
- [GitHub: anthropics/claude-code](https://github.com/anthropics/claude-code) — ソースコード・Issue・README
- [Claude Code VSCode 拡張（Marketplace）](https://marketplace.visualstudio.com/items?itemName=anthropic.claude-code) — VSCode 拡張機能ページ <!-- itemName は推測。要確認 -->
