[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md) | [繁體中文](CONTRIBUTING.zh-TW.md) | [日本語](CONTRIBUTING.ja.md) | [한국어](CONTRIBUTING.ko.md) | [Deutsch](CONTRIBUTING.de.md) | [Français](CONTRIBUTING.fr.md) | [Nederlands](CONTRIBUTING.nl.md)

# 参与 InferrLM

谢谢你愿意给 InferrLM 做贡献！这份指南帮你了解怎样有效地参与。

## 开始

### 找可以做的 issue

欢迎参与！已报告的 bug 和功能需求在 [issues](https://github.com/sbhjt-gr/inferra/issues) 里。

**开始之前：**
1. 先在 issues 里找你想做的事
2. 在那条 issue 下留言，说你想做，然后就开始

### 提出新功能

如果你想做自己的功能，先开一条新 issue，把想法写清楚。说明里要包括：

- **这是什么**：你想加的功能，写明白
- **为什么有用**：它解决什么问题，或者给用户带来什么
- **你打算怎么做**：技术做法，以及需要哪些依赖或改动

讨论之后，这条 issue 会分给你，你就可以开始做了。

## 代码要求

### 代码质量和风格

#### 不要用表情符号
不要在代码、注释、提交说明或给用户看的文字里用表情符号。看起来不专业，也可能出编码问题。用清楚的文字就行。

```typescript
// Bad
console.log('Model loaded successfully! 🎉');

// Good
console.log('Model loaded successfully');

// Good
console.log('model_load_success');
```

#### 注释要有用
注释应该说明为什么这样写，而不是复述代码在做什么。代码本身就应该能看懂在做什么。

```typescript
// Bad - stating the obvious
// Set the temperature to 0.7
const temperature = 0.7;

// Good - explaining the reasoning
// Use 0.7 temperature as a balance between creativity and coherence
// Lower values caused repetitive outputs in testing
const temperature = 0.7;
```

### React 和 React Native 的常见做法

#### 能不用 useEffect 就不用
除非真的需要，否则不要用 `useEffect`。很多开发者伸手就用 `useEffect` 的情况，换个写法就能解决。

**这些情况不要用 useEffect：**
- 为了显示而转换数据（用变量或 `useMemo`）
- 处理用户操作（用事件处理函数）
- props 变了要重置状态（用 `key`，或在渲染时算出来）
- 根据 props 或状态变化去更新状态（在渲染时算）

```typescript
// Bad - unnecessary useEffect
const [filteredModels, setFilteredModels] = useState([]);

useEffect(() => {
  setFilteredModels(models.filter(m => m.size < maxSize));
}, [models, maxSize]);

// Good - calculate during render
const filteredModels = models.filter(m => m.size < maxSize);
```

**这些情况可以用 useEffect：**
- 和外部系统同步（API、DOM、第三方库）
- 组件卸载时必须做的清理
- 建立订阅或事件监听

```typescript
// Good use of useEffect - external system synchronization
useEffect(() => {
  const subscription = modelDownloader.on('progress', handleProgress);
  
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

#### 组件怎么组织
组件尽量只做一件事，能控制在 1000 行以内。大组件拆成小的、可以复用的部分。

### TypeScript 要求

### 文件命名和位置

#### 命名
- 组件：PascalCase（例如 `ChatMessage.tsx`）
- 工具函数：camelCase（例如 `formatMessage.ts`）
- 服务：PascalCase（例如 `ModelDownloader.ts`）
- 类型：PascalCase（例如 `types/chat.ts`）

#### 文件放哪
按用途放到对应目录：
- 界面组件 → `src/components/`
- 业务逻辑 → `src/services/`
- 工具函数 → `src/utils/`
- 类型定义 → `src/types/`
- React hooks → `src/hooks/`

### 手动测试
提交 PR（把改动发上来请求合并）之前：
1. 如果改动两边都有影响，iOS 和 Android 都要测
2. 换不同的模型和配置试一试
3. 长时间运行的操作要看有没有内存泄漏
4. 确认不同屏幕尺寸下界面都正常

## 代码署名

贡献代码时，尤其是比较大的功能或复杂实现，加上署名注释，标明是谁写的。这样有助于：
- 给贡献者应得的署名
- 以后维护的人能看到背景
- 留下社区贡献的记录

### 署名格式

在新文件顶部，或大段代码前面，加一段注释：

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

改动比较小，或只是修改已有代码时：

```typescript
// Enhanced error handling for streaming responses
// Contributed by: @username (https://github.com/username)
function handleStreamError(error: Error) {
  // Implementation
}
```

### 写上什么
- 你的 GitHub 用户名，并链到你的主页
- 如果有对应 issue，写上编号
- 这段代码做什么的简短说明（从上下文已经能看出来的话，可以不写）

这是在 Git 提交记录之外的署名，方便在代码层面认出是谁贡献的。

## Git 流程

### 提交说明
提交说明写清楚、写短，用这个格式：

```
type(scope): brief description

Longer explanation if needed

Fixes #123
```

类型：
- `feat`：新功能
- `fix`：修 bug
- `docs`：文档改动
- `refactor`：整理代码，行为不变
- `test`：加测试或改测试
- `chore`：维护杂务

示例：
```
feat(rag): add document ingestion endpoint
fix(server): resolve buffer encoding in streaming
docs(api): add embeddings endpoint documentation
refactor(tcp): extract model operations to separate file
```

### 拉取请求流程

1. **Fork 并克隆**：Fork 仓库，再克隆到本地
2. **建分支**：为这个功能或修复新建分支
3. **改代码**：按上面的要求来改
4. **测试**：把改动测充分
5. **提交**：每次提交要干净、有逻辑，说明写好
6. **推送**：把分支推到你的 fork
7. **开 PR**：对着 `main` 分支开 PR

#### PR 说明
你的 PR 里要有：
- 能看懂改了什么的标题
- 改了什么、为什么改
- 相关 issue（如果有）

## 许可证

向 InferrLM 贡献代码，即表示你同意这些贡献按 AGPL-3.0 许可证授权。

谢谢你为 InferrLM 做贡献！
