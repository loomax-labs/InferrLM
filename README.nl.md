[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Nederlands](README.nl.md)

## InferrLM (eerder Inferra)
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

InferrLM is een app die grote en kleine modellen rechtstreeks op je Android- of iOS-telefoon zet. Je telefoon kan ook als server in je lokale netwerk werken. Cloudmodellen zoals Claude, Gemini en ChatGPT worden ook ondersteund. Bij modellen op de telefoon kun je bestanden meesturen, ook met RAG (de app zoekt de passende stukken in je bestanden en laat het model daarmee antwoorden).

<p>
  <a href="https://play.google.com/store/apps/details?id=com.gorai.ragionare"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" width="178" style="vertical-align:middle"></a>
  <a href="https://apps.apple.com/us/app/inferra/id6754396856"><img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" width="164" style="vertical-align:middle"></a>
</p>

## Inhoud

- [Demo](#demo)
- [Functies](#functies)
  - [Op deze telefoon](#op-deze-telefoon)
  - [Beelden en tekst](#beelden-en-tekst)
  - [Documenten en RAG](#documenten-en-rag)
  - [Lokale server](#lokale-server)
  - [Modellen beheren](#modellen-beheren)
  - [Chat](#chat)
  - [Wat je nodig hebt](#wat-je-nodig-hebt)
  - [Installatie](#installatie)
- [REST API](#rest-api)
  - [Server starten](#server-starten)
- [Opdrachtregel](#opdrachtregel)
  - [API-documentatie](#api-documentatie)
- [Licentie](#licentie)
- [Meedoen](#meedoen)
- [Techniek](#techniek)
- [Dank](#dank)
- [Stergeschiedenis](#stergeschiedenis)

## Demo

De demo's laten het Apple Foundation Model zien, en het downloaden van MLX-modellen van HuggingFace om ze op het apparaat te draaien.

<p>
  <img src="assets/demo_1.gif" alt="Demo 1" height="350">
  <img src="assets/demo_2.gif" alt="Demo 2" height="350">
</p>

## Functies

### Op deze telefoon
- Lokaal draaien via llama.cpp met GGUF-modellen op Android en iOS.
- Lokaal MLX op Apple Silicon-apparaten.
- Koppeling met cloudmodellen van OpenAI, Gemini en Anthropic. Voor modellen op afstand heb je je eigen API-sleutels en een InferrLM-account nodig. Die modellen zijn optioneel.
- Je kunt het basisadres aanpassen voor diensten die bij OpenAI passen, zoals OpenRouter, Groq, Ollama, LM Studio en Together AI. Zo gebruik je in de app andere adressen.
- Apple Foundation Model op apparaten met Apple Intelligence.

### Beelden en tekst
- Modellen die tekst en beelden lezen, kunnen foto's bekijken met het bijpassende projector-bestand (mmproj). Meer daarover [hier](https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md).
- De ingebouwde camera maakt foto's in de app en stuurt ze naar modellen.

### Documenten en RAG
- RAG helpt het model documenten beter te lezen en te antwoorden met de passende inhoud.
- Je kunt bestanden meesturen. De app leest de tekst lokaal, pagina voor pagina, met OCR, en stuurt die naar het model op de telefoon.
- Documenten worden verwerkt en geïndexeerd, zodat je ze tijdens de chat sneller terugvindt.
- Bij modellen op afstand kun je bestanden direct uploaden.

### Lokale server
- Een ingebouwde HTTP-server biedt REST-API's, zodat apparaten op hetzelfde netwerk bij je modellen kunnen. Je start hem op het tabblad Server. Met een URL deel je de InferrLM-chat met computers, tablets of andere telefoons.
- De volledige API-documentatie staat [hier](docs/REST_APIs.md) en op de startpagina van de server.
- Een opdrachtregelhulpmiddel op [github.com/sbhjt-gr/InferrLM-CLI](https://github.com/sbhjt-gr/InferrLM-CLI) laat zien hoe je zelf apps bouwt met deze API.

### Modellen beheren
- De download haalt modellen rechtstreeks van HuggingFace. Een korte lijst voor telefoons staat bij Modellen, op het tabblad Modellen downloaden.
- Gedownloade modellen verschijnen in de modelkiezer van de chat en op het tabblad Opgeslagen modellen.
- Je kunt modellen uit de opslag importeren of direct via een URL downloaden.

### Chat
- Berichten kun je bewerken, opnieuw laten maken, kopiëren en als Markdown tonen.
- Snelle native Markdown met formules via `react-native-nitro-markdown`, een C++-renderer op de Nitro Modules-brug.
- Elke chatballon kan een aftakking starten. De oorspronkelijke draad blijft, zodat je een andere richting kunt proberen.
- Code van het model staat in blokken en kun je kopiëren.
- Je kunt de chatgeschiedenis beheren en gesprekken vastzetten.

Wil je meedoen of de app lokaal starten, volg dan de gids hieronder. Je wijzigingen moeten de <a href="https://github.com/sbhjt-gr/InferrLM/blob/main/LICENSE">LICENSE</a> volgen.

### Wat je nodig hebt

- Node.js (>= 16.0.0, < 23.0.0)
- npm of yarn
- Expo CLI
- Android Studio (voor Android)
- Xcode (voor iOS)

### Installatie

1. **Repository klonen**
   ```bash
   git clone https://github.com/sbhjt-gr/InferrLM
   cd InferrLM
   ```

2. **Afhankelijkheden installeren**
   ```bash
   yarn install
   ```

3. **Omgevingsvariabelen instellen**
  Vul je API-sleutels en backendinstellingen in. De lijst staat in [app.config.json](app.config.js).

4. **Starten op een apparaat of emulator**
   ```bash
   # For Android
   npx expo run:android
   
   # For iOS
   npx expo run:ios
   ```

## REST API

InferrLM heeft een ingebouwde HTTP-server die de modellen via de OpenAI-API beschikbaar maakt. Apparaten op hetzelfde netwerk kunnen zo bij de modellen op je telefoon. Je kunt InferrLM koppelen aan andere apps, scripts of diensten.

### Server starten

1. Open de InferrLM-app
2. Ga naar het tabblad Server
3. Zet de server aan
4. Het serveradres verschijnt (meestal `http://YOUR_DEVICE_IP:8889`)

## Opdrachtregel

InferrLM-CLI is een terminalclient. Hij maakt verbinding met je InferrLM-server en chat rechtstreeks vanaf de opdrachtregel. Het is een hulpmiddel en meteen een voorbeeld voor wie zelf apps bouwt met de REST-API.

De CLI is gebouwd met React en Ink: antwoorden terwijl ze binnenkomen, gespreksgeschiedenis, en een instelling in gesprek. Broncode en installatie staan op [github.com/sbhjt-gr/InferrLM-CLI](https://github.com/sbhjt-gr/InferrLM-CLI).

Start eerst de InferrLM-server op je telefoon, installeer daarna het hulpmiddel en volg de uitleg in die repository.


### API-documentatie

Als de server draait, open je het serveradres in een browser. De documentatie bevat:

- chat- en completion-eindpunten
- modelbeheer
- RAG- en embedding-API's
- serverinstellingen en status

De uitgebreide referentie staat in de [REST API-documentatie](docs/REST_APIs.md).

## Licentie

Dit project wordt verspreid onder de AGPL-3.0-licentie. Lees die [hier](https://github.com/sbhjt-gr/InferrLM/blob/main/LICENSE). Wijzigingen moeten de regels van deze LICENSE volgen.

## Meedoen

Bijdragen zijn welkom. Je vindt onderwerpen op het tabblad [issues](https://github.com/sbhjt-gr/InferrLM/issues), of je opent nieuwe en begint.

Lees de [bijdragegids](docs/CONTRIBUTING.md) voor de werkwijze, coderegels en gewone praktijk.

## Techniek

- **Framework**: React Native 0.81 met Expo 54 (nieuwe architectuur)
- **App-taal**: TypeScript, JavaScript
- **iOS-modules**: Swift
- **Android-modules**: Kotlin
- **Uitvoering**: C, C++
- **Navigatie**: React Navigation
- **Database**: OP-SQLite, Expo SQLite

## Dank

- [llama.cpp](https://github.com/ggerganov/llama.cpp) - De motor voor lokale GGUF-modellen op Android en iOS.
- [mlx-swift-lm](https://github.com/ml-explore/mlx-swift-lm) - Swift-bibliotheek voor MLX-taalmodellen op Apple Silicon. Die drijft de MLX-backend op iOS aan.
- [inferrlm-llama.rn](https://github.com/sbhjt-gr/inferra-llama.rn) - De aangepaste React Native-adapter voor llama.cpp. Oorspronkelijk afgesplitst van [llama.rn](https://github.com/mybigday/llama.rn), zodat llama.cpp vaker bijgewerkt kan worden.
- [@inferrlm/react-native-mlx](https://github.com/sbhjt-gr/react-native-nitro-mlx) - MLX-motor voor Apple Silicon op iOS, via de Nitro Modules-brug. Afgesplitst en bijgehouden vanaf [react-native-nitro-mlx](https://github.com/corasan/react-native-nitro-mlx).
- [react-native-nitro-markdown](https://github.com/sbhjt-gr/react-native-nitro-markdown) - Native C++ Markdown-renderer voor React Native, voor snelle chatberichten.
- [react-native-rag](https://github.com/software-mansion-labs/react-native-rag) + [@langchain/textsplitters](https://github.com/langchain-ai/langchainjs) - RAG voor React Native. Daarmee zoekt en verwerkt de app documenten met LangChain.
- [react-native-ai](https://github.com/callstackincubator/ai) - De adapter naar het Apple Foundation Model via de Swift-API.
- Denk je dat jouw naam hier ook hoort, laat het weten.

## Stergeschiedenis

[![Star History Chart](https://api.star-history.com/svg?repos=sbhjt-gr/InferrLM&type=Date)](https://star-history.com/#sbhjt-gr/InferrLM&Date)

---

<p align="center">
  <sub>Geef deze repository een ster als je hem nuttig vindt.</sub>
</p>
