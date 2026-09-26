[English](REST_APIs.md) | [简体中文](REST_APIs.zh-CN.md) | [繁體中文](REST_APIs.zh-TW.md) | [日本語](REST_APIs.ja.md) | [한국어](REST_APIs.ko.md) | [Deutsch](REST_APIs.de.md) | [Français](REST_APIs.fr.md) | [Nederlands](REST_APIs.nl.md)

# InferrLM REST API 문서

InferrLM 로컬 HTTP 서버의 전체 인터페이스 설명이에요. REST API(네트워크 요청으로 부르는 인터페이스)로 휴대폰의 AI를 같은 네트워크의 다른 기기에 열어요.

## 시작

### 빠르게 시작

1. **서버 시작**: InferrLM을 열고 **서버** 탭에서 스위치를 켜요. 주소가 나타나요 (예: `http://192.168.1.10:8889`).
2. **모델 다운로드**: **모델** 탭에서 GGUF(모델 파일 형식)를 하나 이상 받아요. API 요청의 모델 이름에는 `.gguf`를 붙이지 않아요.
3. **클라이언트 설정**: OpenAI와 맞는 클라이언트를 `http://YOUR_DEVICE_IP:8889/v1`로 향하게 해요. API 키는 필요 없어요. 클라이언트가 꼭 요구하면 아무 자리표시나 넣어요.
4. **요청 보내기:**

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hello!"}]}'
```

> OpenAI API를 지원하는 앱이나 라이브러리라면 `http://YOUR_DEVICE_IP:8889/v1`만 가리키면 돼요. 두 기기는 같은 로컬 네트워크에 있어야 해요. 모델 이름의 `.gguf`는 있어도 되고 없어도 돼요.

### 서버 시작

1. 휴대폰에서 InferrLM을 열어요
2. **서버** 탭으로 이동해요
3. 서버 스위치를 켜요
4. 서버 주소가 표시돼요 (보통 `http://YOUR_DEVICE_IP:8889`)
5. QR 코드로 이 주소를 공유하거나, 복사해서 다른 기기에서 열 수 있어요

### 바꿀 수 있는 옵션

- **자동 시작**: 앱이 켜질 때 서버를 자동으로 시작해요
- **포트**: 기본 포트는 8889예요 (설정에서 바꿀 수 있어요)

### 기본 설정

**기본 주소**: `http://YOUR_DEVICE_IP:8889`  
**Content-Type**: `application/json`  
**CORS**: 모든 출처에 열려 있어요

### 모델 대상 고르기

글을 만드는 모든 요청에는 `model` 문자열이 있어요. 어느 실행 쪽이 처리할지 정해요.

| 모델 값 | 가는 곳 | 설명 |
|-------------|----------------|-------|
| 저장된 모델 이름 (예: `llama-3.2-1b`) | 이 기기에서 실행되는 로컬 GGUF | 먼저 InferrLM 앱에서 GGUF를 받아요. |
| `apple-foundation` | Apple Intelligence Foundation 모델 | iOS만 해당해요. 앱 설정에서 켜고 `GET /api/models/apple-foundation`으로 확인해요. |

---

## 어시스턴트 (로컬)

### GET /api/assistants

이 기기에 `deployment: "local"`로 저장된 어시스턴트를 나열해요. 응답에는 system prompt, 스킬 설명, 비밀 값이 빠져요.

**응답:**
```json
{
  "assistants": [
    {
      "id": "asst-abc",
      "name": "Research helper",
      "task": "Summarize papers",
      "model": { "provider": "local", "modelId": "llama-3.2-1b" }
    }
  ]
}
```

**예:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/assistants
```

---

## 채팅과 완성 API

### POST /api/chat

전체 대화 기록으로 채팅을 스트리밍하거나 한 번에 완료해요. 로컬 GGUF 모델 이름이나 `apple-foundation`을 받아요.

**요청 본문:**
```json
{
  "model": "llama-3.2-1b",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 512
}
```

**스트리밍 응답 (NDJSON):**
```
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":"Hi"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":" there"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":""},"done":true}
```

**일반 응답:**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "message": {"role": "assistant", "content": "Hi there!"},
  "done": true
}
```

**매개변수:**
- `model` (문자열, 필수): 대상 실행 쪽
- `messages` (배열, 필수): 대화 기록. 각 항목에 `role` (`system` | `user` | `assistant`)과 `content`가 있어요
- `assistant` (문자열, 선택): `GET /api/assistants`의 로컬 어시스턴트 id예요. 지정했고 본문에 system 메시지가 없으면 (`messages`의 `role: "system"`, 최상위 `system`, 또는 `options.system_prompt`), 서버가 생성 전에 그 어시스턴트의 system prompt를 앞에 붙여요. 없는 id는 `404`와 `{ "error": "assistant_not_found" }`를 돌려요.
- `stream` (불리언, 선택): 스트리밍 NDJSON 응답을 켜요 (기본값: `true`)
- `temperature` (숫자, 선택): 샘플링 온도 0.0–2.0
- `max_tokens` (숫자, 선택): 만들 최대 token 수
- `top_p` (숫자, 선택): Top-p 샘플링
- `top_k` (숫자, 선택): Top-k 샘플링

**예:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.2-1b",
    "messages": [{"role": "user", "content": "Explain AI"}],
    "stream": false
  }'
```

---

### POST /api/generate

대화 맥락 없이 프롬프트 하나로 답을 만들어요.

**요청 본문:**
```json
{
  "model": "llama-3.2-1b",
  "prompt": "Explain quantum computing in simple terms",
  "stream": false,
  "max_tokens": 500
}
```

**응답:**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "response": "Quantum computing uses quantum mechanics principles...",
  "done": true
}
```

**매개변수:**
- `model` (문자열, 필수): 대상 실행 쪽
- `prompt` (문자열, 필수): 입력 프롬프트
- `stream` (불리언, 선택): 스트리밍 NDJSON 응답을 켜요
- `max_tokens` (숫자, 선택): 만들 최대 token 수
- `temperature` (숫자, 선택): 샘플링 온도

**예:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "prompt": "Hello world", "stream": false}'
```

---

## OpenAI와 맞는 API

### GET /v1/models

OpenAI 형식으로 쓸 수 있는 모델을 나열해요. OpenAI 클라이언트 라이브러리와 맞아요.

**응답:**
```json
{
  "object": "list",
  "data": [
    {
      "id": "llama-3.2-1b.gguf",
      "object": "model",
      "created": 1700000000,
      "owned_by": "local"
    }
  ]
}
```

**예:**
```bash
curl http://YOUR_DEVICE_IP:8889/v1/models
```

---

### POST /v1/chat/completions

OpenAI와 맞는 채팅 완성 엔드포인트예요. OpenAI API용으로 만든 앱을 그대로 바꿔 쓸 수 있어요. API 키는 필요 없어요. 클라이언트가 `Authorization` 헤더를 요구하면 비어 있지 않은 자리표시를 넣어요.

**요청 본문:**
```json
{
  "model": "llama-3.2-1b",
  "assistant": "asst-abc",
  "messages": [
    {"role": "user", "content": "Hello!"}
  ],
  "stream": false,
  "max_tokens": 100
}
```

선택 항목 `assistant`는 `POST /api/chat`과 같아요 (로컬 어시스턴트만, 없으면 `assistant_not_found`).

**일반 응답:**
```json
{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "created": 1700000000,
  "model": "llama-3.2-1b.gguf",
  "choices": [
    {
      "index": 0,
      "message": {"role": "assistant", "content": "Hi there!"},
      "finish_reason": "stop"
    }
  ],
  "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
}
```

**스트리밍 응답 (SSE):**
```
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**예:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hi"}], "stream": false}'
```

---

## 채팅 기록

### GET /api/chats

저장된 채팅을 모두 나열해요 (메시지는 빠져요).

**응답:**
```json
{
  "chats": [
    {
      "id": "chat-abc123",
      "title": "Quantum Physics Discussion",
      "timestamp": 1700000000000,
      "modelPath": "/path/to/model.gguf",
      "messageCount": 12
    }
  ]
}
```

**예:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats
```

---

### POST /api/chats

새 채팅을 만들어요.

**요청 본문:**
```json
{
  "title": "My Conversation",
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"}
  ]
}
```

**응답 (201):**
```json
{
  "chat": {
    "id": "chat-abc123",
    "title": "My Conversation",
    "timestamp": 1700000000000,
    "modelPath": null,
    "messageCount": 2,
    "messages": [...]
  }
}
```

**매개변수:**
- `title` (문자열, 선택): 채팅 제목
- `messages` (배열, 선택): 대화를 시작할 메시지

---

### GET /api/chats/:id

특정 채팅과 모든 메시지를 가져와요.

**응답:**
```json
{
  "chat": {
    "id": "chat-abc123",
    "title": "My Conversation",
    "timestamp": 1700000000000,
    "modelPath": null,
    "messageCount": 4,
    "messages": [...]
  }
}
```

**예:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### DELETE /api/chats/:id

채팅을 삭제해요.

**응답:**
```json
{
  "status": "deleted",
  "chatId": "chat-abc123"
}
```

**예:**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### GET /api/chats/:id/messages

특정 채팅의 메시지만 가져와요.

**응답:**
```json
{
  "messages": [
    {"id": "msg-1", "role": "user", "content": "Hello"},
    {"id": "msg-2", "role": "assistant", "content": "Hi there!"}
  ]
}
```

**예:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages
```

---

### POST /api/chats/:id/messages

기존 채팅에 메시지를 하나 이상 추가해요.

**요청 본문:**
```json
{
  "messages": [
    {"role": "user", "content": "Follow-up question"}
  ]
}
```

**응답 (201):**
```json
{
  "messages": [
    {"id": "msg-3", "role": "user", "content": "Follow-up question"}
  ]
}
```

**예:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Follow-up"}]}'
```

---

## 모델 관리

### GET /api/tags

기기에 저장된 모델을 모두 나열해요.

**응답:**
```json
{
  "models": [
    {
      "name": "llama-3.2-1b.gguf",
      "modified_at": "2026-03-20T10:00:00.000Z",
      "size": 1234567890,
      "digest": null,
      "model_type": "llama",
      "is_external": false
    }
  ]
}
```

**예:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/tags
```

---

### GET /api/ps

지금 메모리에 올라온 모델을 나열해요.

**응답:**
```json
{
  "models": [
    {
      "name": "llama-3.2-1b.gguf",
      "model": "/path/to/model.gguf",
      "size": 1234567890,
      "loaded_at": "2026-03-20T10:00:00.000Z",
      "is_external": false,
      "model_type": "llama"
    }
  ]
}
```

올라온 모델이 없으면 `models`는 빈 배열이에요.

**예:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/ps
```

---

### POST /api/show

특정 모델의 자세한 정보를 가져와요. GGUF 메타데이터와 현재 설정이 포함돼요.

**요청 본문** (`name`, `model`, 또는 `path`를 써요):
```json
{
  "model": "llama-3.2-1b"
}
```

**응답:**
```json
{
  "name": "llama-3.2-1b.gguf",
  "path": "/path/to/model.gguf",
  "size": 1234567890,
  "modified_at": "2026-03-20T10:00:00.000Z",
  "is_external": false,
  "model_type": "llama",
  "capabilities": ["completion"],
  "multimodal": false,
  "default_projection_model": null,
  "settings": {
    "temperature": 0.7,
    "topP": 0.9,
    "maxTokens": 2048
  },
  "info": {
    "general.architecture": "llama",
    "general.parameter_count": 1000000000
  }
}
```

**예:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/show \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b"}'
```

---

### POST /api/pull

URL에서 모델을 기기로 바로 받아요.

**요청 본문:**
```json
{
  "url": "https://huggingface.co/model.gguf",
  "model": "my-custom-model"
}
```

**응답:**
```json
{
  "status": "downloading",
  "model": "my-custom-model",
  "downloadId": "download-abc123"
}
```

다운로드는 백그라운드에서 돌아요. `GET /api/tags`로 모델이 나타났는지 확인해요.

**예:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/pull \
  -H "Content-Type: application/json" \
  -d '{"url": "https://huggingface.co/model.gguf", "model": "my-model"}'
```

---

### POST /api/copy

기존 모델 파일을 새 이름으로 복사해요.

**요청 본문:**
```json
{
  "source": "llama-3.2-1b",
  "destination": "llama-3.2-1b-backup"
}
```

**응답:**
```json
{
  "status": "copied",
  "source": "llama-3.2-1b.gguf",
  "destination": "llama-3.2-1b-backup.gguf"
}
```

대상 이름이 이미 있으면 `409`를 돌려요. 외부 모델은 복사할 수 없어요.

**예:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/copy \
  -H "Content-Type: application/json" \
  -d '{"source": "llama-3.2-1b", "destination": "llama-backup"}'
```

---

### DELETE /api/delete

로컬 저장공간에서 모델을 삭제해요.

**요청 본문** (`name` 또는 `path`를 써요):
```json
{
  "name": "llama-3.2-1b"
}
```

**응답:**
```json
{
  "success": true
}
```

**예:**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/delete \
  -H "Content-Type: application/json" \
  -d '{"name": "old-model"}'
```

---

### POST /api/models

모델의 수명 주기 작업을 해요.

**요청 본문:**
```json
{
  "action": "load",
  "model": "llama-3.2-1b"
}
```

**쓸 수 있는 동작:**

| 동작 | 설명 | `model` 필드 |
|--------|-------------|---------------|
| `load` | 모델을 메모리에 올려요 | 필수: 모델 이름 또는 경로 |
| `unload` | 지금 올라온 모델을 내려요 | 쓰지 않아요 |
| `reload` | 지금 올라온 모델을 다시 초기화해요 | 쓰지 않아요 |
| `refresh` | 저장공간을 다시 살펴보고 모델 목록을 다시 읽어요 | 쓰지 않아요 |

**응답 (`load`):**
```json
{
  "status": "loaded",
  "model": {
    "name": "llama-3.2-1b.gguf",
    "path": "/path/to/model.gguf",
    "projector": null
  }
}
```

**응답 (`refresh`):**
```json
{
  "status": "refreshed",
  "count": 3,
  "models": [...]
}
```

**예:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models \
  -H "Content-Type: application/json" \
  -d '{"action": "load", "model": "llama-3.2-1b"}'
```

---

### GET /api/models/apple-foundation

Apple Foundation 모델을 쓸 수 있는지, 준비됐는지 확인해요 (iOS만).

**응답:**
```json
{
  "available": true,
  "requirementsMet": true,
  "enabled": true,
  "status": "ready",
  "message": "Apple Foundation is ready to use."
}
```

| `status` | 뜻 |
|----------|---------|
| `ready` | 쓸 수 있고 켜져 있어요. 요청에 `model: "apple-foundation"`을 써요 |
| `configure` | 쓸 수 없거나 꺼져 있어요. 자세한 내용은 `message`를 봐요 |

**예:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### POST /api/models/apple-foundation

Apple Foundation이 요청을 처리할 준비가 됐는지 확인해요. 쓸 수 없거나, 조건이 안 맞거나, 앱 설정에서 꺼져 있으면 오류를 돌려요.

**응답 (준비됨):**
```json
{
  "status": "ready"
}
```

**오류 응답:**
- `501` — `apple_foundation_unavailable`: 기기가 Apple Intelligence를 지원하지 않아요
- `428` — `requirements_not_met`: 기기를 업데이트해야 해요
- `409` — `apple_foundation_disabled`: 먼저 앱 설정에서 켜요

**예:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### GET /api/version

현재 앱 버전을 가져와요.

**응답:**
```json
{
  "version": "0.8.3"
}
```

**예:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/version
```

---

## RAG와 embeddings

### POST /api/embeddings

로컬 모델로 하나 이상의 글에 embedding(글을 숫자로 바꿔 찾기 쉽게 하는 것)을 만들어요.

**요청 본문:**
```json
{
  "model": "llama-3.2-1b",
  "input": "The quick brown fox jumps over the lazy dog"
}
```

한 요청에 배열을 넘기면 여러 글을 한 번에 처리해요.
```json
{
  "model": "llama-3.2-1b",
  "input": ["First text", "Second text"]
}
```

**응답:**
```json
{
  "embeddings": [
    [0.123, -0.456, 0.789, "..."]
  ],
  "model": "llama-3.2-1b.gguf"
}
```

**매개변수:**
- `model` (문자열, 필수): embedding에 쓸 로컬 모델
- `input` (문자열 또는 배열, 필수): 바꿀 글. `prompt`나 `text`로도 받아요.

**예:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "input": "Sample text"}'
```

---

### POST /api/files/ingest

내용을 RAG에 넣어요. 원문, 기기의 파일 경로 하나, 또는 여러 경로를 받아요.

**요청 본문 (원문):**
```json
{
  "content": "Document content to store for RAG...",
  "fileName": "my-doc.txt"
}
```

**요청 본문 (파일 경로 하나):**
```json
{
  "filePath": "/path/to/doc.txt"
}
```

**요청 본문 (파일 경로 여러 개):**
```json
{
  "files": ["/path/to/doc1.txt", "/path/to/doc2.txt"]
}
```

**응답:**
```json
{
  "status": "stored",
  "documentId": "1700000000000-abc123",
  "fileName": "my-doc.txt",
  "model": null
}
```

**매개변수:**
- `content` (문자열): 원문 *( `filePath`와 `files`가 없으면 필수)*
- `filePath` (문자열, 선택): 기기에 있는 파일의 절대 경로
- `files` (배열, 선택): 절대 경로의 배열
- `fileName` (문자열, 선택): 문서 표시 이름 (기본값: `"uploaded.txt"`)
- `chatId` (문자열, 선택): 문서를 특정 채팅에 연결해요
- `provider` (문자열, 선택): RAG embedding 제공자
- `rag` (불리언, 선택): `false`면 RAG 색인을 건너뛰어요 (기본값: `true`)

**예:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Machine learning is a subset of AI...", "fileName": "ml-intro.txt"}'
```

---

### GET /api/rag

현재 RAG 상태를 가져와요.

**응답:**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 3
}
```

**예:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/rag
```

---

### POST /api/rag

RAG를 설정해요 (켜기/끄기, 저장 방식, 또는 초기화).

**요청 본문:**
```json
{
  "enabled": true,
  "storage": "persistent",
  "initialize": true
}
```

**응답:**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 0
}
```

**매개변수:**
- `enabled` (불리언, 선택): RAG를 켜거나 꺼요
- `storage` (문자열, 선택): `"memory"` 또는 `"persistent"`
- `initialize` (불리언, 선택): RAG 초기화를 시작해요
- `provider` (문자열, 선택): 초기화에 쓸 embedding 제공자

**예:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "storage": "persistent"}'
```

---

### POST /api/rag/reset

RAG에 넣은 문서를 모두 지워요.

**응답:**
```json
{
  "status": "cleared",
  "enabled": true,
  "ready": false,
  "documentCount": 0
}
```

**예:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag/reset
```

---

## 서버와 설정

### GET /api/status

서버 상태, 활성 모델, RAG 상태를 가져와요.

**응답:**
```json
{
  "server": {
    "isRunning": true,
    "url": "http://192.168.1.110:8889",
    "port": 8889,
    "clientCount": 1
  },
  "model": {
    "loaded": true,
    "path": "/path/to/model.gguf"
  },
  "rag": {
    "ready": false
  }
}
```

**예:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/status
```

---

### POST /api/settings/thinking

지금 올라온 모델의 생각 모드(답을 내기 전에 더 생각하는 방식)를 켜거나 꺼요.

**요청 본문:**
```json
{
  "enabled": true
}
```

**응답:**
```json
{
  "status": "updated",
  "enabled": true
}
```

**매개변수:**
- `enabled` (불리언, 필수): 생각 모드를 켜거나 꺼요

**예:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/settings/thinking \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## 오류 처리

모든 엔드포인트는 표준 HTTP 상태 코드와 JSON 오류 본문을 돌려요.

**성공 코드:**
- `200 OK`
- `201 Created`

**오류 코드:**
- `400 Bad Request`: 매개변수가 없거나 잘못됐어요
- `404 Not Found`: 리소스가 없어요
- `405 Method Not Allowed`
- `409 Conflict`: 전제가 안 맞아요 (예: 원격 모델이 꺼짐)
- `422 Unprocessable Entity`: 요청은 유효하지만 동작을 할 수 없어요 (예: API 키 없음)
- `500 Internal Server Error`
- `503 Service Unavailable`: 모델이 올라와 있지 않아요

**오류 응답 형식:**
```json
{
  "error": "error_code"
}
```

---

## 보안

- 이 서버는 로컬 네트워크에서만 쓰도록 만들어졌어요
- 로그인은 필요 없어요 (네트워크 격리로 지켜요)
- CORS는 모든 출처에 열려 있어요
- 로컬 네트워크 밖으로 서버를 열려면 VPN이나 방화벽을 먼저 고려해요

---

## 속도 제한

속도 제한은 없어요. 성능은 기기 CPU, 메모리, 모델 크기, 동시 연결 수에 따라요.

---

## 자주 쓰는 예

### 로컬 모델과 채팅

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.2-1b",
    "messages": [
      {"role": "system", "content": "You are a helpful coding assistant"},
      {"role": "user", "content": "Write a Python function to calculate fibonacci"}
    ],
    "stream": false
  }'
```

### 문서를 넣고 RAG 상태 확인

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Your document content here...", "fileName": "doc.txt"}'

curl http://YOUR_DEVICE_IP:8889/api/rag
```

### 모델 관리

```bash
# List available models
curl http://YOUR_DEVICE_IP:8889/api/tags

# Load a model
curl -X POST http://YOUR_DEVICE_IP:8889/api/models \
  -H "Content-Type: application/json" \
  -d '{"action": "load", "model": "llama-3.2-1b"}'

# Check what is loaded
curl http://YOUR_DEVICE_IP:8889/api/ps
```

---

## 예제 앱

### InferrLM CLI

InferrLM CLI는 React, Ink, TypeScript로 만든 명령줄 도구예요. InferrLM 서버에 연결해서 터미널에서 채팅하고, 답이 나오는 동안 표시하며, 대화 기록을 남겨요.

소스: [github.com/sbhjt-gr/inferra-cli](https://github.com/sbhjt-gr/inferra-cli)

---

## 더 볼 자료

- [InferrLM GitHub 저장소](https://github.com/sbhjt-gr/inferra)
- [InferrLM CLI 도구](https://github.com/sbhjt-gr/inferra-cli)
- [기여 가이드](CONTRIBUTING.ko.md)
- [라이선스](../LICENSE)

---

**마지막 업데이트**: 2026년 3월 20일  
**API 버전**: 0.8.3
