[English](REST_APIs.md) | [简体中文](REST_APIs.zh-CN.md) | [繁體中文](REST_APIs.zh-TW.md) | [日本語](REST_APIs.ja.md) | [한국어](REST_APIs.ko.md) | [Deutsch](REST_APIs.de.md) | [Français](REST_APIs.fr.md) | [Nederlands](REST_APIs.nl.md)

# Documentation de l'API REST InferrLM

Description complète du serveur HTTP local d'InferrLM. L'API REST (des appels par requêtes réseau) ouvre l'IA de ton téléphone aux autres appareils du même réseau.

## Pour commencer

### Démarrage rapide

1. **Démarrer le serveur** : ouvre InferrLM, va dans l'onglet **Serveur** et active l'interrupteur. Ton adresse apparaît (par exemple `http://192.168.1.10:8889`).
2. **Télécharger un modèle** : télécharge au moins un GGUF (un format de fichier de modèle) dans l'onglet **Modèles**. Le nom du modèle dans les requêtes API est sans `.gguf`.
3. **Régler le client** : pointe un client compatible OpenAI vers `http://YOUR_DEVICE_IP:8889/v1`. Aucune clé d'API n'est requise. Si le client en exige une, mets n'importe quel texte de remplacement.
4. **Envoyer une requête :**

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hello!"}]}'
```

> Ça marche avec toute application ou bibliothèque qui prend en charge l'API OpenAI : pointe-la vers `http://YOUR_DEVICE_IP:8889/v1`. Les deux appareils doivent être sur le même réseau local. L'extension `.gguf` dans le nom du modèle est facultative.

### Démarrer le serveur

1. Ouvre l'application InferrLM sur ton appareil
2. Va dans l'onglet **Serveur**
3. Active l'interrupteur du serveur
4. L'adresse du serveur s'affiche (en général `http://YOUR_DEVICE_IP:8889`)
5. Tu peux partager cette adresse par QR code, ou la copier pour l'ouvrir sur d'autres appareils

### Options que tu peux changer

- **Démarrage automatique** : démarre le serveur quand l'application s'ouvre
- **Port** : le port par défaut est 8889 (modifiable dans les réglages)

### Configuration de base

**Adresse de base** : `http://YOUR_DEVICE_IP:8889`  
**Content-Type** : `application/json`  
**CORS** : activé pour toutes les origines

### Choisir la cible du modèle

Chaque requête qui produit du texte contient une chaîne `model`. Elle choisit le moteur qui fait le travail :

| Valeur du modèle | Moteur visé | Notes |
|-------------|----------------|-------|
| Nom de modèle enregistré (par exemple `llama-3.2-1b`) | GGUF local sur cet appareil | Télécharge d'abord le GGUF dans l'application InferrLM. |
| `apple-foundation` | Modèle Apple Intelligence Foundation | iOS seulement. Active-le dans les réglages et vérifie avec `GET /api/models/apple-foundation`. |

---

## Assistants (locaux)

### GET /api/assistants

Liste les assistants de cet appareil avec `deployment: "local"`. Les réponses omettent les prompts système, les consignes de skills et les secrets.

**Réponse :**
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

**Exemple :**
```bash
curl http://YOUR_DEVICE_IP:8889/api/assistants
```

---

## API de discussion et de complétion

### POST /api/chat

Diffuse une discussion ou la termine avec tout l'historique. Accepte un nom de modèle GGUF local ou `apple-foundation`.

**Corps de la requête :**
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

**Réponse en flux (NDJSON) :**
```
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":"Hi"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":" there"},"done":false}
{"model":"llama-3.2-1b.gguf","created_at":"...","message":{"role":"assistant","content":""},"done":true}
```

**Réponse sans flux :**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "message": {"role": "assistant", "content": "Hi there!"},
  "done": true
}
```

**Paramètres :**
- `model` (chaîne, obligatoire) : moteur visé
- `messages` (tableau, obligatoire) : historique. Chaque entrée a `role` (`system` | `user` | `assistant`) et `content`
- `assistant` (chaîne, facultatif) : id d'un assistant local venant de `GET /api/assistants`. S'il est défini et que le corps n'a pas de message système (`messages` avec `role: "system"`, `system` au premier niveau, ou `options.system_prompt`), le serveur place le prompt système de cet assistant avant la génération. Un id inconnu renvoie `404` avec `{ "error": "assistant_not_found" }`.
- `stream` (booléen, facultatif) : active les réponses NDJSON en flux (par défaut : `true`)
- `temperature` (nombre, facultatif) : température d'échantillonnage 0.0–2.0
- `max_tokens` (nombre, facultatif) : nombre maximal de tokens à produire
- `top_p` (nombre, facultatif) : échantillonnage top-p
- `top_k` (nombre, facultatif) : échantillonnage top-k

**Exemple :**
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

Produit une réponse à partir d'un seul prompt (sans contexte de discussion).

**Corps de la requête :**
```json
{
  "model": "llama-3.2-1b",
  "prompt": "Explain quantum computing in simple terms",
  "stream": false,
  "max_tokens": 500
}
```

**Réponse :**
```json
{
  "model": "llama-3.2-1b.gguf",
  "created_at": "2026-03-20T10:00:00.000Z",
  "response": "Quantum computing uses quantum mechanics principles...",
  "done": true
}
```

**Paramètres :**
- `model` (chaîne, obligatoire) : moteur visé
- `prompt` (chaîne, obligatoire) : prompt d'entrée
- `stream` (booléen, facultatif) : active les réponses NDJSON en flux
- `max_tokens` (nombre, facultatif) : nombre maximal de tokens à produire
- `temperature` (nombre, facultatif) : température d'échantillonnage

**Exemple :**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/generate \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "prompt": "Hello world", "stream": false}'
```

---

## API compatible OpenAI

### GET /v1/models

Liste les modèles disponibles au format OpenAI. Compatible avec toute bibliothèque cliente OpenAI.

**Réponse :**
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

**Exemple :**
```bash
curl http://YOUR_DEVICE_IP:8889/v1/models
```

---

### POST /v1/chat/completions

Point d'accès de complétion de discussion compatible OpenAI. Remplacement direct pour les apps faites pour l'API OpenAI. Aucune clé d'API n'est requise. Si le client exige un en-tête `Authorization`, mets un texte de remplacement non vide.

**Corps de la requête :**
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

Le `assistant` facultatif se comporte comme sur `POST /api/chat` (assistants locaux seulement ; `assistant_not_found` s'il manque).

**Réponse sans flux :**
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

**Réponse en flux (SSE) :**
```
data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{"content":"Hi"},"finish_reason":null}]}

data: {"id":"chatcmpl-...","object":"chat.completion.chunk","created":...,"model":"llama-3.2-1b.gguf","choices":[{"index":0,"delta":{},"finish_reason":"stop"}]}

data: [DONE]
```

**Exemple :**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "messages": [{"role": "user", "content": "Hi"}], "stream": false}'
```

---

## Historique de discussion

### GET /api/chats

Liste toutes les discussions enregistrées (sans les messages).

**Réponse :**
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

**Exemple :**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats
```

---

### POST /api/chats

Crée une nouvelle discussion.

**Corps de la requête :**
```json
{
  "title": "My Conversation",
  "messages": [
    {"role": "user", "content": "Hello"},
    {"role": "assistant", "content": "Hi there!"}
  ]
}
```

**Réponse (201) :**
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

**Paramètres :**
- `title` (chaîne, facultatif) : titre de la discussion
- `messages` (tableau, facultatif) : messages de départ

---

### GET /api/chats/:id

Récupère une discussion précise, avec tous les messages.

**Réponse :**
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

**Exemple :**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### DELETE /api/chats/:id

Supprime une discussion.

**Réponse :**
```json
{
  "status": "deleted",
  "chatId": "chat-abc123"
}
```

**Exemple :**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123
```

---

### GET /api/chats/:id/messages

Récupère seulement les messages d'une discussion.

**Réponse :**
```json
{
  "messages": [
    {"id": "msg-1", "role": "user", "content": "Hello"},
    {"id": "msg-2", "role": "assistant", "content": "Hi there!"}
  ]
}
```

**Exemple :**
```bash
curl http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages
```

---

### POST /api/chats/:id/messages

Ajoute un ou plusieurs messages à une discussion existante.

**Corps de la requête :**
```json
{
  "messages": [
    {"role": "user", "content": "Follow-up question"}
  ]
}
```

**Réponse (201) :**
```json
{
  "messages": [
    {"id": "msg-3", "role": "user", "content": "Follow-up question"}
  ]
}
```

**Exemple :**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/chats/chat-abc123/messages \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Follow-up"}]}'
```

---

## Gestion des modèles

### GET /api/tags

Liste tous les modèles enregistrés sur l'appareil.

**Réponse :**
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

**Exemple :**
```bash
curl http://YOUR_DEVICE_IP:8889/api/tags
```

---

### GET /api/ps

Liste les modèles actuellement chargés (en mémoire).

**Réponse :**
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

S'il n'y a pas de modèle chargé, `models` est un tableau vide.

**Exemple :**
```bash
curl http://YOUR_DEVICE_IP:8889/api/ps
```

---

### POST /api/show

Récupère le détail d'un modèle, y compris les métadonnées GGUF et les réglages actuels.

**Corps de la requête** (utilise `name`, `model` ou `path`) :
```json
{
  "model": "llama-3.2-1b"
}
```

**Réponse :**
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

**Exemple :**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/show \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b"}'
```

---

### POST /api/pull

Télécharge un modèle depuis une URL directement sur l'appareil.

**Corps de la requête :**
```json
{
  "url": "https://huggingface.co/model.gguf",
  "model": "my-custom-model"
}
```

**Réponse :**
```json
{
  "status": "downloading",
  "model": "my-custom-model",
  "downloadId": "download-abc123"
}
```

Le téléchargement se fait en arrière-plan. Utilise `GET /api/tags` pour voir quand le modèle apparaît.

**Exemple :**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/pull \
  -H "Content-Type: application/json" \
  -d '{"url": "https://huggingface.co/model.gguf", "model": "my-model"}'
```

---

### POST /api/copy

Copie un fichier de modèle existant sous un nouveau nom.

**Corps de la requête :**
```json
{
  "source": "llama-3.2-1b",
  "destination": "llama-3.2-1b-backup"
}
```

**Réponse :**
```json
{
  "status": "copied",
  "source": "llama-3.2-1b.gguf",
  "destination": "llama-3.2-1b-backup.gguf"
}
```

Renvoie `409` si le nom de destination existe déjà. Les modèles externes ne peuvent pas être copiés.

**Exemple :**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/copy \
  -H "Content-Type: application/json" \
  -d '{"source": "llama-3.2-1b", "destination": "llama-backup"}'
```

---

### DELETE /api/delete

Supprime un modèle du stockage local.

**Corps de la requête** (utilise `name` ou `path`) :
```json
{
  "name": "llama-3.2-1b"
}
```

**Réponse :**
```json
{
  "success": true
}
```

**Exemple :**
```bash
curl -X DELETE http://YOUR_DEVICE_IP:8889/api/delete \
  -H "Content-Type: application/json" \
  -d '{"name": "old-model"}'
```

---

### POST /api/models

Fait les opérations de cycle de vie d'un modèle.

**Corps de la requête :**
```json
{
  "action": "load",
  "model": "llama-3.2-1b"
}
```

**Actions disponibles :**

| Action | Description | Champ `model` |
|--------|-------------|---------------|
| `load` | Charge un modèle en mémoire | Obligatoire : nom ou chemin du modèle |
| `unload` | Libère le modèle actuellement chargé | Non utilisé |
| `reload` | Réinitialise le modèle actuellement chargé | Non utilisé |
| `refresh` | Relit le stockage et recharge la liste des modèles | Non utilisé |

**Réponse (`load`) :**
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

**Réponse (`refresh`) :**
```json
{
  "status": "refreshed",
  "count": 3,
  "models": [...]
}
```

**Exemple :**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models \
  -H "Content-Type: application/json" \
  -d '{"action": "load", "model": "llama-3.2-1b"}'
```

---

### GET /api/models/apple-foundation

Vérifie si le modèle Apple Foundation est disponible et prêt (iOS seulement).

**Réponse :**
```json
{
  "available": true,
  "requirementsMet": true,
  "enabled": true,
  "status": "ready",
  "message": "Apple Foundation is ready to use."
}
```

| `status` | Sens |
|----------|---------|
| `ready` | Disponible et activé. Utilise `model: "apple-foundation"` dans les requêtes |
| `configure` | Pas disponible ou pas activé. Le détail est dans `message` |

**Exemple :**
```bash
curl http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### POST /api/models/apple-foundation

Vérifie qu'Apple Foundation peut traiter les requêtes. Renvoie une erreur s'il n'est pas disponible, si les conditions manquent, ou si la fonction n'est pas activée dans les réglages.

**Réponse (prêt) :**
```json
{
  "status": "ready"
}
```

**Réponses d'erreur :**
- `501`, `apple_foundation_unavailable` : l'appareil ne prend pas en charge Apple Intelligence
- `428`, `requirements_not_met` : l'appareil doit être mis à jour
- `409`, `apple_foundation_disabled` : active-le d'abord dans les réglages

**Exemple :**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/models/apple-foundation
```

---

### GET /api/version

Récupère la version actuelle de l'application.

**Réponse :**
```json
{
  "version": "0.8.3"
}
```

**Exemple :**
```bash
curl http://YOUR_DEVICE_IP:8889/api/version
```

---

## RAG et embeddings

### POST /api/embeddings

Produit des embeddings (le texte devient des nombres, pour le retrouver) pour un ou plusieurs textes avec un modèle local.

**Corps de la requête :**
```json
{
  "model": "llama-3.2-1b",
  "input": "The quick brown fox jumps over the lazy dog"
}
```

Passe un tableau pour traiter plusieurs textes dans une seule requête :
```json
{
  "model": "llama-3.2-1b",
  "input": ["First text", "Second text"]
}
```

**Réponse :**
```json
{
  "embeddings": [
    [0.123, -0.456, 0.789, "..."]
  ],
  "model": "llama-3.2-1b.gguf"
}
```

**Paramètres :**
- `model` (chaîne, obligatoire) : modèle local utilisé pour l'embedding
- `input` (chaîne ou tableau, obligatoire) : texte(s) à transformer. Accepté aussi comme `prompt` ou `text`.

**Exemple :**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/embeddings \
  -H "Content-Type: application/json" \
  -d '{"model": "llama-3.2-1b", "input": "Sample text"}'
```

---

### POST /api/files/ingest

Met du contenu dans le RAG. Texte brut, un chemin de fichier sur l'appareil, ou plusieurs chemins.

**Corps de la requête (texte brut) :**
```json
{
  "content": "Document content to store for RAG...",
  "fileName": "my-doc.txt"
}
```

**Corps de la requête (un chemin de fichier) :**
```json
{
  "filePath": "/path/to/doc.txt"
}
```

**Corps de la requête (plusieurs chemins) :**
```json
{
  "files": ["/path/to/doc1.txt", "/path/to/doc2.txt"]
}
```

**Réponse :**
```json
{
  "status": "stored",
  "documentId": "1700000000000-abc123",
  "fileName": "my-doc.txt",
  "model": null
}
```

**Paramètres :**
- `content` (chaîne) : texte brut *(obligatoire si `filePath` et `files` sont absents)*
- `filePath` (chaîne, facultatif) : chemin absolu d'un fichier sur l'appareil
- `files` (tableau, facultatif) : tableau de chemins absolus
- `fileName` (chaîne, facultatif) : nom affiché du document (par défaut : `"uploaded.txt"`)
- `chatId` (chaîne, facultatif) : associe le document à une discussion
- `provider` (chaîne, facultatif) : fournisseur d'embedding RAG
- `rag` (booléen, facultatif) : `false` pour sauter l'indexation RAG (par défaut : `true`)

**Exemple :**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Machine learning is a subset of AI...", "fileName": "ml-intro.txt"}'
```

---

### GET /api/rag

Récupère l'état actuel du RAG.

**Réponse :**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 3
}
```

**Exemple :**
```bash
curl http://YOUR_DEVICE_IP:8889/api/rag
```

---

### POST /api/rag

Règle le RAG (activer ou désactiver, type de stockage, ou initialisation).

**Corps de la requête :**
```json
{
  "enabled": true,
  "storage": "persistent",
  "initialize": true
}
```

**Réponse :**
```json
{
  "enabled": true,
  "ready": true,
  "storage": "persistent",
  "documentCount": 0
}
```

**Paramètres :**
- `enabled` (booléen, facultatif) : activer ou désactiver le RAG
- `storage` (chaîne, facultatif) : `"memory"` ou `"persistent"`
- `initialize` (booléen, facultatif) : lancer l'initialisation du RAG
- `provider` (chaîne, facultatif) : fournisseur d'embedding pour l'initialisation

**Exemple :**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag \
  -H "Content-Type: application/json" \
  -d '{"enabled": true, "storage": "persistent"}'
```

---

### POST /api/rag/reset

Efface tous les documents déjà mis dans le RAG.

**Réponse :**
```json
{
  "status": "cleared",
  "enabled": true,
  "ready": false,
  "documentCount": 0
}
```

**Exemple :**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/rag/reset
```

---

## Serveur et réglages

### GET /api/status

Récupère l'état du serveur, le modèle actif et l'état du RAG.

**Réponse :**
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

**Exemple :**
```bash
curl http://YOUR_DEVICE_IP:8889/api/status
```

---

### POST /api/settings/thinking

Active ou désactive le mode réflexion (réfléchir plus longtemps avant de répondre) pour le modèle actuellement chargé.

**Corps de la requête :**
```json
{
  "enabled": true
}
```

**Réponse :**
```json
{
  "status": "updated",
  "enabled": true
}
```

**Paramètres :**
- `enabled` (booléen, obligatoire) : activer ou désactiver le mode réflexion

**Exemple :**
```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/settings/thinking \
  -H "Content-Type: application/json" \
  -d '{"enabled": true}'
```

---

## Gestion des erreurs

Tous les points d'accès renvoient des codes HTTP standards, et un corps JSON en cas d'erreur.

**Codes de succès :**
- `200 OK`
- `201 Created`

**Codes d'erreur :**
- `400 Bad Request` : paramètre manquant ou invalide
- `404 Not Found` : la ressource n'existe pas
- `405 Method Not Allowed`
- `409 Conflict` : la condition préalable n'est pas remplie (par exemple les modèles distants sont désactivés)
- `422 Unprocessable Entity` : requête valide, mais l'action est impossible (par exemple clé d'API absente)
- `500 Internal Server Error`
- `503 Service Unavailable` : le modèle n'est pas chargé

**Format de la réponse d'erreur :**
```json
{
  "error": "error_code"
}
```

---

## Sécurité

- Ce serveur est prévu pour le réseau local seulement
- Aucune connexion n'est requise (protégé par l'isolement du réseau)
- CORS est activé pour toutes les origines
- Avant d'ouvrir le serveur au-delà de ton réseau local, pense à un VPN ou à un pare-feu

---

## Limite de débit

Aucune limite de débit. Les performances dépendent du CPU, de la mémoire, de la taille du modèle et du nombre de connexions en même temps.

---

## Cas courants

### Discuter avec un modèle local

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

### Mettre un document et vérifier l'état du RAG

```bash
curl -X POST http://YOUR_DEVICE_IP:8889/api/files/ingest \
  -H "Content-Type: application/json" \
  -d '{"content": "Your document content here...", "fileName": "doc.txt"}'

curl http://YOUR_DEVICE_IP:8889/api/rag
```

### Gestion des modèles

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

## Exemples d'applications

### InferrLM CLI

InferrLM CLI est un outil en ligne de commande fait avec React, Ink et TypeScript. Il se connecte à ton serveur InferrLM et discute dans le terminal, avec les réponses au fil de l'eau et l'historique.

Code source : [github.com/sbhjt-gr/inferra-cli](https://github.com/sbhjt-gr/inferra-cli)

---

## Autres ressources

- [Dépôt GitHub InferrLM](https://github.com/sbhjt-gr/inferra)
- [Outil CLI InferrLM](https://github.com/sbhjt-gr/inferra-cli)
- [Guide de contribution](CONTRIBUTING.fr.md)
- [Licence](../LICENSE)

---

**Dernière mise à jour** : 20 mars 2026  
**Version de l'API** : 0.8.3
