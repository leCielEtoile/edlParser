# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- 完全なREADME.md
- CONTRIBUTING.md（コントリビューションガイド）
- LICENSE（MITライセンス）
- .gitignore

## [2.0.0] - 2025-10-03

### Added
- 画像メタデータ削除ツール
  - PNG/JPEG対応
  - クライアントサイド完全処理
  - ワンクリックでダウンロード
- 共通ダークモードコンポーネント
- FOUC（Flash of Unstyled Content）防止機能

### Changed
- **大規模リファクタリング**: モジュール構造に完全移行
  - JavaScriptを7つのモジュールに分割
  - `app/utils/parsers.js` - パーサー関数
  - `app/utils/chapter-operations.js` - チャプター操作
  - `app/ui/modal.js` - モーダル管理
  - `app/ui/message.js` - メッセージ表示
  - `app/ui/chapter-list.js` - チャプターリスト
  - `components/dark-mode.js` - ダークモード（共通）
  - `app/main.js` - メイン統合
- ES6 Modulesに完全移行
- ダークモード実装を`document.documentElement`に変更
- 画像メタデータ削除ツールをクライアント処理に変更

### Fixed
- ダークモードでページ遷移時に一瞬白くなる問題
- 画像メタデータ削除ボタンが動作しない問題

### Improved
- コードの保守性向上（1200行→最大400行/ファイル）
- コードの再利用性向上
- テスト容易性向上
- 拡張性向上

## [1.0.0] - 2025-05-12

### Added
- YouTubeチャプター変換ツール
  - DaVinci Resolve EDL対応
  - Premiere Pro EDL対応
  - Premiere Pro マーカーテキスト対応
  - Premiere Pro マーカーCSV対応
  - チャプター編集機能
  - 時間補正機能
  - フォーマット整形機能
  - ダウンロード・コピー機能
  - キーボードショートカット
- ダークモード
- レスポンシブデザイン
- ドラッグ&ドロップ対応

### Technical
- HTML5, CSS3, Vanilla JavaScript
- CSS Variables
- LocalStorage対応

[unreleased]: https://github.com/yourusername/edlParser/compare/v2.0.0...HEAD
[2.0.0]: https://github.com/yourusername/edlParser/compare/v1.0.0...v2.0.0
[1.0.0]: https://github.com/yourusername/edlParser/releases/tag/v1.0.0
