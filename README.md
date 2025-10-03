# leciel ToolKit

動画編集や画像処理に役立つウェブツール集。すべてのツールはブラウザ上で動作し、プライバシーを保護します。

🔗 **デモサイト**: [https://your-site-url.pages.dev](https://your-site-url.pages.dev)

## 📋 目次

- [機能](#機能)
- [ツール一覧](#ツール一覧)
- [使い方](#使い方)
- [技術スタック](#技術スタック)
- [ローカル開発](#ローカル開発)
- [デプロイ](#デプロイ)
- [プライバシー](#プライバシー)
- [ライセンス](#ライセンス)

## ✨ 機能

- 🎬 **YouTubeチャプター変換ツール** - 編集ソフトのマーカーをYouTubeチャプター形式に変換
- 🖼️ **画像メタデータ削除ツール** - PNG/JPEG画像からEXIF等のメタデータを完全削除
- 🌙 **ダークモード対応** - システム設定に連動、設定を保存
- 📱 **レスポンシブデザイン** - モバイル・タブレット・デスクトップに対応
- 🔒 **完全プライバシー保護** - すべての処理はブラウザ内で完結

## 🛠️ ツール一覧

### 1. YouTubeチャプター変換ツール

Premiere Pro・DaVinci Resolveで作成したマーカーをYouTubeのチャプター形式（タイムスタンプ）に変換します。

**対応形式:**
- ✅ DaVinci Resolve EDL（マーカー付き）
- ✅ Premiere Pro EDL（マーカー付き）
- ✅ Premiere Pro マーカーテキスト（.txt書き出し）
- ✅ Premiere Pro マーカーCSV（.csv書き出し）

**主な機能:**
- ドラッグ&ドロップでファイルアップロード
- テキスト直接貼り付け対応
- 時間補正機能（00:00:00開始に自動調整）
- チャプター編集（追加・編集・削除）
- フォーマット整形（重複削除・時間順ソート）
- ダウンロード・クリップボードコピー
- キーボードショートカット対応

**詳細:** [app/](app/)

### 2. 画像メタデータ削除ツール

PNG・JPEG画像から位置情報、撮影日時、カメラ情報などのメタデータを完全に削除します。

**削除されるメタデータ:**
- 📍 GPS位置情報
- 📅 撮影日時
- 📷 カメラ設定（EXIF）
- ✏️ 著作権・編集履歴（XMP）
- 📝 作者・キャプション（IPTC）
- 🎨 カラープロファイル（ICC）

**主な機能:**
- PNG/JPEG対応
- ドラッグ&ドロップ対応
- プレビュー機能
- ワンクリックで処理&ダウンロード
- 完全ブラウザ内処理（サーバーアップロードなし）

**詳細:** [metadata-remover/](metadata-remover/)

## 🚀 使い方

### オンライン利用

デモサイトにアクセスして、すぐに利用できます。インストール不要です。

### ローカル利用

1. リポジトリをクローン:
```bash
git clone https://github.com/yourusername/edlParser.git
cd edlParser
```

2. ブラウザでHTMLファイルを開く:
```bash
# ホームページ
open index.html

# YouTubeチャプター変換ツール
open app/index.html

# 画像メタデータ削除ツール
open metadata-remover/index.html
```

または、ローカルサーバーを起動:
```bash
# Python 3
python -m http.server 8000

# Node.js (http-server)
npx http-server

# その後、http://localhost:8000 にアクセス
```

## 💻 技術スタック

### フロントエンド
- **HTML5** - セマンティックマークアップ
- **CSS3** - CSS Variables、Flexbox、Grid
- **JavaScript (ES6+)** - Modules、async/await
- **Font Awesome** - アイコン

### アーキテクチャ
- **モジュール構成** - 機能ごとに分割された再利用可能なモジュール
- **コンポーネント指向** - 共通UIコンポーネント
- **状態管理** - シンプルなステート管理パターン

### ホスティング
- **Cloudflare Pages** - 静的サイトホスティング
- **Cloudflare Functions** - サーバーレスAPI（オプション）

## 🔧 ローカル開発

### ディレクトリ構造

```
edlParser/
├── index.html              # ホームページ
├── common.css              # 共通スタイル
├── home.css                # ホームページ専用スタイル
├── app/                    # YouTubeチャプター変換ツール
│   ├── index.html
│   ├── main.js            # メインアプリケーション
│   ├── style.css
│   ├── utils/             # ユーティリティモジュール
│   │   ├── parsers.js    # パーサー関数
│   │   └── chapter-operations.js
│   └── ui/                # UIモジュール
│       ├── modal.js
│       ├── message.js
│       └── chapter-list.js
├── metadata-remover/       # 画像メタデータ削除ツール
│   ├── index.html
│   ├── client-processor.js # クライアント処理
│   └── style.css
├── components/             # 共通コンポーネント
│   └── dark-mode.js       # ダークモード機能
└── functions/              # Cloudflare Functions (オプション)
    └── api/
        └── remove-metadata.js
```

### 開発ガイドライン

#### コーディング規約
- ES6 Modules使用
- 関数はJSDocでドキュメント化
- セレクタはBEM命名規則を推奨
- CSS Variablesで色・サイズ管理

#### モジュール追加
1. `app/utils/`または`app/ui/`に新しいモジュールを作成
2. `export`でAPIを公開
3. `main.js`で`import`

#### スタイル追加
1. 共通スタイルは`common.css`に
2. ページ固有スタイルは各ディレクトリの`style.css`に
3. CSS Variablesを活用

## 🌐 デプロイ

### Cloudflare Pagesへのデプロイ

1. Cloudflare Pagesダッシュボードでプロジェクト作成
2. GitHubリポジトリを連携
3. ビルド設定:
   - **ビルドコマンド:** (なし)
   - **出力ディレクトリ:** `/`
   - **ルートディレクトリ:** `/`

4. デプロイ完了後、カスタムドメイン設定（オプション）

### その他のホスティング

- **Netlify**: ドラッグ&ドロップでデプロイ
- **Vercel**: GitHub連携で自動デプロイ
- **GitHub Pages**: 静的サイトとして公開

## 🔒 プライバシー

### データ保護方針

✅ **完全クライアントサイド処理**
- すべての処理はブラウザ内で実行
- ファイルはサーバーにアップロードされません
- 個人情報は外部に送信されません

✅ **データ保存なし**
- 処理したファイルは保存されません
- ページをリロードすると消去されます

✅ **localStorage使用**
- ダークモード設定のみ保存
- 個人を特定できる情報は保存しません

## 🙏 謝辞

- [Font Awesome](https://fontawesome.com/) - アイコン提供
- [Cloudflare Pages](https://pages.cloudflare.com/) - ホスティング
- すべてのコントリビューター

---

⭐ このプロジェクトが役に立った場合は、スターをお願いします！
