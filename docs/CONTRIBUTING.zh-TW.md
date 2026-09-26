[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md) | [繁體中文](CONTRIBUTING.zh-TW.md) | [日本語](CONTRIBUTING.ja.md) | [한국어](CONTRIBUTING.ko.md) | [Deutsch](CONTRIBUTING.de.md) | [Français](CONTRIBUTING.fr.md) | [Nederlands](CONTRIBUTING.nl.md)

# 參與 InferrLM

謝謝你願意幫 InferrLM。這份指南說明怎麼參與。

## 開始

### 找可以做的 issue

歡迎參與！已回報的 bug 和功能需求在 [issues](https://github.com/sbhjt-gr/inferra/issues) 裡。

**開始之前：**
1. 先在 issues 裡找你想做的事
2. 在那則 issue 下留言，說你想做，然後就開始

### 提出新功能

如果你想做自己的功能，先開一則新 issue，把想法寫清楚。說明裡要包括：

- **這是什麼**：你想加的功能，寫明白
- **為什麼有用**：它解決什麼問題，或給使用者帶來什麼
- **你打算怎麼做**：技術做法，以及需要哪些相依套件或改動

討論之後，這則 issue 會分給你，你就可以開始做了。

## 程式碼要求

### 程式碼品質和風格

#### 不要用表情符號
不要在程式碼、註解、提交說明或給使用者看的文字裡用表情符號。看起來不專業，也可能出編碼問題。用清楚的文字就好。

```typescript
// Bad
console.log('Model loaded successfully! 🎉');

// Good
console.log('Model loaded successfully');

// Good
console.log('model_load_success');
```

#### 註解要有用
註解應該說明為什麼這樣寫，而不是重述程式碼在做什麼。程式碼本身就應該能看懂在做什麼。

```typescript
// Bad - stating the obvious
// Set the temperature to 0.7
const temperature = 0.7;

// Good - explaining the reasoning
// Use 0.7 temperature as a balance between creativity and coherence
// Lower values caused repetitive outputs in testing
const temperature = 0.7;
```

### React 和 React Native 的常見做法

#### 能不用 useEffect 就不用
除非真的需要，否則不要用 `useEffect`。很多開發者一伸手就用 `useEffect` 的情況，換個寫法就能解決。

**這些情況不要用 useEffect：**
- 為了顯示而轉換資料（用變數或 `useMemo`）
- 處理使用者操作（用事件處理函式）
- props 變了要重設狀態（用 `key`，或在繪製時算出來）
- 根據 props 或狀態變化去更新狀態（在繪製時算）

```typescript
// Bad - unnecessary useEffect
const [filteredModels, setFilteredModels] = useState([]);

useEffect(() => {
  setFilteredModels(models.filter(m => m.size < maxSize));
}, [models, maxSize]);

// Good - calculate during render
const filteredModels = models.filter(m => m.size < maxSize);
```

**這些情況可以用 useEffect：**
- 和外部系統同步（API、DOM、第三方函式庫）
- 元件卸載時必須做的清理
- 建立訂閱或事件監聽

```typescript
// Good use of useEffect - external system synchronization
useEffect(() => {
  const subscription = modelDownloader.on('progress', handleProgress);
  
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

#### 元件怎麼組織
元件盡量只做一件事，能控制在 1000 行以內。大元件拆成小的、可以重複使用的部分。

### TypeScript 要求

### 檔案命名和位置

#### 命名
- 元件：PascalCase（例如 `ChatMessage.tsx`）
- 工具函式：camelCase（例如 `formatMessage.ts`）
- 服務：PascalCase（例如 `ModelDownloader.ts`）
- 型別：PascalCase（例如 `types/chat.ts`）

#### 檔案放哪
按用途放到對應目錄：
- 介面元件 → `src/components/`
- 業務邏輯 → `src/services/`
- 工具函式 → `src/utils/`
- 型別定義 → `src/types/`
- React hooks → `src/hooks/`

### 手動測試
送出 PR（把改動送上來請求合併）之前：
1. 如果改動兩邊都有影響，iOS 和 Android 都要測
2. 換不同的模型和設定試一試
3. 長時間執行的操作要看有沒有記憶體流失
4. 確認不同螢幕尺寸下介面都正常

## 程式碼署名

貢獻程式碼時，尤其是比較大的功能或複雜實作，加上署名註解，標明是誰寫的。這樣有助於：
- 給貢獻者應得的署名
- 以後維護的人能看到背景
- 留下社群貢獻的紀錄

### 署名格式

在新檔案頂端，或大段程式碼前面，加一段註解：

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

改動比較小，或只是修改已有程式碼時：

```typescript
// Enhanced error handling for streaming responses
// Contributed by: @username (https://github.com/username)
function handleStreamError(error: Error) {
  // Implementation
}
```

### 寫上什麼
- 你的 GitHub 使用者名稱，並連到你的主頁
- 如果有對應的 issue，寫上編號
- 這段程式碼在做什麼的簡短說明（從上下文已經能看出來的話，可以不寫）

這是在 Git 提交紀錄之外的署名，方便在程式碼層面認出是誰貢獻的。

## Git 流程

### 提交說明
提交說明寫清楚、寫短，用這個格式：

```
type(scope): brief description

Longer explanation if needed

Fixes #123
```

類型：
- `feat`：新功能
- `fix`：修 bug
- `docs`：文件改動
- `refactor`：整理程式碼，行為不變
- `test`：加測試或改測試
- `chore`：維護雜務

範例：
```
feat(rag): add document ingestion endpoint
fix(server): resolve buffer encoding in streaming
docs(api): add embeddings endpoint documentation
refactor(tcp): extract model operations to separate file
```

### 拉取請求流程

1. **Fork 並複製**：Fork 儲存庫，再複製到本機
2. **建分支**：為這個功能或修復新建分支
3. **改程式碼**：照上面的要求來改
4. **測試**：把改動測充分
5. **提交**：每次提交要乾淨、有邏輯，說明寫好
6. **推送**：把分支推到你的 fork
7. **開 PR**：對著 `main` 分支開 PR

#### PR 說明
你的 PR 裡要有：
- 能看懂改了什麼的標題
- 改了什麼、為什麼改
- 相關 issue（如果有）

## 授權

向 InferrLM 貢獻程式碼，即表示你同意這些貢獻按 AGPL-3.0 授權。

謝謝你為 InferrLM 做貢獻！
