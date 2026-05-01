# Claude Code 写本 (Codex Claudia)

Claude Code を体系的に学ぶための日本語の手引き書である。基礎から応用まで、四つの巻 (Liber) に分けて段階的にまとめている。

## 構成

- **Liber I ─ 序** : Claude Code とは何か、どう始めるか
- **Liber II ─ 基礎** : プロンプト、文脈、CLAUDE.md、権限など、日々の使いこなしの土台
- **Liber III ─ 実践** : 大きなタスクの分割、レビュー、失敗からの回復 *(執筆中)*
- **Liber IV ─ 応用** : MCP、サブエージェント、チームでの活用 *(執筆中)*

各記事には動作確認済みの Claude Code バージョン (`targetVersion`) と確認日 (`lastVerified`) を記録している。Claude Code 自体の更新が頻繁なため、記事と実装が乖離した時の参照点となる。

## 技術スタック

[Astro](https://astro.build/) 6 + MDX + Tailwind CSS 4 で構築。Node 22.12 以上が必要。

## 開発

```sh
npm install      # 依存関係のインストール
npm run dev      # 開発サーバー (localhost:4321)
npm run build    # ./dist/ にビルド
npm run preview  # ビルド結果のプレビュー
```

## ディレクトリ構成

```
src/
├── content/articles/   記事本体 (Markdown)
├── content.config.ts   記事フロントマターのスキーマ
├── data/chapters.ts    章 (Liber) の定義
├── layouts/            ページレイアウト
├── components/         ナビゲーション・サイドバー等
├── pages/              ルーティング
├── utils/              記事順序の計算など
└── styles/             グローバル CSS
```

## 執筆・実装の規約

記事の編集方針、フロントマターの必須フィールド、内部リンクの形式、CSS の注意点などは [`CLAUDE.md`](./CLAUDE.md) にまとめている。
