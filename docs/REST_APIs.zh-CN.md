[English](REST_APIs.md) · [简体中文](REST_APIs.zh-CN.md) · [日本語](REST_APIs.ja.md)

# InferrLM REST API 文档

InferrLM 本地 HTTP 服务器的完整接口说明。REST API（通过网络请求调用的接口）把手机上的 AI 开放给同一网络里的其他设备。

## 开始使用

### 快速开始

1. **启动服务器** — 打开 InferrLM，进入 **服务器** 页，把开关打开。网址会出现（例如 `http://192.168.1.10:8889`）。
2. **下载模型** — 在 **模型** 页至少下载一个 GGUF（一种模型文件格式）。API 请求里用的模型名不带 `.gguf`。
3. **配置客户端** — 把任何兼容 OpenAI 的客户端指向 `http://YOUR_DEVICE_IP:8889/v1`。不需要 API 密钥。如果客户端非要填一个，随便写个占位就行。
4. **发一条请求：**

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hello!"}]}'
```

> 任何支持 OpenAI API 的软件或库都能用，只要指向 `http://YOUR_DEVICE_IP:8889/v1`。两台设备必须在同一个本地网络。模型名里的 `.gguf` 后缀可写可不写。

### 启动服务器

1. 在手机上打开 InferrLM
2. 进入 **服务器** 页
3. 打开服务器开关
4. 会显示服务器网址（一般是 `http://YOUR_DEVICE_IP:8889`）
5. 你可以用二维码分享这个网址，也可以复制后在其他设备上打开

### 可以改的选项

- **自动启动**：软件打开时自动启动服务器
- **端口**：默认端口是 8889（可以在设置里改）

### 基础配置

**基础网址**：`http://YOUR_DEVICE_IP:8889`  
**Content-Type**：`application/json`  
**CORS**：对所有来源都已打开

### 选择模型跑在哪

每个会生成文字的请求都带一个 `model` 字符串，用来决定由哪一种方式来跑：

| 模型取值 | 实际跑在哪 | 说明 |
|-------------|----------------|-------|
| 已保存的模型名（例如 `llama-3.2-1b`） | 在手机上运行的本地 GGUF | 先在 InferrLM 里下载这个 GGUF。 |
| `apple-foundation` | Apple Intelligence 的 Foundation 模型 | 仅 iOS。在软件设置里打开，并用 `GET /api/models/apple-foundation` 确认。 |

---

## 助手（本地）

### GET /api/assistants

列出这台手机上 `deployment: "local"` 的助手。响应里不会带系统提示、技能说明和密钥。

**响应：**
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

**示例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/assistants
```

---

## 聊天和补全接口

### POST /api/chat

按完整对话记录来聊天，可以一边生成一边返回，也可以一次返回。可以用本地 GGUF 模型名，也可以用 `apple-foundation`。

**请求体：**
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

**流式响应（NDJSON）：**
```
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":"Hi"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":" there"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":""},"done":true}
```

**非流式响应：**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "message": {"role": "assistant", "content": "Hi there!"},
  "done": true
}
```

**参数：**
- `model`（字符串，必填）：要用哪一种方式来跑
- `messages`（数组，必填）：对话记录。每一条有 `role`（`system` | `user` | `assistant`）和 `content`
- `assistant`（字符串，可选）：本地助手的 id，来自 `GET /api/assistants`。填了它，并且请求体里没有系统消息（`messages` 里 `role: "system"`、顶层 `system`，或 `options.system_prompt`）时，服务器会在生成前加上这个助手的系统提示。id 不存在时返回 `404`，内容是 `{ "error": "assistant_not_found" }`。
- `stream`（布尔值，可选）：是否用 NDJSON 一边生成一边返回（默认：`true`）
- `temperature`（数字，可选）：随机程度，范围 0.0–2.0
- `max_tokens`（数字，可选）：一次最多生成多少内容
- `top_p`（数字，可选）：Top-p 抽样，只从概率较高的候选里挑
- `top_k`（数字，可选）：Top-k 抽样，只从最可能的前几个里挑

**示例：**
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

根据一条提示生成内容，不带之前的对话。

**请求体：**
```json
{
  "model": "llama-3.2-1b",
  "prompt": "Explain quantum computing in simple terms",
  "stream": false,
  "max_tokens": 500
}
```

**响应：**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "response": "Quantum computing uses quantum mechanics principles...",
  "done": true
}
```

**参数：**
- `model`（字符串，必填）：要用哪一种方式来跑
- `prompt`（字符串，必填）：输入的提示
- `stream`（布尔值，可选）：是否用 NDJSON 一边生成一边返回
- `max_tokens`（数字，可选）：一次最多生成多少内容
- `temperature`（数字，可选）：随机程度

**示例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "prompt": "Hello world", "stream": false}'
```

---

## 兼容 OpenAI 的 API

### GET /v1/models

按 OpenAI 的格式列出可用模型。兼容各种 OpenAI 客户端库。

**响应：**
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

**示例：**
```bash
curl http://YOUR_DEVICE_IP:8889/v1/models
```

---

### POST /v1/chat/completions

兼容 OpenAI 的聊天补全接口。按 OpenAI API 写的软件可以直接换过来用。不需要 API 密钥。如果客户端要求 `Authorization` 头，填任意非空占位即可。

**请求体：**
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

可选的 `assistant` 和 `POST /api/chat` 里一样（只支持本地助手；找不到时返回 `assistant_not_found`）。

**非流式响应：**
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

**流式响应（SSE）：**
```
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**示例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hi"}], "stream": false}'
```

---

## 聊天记录

### GET /api/chats

列出所有已保存的聊天，不含消息内容。

**响应：**
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

**示例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats
```

---

### POST /api/chats

新建一段聊天。

**请求体：**
```json
{
  "title": "My Conversation",
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"}
  ]
}
```

**响应（201）：**
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

**参数：**
- `title`（字符串，可选）：聊天标题
- `messages`（数组，可选）：用来开头的初始消息

---

### GET /api/chats/:id

获取某一段聊天，包含全部消息。

**响应：**
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

**示例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### DELETE /api/chats/:id

删除一段聊天。

**响应：**
```json
{
  "status": "deleted",
  "chatId": "chat-abc123"
}
```

**示例：**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### GET /api/chats/:id/messages

只获取某一段聊天的消息。

**响应：**
```json
{
  "messages": [
    {"id": "msg-1", "role": "user", "content": "Hello"},
    {"id": "msg-2", "role": "assistant", "content": "Hi there!"}
  ]
}
```

**示例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages
```

---

### POST /api/chats/:id/messages

往已有聊天里追加一条或多条消息。

**请求体：**
```json
{
  "messages": [
    {"role": "user", "content": "Follow-up question"}
  ]
}
```

**响应（201）：**
```json
{
  "messages": [
    {"id": "msg-3", "role": "user", "content": "Follow-up question"}
  ]
}
```

**示例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Follow-up"}]}'
```

---

## 模型管理

### GET /api/tags

列出手机上保存的全部模型。

**响应：**
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

**示例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/tags
```

---

### GET /api/ps

列出当前已载入的模型（正在内存里的模型）。

**响应：**
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

没有模型载入时，返回空的 `models` 数组。

**示例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/ps
```

---

### POST /api/show

查看某个模型的详细信息，包括 GGUF 元数据和当前设置。

**请求体**（用 `name`、`model` 或 `path`）：
```json
{
  "model": "llama-3.2-1b"
}
```

**响应：**
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

**示例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/show \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b"}'
```

---

### POST /api/pull

从网址把模型直接下载到手机。

**请求体：**
```json
{
  "url": "https://huggingface.co/model.gguf",
  "model": "my-custom-model"
}
```

**响应：**
```json
{
  "status": "downloading",
  "model": "my-custom-model",
  "downloadId": "download-abc123"
}
```

下载在后台跑。用 `GET /api/tags` 看模型什么时候出现。

**示例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/pull \
  -H "Content-Type: application/json" \
  -d '{"url": "https://huggingface.co/model.gguf", "model": "my-model"}'
```

---

### POST /api/copy

把已有的模型文件复制成一个新名字。

**请求体：**
```json
{
  "source": "llama-3.2-1b",
  "destination": "llama-3.2-1b-backup"
}
```

**响应：**
```json
{
  "status": "copied",
  "source": "llama-3.2-1b.gguf",
  "destination": "llama-3.2-1b-backup.gguf"
}
```

如果目标名字已经存在，返回 `409`。外部模型不能复制。

**示例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/copy \
  -H "Content-Type: application/json" \
  -d '{"source": "llama-3.2-1b", "destination": "llama-backup"}'
```

---

### DELETE /api/delete

从本地存储删除一个模型。

**请求体**（用 `name` 或 `path`）：
```json
{
  "name": "llama-3.2-1b"
}
```

**响应：**
```json
{
  "success": true
}
```

**示例：**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/delete \
  -H "Content-Type: application/json" \
  -d '{"name": "old-model"}'
```

---

### POST /api/models

做模型的加载、卸载这类操作。

**请求体：**
```json
{
  "action": "load",
  "model": "llama-3.2-1b"
}
```

**可用操作：**

| 操作 | 说明 | `model` 字段 |
|--------|-------------|---------------|
| `load` | 把模型载入内存 | 必填 — 模型名或路径 |
| `unload` | 释放当前已载入的模型 | 不用 |
| `reload` | 重新初始化当前已载入的模型 | 不用 |
| `refresh` | 重新扫描存储并刷新模型列表 | 不用 |

**响应（`load`）：**
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

**响应（`refresh`）：**
```json
{
  "status": "refreshed",
  "count": 3,
  "models": [...]
}
```

**示例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models \
  -H "Content-Type: application/json" \
  -d '{"action": "load", "model": "llama-3.2-1b"}'
```

---

### GET /api/models/apple-foundation

查看 Apple Foundation 模型是否可用、是否准备好（仅 iOS）。

**响应：**
```json
{
  "available": true,
  "requirementsMet": true,
  "enabled": true,
  "status": "ready",
  "message": "Apple Foundation is ready to use."
}
```

| `status` | 含义 |
|----------|---------|
| `ready` | 可用且已打开 — 请求里用 `model: "apple-foundation"` |
| `configure` | 不可用或未打开 — 看 `message` 里的说明 |

**示例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### POST /api/models/apple-foundation

确认 Apple Foundation 已经可以处理请求。如果设备不支持、条件没满足，或软件设置里没打开，会返回错误。

**响应（已就绪）：**
```json
{
  "status": "ready"
}
```

**错误响应：**
- `501` — `apple_foundation_unavailable`：设备不支持 Apple Intelligence
- `428` — `requirements_not_met`：设备需要更新
- `409` — `apple_foundation_disabled`：先在软件设置里打开

**示例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### GET /api/version

获取当前软件版本。

**响应：**
```json
{
  "version": "0.8.3"
}
```

**示例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/version
```

---

## RAG 和 embedding

RAG 是先找出文档里相关的内容，再让模型回答。embedding 是把文字变成一组数字，方便以后查找。

### POST /api/embeddings

用本地模型为一句或多句文字生成 embedding。

**请求体：**
```json
{
  "model": "llama-3.2-1b",
  "input": "The quick brown fox jumps over the lazy dog"
}
```

一次请求里要处理多段文字时，传入数组：
```json
{
  "model": "llama-3.2-1b",
  "input": ["First text", "Second text"]
}
```

**响应：**
```json
{
  "embeddings": [
    [0.123, -0.456, 0.789, "..."]
  ],
  "model": "llama-3.2-1b.gguf"
}
```

**参数：**
- `model`（字符串，必填）：用来生成 embedding 的本地模型
- `input`（字符串或数组，必填）：要处理的文字。也可以用 `prompt` 或 `text`。

**示例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "input": "Sample text"}'
```

---

### POST /api/files/ingest

把内容放进 RAG。可以是原始文字、手机上的文件路径，或多条文件路径。

**请求体（原始文字）：**
```json
{
  "content": "Document content to store for RAG...",
  "fileName": "my-doc.txt"
}
```

**请求体（单个文件路径）：**
```json
{
  "filePath": "/path/to/doc.txt"
}
```

**请求体（多个文件路径）：**
```json
{
  "files": ["/path/to/doc1.txt", "/path/to/doc2.txt"]
}
```

**响应：**
```json
{
  "status": "stored",
  "documentId": "1700000000000-abc123",
  "fileName": "my-doc.txt",
  "model": null
}
```

**参数：**
- `content`（字符串）：原始文字 *（如果没写 `filePath` 和 `files`，则必填）*
- `filePath`（字符串，可选）：手机上文件的绝对路径
- `files`（数组，可选）：绝对路径组成的数组
- `fileName`（字符串，可选）：文档显示名（默认：`"uploaded.txt"`）
- `chatId`（字符串，可选）：把文档关联到某一段聊天
- `provider`（字符串，可选）：RAG 用哪一家来做 embedding
- `rag`（布尔值，可选）：设为 `false` 则跳过 RAG 索引（默认：`true`）

**示例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Machine learning is a subset of AI...", "fileName": "ml-intro.txt"}'
```

---

### GET /api/rag

获取当前 RAG 的状态。

**响应：**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 3
}
```

**示例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/rag
```

---

### POST /api/rag

配置 RAG：打开或关闭、设置存储方式，或做初始化。

**请求体：**
```json
{
  "enabled": true,
  "storage": "persistent",
  "initialize": true
}
```

**响应：**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 0
}
```

**参数：**
- `enabled`（布尔值，可选）：打开或关闭 RAG
- `storage`（字符串，可选）：`"memory"` 或 `"persistent"`
- `initialize`（布尔值，可选）：触发 RAG 初始化
- `provider`（字符串，可选）：初始化时用哪一家来做 embedding

**示例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "storage": "persistent"}'
```

---

### POST /api/rag/reset

清掉 RAG 里已经入库的全部文档。

**响应：**
```json
{
  "status": "cleared",
  "enabled": true,
  "ready": false,
  "documentCount": 0
}
```

**示例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag/reset
```

---

## 服务器和设置

### GET /api/status

获取服务器状态、当前模型，以及 RAG 状态。

**响应：**
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

**示例：**
```bash
curl http://YOUR_DEVICE_IP:8889/api/status
```

---

### POST /api/settings/thinking

为当前已载入的模型打开或关闭思考模式（多想一会儿再回答）。

**请求体：**
```json
{
  "enabled": true
}
```

**响应：**
```json
{
  "status": "updated",
  "enabled": true
}
```

**参数：**
- `enabled`（布尔值，必填）：打开或关闭思考模式

**示例：**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/settings/thinking \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## 错误处理

所有接口都返回标准 HTTP 状态码。出错时带 JSON 错误体。

**成功：**
- `200 OK`
- `201 Created`

**错误：**
- `400 Bad Request` — 缺少参数或参数无效
- `404 Not Found` — 资源不存在
- `405 Method Not Allowed`
- `409 Conflict` — 前置条件没满足（例如远程模型被关掉了）
- `422 Unprocessable Entity` — 请求格式没问题，但做不了（例如缺少 API 密钥）
- `500 Internal Server Error`
- `503 Service Unavailable` — 模型还没载入

**错误响应格式：**
```json
{
  "error": "error_code"
}
```

---

## 安全方面要注意的事

- 这个服务器只打算在本地网络里用
- 不需要登录（靠网络隔离来保护）
- 对所有来源都开了 CORS
- 如果要暴露到本地网络之外，先考虑 VPN 或防火墙

---

## 请求频率

没有频率限制。快慢取决于手机的 CPU 和内存、模型大小，以及同时连进来的数量。

---

## 常见用法

### 和本地模型聊天

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

### 把文档入库并查看 RAG 状态

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

## 示例程序

### InferrLM CLI

InferrLM CLI 是用 React、Ink 和 TypeScript 做的命令行工具。它连上你的 InferrLM 服务器，在终端里提供完整的聊天界面，支持一边生成一边返回，也保留对话记录。

源码：[github.com/sbhjt-gr/inferra-cli](https://github.com/sbhjt-gr/inferra-cli)

---

## 更多资料

- [InferrLM GitHub 仓库](https://github.com/sbhjt-gr/inferra)
- [InferrLM CLI 工具](https://github.com/sbhjt-gr/inferra-cli)
- [贡献指南](CONTRIBUTING.zh-CN.md)
- [许可证](../LICENSE)

---

**最近更新**：2026 年 3 月 20 日  
**API 版本**：0.8.3
