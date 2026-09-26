[English](REST_APIs.md) | [简体中文](REST_APIs.zh-CN.md) | [日本語](REST_APIs.ja.md)

# InferrLM REST API Documentation

Complete API reference for InferrLM's local HTTP server that exposes AI inference capabilities over your local network.

## Getting Started

### Quick Start

1. **Start the server** — Open InferrLM, go to the **Server** tab, and toggle it on. Your URL will appear (e.g. `http://192.168.1.10:8889`).
2. **Download a model** — Make sure at least one GGUF model is downloaded in the **Models** tab. The model name (without `.gguf`) is used in API requests.
3. **Configure your client** — Point any OpenAI-compatible client to `http://YOUR_DEVICE_IP:8889/v1`. No API key is required — use any placeholder if the client requires one.
4. **Send a request:**

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hello!"}]}'
```

> This works with any application or library that supports the OpenAI API — just point it to `http://YOUR_DEVICE_IP:8889/v1`. Both devices must be on the same local network. The `.gguf` extension is optional in the model name.

### Starting the Server

1. Open the InferrLM app on your device
2. Navigate to the **Server** tab
3. Toggle the server switch to start it
4. Your server URL will be displayed (typically `http://YOUR_DEVICE_IP:8889`)
5. You can share this URL via QR code or copy it to access from other devices

### Configuration Options

- **Auto-start**: Automatically start the server when the app launches
- **Port**: Default port is 8889 (configurable in settings)

### Base Configuration

**Base URL**: `http://YOUR_DEVICE_IP:8889`  
**Content-Type**: `application/json`  
**CORS**: Enabled for all origins

### Selecting a Model Target

Every request that generates text includes a `model` string that determines which execution backend handles the workload:

| Model value | Routed backend | Notes |
|-------------|----------------|-------|
| Stored model name (e.g. `llama-3.2-1b`) | Local GGUF running on-device | Download the GGUF via the InferrLM app first. |
| `apple-foundation` | Apple Intelligence Foundation model | iOS only. Enable in app settings and verify via `GET /api/models/apple-foundation`. |

---

## Assistants (local)

### GET /api/assistants

List assistants stored on this device with `deployment: "local"`. Responses omit system prompts, skill instructions, and secrets.

**Response:**
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

**Example:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/assistants
```

---

## Chat & Completion APIs

### POST /api/chat

Stream or complete a chat with full conversation history. Accepts local GGUF model names or `apple-foundation`.

**Request Body:**
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

**Streaming Response (NDJSON):**
```
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":"Hi"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":" there"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":""},"done":true}
```

**Non-streaming Response:**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "message": {"role": "assistant", "content": "Hi there!"},
  "done": true
}
```

**Parameters:**
- `model` (string, required): Target backend
- `messages` (array, required): Conversation history — each entry has `role` (`system` | `user` | `assistant`) and `content`
- `assistant` (string, optional): Id of a local assistant from `GET /api/assistants`. When set and the body has no system message (`messages` with `role: "system"`, top-level `system`, or `options.system_prompt`), the server prepends that assistant's system prompt before generation. Unknown ids return `404` with `{ "error": "assistant_not_found" }`.
- `stream` (boolean, optional): Enable streaming NDJSON responses (default: `true`)
- `temperature` (number, optional): Sampling temperature 0.0–2.0
- `max_tokens` (number, optional): Maximum tokens to generate
- `top_p` (number, optional): Top-p nucleus sampling
- `top_k` (number, optional): Top-k sampling

**Example:**
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

Generate a completion from a single prompt (no conversation context).

**Request Body:**
```json
{
  "model": "llama-3.2-1b",
  "prompt": "Explain quantum computing in simple terms",
  "stream": false,
  "max_tokens": 500
}
```

**Response:**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "response": "Quantum computing uses quantum mechanics principles...",
  "done": true
}
```

**Parameters:**
- `model` (string, required): Target backend
- `prompt` (string, required): Input prompt
- `stream` (boolean, optional): Enable streaming NDJSON responses
- `max_tokens` (number, optional): Maximum tokens to generate
- `temperature` (number, optional): Sampling temperature

**Example:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "prompt": "Hello world", "stream": false}'
```

---

## OpenAI-Compatible API

### GET /v1/models

List available models in OpenAI format. Compatible with any OpenAI client library.

**Response:**
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

**Example:**
```bash
curl http://YOUR_DEVICE_IP:8889/v1/models
```

---

### POST /v1/chat/completions

OpenAI-compatible chat completions endpoint. Drop-in replacement for apps built against the OpenAI API. No API key is required — set any non-empty placeholder in the `Authorization` header if your client requires one.

**Request Body:**
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

Optional `assistant` behaves the same as on `POST /api/chat` (local assistants only; `assistant_not_found` when missing).

**Non-streaming Response:**
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

**Streaming Response (SSE):**
```
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**Example:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hi"}], "stream": false}'
```

---

## Chat History

### GET /api/chats

List all saved chat conversations (without messages).

**Response:**
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

**Example:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats
```

---

### POST /api/chats

Create a new chat conversation.

**Request Body:**
```json
{
  "title": "My Conversation",
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"}
  ]
}
```

**Response (201):**
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

**Parameters:**
- `title` (string, optional): Chat title
- `messages` (array, optional): Initial messages to seed the conversation

---

### GET /api/chats/:id

Get a specific chat including all messages.

**Response:**
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

**Example:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### DELETE /api/chats/:id

Delete a chat conversation.

**Response:**
```json
{
  "status": "deleted",
  "chatId": "chat-abc123"
}
```

**Example:**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### GET /api/chats/:id/messages

Get only the messages for a specific chat.

**Response:**
```json
{
  "messages": [
    {"id": "msg-1", "role": "user", "content": "Hello"},
    {"id": "msg-2", "role": "assistant", "content": "Hi there!"}
  ]
}
```

**Example:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages
```

---

### POST /api/chats/:id/messages

Append one or more messages to an existing chat.

**Request Body:**
```json
{
  "messages": [
    {"role": "user", "content": "Follow-up question"}
  ]
}
```

**Response (201):**
```json
{
  "messages": [
    {"id": "msg-3", "role": "user", "content": "Follow-up question"}
  ]
}
```

**Example:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Follow-up"}]}'
```

---

## Model Management

### GET /api/tags

List all models stored on the device.

**Response:**
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

**Example:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/tags
```

---

### GET /api/ps

List currently loaded models (models in memory).

**Response:**
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

Returns an empty `models` array when no model is loaded.

**Example:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/ps
```

---

### POST /api/show

Get detailed information about a specific model including GGUF metadata and current settings.

**Request Body** (use `name`, `model`, or `path`):
```json
{
  "model": "llama-3.2-1b"
}
```

**Response:**
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

**Example:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/show \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b"}'
```

---

### POST /api/pull

Download a model from a URL directly to the device.

**Request Body:**
```json
{
  "url": "https://huggingface.co/model.gguf",
  "model": "my-custom-model"
}
```

**Response:**
```json
{
  "status": "downloading",
  "model": "my-custom-model",
  "downloadId": "download-abc123"
}
```

The download runs in the background. Use `GET /api/tags` to check when the model appears.

**Example:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/pull \
  -H "Content-Type: application/json" \
  -d '{"url": "https://huggingface.co/model.gguf", "model": "my-model"}'
```

---

### POST /api/copy

Copy an existing model file under a new name.

**Request Body:**
```json
{
  "source": "llama-3.2-1b",
  "destination": "llama-3.2-1b-backup"
}
```

**Response:**
```json
{
  "status": "copied",
  "source": "llama-3.2-1b.gguf",
  "destination": "llama-3.2-1b-backup.gguf"
}
```

Returns `409` if the destination name already exists. External models cannot be copied.

**Example:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/copy \
  -H "Content-Type: application/json" \
  -d '{"source": "llama-3.2-1b", "destination": "llama-backup"}'
```

---

### DELETE /api/delete

Delete a model from local storage.

**Request Body** (use `name` or `path`):
```json
{
  "name": "llama-3.2-1b"
}
```

**Response:**
```json
{
  "success": true
}
```

**Example:**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/delete \
  -H "Content-Type: application/json" \
  -d '{"name": "old-model"}'
```

---

### POST /api/models

Perform model lifecycle operations.

**Request Body:**
```json
{
  "action": "load",
  "model": "llama-3.2-1b"
}
```

**Available Actions:**

| Action | Description | `model` field |
|--------|-------------|---------------|
| `load` | Load a model into memory | Required — model name or path |
| `unload` | Release the currently loaded model | Not used |
| `reload` | Reinitialise the currently loaded model | Not used |
| `refresh` | Rescan storage and reload the model list | Not used |

**Response (`load`):**
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

**Response (`refresh`):**
```json
{
  "status": "refreshed",
  "count": 3,
  "models": [...]
}
```

**Example:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models \
  -H "Content-Type: application/json" \
  -d '{"action": "load", "model": "llama-3.2-1b"}'
```

---

### GET /api/models/apple-foundation

Check Apple Foundation model availability and readiness (iOS only).

**Response:**
```json
{
  "available": true,
  "requirementsMet": true,
  "enabled": true,
  "status": "ready",
  "message": "Apple Foundation is ready to use."
}
```

| `status` | Meaning |
|----------|---------|
| `ready` | Available and enabled — use `model: "apple-foundation"` in requests |
| `configure` | Not available or not enabled — see `message` for details |

**Example:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### POST /api/models/apple-foundation

Verify that Apple Foundation is ready to process requests. Returns an error if not available, requirements are not met, or the feature is not enabled in app settings.

**Response (ready):**
```json
{
  "status": "ready"
}
```

**Error responses:**
- `501` — `apple_foundation_unavailable`: device does not support Apple Intelligence
- `428` — `requirements_not_met`: device needs to be updated
- `409` — `apple_foundation_disabled`: enable it in app settings first

**Example:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### GET /api/version

Get the current app version.

**Response:**
```json
{
  "version": "0.8.3"
}
```

**Example:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/version
```

---

## RAG & Embeddings

### POST /api/embeddings

Generate embeddings for one or more texts using a local model.

**Request Body:**
```json
{
  "model": "llama-3.2-1b",
  "input": "The quick brown fox jumps over the lazy dog"
}
```

Pass an array to embed multiple texts in one request:
```json
{
  "model": "llama-3.2-1b",
  "input": ["First text", "Second text"]
}
```

**Response:**
```json
{
  "embeddings": [
    [0.123, -0.456, 0.789, "..."]
  ],
  "model": "llama-3.2-1b.gguf"
}
```

**Parameters:**
- `model` (string, required): Local model to use for embedding
- `input` (string or array, required): Text(s) to embed. Also accepted as `prompt` or `text`.

**Example:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "input": "Sample text"}'
```

---

### POST /api/files/ingest

Ingest content into the RAG system. Accepts raw text, a file path on the device, or multiple file paths.

**Request Body (raw text):**
```json
{
  "content": "Document content to store for RAG...",
  "fileName": "my-doc.txt"
}
```

**Request Body (single file path):**
```json
{
  "filePath": "/path/to/doc.txt"
}
```

**Request Body (multiple file paths):**
```json
{
  "files": ["/path/to/doc1.txt", "/path/to/doc2.txt"]
}
```

**Response:**
```json
{
  "status": "stored",
  "documentId": "1700000000000-abc123",
  "fileName": "my-doc.txt",
  "model": null
}
```

**Parameters:**
- `content` (string): Raw text content *(required if `filePath` and `files` are omitted)*
- `filePath` (string, optional): Absolute path to a file on the device
- `files` (array, optional): Array of absolute file paths
- `fileName` (string, optional): Display name for the document (default: `"uploaded.txt"`)
- `chatId` (string, optional): Associate the document with a specific chat
- `provider` (string, optional): RAG embedding provider
- `rag` (boolean, optional): Set to `false` to skip RAG indexing (default: `true`)

**Example:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Machine learning is a subset of AI...", "fileName": "ml-intro.txt"}'
```

---

### GET /api/rag

Get the current RAG system status.

**Response:**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 3
}
```

**Example:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/rag
```

---

### POST /api/rag

Configure the RAG system (enable/disable, set storage type, or initialise).

**Request Body:**
```json
{
  "enabled": true,
  "storage": "persistent",
  "initialize": true
}
```

**Response:**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 0
}
```

**Parameters:**
- `enabled` (boolean, optional): Enable or disable RAG
- `storage` (string, optional): `"memory"` or `"persistent"`
- `initialize` (boolean, optional): Trigger RAG initialisation
- `provider` (string, optional): Embedding provider to use on initialisation

**Example:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "storage": "persistent"}'
```

---

### POST /api/rag/reset

Clear all ingested documents from the RAG system.

**Response:**
```json
{
  "status": "cleared",
  "enabled": true,
  "ready": false,
  "documentCount": 0
}
```

**Example:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag/reset
```

---

## Server & Settings

### GET /api/status

Get server status, active model, and RAG state.

**Response:**
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

**Example:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/status
```

---

### POST /api/settings/thinking

Enable or disable thinking mode (extended reasoning) for the currently loaded model.

**Request Body:**
```json
{
  "enabled": true
}
```

**Response:**
```json
{
  "status": "updated",
  "enabled": true
}
```

**Parameters:**
- `enabled` (boolean, required): Enable or disable thinking mode

**Example:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/settings/thinking \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## Error Handling

All endpoints return standard HTTP status codes with a JSON error body.

**Success codes:**
- `200 OK`
- `201 Created`

**Error codes:**
- `400 Bad Request` — missing or invalid parameters
- `404 Not Found` — resource does not exist
- `405 Method Not Allowed`
- `409 Conflict` — precondition not met (e.g. remote models disabled)
- `422 Unprocessable Entity` — valid request but action cannot be performed (e.g. API key missing)
- `500 Internal Server Error`
- `503 Service Unavailable` — model not loaded

**Error response format:**
```json
{
  "error": "error_code"
}
```

---

## Security Considerations

- The server is designed for local network use only
- No authentication is required (secured by network isolation)
- CORS is enabled for all origins
- Consider a VPN or firewall before exposing the server beyond your local network

---

## Rate Limiting

No rate limits are enforced. Performance depends on device CPU/RAM, model size, and number of concurrent connections.

---

## Common Use Cases

### Chat with a local model

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

### Ingest a document and check RAG status

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Your document content here...", "fileName": "doc.txt"}'

curl http://YOUR_DEVICE_IP:8889/api/rag
```

### Model management

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

## Example Applications

### InferrLM CLI

The InferrLM CLI is a command-line interface tool built with React, Ink, and TypeScript. It connects to your InferrLM server and provides a fully functional terminal-based chat interface with streaming support and conversation history.

Source code: [github.com/sbhjt-gr/inferra-cli](https://github.com/sbhjt-gr/inferra-cli)

---

## Additional Resources

- [InferrLM GitHub Repository](https://github.com/sbhjt-gr/inferra)
- [InferrLM CLI Tool](https://github.com/sbhjt-gr/inferra-cli)
- [Contributing Guide](CONTRIBUTING.md)
- [License](../LICENSE)

---

**Last Updated**: March 20, 2026  
**API Version**: 0.8.3
