[English](REST_APIs.md) | [简体中文](REST_APIs.zh-CN.md) | [繁體中文](REST_APIs.zh-TW.md) | [日本語](REST_APIs.ja.md) | [한국어](REST_APIs.ko.md) | [Deutsch](REST_APIs.de.md) | [Français](REST_APIs.fr.md) | [Nederlands](REST_APIs.nl.md)

# InferrLM REST API-documentatie

Volledige beschrijving van de lokale HTTP-server van InferrLM. De REST API (aanroepen via netwerkverzoeken) opent de AI op je telefoon voor andere apparaten op hetzelfde netwerk.

## Begin

### Snel starten

1. **Server starten**: open InferrLM, ga naar het tabblad **Server** en zet de schakelaar aan. Je adres verschijnt (bijvoorbeeld `http://192.168.1.10:8889`).
2. **Model downloaden**: download minstens één GGUF (een modelbestandsformaat) op het tabblad **Modellen**. De modelnaam in API-verzoeken is zonder `.gguf`.
3. **Client instellen**: wijs een client die bij OpenAI past naar `http://YOUR_DEVICE_IP:8889/v1`. Een API-sleutel is niet nodig. Als de client er een eist, zet je een willekeurige tijdelijke tekst.
4. **Een verzoek sturen:**

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hello!"}]}'
```

> Dit werkt met elke app of bibliotheek die de OpenAI-API ondersteunt. Wijs die naar `http://YOUR_DEVICE_IP:8889/v1`. Beide apparaten moeten op hetzelfde lokale netwerk zitten. De extensie `.gguf` in de modelnaam is optioneel.

### Server starten

1. Open de InferrLM-app op je apparaat
2. Ga naar het tabblad **Server**
3. Zet de server aan
4. Het serveradres verschijnt (meestal `http://YOUR_DEVICE_IP:8889`)
5. Je kunt dit adres delen met een QR-code, of kopiëren en op andere apparaten openen

### Opties die je kunt wijzigen

- **Automatisch starten**: start de server als de app opent
- **Poort**: de standaardpoort is 8889 (aanpasbaar in de instellingen)

### Basisconfiguratie

**Basisadres**: `http://YOUR_DEVICE_IP:8889`  
**Content-Type**: `application/json`  
**CORS**: aan voor alle origins

### Een modeldoel kiezen

Elk verzoek dat tekst maakt bevat een tekenreeks `model`. Die kiest welke uitvoering het werk doet:

| Modelwaarde | Bestemming | Opmerkingen |
|-------------|----------------|-------|
| Opgeslagen modelnaam (bijvoorbeeld `llama-3.2-1b`) | Lokaal GGUF op dit apparaat | Download het GGUF eerst in de InferrLM-app. |
| `apple-foundation` | Apple Intelligence Foundation-model | Alleen iOS. Zet het aan in de app-instellingen en controleer met `GET /api/models/apple-foundation`. |

---

## Assistenten (lokaal)

### GET /api/assistants

Toont assistenten op dit apparaat met `deployment: "local"`. Antwoorden laten system prompts, skill-instructies en geheimen weg.

**Antwoord:**
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

**Voorbeeld:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/assistants
```

---

## Chat- en completion-API's

### POST /api/chat

Streamt een chat of rondt die af met de hele gespreksgeschiedenis. Accepteert lokale GGUF-namen of `apple-foundation`.

**Verzoekbody:**
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

**Streamingantwoord (NDJSON):**
```
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":"Hi"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":" there"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":""},"done":true}
```

**Antwoord zonder streaming:**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "message": {"role": "assistant", "content": "Hi there!"},
  "done": true
}
```

**Parameters:**
- `model` (string, verplicht): uitvoeringsdoel
- `messages` (array, verplicht): gespreksverloop. Elke regel heeft `role` (`system` | `user` | `assistant`) en `content`
- `assistant` (string, optioneel): id van een lokale assistent uit `GET /api/assistants`. Als die gezet is en de body geen systeembericht heeft (`messages` met `role: "system"`, `system` op het hoogste niveau, of `options.system_prompt`), zet de server de system prompt van die assistent vóór het genereren. Onbekende ids geven `404` met `{ "error": "assistant_not_found" }`.
- `stream` (boolean, optioneel): streaming-NDJSON-antwoorden aanzetten (standaard: `true`)
- `temperature` (number, optioneel): samplingtemperatuur 0.0–2.0
- `max_tokens` (number, optioneel): maximum aantal tokens om te maken
- `top_p` (number, optioneel): top-p-sampling
- `top_k` (number, optioneel): top-k-sampling

**Voorbeeld:**
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

Maakt een antwoord uit één prompt (zonder gesprekscontext).

**Verzoekbody:**
```json
{
  "model": "llama-3.2-1b",
  "prompt": "Explain quantum computing in simple terms",
  "stream": false,
  "max_tokens": 500
}
```

**Antwoord:**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "response": "Quantum computing uses quantum mechanics principles...",
  "done": true
}
```

**Parameters:**
- `model` (string, verplicht): uitvoeringsdoel
- `prompt` (string, verplicht): invoerprompt
- `stream` (boolean, optioneel): streaming-NDJSON-antwoorden aanzetten
- `max_tokens` (number, optioneel): maximum aantal tokens om te maken
- `temperature` (number, optioneel): samplingtemperatuur

**Voorbeeld:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "prompt": "Hello world", "stream": false}'
```

---

## API die bij OpenAI past

### GET /v1/models

Toont beschikbare modellen in OpenAI-formaat. Past bij elke OpenAI-clientbibliotheek.

**Antwoord:**
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

**Voorbeeld:**
```bash
curl http://YOUR_DEVICE_IP:8889/v1/models
```

---

### POST /v1/chat/completions

Chat-completion-eindpunt dat bij OpenAI past. Vervanging voor apps die tegen de OpenAI-API zijn gebouwd. Geen API-sleutel nodig. Als de client een `Authorization`-header eist, zet je een niet-lege tijdelijke tekst.

**Verzoekbody:**
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

Optionele `assistant` gedraagt zich als bij `POST /api/chat` (alleen lokale assistenten; `assistant_not_found` als die ontbreekt).

**Antwoord zonder streaming:**
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

**Streamingantwoord (SSE):**
```
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**Voorbeeld:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hi"}], "stream": false}'
```

---

## Chatgeschiedenis

### GET /api/chats

Toont alle opgeslagen chats (zonder berichten).

**Antwoord:**
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

**Voorbeeld:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats
```

---

### POST /api/chats

Maakt een nieuwe chat.

**Verzoekbody:**
```json
{
  "title": "My Conversation",
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"}
  ]
}
```

**Antwoord (201):**
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
- `title` (string, optioneel): chattitel
- `messages` (array, optioneel): eerste berichten voor het gesprek

---

### GET /api/chats/:id

Haalt een bepaalde chat op, inclusief alle berichten.

**Antwoord:**
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

**Voorbeeld:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### DELETE /api/chats/:id

Verwijdert een chat.

**Antwoord:**
```json
{
  "status": "deleted",
  "chatId": "chat-abc123"
}
```

**Voorbeeld:**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### GET /api/chats/:id/messages

Haalt alleen de berichten van een chat op.

**Antwoord:**
```json
{
  "messages": [
    {"id": "msg-1", "role": "user", "content": "Hello"},
    {"id": "msg-2", "role": "assistant", "content": "Hi there!"}
  ]
}
```

**Voorbeeld:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages
```

---

### POST /api/chats/:id/messages

Voegt een of meer berichten toe aan een bestaande chat.

**Verzoekbody:**
```json
{
  "messages": [
    {"role": "user", "content": "Follow-up question"}
  ]
}
```

**Antwoord (201):**
```json
{
  "messages": [
    {"id": "msg-3", "role": "user", "content": "Follow-up question"}
  ]
}
```

**Voorbeeld:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Follow-up"}]}'
```

---

## Modellen beheren

### GET /api/tags

Toont alle modellen die op het apparaat staan.

**Antwoord:**
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

**Voorbeeld:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/tags
```

---

### GET /api/ps

Toont modellen die nu geladen zijn (in het geheugen).

**Antwoord:**
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

Als er geen model geladen is, is `models` een lege array.

**Voorbeeld:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/ps
```

---

### POST /api/show

Haalt details van een model op, inclusief GGUF-metadata en de huidige instellingen.

**Verzoekbody** (gebruik `name`, `model` of `path`):
```json
{
  "model": "llama-3.2-1b"
}
```

**Antwoord:**
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

**Voorbeeld:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/show \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b"}'
```

---

### POST /api/pull

Downloadt een model van een URL rechtstreeks naar het apparaat.

**Verzoekbody:**
```json
{
  "url": "https://huggingface.co/model.gguf",
  "model": "my-custom-model"
}
```

**Antwoord:**
```json
{
  "status": "downloading",
  "model": "my-custom-model",
  "downloadId": "download-abc123"
}
```

De download loopt op de achtergrond. Gebruik `GET /api/tags` om te zien wanneer het model verschijnt.

**Voorbeeld:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/pull \
  -H "Content-Type: application/json" \
  -d '{"url": "https://huggingface.co/model.gguf", "model": "my-model"}'
```

---

### POST /api/copy

Kopieert een bestaand modelbestand onder een nieuwe naam.

**Verzoekbody:**
```json
{
  "source": "llama-3.2-1b",
  "destination": "llama-3.2-1b-backup"
}
```

**Antwoord:**
```json
{
  "status": "copied",
  "source": "llama-3.2-1b.gguf",
  "destination": "llama-3.2-1b-backup.gguf"
}
```

Geeft `409` als de doelnaam al bestaat. Externe modellen kun je niet kopiëren.

**Voorbeeld:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/copy \
  -H "Content-Type: application/json" \
  -d '{"source": "llama-3.2-1b", "destination": "llama-backup"}'
```

---

### DELETE /api/delete

Verwijdert een model uit de lokale opslag.

**Verzoekbody** (gebruik `name` of `path`):
```json
{
  "name": "llama-3.2-1b"
}
```

**Antwoord:**
```json
{
  "success": true
}
```

**Voorbeeld:**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/delete \
  -H "Content-Type: application/json" \
  -d '{"name": "old-model"}'
```

---

### POST /api/models

Voert levenscyclusacties voor modellen uit.

**Verzoekbody:**
```json
{
  "action": "load",
  "model": "llama-3.2-1b"
}
```

**Beschikbare acties:**

| Actie | Beschrijving | Veld `model` |
|--------|-------------|---------------|
| `load` | Laadt een model in het geheugen | Verplicht: modelnaam of pad |
| `unload` | Laat het nu geladen model los | Niet gebruikt |
| `reload` | Initialiseert het nu geladen model opnieuw | Niet gebruikt |
| `refresh` | Leest de opslag opnieuw en laadt de modellijst opnieuw | Niet gebruikt |

**Antwoord (`load`):**
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

**Antwoord (`refresh`):**
```json
{
  "status": "refreshed",
  "count": 3,
  "models": [...]
}
```

**Voorbeeld:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models \
  -H "Content-Type: application/json" \
  -d '{"action": "load", "model": "llama-3.2-1b"}'
```

---

### GET /api/models/apple-foundation

Controleert of het Apple Foundation-model beschikbaar en klaar is (alleen iOS).

**Antwoord:**
```json
{
  "available": true,
  "requirementsMet": true,
  "enabled": true,
  "status": "ready",
  "message": "Apple Foundation is ready to use."
}
```

| `status` | Betekenis |
|----------|---------|
| `ready` | Beschikbaar en aan. Gebruik `model: "apple-foundation"` in verzoeken |
| `configure` | Niet beschikbaar of niet aan. Details staan in `message` |

**Voorbeeld:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### POST /api/models/apple-foundation

Controleert of Apple Foundation verzoeken kan verwerken. Geeft een fout als het niet beschikbaar is, als voorwaarden ontbreken, of als de functie uit staat in de app-instellingen.

**Antwoord (klaar):**
```json
{
  "status": "ready"
}
```

**Foutantwoorden:**
- `501`, `apple_foundation_unavailable`: het apparaat ondersteunt Apple Intelligence niet
- `428`, `requirements_not_met`: het apparaat moet worden bijgewerkt
- `409`, `apple_foundation_disabled`: zet het eerst aan in de app-instellingen

**Voorbeeld:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### GET /api/version

Haalt de huidige app-versie op.

**Antwoord:**
```json
{
  "version": "0.8.3"
}
```

**Voorbeeld:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/version
```

---

## RAG en embeddings

### POST /api/embeddings

Maakt embeddings (tekst wordt getallen, zodat je die kunt terugvinden) voor een of meer teksten met een lokaal model.

**Verzoekbody:**
```json
{
  "model": "llama-3.2-1b",
  "input": "The quick brown fox jumps over the lazy dog"
}
```

Geef een array mee om meerdere teksten in één verzoek te verwerken:
```json
{
  "model": "llama-3.2-1b",
  "input": ["First text", "Second text"]
}
```

**Antwoord:**
```json
{
  "embeddings": [
    [0.123, -0.456, 0.789, "..."]
  ],
  "model": "llama-3.2-1b.gguf"
}
```

**Parameters:**
- `model` (string, verplicht): lokaal model voor de embedding
- `input` (string of array, verplicht): tekst(en) om om te zetten. Ook geaccepteerd als `prompt` of `text`.

**Voorbeeld:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "input": "Sample text"}'
```

---

### POST /api/files/ingest

Zet inhoud in de RAG. Ruwe tekst, één bestandspad op het apparaat, of meerdere paden.

**Verzoekbody (ruwe tekst):**
```json
{
  "content": "Document content to store for RAG...",
  "fileName": "my-doc.txt"
}
```

**Verzoekbody (één bestandspad):**
```json
{
  "filePath": "/path/to/doc.txt"
}
```

**Verzoekbody (meerdere bestandspaden):**
```json
{
  "files": ["/path/to/doc1.txt", "/path/to/doc2.txt"]
}
```

**Antwoord:**
```json
{
  "status": "stored",
  "documentId": "1700000000000-abc123",
  "fileName": "my-doc.txt",
  "model": null
}
```

**Parameters:**
- `content` (string): ruwe tekst *(verplicht als `filePath` en `files` ontbreken)*
- `filePath` (string, optioneel): absoluut pad naar een bestand op het apparaat
- `files` (array, optioneel): array van absolute paden
- `fileName` (string, optioneel): weergavenaam van het document (standaard: `"uploaded.txt"`)
- `chatId` (string, optioneel): koppel het document aan een bepaalde chat
- `provider` (string, optioneel): RAG-embeddingaanbieder
- `rag` (boolean, optioneel): `false` slaat RAG-indexering over (standaard: `true`)

**Voorbeeld:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Machine learning is a subset of AI...", "fileName": "ml-intro.txt"}'
```

---

### GET /api/rag

Haalt de huidige RAG-status op.

**Antwoord:**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 3
}
```

**Voorbeeld:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/rag
```

---

### POST /api/rag

Stelt RAG in (aan/uit, opslagsoort, of initialisatie).

**Verzoekbody:**
```json
{
  "enabled": true,
  "storage": "persistent",
  "initialize": true
}
```

**Antwoord:**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 0
}
```

**Parameters:**
- `enabled` (boolean, optioneel): RAG aan- of uitzetten
- `storage` (string, optioneel): `"memory"` of `"persistent"`
- `initialize` (boolean, optioneel): RAG-initialisatie starten
- `provider` (string, optioneel): embeddingaanbieder voor de initialisatie

**Voorbeeld:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "storage": "persistent"}'
```

---

### POST /api/rag/reset

Wist alle opgenomen documenten uit de RAG.

**Antwoord:**
```json
{
  "status": "cleared",
  "enabled": true,
  "ready": false,
  "documentCount": 0
}
```

**Voorbeeld:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag/reset
```

---

## Server en instellingen

### GET /api/status

Haalt serverstatus, actief model en RAG-staat op.

**Antwoord:**
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

**Voorbeeld:**
```bash
curl http://YOUR_DEVICE_IP:8889/api/status
```

---

### POST /api/settings/thinking

Zet de denkmodus (langer nadenken voordat er antwoord komt) aan of uit voor het model dat nu geladen is.

**Verzoekbody:**
```json
{
  "enabled": true
}
```

**Antwoord:**
```json
{
  "status": "updated",
  "enabled": true
}
```

**Parameters:**
- `enabled` (boolean, verplicht): denkmodus aan- of uitzetten

**Voorbeeld:**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/settings/thinking \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## Foutafhandeling

Alle eindpunten geven standaard HTTP-statuscodes, en bij een fout een JSON-body.

**Succescodes:**
- `200 OK`
- `201 Created`

**Foutcodes:**
- `400 Bad Request`: parameter ontbreekt of is ongeldig
- `404 Not Found`: de bron bestaat niet
- `405 Method Not Allowed`
- `409 Conflict`: de voorwaarde klopt niet (bijvoorbeeld modellen op afstand staan uit)
- `422 Unprocessable Entity`: verzoek is geldig, maar de actie kan niet (bijvoorbeeld API-sleutel ontbreekt)
- `500 Internal Server Error`
- `503 Service Unavailable`: het model is niet geladen

**Foutantwoordformaat:**
```json
{
  "error": "error_code"
}
```

---

## Beveiliging

- Deze server is alleen bedoeld voor het lokale netwerk
- Er is geen aanmelding nodig (beveiligd door netwerkafscheiding)
- CORS staat aan voor alle origins
- Denk aan een VPN of firewall voordat je de server buiten je lokale netwerk openzet

---

## Snelheidslimiet

Er is geen snelheidslimiet. De prestaties hangen af van CPU, geheugen, modelgrootte en het aantal gelijktijdige verbindingen.

---

## Veelgebruikte gevallen

### Chatten met een lokaal model

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

### Een document opnemen en de RAG-status controleren

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Your document content here...", "fileName": "doc.txt"}'

curl http://YOUR_DEVICE_IP:8889/api/rag
```

### Modellen beheren

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

## Voorbeeldapps

### InferrLM CLI

InferrLM CLI is een opdrachtregelhulpmiddel met React, Ink en TypeScript. Het maakt verbinding met je InferrLM-server en chat in de terminal, met antwoorden terwijl ze binnenkomen en met gespreksgeschiedenis.

Broncode: [github.com/sbhjt-gr/inferra-cli](https://github.com/sbhjt-gr/inferra-cli)

---

## Meer bronnen

- [InferrLM GitHub-repository](https://github.com/sbhjt-gr/inferra)
- [InferrLM CLI-hulpmiddel](https://github.com/sbhjt-gr/inferra-cli)
- [Bijdragegids](CONTRIBUTING.nl.md)
- [Licentie](../LICENSE)

---

**Laatst bijgewerkt**: 20 maart 2026  
**API-versie**: 0.8.3
