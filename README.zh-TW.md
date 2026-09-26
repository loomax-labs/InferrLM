[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Nederlands](README.nl.md)

## InferrLM（以前叫 Inferra）
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

InferrLM 是一款手機軟體，能把大模型和小模型直接放到你的 Android 和 iOS 手機上，也能讓手機當區域網路裡的伺服器。Claude、Gemini、ChatGPT 這類雲端模型也能用。手機上的模型還可以附加檔案，並用 RAG（先找出文件裡相關的內容，再讓模型回答）。

<p>
  <a href="https://play.google.com/store/apps/details?id=com.gorai.ragionare"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" width="178" style="vertical-align:middle"></a>
  <a href="https://apps.apple.com/us/app/inferra/id6754396856"><img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" width="164" style="vertical-align:middle"></a>
</p>

## 目錄

- [示範](#示範)
- [功能](#功能)
  - [在手機上執行](#在手機上執行)
  - [看圖，以及文字和圖片](#看圖以及文字和圖片)
  - [文件處理和 RAG](#文件處理和-rag)
  - [本機伺服器](#本機伺服器)
  - [模型管理](#模型管理)
  - [聊天](#聊天)
  - [準備](#準備)
  - [安裝](#安裝)
- [REST API](#rest-api)
  - [啟動伺服器](#啟動伺服器)
- [命令列](#命令列)
  - [API 文件](#api-文件)
- [授權](#授權)
- [參與貢獻](#參與貢獻)
- [技術](#技術)
- [致謝](#致謝)
- [Star 記錄](#star-記錄)

## 示範

示範會用到 Apple Foundation Model，也會從 HuggingFace 下載 MLX 模型，然後在手機上執行。

<p>
  <img src="assets/demo_1.gif" alt="Demo 1" height="350">
  <img src="assets/demo_2.gif" alt="Demo 2" height="350">
</p>

## 功能

### 在手機上執行
- 透過 llama.cpp 在 Android 和 iOS 上執行本機 GGUF（一種模型檔案格式）。
- Apple Silicon 裝置可以在本機跑 MLX。
- 可以接上 OpenAI、Gemini、Anthropic 的雲端模型。遠端模型需要你自己的 API 金鑰，以及 InferrLM 帳號。不用遠端模型也完全可以。
- 可以改相容 OpenAI 的服務的基礎網址，例如 OpenRouter、Groq、Ollama、LM Studio、Together AI。這樣就能在軟體裡換成別的介面位址。
- 支援 Apple Intelligence 的裝置可以用 Apple Foundation 模型。

### 看圖，以及文字和圖片
- 能看文字和圖片的模型，配上對應的 projector（mmproj）檔案，就可以看圖。更多說明見 [這裡](https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md)。
- 軟體裡自帶相機，可以直接拍照，再傳給模型。

### 文件處理和 RAG
- 支援 RAG，讓模型更好看懂文件，回答時能用上相關內容。
- 可以附加檔案。內建的文件擷取會在本機對每一頁做 OCR，把文字抽出來傳給手機上的模型。
- 文件入庫會處理檔案並建立索引，聊天時能更快找到內容。
- 遠端模型支援直接上傳檔案。

### 本機伺服器
- 內建 HTTP 伺服器，用 REST API（透過網路請求呼叫的介面）讓同一網路裡的裝置存取你的模型。在「伺服器」頁就能啟動。用一個網址，就能把 InferrLM 的聊天畫面分享給電腦、平板或其他裝置。
- 完整 API 文件在 [這裡](docs/REST_APIs.zh-TW.md)，伺服器首頁也能看到。
- 命令列工具在 [github.com/sbhjt-gr/InferrLM-CLI](https://github.com/sbhjt-gr/InferrLM-CLI)，裡面示範了怎麼用這個 API 做自己的程式。

### 模型管理
- 下載管理員直接從 HuggingFace 取得模型。適合在手機上執行的精選清單在「模型」裡的「下載模型」。
- 下載好的模型會出現在聊天頁的模型選擇裡，也會出現在「模型」裡的「已儲存的模型」。
- 可以從手機儲存空間匯入，也可以直接用網址下載。

### 聊天
- 訊息可以編輯、重新產生、複製，也支援 Markdown 顯示。
- 用 `react-native-nitro-markdown` 快速顯示 Markdown，數學公式也能顯示。它是基於 Nitro Modules 橋接的 C++ 渲染器。
- 每則聊天氣泡都能分叉：從任意一則訊息另開一段對話，原來的紀錄還在。你可以換個方向聊，以前的內容不會丟。
- 模型寫出的程式碼會放在程式碼區塊裡，可以複製。
- 可以管理聊天紀錄，也能把對話置頂。

如果你想參與，或只是想在自己的電腦上跑起來，照下面的指南來。你的修改需要遵守我們的 <a href="https://github.com/sbhjt-gr/InferrLM/blob/main/LICENSE">LICENSE</a>。

### 準備

- Node.js（>= 16.0.0，< 23.0.0）
- npm 或 yarn
- Expo CLI
- Android Studio（做 Android 開發）
- Xcode（做 iOS 開發）

### 安裝

1. **複製儲存庫**
   ```bash
   git clone https://github.com/sbhjt-gr/InferrLM
   cd InferrLM
   ```

2. **安裝相依套件**
   ```bash
   yarn install
   ```

3. **設定環境變數**
  設定你的 API 金鑰和後端。變數清單在 [app.config.json](app.config.js)

4. **在實機或模擬器上執行**
   ```bash
   # For Android
   npx expo run:android
   
   # For iOS
   npx expo run:ios
   ```

## REST API

InferrLM 自帶 HTTP 伺服器，按 OpenAI API 的方式把模型開放出去，同一網路裡的裝置都能存取你手機上的模型。這樣你就能把 InferrLM 接到別的軟體、指令稿或服務上。

### 啟動伺服器

1. 打開 InferrLM
2. 進入「伺服器」頁
3. 打開伺服器開關
4. 會顯示伺服器網址（一般是 `http://YOUR_DEVICE_IP:8889`）

## 命令列

InferrLM-CLI 是一個終端機用戶端，連上你的 InferrLM 伺服器，直接在命令列裡聊天。它本身能用，也給想用 InferrLM REST API 做程式的人當參考。

CLI 用 React 和 Ink 做了一個基本的終端機畫面，支援一邊產生一邊回傳、保留對話紀錄，還有互動式的初始設定。完整原始碼和安裝說明在 [github.com/sbhjt-gr/InferrLM-CLI](https://github.com/sbhjt-gr/InferrLM-CLI)。

要用 CLI，先讓手機上的 InferrLM 伺服器跑起來，再安裝這個工具，照儲存庫裡的說明完成設定。


### API 文件

伺服器跑起來之後，用任何瀏覽器打開伺服器網址，就能看到完整的 API 文件。文件包括：

- 聊天和補全介面
- 模型管理操作
- RAG 和 embedding（把文字變成一組數字，方便查找）介面
- 伺服器設定和狀態

詳細說明見 [REST API 文件](docs/REST_APIs.zh-TW.md)。

## 授權

這個專案以 AGPL-3.0 授權發布。請在 [這裡](https://github.com/sbhjt-gr/InferrLM/blob/main/LICENSE) 閱讀。任何修改都要遵守這份 LICENSE 的規則。

## 參與貢獻

歡迎參與！你可以在 [issues](https://github.com/sbhjt-gr/InferrLM/issues) 裡找問題，也可以開新問題然後開始做。

閱讀 [貢獻指南](docs/CONTRIBUTING.zh-TW.md)，裡面有貢獻說明、程式碼要求和常見做法。

## 技術

- **框架**：React Native 0.81，Expo 54（新架構）
- **軟體語言**：TypeScript、JavaScript
- **iOS 原生模組**：Swift
- **Android 原生模組**：Kotlin
- **執行引擎**：C、C++
- **導覽**：React Navigation
- **資料庫**：OP-SQLite、Expo SQLite

## 致謝

- [llama.cpp](https://github.com/ggerganov/llama.cpp) — 在 Android 和 iOS 上執行本機 GGUF 模型的底層引擎。
- [mlx-swift-lm](https://github.com/ml-explore/mlx-swift-lm) — 在 Apple Silicon 上執行 MLX 語言模型的 Swift 函式庫，iOS 上的 MLX 後端靠它。
- [inferrlm-llama.rn](https://github.com/sbhjt-gr/inferra-llama.rn) — 客製的 React Native 轉接層，用來接上 llama.cpp。最初從 [llama.rn](https://github.com/mybigday/llama.rn) 分叉並自行維護，以便更頻繁地更新 llama.cpp。
- [@inferrlm/react-native-mlx](https://github.com/sbhjt-gr/react-native-nitro-mlx) — iOS 上的 Apple Silicon MLX 引擎，透過 Nitro Modules 橋接在手機上跑得更快。從 [react-native-nitro-mlx](https://github.com/corasan/react-native-nitro-mlx) 分叉並繼續維護。
- [react-native-nitro-markdown](https://github.com/sbhjt-gr/react-native-nitro-markdown) — React Native 的原生 C++ Markdown 渲染器，用來快速顯示聊天訊息。
- [react-native-rag](https://github.com/software-mansion-labs/react-native-rag) + [@langchain/textsplitters](https://github.com/langchain-ai/langchainjs) — React Native 上的 RAG 實作，用 LangChain 支援文件查找和入庫。
- [react-native-ai](https://github.com/callstackincubator/ai) — 透過 Swift API 接入 Apple Foundation 模型的轉接層。
- 如果你覺得這裡也應該寫上你，請告訴我。

## Star 記錄

[![Star History Chart](https://api.star-history.com/svg?repos=sbhjt-gr/InferrLM&type=Date)](https://star-history.com/#sbhjt-gr/InferrLM&Date)

---

<p align="center">
  <sub>覺得有用的話，給這個儲存庫點個 Star 吧！</sub>
</p>
