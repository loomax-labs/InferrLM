[English](REST_APIs.md) | [简体中文](REST_APIs.zh-CN.md) | [繁體中文](REST_APIs.zh-TW.md) | [日本語](REST_APIs.ja.md) | [한국어](REST_APIs.ko.md) | [Deutsch](REST_APIs.de.md) | [Français](REST_APIs.fr.md) | [Nederlands](REST_APIs.nl.md)

# InferrLM REST API の説明

InferrLM のローカル HTTP サーバーについて、API（ほかのソフトから使う窓口）の全体です。REST（決まったアドレスでやり取りする仕組み）で、同じネットワークの中から、このスマホで答えを作る処理を使えます。

## はじめに

### すぐに始める

1. **サーバーを起動する** — InferrLM を開き、**サーバー** タブでスイッチを入れます。URL が出ます（例: `http://192.168.1.10:8889`）。
2. **モデルをダウンロードする** — **モデル** タブで、GGUF（モデルのファイル形式）のモデルを少なくとも1つダウンロードしておきます。API のリクエストでは、モデル名（`.gguf` なし）を使います。
3. **クライアントを設定する** — OpenAI と同じ形のクライアントの接続先を `http://YOUR_DEVICE_IP:8889/v1` にします。API キーは不要です。クライアントがキーを求めるときは、空でない仮の値でかまいません。
4. **リクエストを送る:**

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hello!"}]}'
```

> OpenAI API に対応したアプリやライブラリなら使えます。接続先を `http://YOUR_DEVICE_IP:8889/v1` にするだけです。両方の端末は同じローカルネットワークにいる必要があります。モデル名の `.gguf` は付けても付けなくてもかまいません。

### サーバーを起動する

1. 端末で InferrLM アプリを開きます
2. **サーバー** タブを開きます
3. サーバーのスイッチを入れて起動します
4. サーバーの URL が表示されます（ふつうは `http://YOUR_DEVICE_IP:8889`）
5. この URL は QR コードで共有するか、コピーしてほかの端末から開けます

### 設定の項目

- **自動起動**: アプリの起動時にサーバーを自動で始めます
- **ポート**: 既定のポートは 8889 です（設定で変えられます）

### 基本の設定

**ベース URL**: `http://YOUR_DEVICE_IP:8889`  
**Content-Type**: `application/json`  
**CORS**: すべてのオリジンで有効です

### モデルの向け先を選ぶ

文字を作るリクエストには、どの処理が仕事をするかを決める `model` の文字列が入ります。

| モデルの値 | 向かう処理 | メモ |
|-------------|----------------|-------|
| 保存済みのモデル名（例: `llama-3.2-1b`） | このスマホで動かすローカルの GGUF | 先に InferrLM アプリで GGUF をダウンロードします。 |
| `apple-foundation` | Apple Intelligence の Foundation モデル | iOS のみです。アプリの設定で有効にし、`GET /api/models/apple-foundation` で確認します。 |

---

## アシスタント（このスマホ）

### GET /api/assistants

この端末に保存され、`deployment: "local"` のアシスタントを一覧します。返事には、システムへの指示、スキルの手順、秘密の値は含みません。

**返事:**
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

**例:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/assistants
```

---

## チャットと文の完成 API

### POST /api/chat

これまでの会話を全部使って、チャットを流しながら、または一括で返します。ローカルの GGUF のモデル名か `apple-foundation` を受け付けます。

**リクエスト本文:**
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

**流しながらの返事（NDJSON）:**
```
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":"Hi"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":" there"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":""},"done":true}
```

**一括の返事:**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "message": {"role": "assistant", "content": "Hi there!"},
  "done": true
}
```

**パラメータ:**
- `model`（文字列、必須）: 向け先の処理
- `messages`（配列、必須）: これまでの会話。各要素には `role`（`system` | `user` | `assistant`）と `content` があります
- `assistant`（文字列、任意）: `GET /api/assistants` で得られる、このスマホのアシスタントの id です。指定され、本文にシステムメッセージ（`role: "system"` の `messages`、最上位の `system`、または `options.system_prompt`）がないとき、サーバーはそのアシスタントのシステムへの指示を、答えを作る前に先頭へ足します。未知の id は `404` と `{ "error": "assistant_not_found" }` を返します
- `stream`（真偽値、任意）: NDJSON で流しながら返します（既定: `true`）
- `temperature`（数値、任意）: 答えのばらつき。0.0〜2.0
- `max_tokens`（数値、任意）: 生成する長さの上限
- `top_p`（数値、任意）: 上位の候補から選ぶ割合
- `top_k`（数値、任意）: 候補として残す数

**例:**
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

1つの入力文から続きを作ります（会話の流れはありません）。

**リクエスト本文:**
```json
{
  "model": "llama-3.2-1b",
  "prompt": "Explain quantum computing in simple terms",
  "stream": false,
  "max_tokens": 500
}
```

**返事:**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "response": "Quantum computing uses quantum mechanics principles...",
  "done": true
}
```

**パラメータ:**
- `model`（文字列、必須）: 向け先の処理
- `prompt`（文字列、必須）: 入力する文
- `stream`（真偽値、任意）: NDJSON で流しながら返します
- `max_tokens`（数値、任意）: 生成する長さの上限
- `temperature`（数値、任意）: 答えのばらつき

**例:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "prompt": "Hello world", "stream": false}'
```

---

## OpenAI と同じ形の API

### GET /v1/models

使えるモデルを OpenAI の形で一覧します。どの OpenAI クライアントライブラリでも使えます。

**返事:**
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

**例:**
```bash
curl http://YOUR_DEVICE_IP:8889/v1/models
```

---

### POST /v1/chat/completions

OpenAI と同じ形のチャット完成エンドポイントです。OpenAI API 向けに作ったアプリを、入れ替えるだけで使えます。API キーは不要です。クライアントが求めるときは、`Authorization` ヘッダーに空でない仮の値を入れてください。

**リクエスト本文:**
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

任意の `assistant` は `POST /api/chat` と同じです（このスマホのアシスタントだけです。無いときは `assistant_not_found` です）。

**一括の返事:**
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

**流しながらの返事（SSE）:**
```
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**例:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hi"}], "stream": false}'
```

---

## チャットの履歴

### GET /api/chats

保存したチャットの会話を全部一覧します（メッセージ本体は含みません）。

**返事:**
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

**例:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats
```

---

### POST /api/chats

新しいチャットの会話を作ります。

**リクエスト本文:**
```json
{
  "title": "My Conversation",
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"}
  ]
}
```

**返事（201）:**
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

**パラメータ:**
- `title`（文字列、任意）: チャットの題名
- `messages`（配列、任意）: 会話の最初に入れるメッセージ

---

### GET /api/chats/:id

指定したチャットを、メッセージ全部つきで取得します。

**返事:**
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

**例:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### DELETE /api/chats/:id

チャットの会話を削除します。

**返事:**
```json
{
  "status": "deleted",
  "chatId": "chat-abc123"
}
```

**例:**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### GET /api/chats/:id/messages

指定したチャットのメッセージだけを取得します。

**返事:**
```json
{
  "messages": [
    {"id": "msg-1", "role": "user", "content": "Hello"},
    {"id": "msg-2", "role": "assistant", "content": "Hi there!"}
  ]
}
```

**例:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages
```

---

### POST /api/chats/:id/messages

既存のチャットに、1件以上のメッセージを足します。

**リクエスト本文:**
```json
{
  "messages": [
    {"role": "user", "content": "Follow-up question"}
  ]
}
```

**返事（201）:**
```json
{
  "messages": [
    {"id": "msg-3", "role": "user", "content": "Follow-up question"}
  ]
}
```

**例:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Follow-up"}]}'
```

---

## モデルの管理

### GET /api/tags

端末に保存されているモデルを全部一覧します。

**返事:**
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

**例:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/tags
```

---

### GET /api/ps

いま読み込まれているモデル（メモリ上のモデル）を一覧します。

**返事:**
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

モデルが読み込まれていないときは、`models` は空の配列です。

**例:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/ps
```

---

### POST /api/show

指定したモデルの詳しい情報を取得します。GGUF のメタデータと、いまの設定を含みます。

**リクエスト本文**（`name`、`model`、`path` のいずれかを使います）:
```json
{
  "model": "llama-3.2-1b"
}
```

**返事:**
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

**例:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/show \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b"}'
```

---

### POST /api/pull

URL からモデルを、端末へ直接ダウンロードします。

**リクエスト本文:**
```json
{
  "url": "https://huggingface.co/model.gguf",
  "model": "my-custom-model"
}
```

**返事:**
```json
{
  "status": "downloading",
  "model": "my-custom-model",
  "downloadId": "download-abc123"
}
```

ダウンロードは背景で進みます。モデルが出たかは `GET /api/tags` で確認します。

**例:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/pull \
  -H "Content-Type: application/json" \
  -d '{"url": "https://huggingface.co/model.gguf", "model": "my-model"}'
```

---

### POST /api/copy

既存のモデルファイルを、新しい名前でコピーします。

**リクエスト本文:**
```json
{
  "source": "llama-3.2-1b",
  "destination": "llama-3.2-1b-backup"
}
```

**返事:**
```json
{
  "status": "copied",
  "source": "llama-3.2-1b.gguf",
  "destination": "llama-3.2-1b-backup.gguf"
}
```

宛先の名前がすでにあるときは `409` を返します。外から参照しているモデルはコピーできません。

**例:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/copy \
  -H "Content-Type: application/json" \
  -d '{"source": "llama-3.2-1b", "destination": "llama-backup"}'
```

---

### DELETE /api/delete

ローカルの保存場所からモデルを削除します。

**リクエスト本文**（`name` または `path` を使います）:
```json
{
  "name": "llama-3.2-1b"
}
```

**返事:**
```json
{
  "success": true
}
```

**例:**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/delete \
  -H "Content-Type: application/json" \
  -d '{"name": "old-model"}'
```

---

### POST /api/models

モデルの読み込みと解放などの操作をします。

**リクエスト本文:**
```json
{
  "action": "load",
  "model": "llama-3.2-1b"
}
```

**使える操作:**

| 操作 | 説明 | `model` フィールド |
|--------|-------------|---------------|
| `load` | モデルをメモリに読み込みます | 必須。モデル名またはパス |
| `unload` | いま読み込まれているモデルを解放します | 使いません |
| `reload` | いま読み込まれているモデルを読み込み直します | 使いません |
| `refresh` | 保存場所を読み直し、モデル一覧を更新します | 使いません |

**返事（`load`）:**
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

**返事（`refresh`）:**
```json
{
  "status": "refreshed",
  "count": 3,
  "models": [...]
}
```

**例:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models \
  -H "Content-Type: application/json" \
  -d '{"action": "load", "model": "llama-3.2-1b"}'
```

---

### GET /api/models/apple-foundation

Apple Foundation モデルが使えるか、準備ができているかを確認します（iOS のみ）。

**返事:**
```json
{
  "available": true,
  "requirementsMet": true,
  "enabled": true,
  "status": "ready",
  "message": "Apple Foundation is ready to use."
}
```

| `status` | 意味 |
|----------|---------|
| `ready` | 使えて、有効です。リクエストでは `model: "apple-foundation"` を使います |
| `configure` | 使えないか、有効ではありません。詳しくは `message` を見てください |

**例:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### POST /api/models/apple-foundation

Apple Foundation がリクエストを処理できる状態かを確認します。使えない、条件を満たしていない、またはアプリの設定で有効でないときは、エラーを返します。

**返事（準備完了）:**
```json
{
  "status": "ready"
}
```

**エラーの返事:**
- `501` — `apple_foundation_unavailable`: この端末は Apple Intelligence に対応していません
- `428` — `requirements_not_met`: 端末の更新が必要です
- `409` — `apple_foundation_disabled`: 先にアプリの設定で有効にしてください

**例:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### GET /api/version

いまのアプリの版を取得します。

**返事:**
```json
{
  "version": "0.8.3"
}
```

**例:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/version
```

---

## RAG と、文章を数値の並びにする処理

RAG（資料を探してから答える仕組み）と、文章を数値の並びにする処理（embedding）です。

### POST /api/embeddings

このスマホのモデルを使い、1つ以上の文章を数値の並びにします。

**リクエスト本文:**
```json
{
  "model": "llama-3.2-1b",
  "input": "The quick brown fox jumps over the lazy dog"
}
```

1回のリクエストで複数の文章を数値の並びにするには、配列を渡します。
```json
{
  "model": "llama-3.2-1b",
  "input": ["First text", "Second text"]
}
```

**返事:**
```json
{
  "embeddings": [
    [0.123, -0.456, 0.789, "..."]
  ],
  "model": "llama-3.2-1b.gguf"
}
```

**パラメータ:**
- `model`（文字列、必須）: 数値の並びに使う、このスマホのモデル
- `input`（文字列または配列、必須）: 数値の並びにしたい文章。`prompt` または `text` でも受け付けます

**例:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "input": "Sample text"}'
```

---

### POST /api/files/ingest

RAG に内容を取り込みます。生のテキスト、端末上のファイルパス、または複数のファイルパスを受け付けます。

**リクエスト本文（生のテキスト）:**
```json
{
  "content": "Document content to store for RAG...",
  "fileName": "my-doc.txt"
}
```

**リクエスト本文（ファイルパスが1つ）:**
```json
{
  "filePath": "/path/to/doc.txt"
}
```

**リクエスト本文（ファイルパスが複数）:**
```json
{
  "files": ["/path/to/doc1.txt", "/path/to/doc2.txt"]
}
```

**返事:**
```json
{
  "status": "stored",
  "documentId": "1700000000000-abc123",
  "fileName": "my-doc.txt",
  "model": null
}
```

**パラメータ:**
- `content`（文字列）: 生のテキスト（`filePath` と `files` を省くときは必須）
- `filePath`（文字列、任意）: 端末上のファイルへの絶対パス
- `files`（配列、任意）: 絶対パスの配列
- `fileName`（文字列、任意）: 文書の表示名（既定: `"uploaded.txt"`）
- `chatId`（文字列、任意）: 文書を特定のチャットに結び付けます
- `provider`（文字列、任意）: RAG で数値の並びに使う提供元
- `rag`（真偽値、任意）: `false` にすると RAG の索引を飛ばします（既定: `true`）

**例:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Machine learning is a subset of AI...", "fileName": "ml-intro.txt"}'
```

---

### GET /api/rag

いまの RAG の状態を取得します。

**返事:**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 3
}
```

**例:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/rag
```

---

### POST /api/rag

RAG を設定します（有効と無効、保存の種類、または初期化）。

**リクエスト本文:**
```json
{
  "enabled": true,
  "storage": "persistent",
  "initialize": true
}
```

**返事:**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 0
}
```

**パラメータ:**
- `enabled`（真偽値、任意）: RAG を有効または無効にします
- `storage`（文字列、任意）: `"memory"` または `"persistent"`
- `initialize`（真偽値、任意）: RAG の初期化を始めます
- `provider`（文字列、任意）: 初期化のときに使う、数値の並びの提供元

**例:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "storage": "persistent"}'
```

---

### POST /api/rag/reset

RAG に取り込んだ文書を全部消します。

**返事:**
```json
{
  "status": "cleared",
  "enabled": true,
  "ready": false,
  "documentCount": 0
}
```

**例:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag/reset
```

---

## サーバーと設定

### GET /api/status

サーバーの状態、動いているモデル、RAG の状態を取得します。

**返事:**
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

**例:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/status
```

---

### POST /api/settings/thinking

いま読み込まれているモデルの、じっくり考えるモード（答えを出す前に、もう一段考える）を有効または無効にします。

**リクエスト本文:**
```json
{
  "enabled": true
}
```

**返事:**
```json
{
  "status": "updated",
  "enabled": true
}
```

**パラメータ:**
- `enabled`（真偽値、必須）: じっくり考えるモードを有効または無効にします

**例:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/settings/thinking \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## エラーの扱い

すべてのエンドポイントは、標準の HTTP ステータスコードと、JSON のエラー本文を返します。

**成功のコード:**
- `200 OK`
- `201 Created`

**エラーのコード:**
- `400 Bad Request` — パラメータが無い、または無効です
- `404 Not Found` — リソースがありません
- `405 Method Not Allowed`
- `409 Conflict` — 前提を満たしていません（例: 離れたモデルがオフです）
- `422 Unprocessable Entity` — リクエストは正しいが、操作を実行できません（例: API キーがありません）
- `500 Internal Server Error`
- `503 Service Unavailable` — モデルが読み込まれていません

**エラーの返事の形:**
```json
{
  "error": "error_code"
}
```

---

## 安全について

- このサーバーは、ローカルネットワークの中だけで使う想定です
- 認証は不要です（ネットワークを外と分けていることで守ります）
- CORS はすべてのオリジンで有効です
- ローカルネットワークの外に出す前に、VPN またはファイアウォールを検討してください

---

## 回数の上限

回数の上限はありません。速さは、端末の CPU とメモリ、モデルの大きさ、同時の接続数によります。

---

## よくある使い方

### このスマホのモデルとチャットする

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

### 文書を取り込み、RAG の状態を確認する

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Your document content here...", "fileName": "doc.txt"}'

curl http://YOUR_DEVICE_IP:8889/api/rag
```

### モデルの管理

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

## 例となるアプリ

### InferrLM CLI

InferrLM CLI は、React、Ink、TypeScript で作ったコマンドラインの道具です。InferrLM のサーバーにつながり、返事を流しながら表示し、会話の履歴もある、ターミナルのチャットを使えます。

ソース: [github.com/sbhjt-gr/inferra-cli](https://github.com/sbhjt-gr/inferra-cli)

---

## 関連資料

- [InferrLM の GitHub リポジトリ](https://github.com/sbhjt-gr/inferra)
- [InferrLM CLI](https://github.com/sbhjt-gr/inferra-cli)
- [開発ガイド](CONTRIBUTING.ja.md)
- [ライセンス](../LICENSE)

---

**最終更新**: 2026年3月20日  
**API の版**: 0.8.3
