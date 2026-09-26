[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Nederlands](README.nl.md)

## InferrLM (früher Inferra)
<!-- version-badges:start -->
<p>
  <a href="https://github.com/sbhjt-gr/InferrLM/blob/main/app.config.js"><img src="https://img.shields.io/badge/Codebase-0.9.0_%C2%B7_2026--09--27-6a1b9a" alt="Codebase 0.9.0, last commit 2026-09-27"></a>
  <a href="https://play.google.com/store/apps/details?id=com.gorai.ragionare"><img src="https://img.shields.io/badge/Play_Store-0.8.6_%C2%B7_2026--03--29_%C2%B7_182d_behind-e05d44?logo=googleplay&logoColor=white" alt="Google Play 0.8.6, updated 2026-03-29, 182d behind the codebase"></a>
  <a href="https://apps.apple.com/us/app/inferrlm/id6754396856"><img src="https://img.shields.io/badge/App_Store-0.8.7_%C2%B7_2026--03--30_%C2%B7_181d_behind-e05d44?logo=apple&logoColor=white" alt="App Store 0.8.7, released 2026-03-30, 181d behind the codebase"></a>
  <a href="https://opensource.org/licenses/AGPL-3.0"><img src="https://img.shields.io/badge/License-AGPL--3.0-orange" alt="License: AGPL-3.0"></a>
</p>
<!-- version-badges:end -->
<p>
  <img src="assets/source/InferrLM-header.jpg" alt="InferrLM Header" width="600">
</p>

InferrLM ist eine App, die große und kleine Modelle direkt auf dein Android- oder iOS-Handy bringt. Dein Handy kann auch als Server im lokalen Netz dienen. Cloud-Modelle wie Claude, Gemini und ChatGPT werden ebenfalls unterstützt. Bei Modellen auf dem Handy kannst du Dateien anhängen, auch mit RAG (die App sucht passende Stellen in deinen Dateien und lässt das Modell damit antworten).

<p>
  <a href="https://play.google.com/store/apps/details?id=com.gorai.ragionare"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" width="178" style="vertical-align:middle"></a>
  <a href="https://apps.apple.com/us/app/inferra/id6754396856"><img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" width="164" style="vertical-align:middle"></a>
</p>

## Inhalt

- [Demo](#demo)
- [Funktionen](#funktionen)
  - [Auf diesem Handy ausführen](#auf-diesem-handy-ausführen)
  - [Bilder und Text](#bilder-und-text)
  - [Dokumente und RAG](#dokumente-und-rag)
  - [Lokaler Server](#lokaler-server)
  - [Modelle verwalten](#modelle-verwalten)
  - [Chat](#chat)
  - [Voraussetzungen](#voraussetzungen)
  - [Installation](#installation)
- [REST API](#rest-api)
  - [Server starten](#server-starten)
- [Kommandozeile](#kommandozeile)
  - [API-Dokumentation](#api-dokumentation)
- [Lizenz](#lizenz)
- [Mitmachen](#mitmachen)
- [Technik](#technik)
- [Danksagung](#danksagung)
- [Star-Verlauf](#star-verlauf)

## Demo

Die Demos zeigen das Apple Foundation Model und das Herunterladen von MLX-Modellen von HuggingFace, damit sie auf dem Gerät laufen.

<p>
  <img src="assets/demo_1.gif" alt="Demo 1" height="350">
  <img src="assets/demo_2.gif" alt="Demo 2" height="350">
</p>

## Funktionen

### Auf diesem Handy ausführen
- Lokale Ausführung über llama.cpp mit GGUF-Modellen auf Android und iOS.
- Lokale MLX-Ausführung auf Apple-Silicon-Geräten.
- Anbindung an Cloud-Modelle von OpenAI, Gemini und Anthropic. Für entfernte Modelle brauchst du eigene API-Schlüssel und ein InferrLM-Konto. Entfernte Modelle sind optional.
- Du kannst die Basis-URL für OpenAI-kompatible Anbieter ändern, zum Beispiel OpenRouter, Groq, Ollama, LM Studio und Together AI. So erreichst du in der App andere Endpunkte.
- Apple Foundation Model auf Geräten mit Apple Intelligence.

### Bilder und Text
- Modelle, die Text und Bilder verstehen, können mit der passenden Projektor-Datei (mmproj) Bilder lesen. Mehr dazu [hier](https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md).
- Die eingebaute Kamera nimmt Fotos in der App auf und schickt sie an Modelle.

### Dokumente und RAG
- RAG hilft dem Modell, Dokumente besser zu verstehen und Antworten mit dem passenden Inhalt zu geben.
- Dateien kannst du anhängen. Die App liest den Text lokal per OCR von allen Seiten und schickt ihn an das Modell auf dem Handy.
- Dokumente werden verarbeitet und indexiert, damit du sie im Chat schneller findest.
- Bei entfernten Modellen kannst du Dateien direkt hochladen.

### Lokaler Server
- Ein eingebauter HTTP-Server stellt REST-APIs bereit, damit Geräte im selben Netz auf deine Modelle zugreifen. Du startest ihn im Tab Server. Über eine URL teilst du die InferrLM-Chatoberfläche mit Computern, Tablets oder anderen Handys.
- Die vollständige API-Dokumentation liegt [hier](docs/REST_APIs.md) und auf der Startseite des Servers.
- Ein Kommandozeilen-Werkzeug unter [github.com/sbhjt-gr/InferrLM-CLI](https://github.com/sbhjt-gr/InferrLM-CLI) zeigt, wie du eigene Programme mit der API baust.

### Modelle verwalten
- Der Download holt Modelle direkt von HuggingFace. Eine kurze Liste für Handys findest du unter Modelle, im Tab „Modelle herunterladen“.
- Heruntergeladene Modelle erscheinen in der Modellauswahl im Chat und im Tab „Gespeicherte Modelle“.
- Du kannst Modelle aus dem Speicher importieren oder direkt über eine URL laden.

### Chat
- Nachrichten kannst du bearbeiten, neu erzeugen, kopieren und als Markdown anzeigen.
- Schnelles natives Markdown mit Formeln über `react-native-nitro-markdown`, einen C++-Renderer auf der Nitro-Modules-Brücke.
- Jede Sprechblase kann eine neue Abzweigung starten. Der ursprüngliche Verlauf bleibt, du kannst eine andere Richtung ausprobieren.
- Code aus dem Modell steht in Blöcken und lässt sich kopieren.
- Den Chatverlauf kannst du verwalten und Unterhaltungen anheften.

Wenn du mitmachen oder die App lokal starten willst, folge der Anleitung unten. Änderungen müssen die <a href="https://github.com/sbhjt-gr/InferrLM/blob/main/LICENSE">LICENSE</a> einhalten.

### Voraussetzungen

- Node.js (>= 16.0.0, < 23.0.0)
- npm oder yarn
- Expo CLI
- Android Studio (für Android)
- Xcode (für iOS)

### Installation

1. **Repository klonen**
   ```bash
   git clone https://github.com/sbhjt-gr/InferrLM
   cd InferrLM
   ```

2. **Abhängigkeiten installieren**
   ```bash
   yarn install
   ```

3. **Umgebungsvariablen setzen**
  Trage API-Schlüssel und Backend-Einstellungen ein. Die Liste steht in [app.config.json](app.config.js).

4. **Auf Gerät oder Emulator starten**
   ```bash
   # For Android
   npx expo run:android
   
   # For iOS
   npx expo run:ios
   ```

## REST API

InferrLM enthält einen HTTP-Server, der die Modelle über die OpenAI-API bereitstellt. Geräte im selben Netz können so auf die Modelle auf deinem Handy zugreifen. Du kannst InferrLM mit anderen Apps, Skripten oder Diensten verbinden.

### Server starten

1. Öffne die InferrLM-App
2. Gehe zum Tab Server
3. Schalte den Server ein
4. Die Server-URL wird angezeigt (meist `http://YOUR_DEVICE_IP:8889`)

## Kommandozeile

InferrLM-CLI ist ein Terminal-Client. Er verbindet sich mit deinem InferrLM-Server und chattet direkt in der Kommandozeile. Er ist ein Werkzeug und zugleich ein Beispiel für Entwickler, die die REST-API nutzen wollen.

Die CLI nutzt React und Ink für eine einfache Terminaloberfläche mit laufenden Antworten, Verlauf und einer Einrichtung im Dialog. Quelltext und Installation findest du unter [github.com/sbhjt-gr/InferrLM-CLI](https://github.com/sbhjt-gr/InferrLM-CLI).

Starte zuerst den InferrLM-Server auf dem Handy, installiere dann das CLI-Werkzeug und folge der Anleitung in dessen Repository.


### API-Dokumentation

Wenn der Server läuft, öffnest du die Server-URL in einem Browser. Die Dokumentation enthält:

- Chat- und Completion-Endpunkte
- Modellverwaltung
- RAG- und Embedding-APIs
- Serverkonfiguration und Status

Die ausführliche Referenz steht in der [REST-API-Dokumentation](docs/REST_APIs.md).

## Lizenz

Dieses Projekt steht unter der AGPL-3.0-Lizenz. Lies sie [hier](https://github.com/sbhjt-gr/InferrLM/blob/main/LICENSE). Änderungen müssen die Regeln dieser LICENSE einhalten.

## Mitmachen

Beiträge sind willkommen. Du findest Aufgaben im Tab [Issues](https://github.com/sbhjt-gr/InferrLM/issues) oder legst neue an und fängst an.

Lies den [Beitragsleitfaden](docs/CONTRIBUTING.md) für Ablauf, Code-Regeln und übliche Praxis.

## Technik

- **Framework**: React Native 0.81 mit Expo 54 (neue Architektur)
- **App-Sprache**: TypeScript, JavaScript
- **iOS-Module**: Swift
- **Android-Module**: Kotlin
- **Ausführung**: C, C++
- **Navigation**: React Navigation
- **Datenbank**: OP-SQLite, Expo SQLite

## Danksagung

- [llama.cpp](https://github.com/ggerganov/llama.cpp) - Die Engine für lokale GGUF-Modelle auf Android und iOS.
- [mlx-swift-lm](https://github.com/ml-explore/mlx-swift-lm) - Swift-Bibliothek für MLX-Sprachmodelle auf Apple Silicon. Sie treibt das MLX-Backend auf iOS an.
- [inferrlm-llama.rn](https://github.com/sbhjt-gr/inferra-llama.rn) - Der angepasste React-Native-Adapter für llama.cpp. Ursprünglich von [llama.rn](https://github.com/mybigday/llama.rn) abgezweigt, damit llama.cpp öfter aktualisiert werden kann.
- [@inferrlm/react-native-mlx](https://github.com/sbhjt-gr/react-native-nitro-mlx) - MLX-Engine für Apple Silicon auf iOS, über die Nitro-Modules-Brücke. Abgezweigt und weitergeführt von [react-native-nitro-mlx](https://github.com/corasan/react-native-nitro-mlx).
- [react-native-nitro-markdown](https://github.com/sbhjt-gr/react-native-nitro-markdown) - Nativer C++-Markdown-Renderer für React Native, für schnelle Chatnachrichten.
- [react-native-rag](https://github.com/software-mansion-labs/react-native-rag) + [@langchain/textsplitters](https://github.com/langchain-ai/langchainjs) - RAG für React Native. Damit sucht und liest die App Dokumente mit LangChain.
- [react-native-ai](https://github.com/callstackincubator/ai) - Der Adapter für das Apple Foundation Model über die Swift-API.
- Wenn du meinst, dass dein Name hier auch stehen sollte, sag Bescheid.

## Star-Verlauf

[![Star History Chart](https://api.star-history.com/svg?repos=sbhjt-gr/InferrLM&type=Date)](https://star-history.com/#sbhjt-gr/InferrLM&Date)

---

<p align="center">
  <sub>Gib dem Repository einen Star, wenn es dir hilft.</sub>
</p>
