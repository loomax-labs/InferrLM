[English](REST_APIs.md) | [简体中文](REST_APIs.zh-CN.md) | [繁體中文](REST_APIs.zh-TW.md) | [日本語](REST_APIs.ja.md) | [한국어](REST_APIs.ko.md) | [Deutsch](REST_APIs.de.md) | [Français](REST_APIs.fr.md) | [Nederlands](REST_APIs.nl.md)

# InferrLM REST API 文件

InferrLM 本機 HTTP 伺服器的完整介面說明。REST API（透過網路請求呼叫的介面）把手機上的 AI 開放給同一網路裡的其他裝置。

## 開始

### 快速開始

1. **啟動伺服器**：打開 InferrLM，進入 **伺服器** 頁，把開關打開。網址會出現（例如 `http://192.168.1.10:8889`）。
2. **下載模型**：在 **模型** 頁至少下載一個 GGUF（一種模型檔案格式）。API 請求裡的模型名不帶 `.gguf`。
3. **設定用戶端**：把任何相容 OpenAI 的用戶端指向 `http://YOUR_DEVICE_IP:8889/v1`。不需要 API 金鑰。如果用戶端一定要填，隨便寫個占位就好。
4. **發一則請求：**

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hello!"}]}'
```

> 任何支援 OpenAI API 的軟體或函式庫都能用，只要指向 `http://YOUR_DEVICE_IP:8889/v1`。兩台裝置必須在同一個區域網路。模型名裡的 `.gguf` 可寫可不寫。

### 啟動伺服器

1. 在手機上打開 InferrLM
2. 進入 **伺服器** 頁
3. 打開伺服器開關
4. 會顯示伺服器網址（一般是 `http://YOUR_DEVICE_IP:8889`）
5. 你可以用 QR code 分享這個網址，也可以複製後在其他裝置上打開

### 可以改的選項

- **自動啟動**：軟體打開時自動啟動伺服器
- **連接埠**：預設連接埠是 8889（可以在設定裡改）

### 基礎設定

**基礎網址**：`http://YOUR_DEVICE_IP:8889`  
**Content-Type**：`application/json`  
**CORS**：對所有來源開放

### 選擇模型目標

每個會產生文字的請求都有一個 `model` 字串，用來決定由哪個執行後端處理：

| 模型值 | 送到哪個後端 | 說明 |
|-------------|----------------|-------|
| 已儲存的模型名（例如 `llama-3.2-1b`） | 在這台裝置上執行的本機 GGUF | 先在 InferrLM 裡下載 GGUF。 |
| `apple-foundation` | Apple Intelligence Foundation 模型 | 僅 iOS。在軟體設定裡打開，並用 `GET /api/models/apple-foundation` 確認。 |

---

## 助理（本機）

### GET /api/assistants

列出這台裝置上 `deployment: "local"` 的助理。回應不會帶出 system prompt、技能說明和密鑰。

**回應：**
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

**範例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/assistants
```

---

## 聊天與完成介面

### POST /api/chat

串流或一次完成一段有完整對話紀錄的聊天。接受本機 GGUF 模型名或 `apple-foundation`。

**請求內容：**
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

**串流回應（NDJSON）：**
```
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":"Hi"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":" there"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":""},"done":true}
```

**非串流回應：**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "message": {"role": "assistant", "content": "Hi there!"},
  "done": true
}
```

**參數：**
- `model`（字串，必填）：目標後端
- `messages`（陣列，必填）：對話紀錄。每一則有 `role`（`system` | `user` | `assistant`）和 `content`
- `assistant`（字串，選填）：本機助理的 id，來自 `GET /api/assistants`。有填、而且內容裡沒有 system 訊息（`messages` 裡 `role: "system"`、頂層 `system`，或 `options.system_prompt`）時，伺服器會在產生回答前加上該助理的 system prompt。未知 id 回 `404`，內容是 `{ "error": "assistant_not_found" }`。
- `stream`（布林，選填）：開啟串流 NDJSON 回應（預設：`true`）
- `temperature`（數字，選填）：取樣溫度 0.0–2.0
- `max_tokens`（數字，選填）：最多產生多少 token
- `top_p`（數字，選填）：Top-p 取樣
- `top_k`（數字，選填）：Top-k 取樣

**範例：**
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

從單一提示產生一段回答（沒有對話上下文）。

**請求內容：**
```json
{
  "model": "llama-3.2-1b",
  "prompt": "Explain quantum computing in simple terms",
  "stream": false,
  "max_tokens": 500
}
```

**回應：**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "response": "Quantum computing uses quantum mechanics principles...",
  "done": true
}
```

**參數：**
- `model`（字串，必填）：目標後端
- `prompt`（字串，必填）：輸入的提示
- `stream`（布林，選填）：開啟串流 NDJSON 回應
- `max_tokens`（數字，選填）：最多產生多少 token
- `temperature`（數字，選填）：取樣溫度

**範例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "prompt": "Hello world", "stream": false}'
```

---

## 相容 OpenAI 的 API

### GET /v1/models

以 OpenAI 格式列出可用模型。任何 OpenAI 用戶端函式庫都能用。

**回應：**
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

**範例：**
```bash
curl http://YOUR_DEVICE_IP:8889/v1/models
```

---

### POST /v1/chat/completions

相容 OpenAI 的聊天完成介面。給原本接 OpenAI API 的軟體直接替換。不需要 API 金鑰。如果用戶端一定要 `Authorization` 標頭，放任何非空的占位即可。

**請求內容：**
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

選填的 `assistant` 和 `POST /api/chat` 一樣（只限本機助理；找不到時是 `assistant_not_found`）。

**非串流回應：**
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

**串流回應（SSE）：**
```
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**範例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hi"}], "stream": false}'
```

---

## 聊天紀錄

### GET /api/chats

列出所有已儲存的聊天（不含訊息）。

**回應：**
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

**範例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats
```

---

### POST /api/chats

建立一段新的聊天。

**請求內容：**
```json
{
  "title": "My Conversation",
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"}
  ]
}
```

**回應（201）：**
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

**參數：**
- `title`（字串，選填）：聊天標題
- `messages`（陣列，選填）：一開始放進對話的訊息

---

### GET /api/chats/:id

取得某一段聊天，含全部訊息。

**回應：**
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

**範例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### DELETE /api/chats/:id

刪除一段聊天。

**回應：**
```json
{
  "status": "deleted",
  "chatId": "chat-abc123"
}
```

**範例：**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### GET /api/chats/:id/messages

只取得某一段聊天的訊息。

**回應：**
```json
{
  "messages": [
    {"id": "msg-1", "role": "user", "content": "Hello"},
    {"id": "msg-2", "role": "assistant", "content": "Hi there!"}
  ]
}
```

**範例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages
```

---

### POST /api/chats/:id/messages

在現有聊天後面加上一則或多則訊息。

**請求內容：**
```json
{
  "messages": [
    {"role": "user", "content": "Follow-up question"}
  ]
}
```

**回應（201）：**
```json
{
  "messages": [
    {"id": "msg-3", "role": "user", "content": "Follow-up question"}
  ]
}
```

**範例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Follow-up"}]}'
```

---

## 模型管理

### GET /api/tags

列出這台裝置上儲存的所有模型。

**回應：**
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

**範例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/tags
```

---

### GET /api/ps

列出目前已載入的模型（在記憶體裡的模型）。

**回應：**
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

沒有載入模型時，`models` 是空陣列。

**範例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/ps
```

---

### POST /api/show

取得某個模型的詳細資料，包括 GGUF 中繼資料和目前設定。

**請求內容**（用 `name`、`model` 或 `path`）：
```json
{
  "model": "llama-3.2-1b"
}
```

**回應：**
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

**範例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/show \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b"}'
```

---

### POST /api/pull

從網址直接把模型下載到這台裝置。

**請求內容：**
```json
{
  "url": "https://huggingface.co/model.gguf",
  "model": "my-custom-model"
}
```

**回應：**
```json
{
  "status": "downloading",
  "model": "my-custom-model",
  "downloadId": "download-abc123"
}
```

下載在背景進行。用 `GET /api/tags` 看模型什麼時候出現。

**範例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/pull \
  -H "Content-Type: application/json" \
  -d '{"url": "https://huggingface.co/model.gguf", "model": "my-model"}'
```

---

### POST /api/copy

把現有的模型檔複製成新名字。

**請求內容：**
```json
{
  "source": "llama-3.2-1b",
  "destination": "llama-3.2-1b-backup"
}
```

**回應：**
```json
{
  "status": "copied",
  "source": "llama-3.2-1b.gguf",
  "destination": "llama-3.2-1b-backup.gguf"
}
```

如果目標名稱已存在，回 `409`。外部模型不能複製。

**範例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/copy \
  -H "Content-Type: application/json" \
  -d '{"source": "llama-3.2-1b", "destination": "llama-backup"}'
```

---

### DELETE /api/delete

從本機儲存空間刪除一個模型。

**請求內容**（用 `name` 或 `path`）：
```json
{
  "name": "llama-3.2-1b"
}
```

**回應：**
```json
{
  "success": true
}
```

**範例：**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/delete \
  -H "Content-Type: application/json" \
  -d '{"name": "old-model"}'
```

---

### POST /api/models

做模型的生命週期操作。

**請求內容：**
```json
{
  "action": "load",
  "model": "llama-3.2-1b"
}
```

**可用動作：**

| 動作 | 說明 | `model` 欄位 |
|--------|-------------|---------------|
| `load` | 把模型載入記憶體 | 必填：模型名或路徑 |
| `unload` | 釋放目前載入的模型 | 不用 |
| `reload` | 重新初始化目前載入的模型 | 不用 |
| `refresh` | 重新掃描儲存空間並重載模型清單 | 不用 |

**回應（`load`）：**
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

**回應（`refresh`）：**
```json
{
  "status": "refreshed",
  "count": 3,
  "models": [...]
}
```

**範例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models \
  -H "Content-Type: application/json" \
  -d '{"action": "load", "model": "llama-3.2-1b"}'
```

---

### GET /api/models/apple-foundation

檢查 Apple Foundation 模型是否可用、是否就緒（僅 iOS）。

**回應：**
```json
{
  "available": true,
  "requirementsMet": true,
  "enabled": true,
  "status": "ready",
  "message": "Apple Foundation is ready to use."
}
```

| `status` | 意思 |
|----------|---------|
| `ready` | 可用且已開啟。請求裡用 `model: "apple-foundation"` |
| `configure` | 不可用或未開啟。詳情看 `message` |

**範例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### POST /api/models/apple-foundation

確認 Apple Foundation 可以處理請求。不可用、條件不足，或軟體設定裡沒打開時，會回錯誤。

**回應（就緒）：**
```json
{
  "status": "ready"
}
```

**錯誤回應：**
- `501` — `apple_foundation_unavailable`：裝置不支援 Apple Intelligence
- `428` — `requirements_not_met`：裝置需要更新
- `409` — `apple_foundation_disabled`：先在軟體設定裡打開

**範例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### GET /api/version

取得目前的軟體版本。

**回應：**
```json
{
  "version": "0.8.3"
}
```

**範例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/version
```

---

## RAG 與 embeddings

### POST /api/embeddings

用本機模型為一段或多段文字產生 embedding（把文字變成一組數字，方便查找）。

**請求內容：**
```json
{
  "model": "llama-3.2-1b",
  "input": "The quick brown fox jumps over the lazy dog"
}
```

在同一次請求裡傳入陣列，就能處理多段文字：
```json
{
  "model": "llama-3.2-1b",
  "input": ["First text", "Second text"]
}
```

**回應：**
```json
{
  "embeddings": [
    [0.123, -0.456, 0.789, "..."]
  ],
  "model": "llama-3.2-1b.gguf"
}
```

**參數：**
- `model`（字串，必填）：用來做 embedding 的本機模型
- `input`（字串或陣列，必填）：要轉換的文字。也可以用 `prompt` 或 `text`。

**範例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "input": "Sample text"}'
```

---

### POST /api/files/ingest

把內容放進 RAG。可以是原始文字、裝置上的一個檔案路徑，或多個檔案路徑。

**請求內容（原始文字）：**
```json
{
  "content": "Document content to store for RAG...",
  "fileName": "my-doc.txt"
}
```

**請求內容（單一檔案路徑）：**
```json
{
  "filePath": "/path/to/doc.txt"
}
```

**請求內容（多個檔案路徑）：**
```json
{
  "files": ["/path/to/doc1.txt", "/path/to/doc2.txt"]
}
```

**回應：**
```json
{
  "status": "stored",
  "documentId": "1700000000000-abc123",
  "fileName": "my-doc.txt",
  "model": null
}
```

**參數：**
- `content`（字串）：原始文字 *（沒有 `filePath` 和 `files` 時必填）*
- `filePath`（字串，選填）：裝置上檔案的絕對路徑
- `files`（陣列，選填）：多個絕對路徑
- `fileName`（字串，選填）：文件顯示名稱（預設：`"uploaded.txt"`）
- `chatId`（字串，選填）：把文件掛到某一段聊天
- `provider`（字串，選填）：RAG embedding 提供者
- `rag`（布林，選填）：設為 `false` 就略過 RAG 索引（預設：`true`）

**範例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Machine learning is a subset of AI...", "fileName": "ml-intro.txt"}'
```

---

### GET /api/rag

取得目前的 RAG 狀態。

**回應：**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 3
}
```

**範例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/rag
```

---

### POST /api/rag

設定 RAG（開啟或關閉、儲存方式，或初始化）。

**請求內容：**
```json
{
  "enabled": true,
  "storage": "persistent",
  "initialize": true
}
```

**回應：**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 0
}
```

**參數：**
- `enabled`（布林，選填）：開啟或關閉 RAG
- `storage`（字串，選填）：`"memory"` 或 `"persistent"`
- `initialize`（布林，選填）：觸發 RAG 初始化
- `provider`（字串，選填）：初始化時用的 embedding 提供者

**範例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "storage": "persistent"}'
```

---

### POST /api/rag/reset

清掉 RAG 裡已放入的所有文件。

**回應：**
```json
{
  "status": "cleared",
  "enabled": true,
  "ready": false,
  "documentCount": 0
}
```

**範例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag/reset
```

---

## 伺服器與設定

### GET /api/status

取得伺服器狀態、目前模型，以及 RAG 狀態。

**回應：**
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

**範例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/status
```

---

### POST /api/settings/thinking

為目前載入的模型開啟或關閉思考模式（多想一段再回答）。

**請求內容：**
```json
{
  "enabled": true
}
```

**回應：**
```json
{
  "status": "updated",
  "enabled": true
}
```

**參數：**
- `enabled`（布林，必填）：開啟或關閉思考模式

**範例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/settings/thinking \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## 錯誤處理

所有介面都回標準 HTTP 狀態碼，錯誤內容是 JSON。

**成功代碼：**
- `200 OK`
- `201 Created`

**錯誤代碼：**
- `400 Bad Request`：缺少參數或參數無效
- `404 Not Found`：資源不存在
- `405 Method Not Allowed`
- `409 Conflict`：前提不成立（例如遠端模型被關掉）
- `422 Unprocessable Entity`：請求有效，但動作做不到（例如缺少 API 金鑰）
- `500 Internal Server Error`
- `503 Service Unavailable`：模型尚未載入

**錯誤回應格式：**
```json
{
  "error": "error_code"
}
```

---

## 安全注意

- 這個伺服器只適合在區域網路使用
- 不需要登入驗證（靠網路隔離）
- CORS 對所有來源開放
- 如果要讓區域網路以外的人連到伺服器，先考慮 VPN 或防火牆

---

## 速率限制

沒有速率限制。速度取決於裝置的 CPU、記憶體、模型大小，以及同時連線數。

---

## 常見用法

### 和本機模型聊天

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

### 放入文件並查看 RAG 狀態

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Your document content here...", "fileName": "doc.txt"}'

curl http://YOUR_DEVICE_IP:8889/api/rag
```

### 模型管理

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

## 範例程式

### InferrLM CLI

InferrLM CLI 是用 React、Ink 和 TypeScript 做的命令列工具。它連上你的 InferrLM 伺服器，在終端機裡聊天，支援一邊產生一邊回傳，也保留對話紀錄。

原始碼：[github.com/sbhjt-gr/inferra-cli](https://github.com/sbhjt-gr/inferra-cli)

---

## 其他資源

- [InferrLM GitHub 儲存庫](https://github.com/sbhjt-gr/inferra)
- [InferrLM CLI 工具](https://github.com/sbhjt-gr/inferra-cli)
- [貢獻指南](CONTRIBUTING.zh-TW.md)
- [授權](../LICENSE)

---

**最後更新**：2026 年 3 月 20 日  
**API 版本**：0.8.3
