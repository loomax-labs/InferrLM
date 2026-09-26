[English](REST_APIs.md) | [简体中文](REST_APIs.zh-CN.md) | [繁體中文](REST_APIs.zh-TW.md) | [日本語](REST_APIs.ja.md) | [한국어](REST_APIs.ko.md) | [Deutsch](REST_APIs.de.md) | [Français](REST_APIs.fr.md) | [Nederlands](REST_APIs.nl.md)

# InferrLM REST-API-Dokumentation

Vollständige Beschreibung des lokalen HTTP-Servers von InferrLM. Die REST-API (Aufruf über Netzwerkanfragen) öffnet die AI auf deinem Handy für andere Geräte im selben Netz.

## Anfang

### Schnellstart

1. **Server starten**: Öffne InferrLM, geh zum Tab **Server** und schalte ihn ein. Deine URL erscheint (zum Beispiel `http://192.168.1.10:8889`).
2. **Modell herunterladen**: Lade im Tab **Modelle** mindestens ein GGUF herunter (ein Modelldateiformat). In API-Anfragen steht der Modellname ohne `.gguf`.
3. **Client einstellen**: Richte einen OpenAI-kompatiblen Client auf `http://YOUR_DEVICE_IP:8889/v1`. Ein API-Schlüssel ist nicht nötig. Wenn der Client einen verlangt, setze irgendeinen Platzhalter.
4. **Anfrage senden:**

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hello!"}]}'
```

> Das funktioniert mit jeder App oder Bibliothek, die die OpenAI-API unterstützt. Richte sie auf `http://YOUR_DEVICE_IP:8889/v1`. Beide Geräte müssen im selben lokalen Netz sein. Die Endung `.gguf` im Modellnamen ist optional.

### Server starten

1. Öffne die InferrLM-App auf deinem Gerät
2. Geh zum Tab **Server**
3. Schalte den Server ein
4. Die Server-URL wird angezeigt (meist `http://YOUR_DEVICE_IP:8889`)
5. Du kannst die URL per QR-Code teilen oder kopieren und auf anderen Geräten öffnen

### Einstellbare Optionen

- **Autostart**: Server starten, wenn die App öffnet
- **Port**: Standardport ist 8889 (in den Einstellungen änderbar)

### Grundkonfiguration

**Basis-URL**: `http://YOUR_DEVICE_IP:8889`  
**Content-Type**: `application/json`  
**CORS**: Für alle Ursprünge an

### Modellziel wählen

Jede Anfrage, die Text erzeugt, enthält eine Zeichenkette `model`. Sie legt fest, welches Backend die Arbeit übernimmt:

| Modellwert | Ziel-Backend | Hinweise |
|-------------|----------------|-------|
| Gespeicherter Modellname (z. B. `llama-3.2-1b`) | Lokales GGUF auf diesem Gerät | Lade das GGUF zuerst in der InferrLM-App. |
| `apple-foundation` | Apple Intelligence Foundation Model | Nur iOS. In den App-Einstellungen einschalten und mit `GET /api/models/apple-foundation` prüfen. |

---

## Assistenten (lokal)

### GET /api/assistants

Listet Assistenten auf diesem Gerät mit `deployment: "local"`. Antworten lassen System-Prompts, Skill-Anweisungen und Geheimnisse weg.

**Antwort:**
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

**Beispiel:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/assistants
```

---

## Chat- und Completion-APIs

### POST /api/chat

Streamt einen Chat oder schließt ihn mit der ganzen Gesprächshistorie ab. Nimmt lokale GGUF-Namen oder `apple-foundation`.

**Anfragekörper:**
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

**Streaming-Antwort (NDJSON):**
```
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":"Hi"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":" there"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":""},"done":true}
```

**Antwort ohne Streaming:**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "message": {"role": "assistant", "content": "Hi there!"},
  "done": true
}
```

**Parameter:**
- `model` (string, erforderlich): Ziel-Backend
- `messages` (array, erforderlich): Gesprächsverlauf. Jeder Eintrag hat `role` (`system` | `user` | `assistant`) und `content`
- `assistant` (string, optional): Id eines lokalen Assistenten aus `GET /api/assistants`. Wenn gesetzt und der Körper keine Systemnachricht hat (`messages` mit `role: "system"`, oberstes `system` oder `options.system_prompt`), setzt der Server den System-Prompt dieses Assistenten vor die Erzeugung. Unbekannte Ids geben `404` mit `{ "error": "assistant_not_found" }`.
- `stream` (boolean, optional): Streaming-NDJSON-Antworten einschalten (Standard: `true`)
- `temperature` (number, optional): Sampling-Temperatur 0.0–2.0
- `max_tokens` (number, optional): Höchstzahl der zu erzeugenden Tokens
- `top_p` (number, optional): Top-p-Sampling
- `top_k` (number, optional): Top-k-Sampling

**Beispiel:**
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

Erzeugt eine Antwort aus einem einzelnen Prompt (ohne Gesprächskontext).

**Anfragekörper:**
```json
{
  "model": "llama-3.2-1b",
  "prompt": "Explain quantum computing in simple terms",
  "stream": false,
  "max_tokens": 500
}
```

**Antwort:**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "response": "Quantum computing uses quantum mechanics principles...",
  "done": true
}
```

**Parameter:**
- `model` (string, erforderlich): Ziel-Backend
- `prompt` (string, erforderlich): Eingabe-Prompt
- `stream` (boolean, optional): Streaming-NDJSON-Antworten einschalten
- `max_tokens` (number, optional): Höchstzahl der zu erzeugenden Tokens
- `temperature` (number, optional): Sampling-Temperatur

**Beispiel:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "prompt": "Hello world", "stream": false}'
```

---

## OpenAI-kompatible API

### GET /v1/models

Listet verfügbare Modelle im OpenAI-Format. Passt zu jeder OpenAI-Client-Bibliothek.

**Antwort:**
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

**Beispiel:**
```bash
curl http://YOUR_DEVICE_IP:8889/v1/models
```

---

### POST /v1/chat/completions

OpenAI-kompatibler Chat-Completion-Endpunkt. Ersatz für Apps, die gegen die OpenAI-API gebaut sind. Kein API-Schlüssel nötig. Wenn der Client einen `Authorization`-Header verlangt, setze einen beliebigen nicht leeren Platzhalter.

**Anfragekörper:**
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

Optionales `assistant` verhält sich wie bei `POST /api/chat` (nur lokale Assistenten; fehlt er, kommt `assistant_not_found`).

**Antwort ohne Streaming:**
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

**Streaming-Antwort (SSE):**
```
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**Beispiel:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hi"}], "stream": false}'
```

---

## Chatverlauf

### GET /api/chats

Listet alle gespeicherten Chats (ohne Nachrichten).

**Antwort:**
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

**Beispiel:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats
```

---

### POST /api/chats

Legt einen neuen Chat an.

**Anfragekörper:**
```json
{
  "title": "My Conversation",
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"}
  ]
}
```

**Antwort (201):**
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

**Parameter:**
- `title` (string, optional): Chat-Titel
- `messages` (array, optional): Erste Nachrichten für das Gespräch

---

### GET /api/chats/:id

Holt einen bestimmten Chat einschließlich aller Nachrichten.

**Antwort:**
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

**Beispiel:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### DELETE /api/chats/:id

Löscht einen Chat.

**Antwort:**
```json
{
  "status": "deleted",
  "chatId": "chat-abc123"
}
```

**Beispiel:**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### GET /api/chats/:id/messages

Holt nur die Nachrichten eines Chats.

**Antwort:**
```json
{
  "messages": [
    {"id": "msg-1", "role": "user", "content": "Hello"},
    {"id": "msg-2", "role": "assistant", "content": "Hi there!"}
  ]
}
```

**Beispiel:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages
```

---

### POST /api/chats/:id/messages

Hängt eine oder mehrere Nachrichten an einen bestehenden Chat.

**Anfragekörper:**
```json
{
  "messages": [
    {"role": "user", "content": "Follow-up question"}
  ]
}
```

**Antwort (201):**
```json
{
  "messages": [
    {"id": "msg-3", "role": "user", "content": "Follow-up question"}
  ]
}
```

**Beispiel:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Follow-up"}]}'
```

---

## Modelle verwalten

### GET /api/tags

Listet alle auf dem Gerät gespeicherten Modelle.

**Antwort:**
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

**Beispiel:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/tags
```

---

### GET /api/ps

Listet gerade geladene Modelle (Modelle im Speicher).

**Antwort:**
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

Wenn kein Modell geladen ist, ist `models` ein leeres Array.

**Beispiel:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/ps
```

---

### POST /api/show

Holt Details zu einem Modell, einschließlich GGUF-Metadaten und aktueller Einstellungen.

**Anfragekörper** (nutze `name`, `model` oder `path`):
```json
{
  "model": "llama-3.2-1b"
}
```

**Antwort:**
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

**Beispiel:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/show \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b"}'
```

---

### POST /api/pull

Lädt ein Modell von einer URL direkt auf das Gerät.

**Anfragekörper:**
```json
{
  "url": "https://huggingface.co/model.gguf",
  "model": "my-custom-model"
}
```

**Antwort:**
```json
{
  "status": "downloading",
  "model": "my-custom-model",
  "downloadId": "download-abc123"
}
```

Der Download läuft im Hintergrund. Mit `GET /api/tags` siehst du, wann das Modell erscheint.

**Beispiel:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/pull \
  -H "Content-Type: application/json" \
  -d '{"url": "https://huggingface.co/model.gguf", "model": "my-model"}'
```

---

### POST /api/copy

Kopiert eine vorhandene Modelldatei unter einem neuen Namen.

**Anfragekörper:**
```json
{
  "source": "llama-3.2-1b",
  "destination": "llama-3.2-1b-backup"
}
```

**Antwort:**
```json
{
  "status": "copied",
  "source": "llama-3.2-1b.gguf",
  "destination": "llama-3.2-1b-backup.gguf"
}
```

Gibt `409`, wenn der Zielname schon existiert. Externe Modelle lassen sich nicht kopieren.

**Beispiel:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/copy \
  -H "Content-Type: application/json" \
  -d '{"source": "llama-3.2-1b", "destination": "llama-backup"}'
```

---

### DELETE /api/delete

Löscht ein Modell aus dem lokalen Speicher.

**Anfragekörper** (nutze `name` oder `path`):
```json
{
  "name": "llama-3.2-1b"
}
```

**Antwort:**
```json
{
  "success": true
}
```

**Beispiel:**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/delete \
  -H "Content-Type: application/json" \
  -d '{"name": "old-model"}'
```

---

### POST /api/models

Führt Lebenszyklus-Aktionen für Modelle aus.

**Anfragekörper:**
```json
{
  "action": "load",
  "model": "llama-3.2-1b"
}
```

**Verfügbare Aktionen:**

| Aktion | Beschreibung | Feld `model` |
|--------|-------------|---------------|
| `load` | Lädt ein Modell in den Speicher | Erforderlich: Modellname oder Pfad |
| `unload` | Gibt das gerade geladene Modell frei | Nicht verwendet |
| `reload` | Initialisiert das gerade geladene Modell neu | Nicht verwendet |
| `refresh` | Liest den Speicher neu und lädt die Modellliste neu | Nicht verwendet |

**Antwort (`load`):**
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

**Antwort (`refresh`):**
```json
{
  "status": "refreshed",
  "count": 3,
  "models": [...]
}
```

**Beispiel:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models \
  -H "Content-Type: application/json" \
  -d '{"action": "load", "model": "llama-3.2-1b"}'
```

---

### GET /api/models/apple-foundation

Prüft, ob das Apple Foundation Model verfügbar und bereit ist (nur iOS).

**Antwort:**
```json
{
  "available": true,
  "requirementsMet": true,
  "enabled": true,
  "status": "ready",
  "message": "Apple Foundation is ready to use."
}
```

| `status` | Bedeutung |
|----------|---------|
| `ready` | Verfügbar und eingeschaltet. In Anfragen `model: "apple-foundation"` verwenden |
| `configure` | Nicht verfügbar oder nicht eingeschaltet. Details stehen in `message` |

**Beispiel:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### POST /api/models/apple-foundation

Prüft, ob Apple Foundation Anfragen bearbeiten kann. Gibt einen Fehler, wenn es nicht verfügbar ist, Anforderungen fehlen oder die Funktion in den App-Einstellungen aus ist.

**Antwort (bereit):**
```json
{
  "status": "ready"
}
```

**Fehlerantworten:**
- `501`, `apple_foundation_unavailable`: Gerät unterstützt Apple Intelligence nicht
- `428`, `requirements_not_met`: Gerät muss aktualisiert werden
- `409`, `apple_foundation_disabled`: zuerst in den App-Einstellungen einschalten

**Beispiel:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### GET /api/version

Holt die aktuelle App-Version.

**Antwort:**
```json
{
  "version": "0.8.3"
}
```

**Beispiel:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/version
```

---

## RAG und Embeddings

### POST /api/embeddings

Erzeugt Embeddings (Text wird zu Zahlen, damit man ihn finden kann) für einen oder mehrere Texte mit einem lokalen Modell.

**Anfragekörper:**
```json
{
  "model": "llama-3.2-1b",
  "input": "The quick brown fox jumps over the lazy dog"
}
```

Übergib ein Array, um mehrere Texte in einer Anfrage zu verarbeiten:
```json
{
  "model": "llama-3.2-1b",
  "input": ["First text", "Second text"]
}
```

**Antwort:**
```json
{
  "embeddings": [
    [0.123, -0.456, 0.789, "..."]
  ],
  "model": "llama-3.2-1b.gguf"
}
```

**Parameter:**
- `model` (string, erforderlich): Lokales Modell für das Embedding
- `input` (string oder array, erforderlich): Text(e) zum Einbetten. Auch als `prompt` oder `text` akzeptiert.

**Beispiel:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "input": "Sample text"}'
```

---

### POST /api/files/ingest

Nimmt Inhalt ins RAG auf. Rohtext, ein Dateipfad auf dem Gerät oder mehrere Pfade.

**Anfragekörper (Rohtext):**
```json
{
  "content": "Document content to store for RAG...",
  "fileName": "my-doc.txt"
}
```

**Anfragekörper (ein Dateipfad):**
```json
{
  "filePath": "/path/to/doc.txt"
}
```

**Anfragekörper (mehrere Dateipfade):**
```json
{
  "files": ["/path/to/doc1.txt", "/path/to/doc2.txt"]
}
```

**Antwort:**
```json
{
  "status": "stored",
  "documentId": "1700000000000-abc123",
  "fileName": "my-doc.txt",
  "model": null
}
```

**Parameter:**
- `content` (string): Rohtext *(erforderlich, wenn `filePath` und `files` fehlen)*
- `filePath` (string, optional): Absoluter Pfad zu einer Datei auf dem Gerät
- `files` (array, optional): Array absoluter Dateipfade
- `fileName` (string, optional): Anzeigename des Dokuments (Standard: `"uploaded.txt"`)
- `chatId` (string, optional): Dokument einem bestimmten Chat zuordnen
- `provider` (string, optional): RAG-Embedding-Anbieter
- `rag` (boolean, optional): `false` überspringt die RAG-Indexierung (Standard: `true`)

**Beispiel:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Machine learning is a subset of AI...", "fileName": "ml-intro.txt"}'
```

---

### GET /api/rag

Holt den aktuellen RAG-Status.

**Antwort:**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 3
}
```

**Beispiel:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/rag
```

---

### POST /api/rag

Stellt RAG ein (ein/aus, Speicherart oder Initialisierung).

**Anfragekörper:**
```json
{
  "enabled": true,
  "storage": "persistent",
  "initialize": true
}
```

**Antwort:**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 0
}
```

**Parameter:**
- `enabled` (boolean, optional): RAG ein- oder ausschalten
- `storage` (string, optional): `"memory"` oder `"persistent"`
- `initialize` (boolean, optional): RAG-Initialisierung anstoßen
- `provider` (string, optional): Embedding-Anbieter für die Initialisierung

**Beispiel:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "storage": "persistent"}'
```

---

### POST /api/rag/reset

Löscht alle aufgenommenen Dokumente aus dem RAG.

**Antwort:**
```json
{
  "status": "cleared",
  "enabled": true,
  "ready": false,
  "documentCount": 0
}
```

**Beispiel:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag/reset
```

---

## Server und Einstellungen

### GET /api/status

Holt Serverstatus, aktives Modell und RAG-Zustand.

**Antwort:**
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

**Beispiel:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/status
```

---

### POST /api/settings/thinking

Schaltet den Denkmodus (länger nachdenken, bevor geantwortet wird) für das gerade geladene Modell ein oder aus.

**Anfragekörper:**
```json
{
  "enabled": true
}
```

**Antwort:**
```json
{
  "status": "updated",
  "enabled": true
}
```

**Parameter:**
- `enabled` (boolean, erforderlich): Denkmodus ein- oder ausschalten

**Beispiel:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/settings/thinking \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## Fehlerbehandlung

Alle Endpunkte geben Standard-HTTP-Statuscodes und bei Fehlern einen JSON-Körper.

**Erfolgscodes:**
- `200 OK`
- `201 Created`

**Fehlercodes:**
- `400 Bad Request`: Parameter fehlen oder sind ungültig
- `404 Not Found`: Ressource gibt es nicht
- `405 Method Not Allowed`
- `409 Conflict`: Voraussetzung nicht erfüllt (zum Beispiel entfernte Modelle aus)
- `422 Unprocessable Entity`: Anfrage ist gültig, die Aktion geht aber nicht (zum Beispiel API-Schlüssel fehlt)
- `500 Internal Server Error`
- `503 Service Unavailable`: Modell ist nicht geladen

**Format der Fehlerantwort:**
```json
{
  "error": "error_code"
}
```

---

## Sicherheit

- Der Server ist nur für das lokale Netz gedacht
- Keine Anmeldung nötig (geschützt durch Netztrennung)
- CORS ist für alle Ursprünge an
- Bevor du den Server über dein lokales Netz hinaus öffnest, denk an VPN oder Firewall

---

## Ratenbegrenzung

Es gibt keine Ratenbegrenzung. Die Leistung hängt von CPU, RAM, Modellgröße und gleichzeitigen Verbindungen ab.

---

## Häufige Fälle

### Mit einem lokalen Modell chatten

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

### Dokument aufnehmen und RAG-Status prüfen

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Your document content here...", "fileName": "doc.txt"}'

curl http://YOUR_DEVICE_IP:8889/api/rag
```

### Modelle verwalten

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

## Beispielanwendungen

### InferrLM CLI

Die InferrLM CLI ist ein Kommandozeilenwerkzeug mit React, Ink und TypeScript. Sie verbindet sich mit deinem InferrLM-Server und chattet im Terminal, mit laufenden Antworten und Gesprächsverlauf.

Quelltext: [github.com/sbhjt-gr/inferra-cli](https://github.com/sbhjt-gr/inferra-cli)

---

## Weitere Quellen

- [InferrLM-GitHub-Repository](https://github.com/sbhjt-gr/inferra)
- [InferrLM-CLI-Werkzeug](https://github.com/sbhjt-gr/inferra-cli)
- [Beitragsleitfaden](CONTRIBUTING.de.md)
- [Lizenz](../LICENSE)

---

**Zuletzt aktualisiert**: 20. März 2026  
**API-Version**: 0.8.3
