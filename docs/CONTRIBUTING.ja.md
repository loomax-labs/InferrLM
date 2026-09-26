[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md) | [繁體中文](CONTRIBUTING.zh-TW.md) | [日本語](CONTRIBUTING.ja.md) | [한국어](CONTRIBUTING.ko.md) | [Deutsch](CONTRIBUTING.de.md) | [Français](CONTRIBUTING.fr.md) | [Nederlands](CONTRIBUTING.nl.md)

# InferrLM への参加

InferrLM への参加に関心を持ってくれて、ありがとうございます。このガイドは、プロジェクトにうまく加わるための説明です。

## はじめに

### 取り組む課題を探す

参加を歓迎します。報告された不具合や機能の要望は [issues](https://github.com/sbhjt-gr/inferra/issues) タブにあります。

**作業を始める前に:**
1. issues タブを見て、取り組みたいものを探します
2. その issue に関心があることをコメントし、作業を始めます

### 新しい機能を提案する

自分の機能を加えたいときは、先に新しい issue を開き、考えをはっきり書いてください。提案には次を含めてください。

- **何の機能か**: 加えたい動きのわかりやすい説明
- **なぜ役立つか**: 解く問題、または利用者に足す価値
- **どう実装するか**: 技術的な進め方と、必要な依存関係や変更

話し合いのあと、その issue を担当し、作業を始められます。

## コードの指針

### コードの質と書き方

#### 絵文字を使わない
コード、コメント、コミットメッセージ、利用者に見える文に絵文字を使わないでください。雑に見え、文字コードの問題も起きます。代わりに、わかりやすい文を書いてください。

```typescript
// Bad
console.log('Model loaded successfully! 🎉');

// Good
console.log('Model loaded successfully');

// Good
console.log('model_load_success');
```

#### 意味のあるコメント
コメントは、コードが何をするかではなく、なぜその書き方にしたかを説明します。何をするかは、コード自体でわかるようにしてください。

```typescript
// Bad - stating the obvious
// Set the temperature to 0.7
const temperature = 0.7;

// Good - explaining the reasoning
// Use 0.7 temperature as a balance between creativity and coherence
// Lower values caused repetitive outputs in testing
const temperature = 0.7;
```

### React と React Native の進め方

#### できるときは useEffect を避ける
本当に必要なとき以外、`useEffect` を使わないでください。`useEffect` に手が伸びる多くの場合は、別の書き方で解けます。

**useEffect を使わないとき:**
- 表示のためのデータ変換（変数か `useMemo` を使います）
- 利用者の操作への対応（イベントの処理を使います）
- props が変わったときの状態のリセット（`key` を使うか、描画のときに計算します）
- props や state の変化に合わせて state を更新する（描画のときに計算します）

```typescript
// Bad - unnecessary useEffect
const [filteredModels, setFilteredModels] = useState([]);

useEffect(() => {
  setFilteredModels(models.filter(m => m.size < maxSize));
}, [models, maxSize]);

// Good - calculate during render
const filteredModels = models.filter(m => m.size < maxSize);
```

**useEffect を使うとき:**
- 外の仕組みとの同期（API、DOM、他社のライブラリ）
- コンポーネントが外れるときに必ず行う片付け
- 購読やイベントの待ち受けの準備

```typescript
// Good use of useEffect - external system synchronization
useEffect(() => {
  const subscription = modelDownloader.on('progress', handleProgress);
  
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

#### コンポーネントの分け方
コンポーネントは役割を絞り、できるときは 1000 行未満にします。大きいコンポーネントは、小さく再利用できる部品に分けてください。

### TypeScript の指針

### ファイル名と置き場所

#### 名前の付け方
- コンポーネント: PascalCase（例: `ChatMessage.tsx`）
- ユーティリティ: camelCase（例: `formatMessage.ts`）
- サービス: PascalCase（例: `ModelDownloader.ts`）
- 型: PascalCase（例: `types/chat.ts`）

#### ファイルの置き場所
目的に合ったディレクトリに置きます。
- UI コンポーネント → `src/components/`
- 業務の処理 → `src/services/`
- ユーティリティ関数 → `src/utils/`
- 型の定義 → `src/types/`
- React のフック → `src/hooks/`

### 手での確認
PR を出す前に:
1. 両方のプラットフォームに影響する変更なら、iOS と Android の両方で確認します
2. 別のモデルと設定で確認します
3. 長く動かす処理で、メモリの漏れがないか見ます
4. 画面の大きさが違っても UI が使えるか確認します

## コードのクレジット

コードを加えるとき、とくに大きな機能や複雑な実装では、誰が書いたかがわかるコメントを付けてください。これは次の役に立ちます。
- 貢献者にきちんと名を残す
- あとから直す人に背景を渡す
- コミュニティの貢献の記録を残す

### クレジットの書き方

新しいファイルの先頭、または大きなコードの塊の前にコメントを付けます。

```typescript
/**
 * Feature: RAG Document Ingestion
 * Contributed by: @username (https://github.com/username)
 * Issue: #123
 */

export class DocumentProcessor {
  // Implementation
}
```

既存のコードへの小さい追加や変更では、次のようにします。

```typescript
// Enhanced error handling for streaming responses
// Contributed by: @username (https://github.com/username)
function handleStreamError(error: Error) {
  // Implementation
}
```

### 書くこと
- GitHub のユーザー名と、プロフィールへのリンク
- 該当するときは issue 番号
- コードが何をするかの短い説明（文脈から明らかなら省いてかまいません）

このクレジットは Git のコミット履歴に加えるものです。コードを読んだ場所で、誰の貢献かがわかります。

## Git の進め方

### コミットメッセージ
次の形で、短くわかりやすいコミットメッセージを書いてください。

```
type(scope): brief description

Longer explanation if needed

Fixes #123
```

種類:
- `feat`: 新しい機能
- `fix`: 不具合の修正
- `docs`: ドキュメントの変更
- `refactor`: 動きを変えずにコードを整理する
- `test`: テストの追加や更新
- `chore`: 保守の作業

例:
```
feat(rag): add document ingestion endpoint
fix(server): resolve buffer encoding in streaming
docs(api): add embeddings endpoint documentation
refactor(tcp): extract model operations to separate file
```

### プルリクエストの手順

1. **フォークしてクローンする**: リポジトリをフォークし、手元にクローンします
2. **ブランチを作る**: 機能や修正のための新しいブランチを作ります
3. **変更する**: この指針に沿って実装します
4. **確認する**: 変更を十分に確認します
5. **コミットする**: 意味のまとまりごとに、よいメッセージでコミットします
6. **プッシュする**: ブランチを自分のフォークにプッシュします
7. **プルリクエスト**: `main` ブランチに対して PR を開きます

#### PR の説明
プルリクエストには次を含めてください。
- 変更がわかるタイトル
- 何を変え、なぜ変えたかの説明
- 関連する issue への参照（あるとき）

## ライセンス

InferrLM に貢献することで、その貢献が AGPL-3.0 License の下でライセンスされることに同意したことになります。

InferrLM への参加をありがとうございます。
