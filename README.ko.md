[English](README.md) | [简体中文](README.zh-CN.md) | [繁體中文](README.zh-TW.md) | [日本語](README.ja.md) | [한국어](README.ko.md) | [Deutsch](README.de.md) | [Français](README.fr.md) | [Nederlands](README.nl.md)

## InferrLM (이전 이름은 Inferra)
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

InferrLM은 큰 모델과 작은 모델을 Android와 iOS 휴대폰에서 바로 쓰게 해 주는 앱이에요. 휴대폰을 같은 네트워크의 서버로도 쓸 수 있어요. Claude, Gemini, ChatGPT 같은 클라우드 모델도 지원해요. 이 휴대폰에서 실행하는 모델에는 파일을 붙일 수 있고, RAG(문서에서 관련 내용을 찾은 다음 답하게 하는 방식)도 쓸 수 있어요.

<p>
  <a href="https://play.google.com/store/apps/details?id=com.gorai.ragionare"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" width="178" style="vertical-align:middle"></a>
  <a href="https://apps.apple.com/us/app/inferra/id6754396856"><img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" width="164" style="vertical-align:middle"></a>
</p>

## 목차

- [데모](#데모)
- [기능](#기능)
  - [이 휴대폰에서 실행](#이-휴대폰에서-실행)
  - [사진, 글과 그림](#사진-글과-그림)
  - [문서와 RAG](#문서와-rag)
  - [로컬 서버](#로컬-서버)
  - [모델 관리](#모델-관리)
  - [채팅](#채팅)
  - [준비](#준비)
  - [설치](#설치)
- [REST API](#rest-api)
  - [서버 시작](#서버-시작)
- [명령줄](#명령줄)
  - [API 문서](#api-문서)
- [라이선스](#라이선스)
- [기여](#기여)
- [기술](#기술)
- [감사](#감사)
- [Star 기록](#star-기록)

## 데모

Apple Foundation Model을 쓰고, HuggingFace에서 MLX 모델을 받아 이 휴대폰에서 실행하는 모습이에요.

<p>
  <img src="assets/demo_1.gif" alt="Demo 1" height="350">
  <img src="assets/demo_2.gif" alt="Demo 2" height="350">
</p>

## 기능

### 이 휴대폰에서 실행
- llama.cpp로 Android와 iOS에서 로컬 GGUF(모델 파일 형식)를 실행해요.
- Apple Silicon 기기에서는 MLX를 이 휴대폰에서 실행할 수 있어요.
- OpenAI, Gemini, Anthropic 클라우드 모델도 연결할 수 있어요. 원격 모델은 본인 API 키와 InferrLM 계정이 필요해요. 원격 모델은 쓰지 않아도 돼요.
- OpenRouter, Groq, Ollama, LM Studio, Together AI처럼 OpenAI와 맞는 서비스의 기본 주소를 바꿀 수 있어요. 앱 안에서 다른 주소를 쓸 수 있어요.
- Apple Intelligence를 지원하는 기기에서는 Apple Foundation 모델을 쓸 수 있어요.

### 사진, 글과 그림
- 글과 그림을 보는 모델에 projector(mmproj) 파일을 붙이면 사진을 볼 수 있어요. 자세한 내용은 [여기](https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md)를 보세요.
- 앱 안의 카메라로 사진을 찍어 모델에 보낼 수 있어요.

### 문서와 RAG
- RAG로 문서를 더 잘 이해하고, 관련 내용을 답에 쓸 수 있어요.
- 파일을 붙일 수 있어요. 문서에서 글자를 읽는 기능이 모든 페이지를 이 휴대폰에서 OCR로 읽어 로컬 모델에 보내요.
- 문서를 넣고 색인을 만들어, 채팅 중에 내용을 더 빨리 찾아요.
- 원격 모델에는 파일을 바로 올릴 수 있어요.

### 로컬 서버
- 내장 HTTP 서버가 REST API로 같은 네트워크의 기기가 모델에 접속하게 해요. 서버 탭에서 켤 수 있어요. 주소 하나로 채팅 화면을 컴퓨터, 태블릿, 다른 휴대폰과 나눌 수 있어요.
- 전체 API 문서는 [여기](docs/REST_APIs.ko.md)와 서버 첫 화면에 있어요.
- 명령줄 도구는 [github.com/sbhjt-gr/InferrLM-CLI](https://github.com/sbhjt-gr/InferrLM-CLI)에 있고, 이 API로 앱을 만드는 예를 보여 줘요.

### 모델 관리
- 다운로드 관리자가 HuggingFace에서 모델을 받아요. 휴대폰에서 실행하기 좋게 고른 목록은 모델의 다운로드 탭에 있어요.
- 받은 모델은 채팅 화면의 모델 선택과 모델의 저장된 모델 탭에 나와요.
- 휴대폰 저장공간에서 가져오거나, 주소로 바로 받을 수 있어요.

### 채팅
- 메시지는 수정, 다시 생성, 복사, Markdown 표시를 지원해요.
- `react-native-nitro-markdown`로 Markdown과 수식을 빠르게 보여 줘요. Nitro Modules 다리 위의 C++ 렌더러예요.
- 각 말풍선에서 대화를 나눌 수 있어요. 어떤 메시지에서든 새 갈래를 만들고, 원래 대화는 그대로 둬요.
- 모델이 만든 코드는 코드 블록에 나오고, 복사할 수 있어요.
- 채팅 기록을 관리하고, 대화를 고정할 수 있어요.

기여하거나 내 컴퓨터에서 실행해 보려면 아래를 따르세요. 변경은 <a href="https://github.com/sbhjt-gr/InferrLM/blob/main/LICENSE">LICENSE</a>를 지켜야 해요.

### 준비

- Node.js (>= 16.0.0, < 23.0.0)
- npm 또는 yarn
- Expo CLI
- Android Studio (Android 개발)
- Xcode (iOS 개발)

### 설치

1. **저장소 복제**
   ```bash
   git clone https://github.com/sbhjt-gr/InferrLM
   cd InferrLM
   ```

2. **의존성 설치**
   ```bash
   yarn install
   ```

3. **환경 변수 설정**
  API 키와 백엔드 설정을 넣으세요. 변수 목록은 [app.config.json](app.config.js)에 있어요.

4. **기기 또는 에뮬레이터에서 실행**
   ```bash
   # For Android
   npx expo run:android
   
   # For iOS
   npx expo run:ios
   ```

## REST API

InferrLM에는 HTTP 서버가 들어 있어요. OpenAI API 방식으로 모델을 열고, 같은 네트워크의 기기가 휴대폰의 모델에 접속할 수 있어요. 다른 앱, 스크립트, 서비스에 InferrLM을 연결할 수 있어요.

### 서버 시작

1. InferrLM을 열어요
2. 서버 탭으로 이동해요
3. 서버 스위치를 켜요
4. 서버 주소가 표시돼요 (보통 `http://YOUR_DEVICE_IP:8889`)

## 명령줄

InferrLM-CLI는 터미널 클라이언트예요. InferrLM 서버에 연결해서 명령줄에서 채팅할 수 있어요. 그 자체로 쓸 수 있고, REST API로 앱을 만드는 참고이기도 해요.

CLI는 React와 Ink로 기본 터미널 화면을 만들어요. 답이 나오는 동안 표시하고, 대화 기록을 남기고, 처음 설정을 대화로 진행해요. 전체 소스와 설치 방법은 [github.com/sbhjt-gr/InferrLM-CLI](https://github.com/sbhjt-gr/InferrLM-CLI)에 있어요.

CLI를 쓰려면 휴대폰에서 InferrLM 서버를 켠 다음 도구를 설치하고, 그 저장소의 안내를 따르세요.


### API 문서

서버가 켜지면 아무 브라우저에서 서버 주소를 열어 전체 API 문서를 볼 수 있어요. 문서에는 다음이 있어요.

- 채팅과 완성 엔드포인트
- 모델 관리
- RAG와 embedding(글을 숫자로 바꿔 찾기 쉽게 하는 것) API
- 서버 설정과 상태

자세한 내용은 [REST API 문서](docs/REST_APIs.ko.md)를 보세요.

## 라이선스

이 프로젝트는 AGPL-3.0 라이선스로 배포돼요. [여기](https://github.com/sbhjt-gr/InferrLM/blob/main/LICENSE)에서 읽어 주세요. 수정은 이 LICENSE 규칙을 따라야 해요.

## 기여

기여를 환영해요. [issues](https://github.com/sbhjt-gr/InferrLM/issues)에서 문제를 찾거나 새로 올리고 작업을 시작하세요.

[기여 가이드](docs/CONTRIBUTING.ko.md)에 기여 방법, 코드 기준, 자주 쓰는 방식이 있어요.

## 기술

- **프레임워크**: React Native 0.81, Expo 54 (새 아키텍처)
- **앱 언어**: TypeScript, JavaScript
- **iOS 네이티브 모듈**: Swift
- **Android 네이티브 모듈**: Kotlin
- **실행 엔진**: C, C++
- **이동**: React Navigation
- **데이터베이스**: OP-SQLite, Expo SQLite

## 감사

- [llama.cpp](https://github.com/ggerganov/llama.cpp) - Android와 iOS에서 로컬 GGUF 모델을 실행하는 기반 엔진이에요.
- [mlx-swift-lm](https://github.com/ml-explore/mlx-swift-lm) - Apple Silicon에서 MLX 언어 모델을 실행하는 Swift 라이브러리예요. iOS의 MLX 실행을 담당해요.
- [inferrlm-llama.rn](https://github.com/sbhjt-gr/inferra-llama.rn) - llama.cpp를 잇는 맞춤 React Native 어댑터예요. [llama.rn](https://github.com/mybigday/llama.rn)에서 포크해 llama.cpp를 더 자주 업데이트해요.
- [@inferrlm/react-native-mlx](https://github.com/sbhjt-gr/react-native-nitro-mlx) - iOS용 Apple Silicon MLX 엔진이에요. Nitro Modules 다리로 이 휴대폰에서 실행해요. [react-native-nitro-mlx](https://github.com/corasan/react-native-nitro-mlx)에서 포크해 유지해요.
- [react-native-nitro-markdown](https://github.com/sbhjt-gr/react-native-nitro-markdown) - React Native용 네이티브 C++ Markdown 렌더러예요. 채팅 메시지를 빠르게 표시해요.
- [react-native-rag](https://github.com/software-mansion-labs/react-native-rag) + [@langchain/textsplitters](https://github.com/langchain-ai/langchainjs) - React Native용 RAG예요. LangChain으로 문서 찾기와 넣기를 해요.
- [react-native-ai](https://github.com/callstackincubator/ai) - Swift API로 Apple Foundation 모델에 접속하는 어댑터예요.
- 여기에도 이름이 필요하다고 생각하면 알려 주세요.

## Star 기록

[![Star History Chart](https://api.star-history.com/svg?repos=sbhjt-gr/InferrLM&type=Date)](https://star-history.com/#sbhjt-gr/InferrLM&Date)

---

<p align="center">
  <sub>유용하면 이 저장소에 Star를 눌러 주세요.</sub>
</p>
