[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md) | [繁體中文](CONTRIBUTING.zh-TW.md) | [日本語](CONTRIBUTING.ja.md) | [한국어](CONTRIBUTING.ko.md) | [Deutsch](CONTRIBUTING.de.md) | [Français](CONTRIBUTING.fr.md) | [Nederlands](CONTRIBUTING.nl.md)

# InferrLM에 기여하기

InferrLM에 관심을 주셔서 고마워요. 이 가이드는 프로젝트에 어떻게 기여하면 되는지 알려 줘요.

## 시작

### 할 일 찾기

기여를 환영해요. 신고된 버그와 기능 요청은 [issues](https://github.com/sbhjt-gr/inferra/issues)에 있어요.

**시작하기 전에:**
1. issues에서 하고 싶은 일을 찾아요
2. 그 issue에 댓글을 남기고, 바로 시작해요

### 새 기능 제안

직접 기능을 넣고 싶으면 먼저 issue를 열고 생각을 분명하게 적어요. 제안에는 다음이 있어야 해요.

- **어떤 기능인지**: 넣으려는 기능을 분명하게
- **왜 유용한지**: 어떤 문제를 풀거나, 사용자에게 어떤 도움이 되는지
- **어떻게 만들 건지**: 기술적인 방법과 필요한 의존성 또는 변경

이야기가 끝나면 그 issue가 배정되고, 작업을 시작할 수 있어요.

## 코드 기준

### 코드 품질과 스타일

#### 이모지를 쓰지 마세요
코드, 주석, 커밋 메시지, 사용자에게 보이는 글에 이모지를 쓰지 마세요. 전문적으로 보이지 않고, 인코딩 문제가 날 수 있어요. 분명한 글을 쓰세요.

```typescript
// Bad
console.log('Model loaded successfully! 🎉');

// Good
console.log('Model loaded successfully');

// Good
console.log('model_load_success');
```

#### 주석은 이유를 적어요
주석은 코드가 무엇을 하는지가 아니라, 왜 이렇게 짰는지를 설명해야 해요. 코드만 봐도 무엇을 하는지는 알 수 있어야 해요.

```typescript
// Bad - stating the obvious
// Set the temperature to 0.7
const temperature = 0.7;

// Good - explaining the reasoning
// Use 0.7 temperature as a balance between creativity and coherence
// Lower values caused repetitive outputs in testing
const temperature = 0.7;
```

### React와 React Native에서 자주 쓰는 방식

#### useEffect는 꼭 필요할 때만
정말 필요할 때가 아니면 `useEffect`를 쓰지 마세요. 개발자가 `useEffect`를 꺼내 쓰는 경우의 대부분은 다른 방식으로 풀 수 있어요.

**useEffect를 쓰지 말 때:**
- 화면에 보여 주려고 데이터를 바꿀 때 (변수나 `useMemo`를 써요)
- 사용자 동작을 처리할 때 (이벤트 처리 함수를 써요)
- props가 바뀌면 상태를 되돌릴 때 (`key`를 쓰거나, 그릴 때 계산해요)
- props나 상태가 바뀌었다고 상태를 다시 넣을 때 (그릴 때 계산해요)

```typescript
// Bad - unnecessary useEffect
const [filteredModels, setFilteredModels] = useState([]);

useEffect(() => {
  setFilteredModels(models.filter(m => m.size < maxSize));
}, [models, maxSize]);

// Good - calculate during render
const filteredModels = models.filter(m => m.size < maxSize);
```

**useEffect를 쓸 때:**
- 바깥 시스템과 맞출 때 (API, DOM, 다른 라이브러리)
- 컴포넌트가 사라질 때 꼭 해야 하는 정리
- 구독이나 이벤트 듣기를 만들 때

```typescript
// Good use of useEffect - external system synchronization
useEffect(() => {
  const subscription = modelDownloader.on('progress', handleProgress);
  
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

#### 컴포넌트 구성
컴포넌트는 한 가지 일에 두고, 가능하면 1000줄을 넘기지 마세요. 큰 컴포넌트는 다시 쓸 수 있는 작은 조각으로 나눠요.

### TypeScript 기준

### 파일 이름과 위치

#### 이름
- 컴포넌트: PascalCase (예: `ChatMessage.tsx`)
- 유틸: camelCase (예: `formatMessage.ts`)
- 서비스: PascalCase (예: `ModelDownloader.ts`)
- 타입: PascalCase (예: `types/chat.ts`)

#### 파일 위치
용도에 맞는 폴더에 두세요.
- 화면 컴포넌트 → `src/components/`
- 업무 로직 → `src/services/`
- 유틸 함수 → `src/utils/`
- 타입 정의 → `src/types/`
- React hooks → `src/hooks/`

### 직접 시험
PR을 올리기 전에:
1. 변경이 양쪽 모두에 영향을 주면 iOS와 Android를 둘 다 확인해요
2. 다른 모델과 설정으로도 시험해요
3. 오래 도는 작업에서 메모리가 새지 않는지 봐요
4. 화면 크기가 달라도 UI가 되는지 확인해요

## 코드 표시

코드를 넣을 때, 특히 큰 기능이나 복잡한 구현이면 누가 넣었는지 주석으로 남겨요. 이건 다음에 도움이 돼요.
- 기여한 사람에게 이름을 남김
- 나중에 고치는 사람이 배경을 알 수 있음
- 커뮤니티 기여 기록을 남김

### 표시 형식

새 파일 맨 위나, 큰 코드 덩어리 앞에 주석을 넣어요.

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

작은 기여이거나 기존 코드를 고칠 때:

```typescript
// Enhanced error handling for streaming responses
// Contributed by: @username (https://github.com/username)
function handleStreamError(error: Error) {
  // Implementation
}
```

### 넣을 내용
- GitHub 사용자 이름과 프로필 링크
- 해당하는 issue 번호
- 코드가 무엇을 하는지 짧은 설명 (맥락만으로 분명하면 생략해도 돼요)

이 표시는 Git 커밋 기록과 별개예요. 코드에서 누가 넣었는지 바로 알 수 있어요.

## Git 흐름

### 커밋 메시지
커밋 메시지는 짧고 분명하게, 이 형식으로 써요.

```
type(scope): brief description

Longer explanation if needed

Fixes #123
```

종류:
- `feat`: 새 기능
- `fix`: 버그 수정
- `docs`: 문서 변경
- `refactor`: 동작은 그대로 두고 코드 정리
- `test`: 테스트 추가 또는 수정
- `chore`: 유지보수

예:
```
feat(rag): add document ingestion endpoint
fix(server): resolve buffer encoding in streaming
docs(api): add embeddings endpoint documentation
refactor(tcp): extract model operations to separate file
```

### Pull Request 절차

1. **Fork와 복제**: 저장소를 Fork하고 로컬에 복제해요
2. **브랜치**: 기능이나 수정용 브랜치를 만들어요
3. **변경**: 위 기준에 맞게 구현해요
4. **시험**: 변경을 충분히 확인해요
5. **커밋**: 깔끔하고 논리적인 커밋과 좋은 메시지를 남겨요
6. **푸시**: 브랜치를 내 fork에 푸시해요
7. **Pull Request**: `main` 브랜치로 PR을 열어요

#### PR 설명
PR에는 다음이 있어야 해요.
- 무엇을 바꿨는지 알 수 있는 제목
- 무엇을, 왜 바꿨는지
- 관련 issue (있으면)

## 라이선스

InferrLM에 기여하면, 그 기여가 AGPL-3.0 라이선스로 제공되는 데 동의하는 거예요.

InferrLM에 기여해 주셔서 고마워요.
