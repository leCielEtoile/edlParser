# コントリビューションガイド

leciel ToolKitへのコントリビューションありがとうございます！

## 🎯 コントリビューション方法

### バグ報告

バグを発見した場合:

1. [Issues](https://github.com/yourusername/edlParser/issues)で既存の報告を確認
2. 重複がなければ、新しいIssueを作成
3. 以下の情報を含める:
   - バグの詳細な説明
   - 再現手順
   - 期待される動作
   - 実際の動作
   - スクリーンショット（該当する場合）
   - ブラウザ・OSバージョン

### 機能提案

新機能の提案:

1. [Issues](https://github.com/yourusername/edlParser/issues)で提案を作成
2. 以下を含める:
   - 機能の詳細な説明
   - ユースケース
   - 想定される実装方法（オプション）

### プルリクエスト

コードの変更を提案する場合:

1. リポジトリをフォーク
2. フィーチャーブランチを作成
   ```bash
   git checkout -b feature/your-feature-name
   ```
3. 変更を実装
4. コミット
   ```bash
   git commit -m "feat: add your feature"
   ```
5. プッシュ
   ```bash
   git push origin feature/your-feature-name
   ```
6. プルリクエストを作成

## 📝 コーディング規約

### JavaScript

- **ES6+ Modules** を使用
- **JSDoc** でドキュメント化
- **const/let** を使用（varは使わない）
- **Arrow関数** を推奨
- **async/await** を使用（Promiseチェーンは避ける）

```javascript
/**
 * 関数の説明
 * @param {string} param - パラメータの説明
 * @returns {Object} - 戻り値の説明
 */
export const functionName = (param) => {
  // 実装
};
```

### CSS

- **CSS Variables** で色・サイズを管理
- **BEM命名規則** を推奨
- **Mobile-first** アプローチ
- **セレクタの詳細度** を低く保つ

```css
/* Good */
.block__element--modifier {
  color: var(--primary-color);
}

/* Avoid */
div.container > p#text {
  color: #4f46e5;
}
```

### HTML

- **セマンティックHTML** を使用
- **ARIA属性** でアクセシビリティ確保
- **alt属性** を必ず含める

## 🧪 テスト

- 変更後、すべてのツールが正常に動作することを確認
- 複数のブラウザでテスト（Chrome、Firefox、Safari推奨）
- モバイルデバイスでテスト

## 📦 コミットメッセージ

コミットメッセージは[Conventional Commits](https://www.conventionalcommits.org/)形式を推奨:

- `feat:` - 新機能
- `fix:` - バグ修正
- `docs:` - ドキュメント更新
- `style:` - コードスタイル変更（機能変更なし）
- `refactor:` - リファクタリング
- `perf:` - パフォーマンス改善
- `test:` - テスト追加・修正
- `chore:` - ビルド・設定変更

例:
```
feat(app): add chapter export to JSON format
fix(metadata-remover): resolve JPEG parsing issue
docs: update README with new features
```

## 🌳 ブランチ戦略

- `main` - 本番環境
- `develop` - 開発環境（オプション）
- `feature/*` - 新機能
- `fix/*` - バグ修正
- `refactor/*` - リファクタリング

## ✅ プルリクエストチェックリスト

プルリクエストを作成する前に:

- [ ] コードが正常に動作する
- [ ] コーディング規約に従っている
- [ ] コメント・ドキュメントを更新
- [ ] 既存機能を破壊していない
- [ ] 複数ブラウザでテスト済み
- [ ] コミットメッセージが明確

## 🤔 質問・サポート

質問がある場合:

1. [Issues](https://github.com/yourusername/edlParser/issues)で検索
2. 見つからない場合は新しいIssueを作成
3. "question"ラベルを付ける

## 📜 ライセンス

コントリビューションはすべて[MIT License](LICENSE)の下でライセンスされます。

---

Happy coding! 🎉
