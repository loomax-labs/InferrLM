[English](README.md) · [简体中文](README.zh-CN.md) · [日本語](README.ja.md)

## InferrLM（以前の名前は Inferra）
<p>
  <a href="" target="_blank"><img src="https://img.shields.io/badge/App_Version-0.8.7-6a1b9a" alt="App Version 0.8.7"></a>
  <a href="https://opensource.org/licenses/AGPL-3.0" target="_blank"><img src="https://img.shields.io/badge/License-AGPL--3.0-orange" alt="License: AGPL-3.0"></a>
</p>
<p>
  <img src="assets/source/InferrLM-header.jpg" alt="InferrLM Header" width="600">
</p>

InferrLM は、大きなモデルも小さなモデルも Android と iOS の端末で直接使えるモバイルアプリです。端末を、同じネットワークの中のサーバーとしても使えます。Claude、Gemini、ChatGPT のようなクラウドのモデルにも対応しています。このスマホで動かすモデルでは、RAG（資料を探してから答える仕組み）付きのファイル添付も使えます。

<p>
  <a href="https://play.google.com/store/apps/details?id=com.gorai.ragionare"><img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Get it on Google Play" width="178" style="vertical-align:middle"></a>
  <a href="https://apps.apple.com/us/app/inferra/id6754396856"><img src="https://developer.apple.com/assets/elements/badges/download-on-the-app-store.svg" alt="Download on the App Store" width="164" style="vertical-align:middle"></a>
</p>


このプロジェクトの開発を支援したいときは、[Ko-fi](https://ko-fi.com/subhajitgorai) から寄付できます。

## デモ

Apple Foundation モデルを使う様子と、HuggingFace から MLX のモデルをダウンロードして、このスマホで動かす様子です。

<p>
  <img src="assets/demo_1.gif" alt="Demo 1" height="350">
  <img src="assets/demo_2.gif" alt="Demo 2" height="350">
</p>

## 機能

### このスマホで動かす
- llama.cpp により、GGUF（モデルのファイル形式）のモデルを Android と iOS のどちらでもこのスマホで動かせます。
- Apple Silicon の端末では、MLX でもこのスマホで動かせます。
- OpenAI、Gemini、Anthropic のクラウドのモデルともつながります。クラウドのモデルを使うには、自分の API キーと、InferrLM の登録アカウントが必要です。クラウドのモデルは使わなくてもかまいません。
- OpenRouter、Groq、Ollama、LM Studio、Together AI のように OpenAI と同じ形の提供元では、接続先の URL を変えられます。アプリの中から、別の API（ほかのソフトから使う窓口）の入口を使えます。
- Apple Intelligence に対応した端末では、Apple Foundation モデルも使えます。

### 画像と、文字と画像
- 文字と画像に対応したモデルと、それに合う projector（mmproj）ファイルで、画像を読めます。詳しくは [こちら](https://github.com/ggml-org/llama.cpp/blob/master/docs/multimodal.md) です。
- アプリ内のカメラで写真を撮り、そのままモデルに送れます。

### 文書の処理と RAG
- RAG（資料を探してから答える仕組み）で、文書の理解と、今の話に合った返事がしやすくなります。
- ファイルを添付できます。内蔵の文書抽出が、文書のすべてのページで文字をこのスマホ上で読み取り、テキストを取り出して、このスマホのモデルに送ります。
- 会話の途中で素早く探せるよう、ファイルを処理して索引にする取り込みがあります。
- クラウドのモデルには、端末本来のファイル送信も使えます。

### ローカルサーバー
- 内蔵の HTTP サーバーが REST API（決まったアドレスでやり取りする窓口）を出し、同じネットワーク上のどの端末からでもモデルを使えます。サーバーはサーバーのタブから起動できます。URL で、InferrLM のチャット画面をパソコン、タブレット、ほかの端末と共有できます。
- API の説明は [こちら](docs/REST_APIs.ja.md) と、サーバーのホームページにあります。
- コマンドラインのツールは [github.com/sbhjt-gr/InferrLM-CLI](https://github.com/sbhjt-gr/InferrLM-CLI) にあり、この API でアプリを作る例になっています。

### モデルの管理
- HuggingFace からモデルを直接取るダウンロード管理があります。スマホ向けに選んだ一覧は、モデルの「モデルをダウンロード」タブにあります。
- ダウンロードしたモデルは、チャット画面のモデル選択と、「モデル」タブの中の「保存したモデル」タブに出ます。
- 端末内の保存場所から読み込むか、URL から直接ダウンロードできます。

### チャット
- メッセージは編集、作り直し、コピー、Markdown の表示ができます。
- `react-native-nitro-markdown` による、数式にも対応した速い Markdown 表示です。Nitro Modules の橋の上に作った C++ の表示です。
- 各チャットの吹き出しから会話を分岐できます。どのメッセージからでも別の方向に進め、元のスレッドは残るので、前の流れを失わずに別の試しができます。
- モデルが作ったコードは、コピーできるコードブロックの中に表示します。
- チャット履歴を管理し、会話をピン留めできます。

手元で動かすときや、開発に加わるときは、下の手順に従ってください。変更は <a href="https://github.com/sbhjt-gr/InferrLM/blob/main/LICENSE">LICENSE</a> に沿う必要があります。

### 必要なもの

- Node.js（16.0.0 以上、23.0.0 未満）
- npm または yarn
- Expo CLI
- Android Studio（Android の開発）
- Xcode（iOS の開発）

### インストール

1. **リポジトリをクローンする**
   ```bash
   git clone https://github.com/sbhjt-gr/InferrLM
   cd InferrLM
   ```

2. **依存関係を入れる**
   ```bash
   yarn install
   ```

3. **環境変数を設定する**
  API キーとバックエンドの設定をします。変数の一覧は [app.config.json](app.config.js) にあります。

4. **実機またはエミュレータで動かす**
   ```bash
   # For Android
   npx expo run:android
   
   # For iOS
   npx expo run:ios
   ```

## REST API

InferrLM には内蔵の HTTP サーバーがあり、OpenAI API の形でモデルを出せます。同じローカルネットワーク上のどの端末からでも、このスマホのモデルを使えます。ほかのアプリ、スクリプト、サービスと InferrLM をつなげられます。

### サーバーを起動する

1. InferrLM アプリを開きます
2. サーバーのタブを開きます
3. サーバーのスイッチを入れて起動します
4. サーバーの URL が表示されます（ふつうは `http://YOUR_DEVICE_IP:8889`）

## コマンドライン

InferrLM-CLI は、InferrLM のサーバーにつながり、ターミナルからチャットできるクライアントです。そのまま使える道具であり、InferrLM の REST API でアプリを作る人向けの見本でもあります。

CLI は React と Ink で作られており、返事を流しながら表示する、会話の履歴、対話式の初期設定といった、基本的なターミナル画面があります。ソースとインストール手順は [github.com/sbhjt-gr/InferrLM-CLI](https://github.com/sbhjt-gr/InferrLM-CLI) にあります。

CLI を始めるには、スマホで InferrLM のサーバーを起動してから、CLI を入れ、そのリポジトリの手順に従ってください。


### API の説明

サーバーが動いているあいだ、サーバーの URL をブラウザで開くと、API の説明を全部読めます。説明には次が含まれます。

- チャットと文の完成のエンドポイント
- モデルの管理
- RAG と、文章を数値の並びにするための API
- サーバーの設定と状態

詳しくは [REST API の説明](docs/REST_APIs.ja.md) を見てください。

## ライセンス

このプロジェクトは AGPL-3.0 License で配布しています。[こちら](https://github.com/sbhjt-gr/InferrLM/blob/main/LICENSE) を読んでください。変更はこの LICENSE の規則に沿う必要があります。

## 開発への参加

参加を歓迎します。[issues](https://github.com/sbhjt-gr/InferrLM/issues) タブで課題を探すか、新しく立ててから作業を始められます。

参加の手順、コードの基準、進め方は [開発ガイド](docs/CONTRIBUTING.ja.md) にあります。

## 技術構成

- **フレームワーク**: React Native 0.81 と Expo 54（New Architecture）
- **アプリの言語**: TypeScript、JavaScript
- **iOS のネイティブモジュール**: Swift
- **Android のネイティブモジュール**: Kotlin
- **答えを作るエンジン**: C、C++
- **画面遷移**: React Navigation
- **データベース**: OP-SQLite、Expo SQLite

## 謝辞

- [llama.cpp](https://github.com/ggerganov/llama.cpp) - Android と iOS の両方で、ローカルの GGUF モデルをこのスマホで動かす土台のエンジンです。
- [mlx-swift-lm](https://github.com/ml-explore/mlx-swift-lm) - Apple Silicon で MLX の言語モデルを動かす Swift のライブラリです。iOS の MLX 側を支えています。
- [inferrlm-llama.rn](https://github.com/sbhjt-gr/inferra-llama.rn) - llama.cpp への橋になる、手を入れた React Native のアダプターです。llama.cpp をより頻繁に更新するため、[llama.rn](https://github.com/mybigday/llama.rn) からフォークして自分たちで置いています。
- [@inferrlm/react-native-mlx](https://github.com/sbhjt-gr/react-native-nitro-mlx) - iOS 向けの Apple Silicon MLX エンジンです。Nitro Modules の橋で、このスマホでの動きを軽くします。[react-native-nitro-mlx](https://github.com/corasan/react-native-nitro-mlx) からフォークして管理しています。
- [react-native-nitro-markdown](https://github.com/sbhjt-gr/react-native-nitro-markdown) - React Native 向けの、C++ による Markdown 表示です。チャットのメッセージを速く描くために使っています。
- [react-native-rag](https://github.com/software-mansion-labs/react-native-rag) + [@langchain/textsplitters](https://github.com/langchain-ai/langchainjs) - React Native 向けの RAG の実装です。LangChain を使い、文書の検索と取り込みを支えています。
- [react-native-ai](https://github.com/callstackincubator/ai) - Swift API で Apple Foundation モデルにつなぐアダプターです。
- ここにも載せるべきだと思う人は、知らせてください。

## スターの履歴

[![Star History Chart](https://api.star-history.com/svg?repos=sbhjt-gr/InferrLM&type=Date)](https://star-history.com/#sbhjt-gr/InferrLM&Date)

---

<p align="center">
  <sub>役に立ったら、このリポジトリにスターを付けてください。</sub>
</p>
