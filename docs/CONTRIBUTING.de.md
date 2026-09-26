[English](CONTRIBUTING.md) | [简体中文](CONTRIBUTING.zh-CN.md) | [繁體中文](CONTRIBUTING.zh-TW.md) | [日本語](CONTRIBUTING.ja.md) | [한국어](CONTRIBUTING.ko.md) | [Deutsch](CONTRIBUTING.de.md) | [Français](CONTRIBUTING.fr.md) | [Nederlands](CONTRIBUTING.nl.md)

# Bei InferrLM mitmachen

Danke, dass du bei InferrLM mitmachen willst. Diese Anleitung zeigt, wie du sinnvoll beitragen kannst.

## Anfang

### Aufgaben finden

Beiträge sind willkommen. Gemeldete Fehler und Funktionswünsche stehen unter [Issues](https://github.com/sbhjt-gr/inferra/issues).

**Bevor du anfängst:**
1. Schau in den Issues nach etwas, das du machen willst
2. Schreib einen Kommentar zu dem Issue und fang an

### Neue Funktionen vorschlagen

Wenn du eine eigene Funktion bauen willst, öffne zuerst ein Issue und beschreibe die Idee klar. Dein Vorschlag sollte erklären:

- **Was die Funktion ist**: Eine klare Beschreibung dessen, was du hinzufügen willst
- **Warum sie nützlich ist**: Welches Problem sie löst oder welchen Nutzen sie hat
- **Wie du sie bauen willst**: Dein technischer Weg und nötige Abhängigkeiten oder Änderungen

Nach der Diskussion wird dir das Issue zugewiesen, und du kannst anfangen.

## Code-Regeln

### Qualität und Stil

#### Keine Emojis
Benutze keine Emojis in Code, Kommentaren, Commit-Nachrichten oder Text, den Nutzer sehen. Das wirkt unprofessionell und kann Zeichenprobleme machen. Schreib klaren Text.

```typescript
// Bad
console.log('Model loaded successfully! 🎉');

// Good
console.log('Model loaded successfully');

// Good
console.log('model_load_success');
```

#### Kommentare mit Grund
Kommentare sollen erklären, warum der Code so ist, nicht was er tut. Der Code selbst soll zeigen, was er tut.

```typescript
// Bad - stating the obvious
// Set the temperature to 0.7
const temperature = 0.7;

// Good - explaining the reasoning
// Use 0.7 temperature as a balance between creativity and coherence
// Lower values caused repetitive outputs in testing
const temperature = 0.7;
```

### Übliche Praxis bei React und React Native

#### useEffect nur wenn nötig
Benutze `useEffect` nur, wenn es wirklich nötig ist. Die meisten Fälle, in denen man zu `useEffect` greift, gehen mit einem besseren Muster.

**Wann du useEffect nicht benutzt:**
- Daten für die Anzeige umformen (nimm Variablen oder `useMemo`)
- Nutzeraktionen behandeln (nimm Event-Handler)
- Zustand zurücksetzen, wenn Props sich ändern (nimm die `key`-Prop oder rechne beim Rendern)
- Zustand aus Props oder Zustand neu setzen (rechne beim Rendern)

```typescript
// Bad - unnecessary useEffect
const [filteredModels, setFilteredModels] = useState([]);

useEffect(() => {
  setFilteredModels(models.filter(m => m.size < maxSize));
}, [models, maxSize]);

// Good - calculate during render
const filteredModels = models.filter(m => m.size < maxSize);
```

**Wann du useEffect benutzt:**
- Abgleich mit äußeren Systemen (APIs, DOM, fremde Bibliotheken)
- Aufräumen, das beim Aushängen der Komponente passieren muss
- Abos oder Event-Listener einrichten

```typescript
// Good use of useEffect - external system synchronization
useEffect(() => {
  const subscription = modelDownloader.on('progress', handleProgress);
  
  return () => {
    subscription.unsubscribe();
  };
}, []);
```

#### Komponenten aufteilen
Halte Komponenten fokussiert und nach Möglichkeit unter 1000 Zeilen. Teile große Komponenten in kleinere, wiederverwendbare Teile.

### TypeScript

### Dateinamen und Ort

#### Namen
- Komponenten: PascalCase (zum Beispiel `ChatMessage.tsx`)
- Hilfsfunktionen: camelCase (zum Beispiel `formatMessage.ts`)
- Services: PascalCase (zum Beispiel `ModelDownloader.ts`)
- Typen: PascalCase (zum Beispiel `types/chat.ts`)

#### Ablage
Lege Dateien nach ihrem Zweck ab:
- UI-Komponenten → `src/components/`
- Fachlogik → `src/services/`
- Hilfsfunktionen → `src/utils/`
- Typdefinitionen → `src/types/`
- React-Hooks → `src/hooks/`

### Manuell prüfen
Bevor du den PR schickst:
1. Teste auf iOS und Android, wenn die Änderung beide betrifft
2. Teste mit verschiedenen Modellen und Einstellungen
3. Achte bei langen Läufen auf Speicherlecks
4. Prüfe die Oberfläche auf verschiedenen Bildschirmgrößen

## Herkunft im Code

Wenn du Code beiträgst, vor allem bei großen Funktionen oder komplexen Stellen, setze einen Herkunftskommentar. Das hilft bei:
- Anerkennung für die Beitragenden
- Kontext für spätere Pflege
- einer Spur der Beiträge aus der Community

### Format

Setze den Kommentar oben in neue Dateien oder vor große Blöcke:

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

Bei kleinen Beiträgen oder Änderungen an bestehendem Code:

```typescript
// Enhanced error handling for streaming responses
// Contributed by: @username (https://github.com/username)
function handleStreamError(error: Error) {
  // Implementation
}
```

### Was hineingehört
- Dein GitHub-Name mit Link zum Profil
- Die Issue-Nummer, falls es eine gibt
- Eine kurze Beschreibung, was der Code tut (weglassen, wenn es aus dem Kontext klar ist)

Das steht zusätzlich zur Git-Historie und macht Beiträge direkt im Code sichtbar.

## Git-Ablauf

### Commit-Nachrichten
Schreib klare, kurze Commit-Nachrichten in diesem Format:

```
type(scope): brief description

Longer explanation if needed

Fixes #123
```

Typen:
- `feat`: Neue Funktion
- `fix`: Fehlerbehebung
- `docs`: Änderung an der Dokumentation
- `refactor`: Umbau ohne geändertes Verhalten
- `test`: Tests hinzufügen oder ändern
- `chore`: Pflege

Beispiele:
```
feat(rag): add document ingestion endpoint
fix(server): resolve buffer encoding in streaming
docs(api): add embeddings endpoint documentation
refactor(tcp): extract model operations to separate file
```

### Pull-Request-Ablauf

1. **Fork und Klon**: Forke das Repository und klone es lokal
2. **Branch**: Lege einen Branch für die Funktion oder den Fix an
3. **Änderungen**: Setze sie nach diesen Regeln um
4. **Test**: Teste gründlich
5. **Commit**: Mach saubere, logische Commits mit guten Nachrichten
6. **Push**: Schiebe den Branch in deinen Fork
7. **Pull Request**: Öffne einen PR gegen den Branch `main`

#### PR-Beschreibung
Dein Pull Request sollte enthalten:
- Einen klaren Titel zur Änderung
- Was geändert wurde und warum
- Verweis auf verwandte Issues, falls vorhanden

## Lizenz

Wenn du zu InferrLM beiträgst, stimmst du zu, dass deine Beiträge unter der AGPL-3.0-Lizenz stehen.

Danke, dass du bei InferrLM mitmachst.
