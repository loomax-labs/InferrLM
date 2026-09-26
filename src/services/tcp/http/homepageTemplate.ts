import { localApiWording } from '../../regionPolicy';

export function getHomepageHTML(): string {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>InferrLM API Documentation</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      min-height: 100vh;
      padding: 40px 20px;
    }
    .container {
      background: white;
      border-radius: 20px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
      max-width: 1200px;
      margin: 0 auto;
      padding: 40px;
    }
    h1 {
      color: #333;
      font-size: 2.5em;
      margin-bottom: 10px;
      text-align: center;
    }
    .subtitle {
      color: #666;
      text-align: center;
      margin-bottom: 30px;
      font-size: 1.1em;
    }
    .status {
      background: #f7f9fc;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
    }
    .status-item {
      display: flex;
      justify-content: space-between;
      padding: 12px 0;
      border-bottom: 1px solid #e1e8ed;
    }
    .status-item:last-child { border-bottom: none; }
    .status-label {
      color: #666;
      font-weight: 500;
    }
    .status-value {
      color: #333;
      font-weight: 600;
    }
    .status-value.active {
      color: #10b981;
    }
    .nav {
      background: #f7f9fc;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 30px;
      display: flex;
      gap: 10px;
      flex-wrap: wrap;
      justify-content: center;
    }
    .nav-btn {
      background: white;
      border: 2px solid #667eea;
      color: #667eea;
      padding: 8px 16px;
      border-radius: 8px;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s;
    }
    .nav-btn:hover {
      background: #667eea;
      color: white;
    }
    .section {
      margin-bottom: 40px;
    }
    .section-title {
      color: #333;
      font-size: 1.8em;
      margin-bottom: 20px;
      font-weight: 600;
      border-bottom: 3px solid #667eea;
      padding-bottom: 10px;
    }
    .endpoint-card {
      background: #f7f9fc;
      border-radius: 12px;
      padding: 20px;
      margin-bottom: 20px;
      border-left: 4px solid #667eea;
    }
    .endpoint-header {
      display: flex;
      align-items: center;
      margin-bottom: 15px;
      flex-wrap: wrap;
      gap: 10px;
    }
    .method {
      display: inline-block;
      padding: 6px 12px;
      border-radius: 6px;
      font-size: 0.9em;
      font-weight: bold;
      color: white;
    }
    .method.get { background: #10b981; }
    .method.post { background: #3b82f6; }
    .method.delete { background: #ef4444; }
    .endpoint-path {
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 1.1em;
      color: #333;
      font-weight: 600;
    }
    .endpoint-desc {
      color: #666;
      margin-bottom: 15px;
      line-height: 1.6;
    }
    .code-block {
      background: #2d3748;
      color: #e2e8f0;
      padding: 15px;
      border-radius: 8px;
      overflow-x: auto;
      margin-bottom: 10px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 0.9em;
    }
    .code-label {
      color: #667eea;
      font-weight: 600;
      margin-bottom: 8px;
      font-size: 0.9em;
    }
    .footer {
      text-align: center;
      margin-top: 40px;
      padding-top: 20px;
      border-top: 2px solid #e1e8ed;
      color: #666;
      font-size: 0.9em;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>InferrLM API Documentation</h1>
    <p class="subtitle">Complete API reference for local AI inference</p>

    <div class="nav">
      <button class="nav-btn" onclick="document.getElementById('setup').scrollIntoView({behavior:'smooth'})">Quick Start</button>
      <button class="nav-btn" onclick="document.getElementById('openai').scrollIntoView({behavior:'smooth'})">OpenAI Compatible</button>
      <button class="nav-btn" onclick="document.getElementById('chat').scrollIntoView({behavior:'smooth'})">Chat</button>
      <button class="nav-btn" onclick="document.getElementById('models').scrollIntoView({behavior:'smooth'})">Models</button>
      <button class="nav-btn" onclick="document.getElementById('rag').scrollIntoView({behavior:'smooth'})">RAG</button>
      <button class="nav-btn" onclick="document.getElementById('server').scrollIntoView({behavior:'smooth'})">Server</button>
    </div>

    <div id="setup" class="section">
      <h2 class="section-title">Quick Start</h2>
      <p style="color:#666;margin-bottom:20px;line-height:1.6;">Get up and running with the InferrLM API in minutes. Works with any OpenAI-compatible client.</p>

      <div class="endpoint-card" style="border-left-color:#10b981;">
        <p class="endpoint-desc"><strong>1. Start the Server</strong> &mdash; Toggle the server switch in the InferrLM app. Your URL will appear (e.g. <code>http://192.168.1.10:8889</code>).</p>
        <p class="endpoint-desc"><strong>2. Download a Model</strong> &mdash; Ensure at least one GGUF model is downloaded in the Models tab.</p>
        <p class="endpoint-desc"><strong>3. Configure Your Client</strong> &mdash; Set the base URL to <code>http://&lt;device-ip&gt;:8889/v1</code>. No API key required &mdash; use any placeholder if needed.</p>
        <p class="endpoint-desc"><strong>4. Set the Model Name</strong> &mdash; Use the model name from the Models tab (e.g. <code>llama-3.2-1b</code>). The <code>.gguf</code> extension is optional.</p>
        <p class="endpoint-desc" style="margin-bottom:0;"><strong>5. Send a Request</strong></p>
      </div>
      <pre class="code-block">curl -X POST http://&lt;device-ip&gt;:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hello!"}]}'</pre>

      <div class="endpoint-card" style="border-left-color:#667eea;margin-top:20px;">
        <p class="endpoint-desc" style="margin-bottom:0;">This works with any application or library that supports the OpenAI API &mdash; just point it to <code>http://&lt;device-ip&gt;:8889/v1</code>. Both devices must be on the same local network.</p>
      </div>
    </div>

    <div id="openai" class="section">
      <h2 class="section-title">OpenAI-Compatible API</h2>
      <p style="color:#666;margin-bottom:20px;line-height:1.6;">Drop-in replacement for OpenAI API. Use these endpoints with any tool that supports custom OpenAI-compatible servers (Obsidian plugins, Continue, Open WebUI, etc). Set the base URL to <code>http://&lt;device-ip&gt;:8889/v1</code>. The <code>Authorization</code> header is accepted but not required.</p>

      <div class="endpoint-card" style="border-left-color:#10b981;">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="endpoint-path">/v1/chat/completions</span>
        </div>
        <p class="endpoint-desc">Chat completions with streaming (SSE) support. Compatible with OpenAI client libraries and plugins.</p>
        <div class="code-label">Request:</div>
        <pre class="code-block">{
  "model": "llama-3.2-1b",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true,
  "temperature": 0.7,
  "max_tokens": 1024
}</pre>
        <div class="code-label">Response (streaming SSE):</div>
        <pre class="code-block">data: {"id":"chatcmpl-...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{"content":" there!"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]</pre>
        <div class="code-label">Response (non-streaming):</div>
        <pre class="code-block">{
  "id": "chatcmpl-...",
  "object": "chat.completion",
  "model": "llama-3.2-1b",
  "choices": [{
    "index": 0,
    "message": {"role": "assistant", "content": "Hi there!"},
    "finish_reason": "stop"
  }],
  "usage": {"prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0}
}</pre>
      </div>

      <div class="endpoint-card" style="border-left-color:#10b981;">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/v1/models</span>
        </div>
        <p class="endpoint-desc">List available models in OpenAI format. Includes local GGUF models and Apple Foundation.</p>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "object": "list",
  "data": [
    {"id": "llama-3.2-1b.gguf", "object": "model", "owned_by": "local"},
    {"id": "apple-foundation", "object": "model", "owned_by": "apple"}
  ]
}</pre>
      </div>
    </div>

    <div id="chat" class="section">
      <h2 class="section-title">Chat & Completion APIs</h2>
      
      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/chat</span>
        </div>
        <p class="endpoint-desc">Stream chat completions with conversation history. Use local GGUF names or <code>apple-foundation</code> in the <code>model</code> field.</p>
        <div class="code-label">Request:</div>
        <pre class="code-block">{
  "model": "llama-3.2-1b",
  "messages": [
    {"role": "system", "content": "You are a helpful assistant"},
    {"role": "user", "content": "Hello!"}
  ],
  "stream": true,
  "temperature": 0.7
}</pre>
        <div class="code-label">Response (streaming):</div>
        <pre class="code-block">{"message": {"role": "assistant", "content": "Hi"}, "done": false}
{"message": {"role": "assistant", "content": " there"}, "done": false}
{"message": {"role": "assistant", "content": "!"}, "done": true}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/generate</span>
        </div>
        <p class="endpoint-desc">Generate completion from a prompt without conversation context using local or Apple Foundation models.</p>
        <div class="code-label">Request:</div>
        <pre class="code-block">{
  "model": "apple-foundation",
  "prompt": "Explain quantum computing",
  "stream": false,
  "max_tokens": 500
}</pre>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "response": "Quantum computing uses quantum mechanics...",
  "done": true,
  "context": [...]
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/api/chats</span>
        </div>
        <p class="endpoint-desc">List all saved chat conversations</p>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "chats": [
    {"id": "chat-abc123", "title": "Quantum Physics", "timestamp": 1700000000000, "modelPath": "/path/to/model.gguf", "messageCount": 12},
    {"id": "chat-def456", "title": "Cooking Tips", "timestamp": 1699900000000, "modelPath": null, "messageCount": 4}
  ]
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/chats</span>
        </div>
        <p class="endpoint-desc">Create or update a chat conversation</p>
        <div class="code-label">Request:</div>
        <pre class="code-block">{
  "title": "My Conversation",
  "messages": [...]
}</pre>
      </div>
    </div>

    <div id="models" class="section">
      <h2 class="section-title">Model Management</h2>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/api/tags</span>
        </div>
        <p class="endpoint-desc">List all available models</p>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
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
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/api/ps</span>
        </div>
        <p class="endpoint-desc">List currently loaded models</p>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "models": [
    {
      "name": "llama-3.2-1b.gguf",
      "model": "/path/to/llama-3.2-1b.gguf",
      "size": 1234567890,
      "loaded_at": "2026-03-20T10:00:00.000Z",
      "is_external": false,
      "model_type": "llama"
    }
  ]
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/show</span>
        </div>
        <p class="endpoint-desc">Get detailed information about a model including GGUF metadata and current settings. Use <code>name</code>, <code>model</code>, or <code>path</code> in the request.</p>
        <div class="code-label">Request:</div>
        <pre class="code-block">{
  "model": "llama-3.2-1b"
}</pre>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "name": "llama-3.2-1b.gguf",
  "path": "/path/to/llama-3.2-1b.gguf",
  "size": 1234567890,
  "model_type": "llama",
  "capabilities": ["completion"],
  "multimodal": false,
  "settings": {"temperature": 0.7, "topP": 0.9, "maxTokens": 2048},
  "info": {"general.architecture": "llama", "general.parameter_count": 1000000000}
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/pull</span>
        </div>
        <p class="endpoint-desc">Download a model from a URL directly to the device. Download runs in the background — check <code>GET /api/tags</code> for completion.</p>
        <div class="code-label">Request:</div>
        <pre class="code-block">{
  "url": "https://huggingface.co/model.gguf",
  "model": "my-custom-model"
}</pre>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "status": "downloading",
  "model": "my-custom-model",
  "downloadId": "download-abc123"
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/copy</span>
        </div>
        <p class="endpoint-desc">Copy an existing model file under a new name. Returns 409 if the destination already exists. External models cannot be copied.</p>
        <div class="code-label">Request:</div>
        <pre class="code-block">{
  "source": "llama-3.2-1b",
  "destination": "llama-backup"
}</pre>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "status": "copied",
  "source": "llama-3.2-1b",
  "destination": "llama-backup"
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method delete">DELETE</span>
          <span class="endpoint-path">/api/delete</span>
        </div>
        <p class="endpoint-desc">Delete a model from local storage</p>
        <div class="code-label">Request:</div>
        <pre class="code-block">{
  "name": "llama-3.2-1b"
}</pre>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "success": true
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/models</span>
        </div>
        <p class="endpoint-desc">Manage model operations: load, unload, reload, or refresh model list</p>
        <div class="code-label">Request (refresh):</div>
        <pre class="code-block">{
  "action": "refresh"
}</pre>
        <div class="code-label">Request (load/unload):</div>
        <pre class="code-block">{
  "action": "load",
  "model": "llama-3.2-1b"
}</pre>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "status": "refreshed",
  "count": 5,
  "models": [...]
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/api/models/apple-foundation</span>
        </div>
        <p class="endpoint-desc">Check Apple Foundation model availability and status</p>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "available": true,
  "requirementsMet": true,
  "enabled": true,
  "status": "ready",
  "message": "Apple Foundation is ready to use."
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/models/apple-foundation</span>
        </div>
        <p class="endpoint-desc">Check whether Apple Foundation is ready to accept requests. No request body needed. Enable Apple Foundation in app settings first.</p>
        <div class="code-label">Response (ready):</div>
        <pre class="code-block">{
  "status": "ready"
}</pre>
        <div class="code-label">Error responses:</div>
        <pre class="code-block">501 apple_foundation_unavailable — device does not support Apple Intelligence
428 requirements_not_met — device needs to be updated
409 apple_foundation_disabled — enable in app settings first</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/api/version</span>
        </div>
        <p class="endpoint-desc">Get API version</p>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "version": "0.8.3"
}</pre>
      </div>
    </div>

    <div id="rag" class="section">
      <h2 class="section-title">RAG & Embeddings</h2>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/embeddings</span>
        </div>
        <p class="endpoint-desc">Generate embeddings for text</p>
        <div class="code-label">Request:</div>
        <pre class="code-block">{
  "model": "llama-3.2-1b",
  "input": "The quick brown fox"
}</pre>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "embeddings": [
    [0.123, -0.456, 0.789, ...]
  ],
  "model": "llama-3.2-1b"
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/files/ingest</span>
        </div>
        <p class="endpoint-desc">Ingest documents for RAG (supports multiple input methods)</p>
        <div class="code-label">Request (direct content):</div>
        <pre class="code-block">{
  "content": "Document content here..."
}</pre>
        <div class="code-label">Request (single file path):</div>
        <pre class="code-block">{
  "filePath": "/documents/doc1.pdf"
}</pre>
        <div class="code-label">Request (multiple files):</div>
        <pre class="code-block">{
  "files": [
    "/documents/doc1.pdf",
    "/documents/doc2.txt"
  ]
}</pre>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "status": "success",
  "processed": 2
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/api/rag</span>
        </div>
        <p class="endpoint-desc">Get RAG system status</p>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 3
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/rag</span>
        </div>
        <p class="endpoint-desc">Configure the RAG system — enable/disable, set storage type, or trigger initialisation</p>
        <div class="code-label">Request:</div>
        <pre class="code-block">{
  "enabled": true,
  "storage": "persistent",
  "initialize": true
}</pre>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 0
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/rag/reset</span>
        </div>
        <p class="endpoint-desc">Clear all ingested documents from the RAG system</p>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "status": "cleared",
  "enabled": true,
  "ready": false,
  "documentCount": 0
}</pre>
      </div>
    </div>

    <div id="server" class="section">
      <h2 class="section-title">Server & Settings</h2>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method get">GET</span>
          <span class="endpoint-path">/api/status</span>
        </div>
        <p class="endpoint-desc">Get detailed server status</p>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "server": {
    "isRunning": true,
    "url": "http://192.168.1.110:8889",
    "port": 8889,
    "clientCount": 1
  },
  "model": {
    "loaded": true,
    "path": "/path/to/llama-3.2-1b.gguf"
  },
  "rag": {
    "ready": false
  }
}</pre>
      </div>

      <div class="endpoint-card">
        <div class="endpoint-header">
          <span class="method post">POST</span>
          <span class="endpoint-path">/api/settings/thinking</span>
        </div>
        <p class="endpoint-desc">Configure thinking mode settings</p>
        <div class="code-label">Request:</div>
        <pre class="code-block">{
  "enabled": true
}</pre>
        <div class="code-label">Response:</div>
        <pre class="code-block">{
  "status": "updated",
  "enabled": true
}</pre>
      </div>
    </div>

    <div class="footer">
      <p style="margin-bottom: 10px;"><strong>Base URL:</strong> Use the server URL shown in the status section above</p>
      <p style="margin-bottom: 10px;"><strong>OpenAI-Compatible Base URL:</strong> <code>http://&lt;device-ip&gt;:8889/v1</code></p>
      <p style="margin-bottom: 10px;"><strong>Headers:</strong> Content-Type: application/json</p>
      <p style="margin-bottom: 10px;"><strong>CORS:</strong> Enabled for all origins</p>
    </div>
  </div>
</body>
</html>`;
  return localApiWording(html);
}
