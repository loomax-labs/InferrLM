import { DownloadableModel } from "../components/model/DownloadableModelItem";
import { ModelType, ModelFormat } from "../types/models";

export const DOWNLOADABLE_MODELS: DownloadableModel[] = [
  {
    "name": "Gemma 4 E4B Instruct",
    "description": "Google's Gemma 4 E4B with vision capabilities and built-in reasoning. 256K context length.",
    "size": "4.98 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/gemma-4-E4B-it-Q4_K_M.gguf",
    "licenseLink": "https://ai.google.dev/gemma/terms",
    "modelFamily": "4 Billion",
    "quantization": "Q4_K_M",
    "tags": ["vision", "reasoning", "recommended", "llama.cpp"],
    "modelType": ModelType.VISION,
    "capabilities": ["vision", "text"],
    "supportsMultimodal": true,
    "additionalFiles": [
      {
        "name": "mmproj-BF16.gguf",
        "url": "https://huggingface.co/unsloth/gemma-4-E4B-it-GGUF/resolve/main/mmproj-BF16.gguf",
        "description": "Multimodal projector for Gemma 4 E4B"
      }
    ]
  },
  {
    "name": "Gemma 4 E2B Instruct",
    "description": "Google's Gemma 4 E2B with vision capabilities and built-in reasoning. 256K context length.",
    "size": "3.11 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/gemma-4-E2B-it-Q4_K_M.gguf",
    "licenseLink": "https://ai.google.dev/gemma/terms",
    "modelFamily": "2 Billion",
    "quantization": "Q4_K_M",
    "tags": ["vision", "reasoning", "fastest", "llama.cpp"],
    "modelType": ModelType.VISION,
    "capabilities": ["vision", "text"],
    "supportsMultimodal": true,
    "additionalFiles": [
      {
        "name": "mmproj-BF16.gguf",
        "url": "https://huggingface.co/unsloth/gemma-4-E2B-it-GGUF/resolve/main/mmproj-BF16.gguf",
        "description": "Multimodal projector for Gemma 4 E2B"
      }
    ]
  },
  {
    "name": "Gemma 4 E4B Instruct (LiteRT)",
    "description": "Google's Gemma 4 E4B with multimodal input (text, vision, audio), built-in thinking, and speculative decoding. Up to 32K context length.",
    "size": "3.41 GB",
    "huggingFaceLink": "https://huggingface.co/litert-community/gemma-4-E4B-it-litert-lm/resolve/main/gemma-4-E4B-it.litertlm",
    "licenseLink": "https://ai.google.dev/gemma/terms",
    "modelFamily": "4 Billion",
    "quantization": "int4",
    "tags": ["vision", "reasoning", "recommended", "litert"],
    "modelType": ModelType.VISION,
    "modelFormat": ModelFormat.LITERT,
    "capabilities": ["vision", "text", "audio"],
    "supportsMultimodal": true
  },
  {
    "name": "Gemma 4 E2B Instruct (LiteRT)",
    "description": "Google's Gemma 4 E2B with multimodal input (text, vision, audio), built-in thinking, and speculative decoding. Up to 32K context length.",
    "size": "2.41 GB",
    "huggingFaceLink": "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm",
    "licenseLink": "https://ai.google.dev/gemma/terms",
    "modelFamily": "2 Billion",
    "quantization": "int4",
    "tags": ["vision", "reasoning", "fastest", "recommended", "litert"],
    "modelType": ModelType.VISION,
    "modelFormat": ModelFormat.LITERT,
    "capabilities": ["vision", "text", "audio"],
    "supportsMultimodal": true
  },
  {
    "name": "Qwen3.5 9B Instruct",
    "description": "Latest Qwen 3.5 9B instruct model for higher quality responses and reasoning.",
    "size": "5.68 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/Qwen3.5-9B-GGUF/resolve/main/Qwen3.5-9B-Q4_K_M.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "9 Billion",
    "quantization": "Q4_K_M",
    "tags": ["reasoning", "llama.cpp"]
  },
  {
    "name": "Qwen3.5 4B Instruct",
    "description": "Latest Qwen 3.5 instruct model with stronger reasoning and instruction following.",
    "size": "2.74 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/Qwen3.5-4B-GGUF/resolve/main/Qwen3.5-4B-Q4_K_M.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "4 Billion",
    "quantization": "Q4_K_M",
    "tags": ["recommended", "llama.cpp"]
  },
  {
    "name": "Qwen3.5 2B Instruct",
    "description": "Latest Qwen 3.5 instruct model balancing speed and quality for mobile devices.",
    "size": "1.28 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/Qwen3.5-2B-GGUF/resolve/main/Qwen3.5-2B-Q4_K_M.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "2 Billion",
    "quantization": "Q4_K_M",
    "tags": ["fastest", "llama.cpp"]
  },
  {
    "name": "Qwen3.5 0.8B Instruct",
    "description": "Latest compact Qwen 3.5 instruct model optimized for low-memory on-device usage.",
    "size": "0.53 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/Qwen3.5-0.8B-GGUF/resolve/main/Qwen3.5-0.8B-Q4_K_M.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "800 Million",
    "quantization": "Q4_K_M",
    "tags": ["fastest", "llama.cpp"]
  },
  {
    "name": "Ministral 3 8B Reasoning",
    "description": "Mistral's reasoning model with vision capabilities, optimized for complex multi-step reasoning, math, and coding tasks.",
    "size": "5.2 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/Ministral-3-8B-Reasoning-2512-GGUF/resolve/main/Ministral-3-8B-Reasoning-2512-Q4_K_M.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "8 Billion",
    "quantization": "Q4_K_M",
    "tags": ["reasoning", "vision", "llama.cpp"],
    "modelType": ModelType.VISION,
    "capabilities": ["vision", "text"],
    "supportsMultimodal": true,
    "additionalFiles": [
      {
        "name": "Ministral-3-8B-Reasoning-2512-BF16-mmproj.gguf",
        "url": "https://huggingface.co/unsloth/Ministral-3-8B-Reasoning-2512-GGUF/resolve/main/mmproj-BF16.gguf",
        "description": "Multimodal projector for Ministral 3 8B Reasoning"
      }
    ]
  },
  {
    "name": "Ministral 3 3B Instruct",
    "description": "Mistral's compact vision-language model with 256K context, multilingual support, and strong adherence to system prompts.",
    "size": "2.15 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/Ministral-3-3B-Instruct-2512-GGUF/resolve/main/Ministral-3-3B-Instruct-2512-Q4_0.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "3 Billion",
    "quantization": "Q4_K_M",
    "tags": ["vision", "fastest", "recommended", "llama.cpp"],
    "modelType": ModelType.VISION,
    "capabilities": ["vision", "text"],
    "supportsMultimodal": true,
    "additionalFiles": [
      {
        "name": "Ministral-3-3B-Instruct-2512-BF16-mmproj.gguf",
        "url": "https://huggingface.co/unsloth/Ministral-3-3B-Instruct-2512-GGUF/resolve/main/mmproj-BF16.gguf",
        "description": "Multimodal projector for Ministral 3 3B"
      }
    ]
  },
  {
    "name": "VibeThinker 1.5B",
    "description": "WeiboAI's specialized reasoning model for competitive math and coding problems, achieving performance comparable to 20B models.",
    "size": "1.12 GB",
    "huggingFaceLink": "https://huggingface.co/MaziyarPanahi/VibeThinker-1.5B-GGUF/resolve/main/VibeThinker-1.5B.Q4_K_M.gguf",
    "licenseLink": "https://opensource.org/licenses/MIT",
    "modelFamily": "1.5 Billion",
    "quantization": "Q4_K_M",
    "tags": ["reasoning", "fastest", "llama.cpp"]
  },
  {
    "name": "Granite 4.0 Helper 1B",
    "description": "IBM's efficient helper model with 1B parameters optimized for fast on-device inference and instruction following.",
    "size": "1.1 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/granite-4.0-h-1b-GGUF/resolve/main/granite-4.0-h-1b-Q8_0.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "1 Billion",
    "quantization": "Q8_0",
    "tags": ["fastest", "recommended", "llama.cpp"]
  },
  {
    "name": "MiniCPM4.1 Instruct",
    "description": "OpenBMB's ultra-efficient large language model with hybrid reasoning capabilities and optimized end-side deployment.",
    "size": "4.97 GB",
    "huggingFaceLink": "https://huggingface.co/openbmb/MiniCPM4.1-8B-GGUF/resolve/main/MiniCPM4.1-8B-Q4_K_M.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "8 Billion",
    "quantization": "Q4_K_M",
    "tags": ["reasoning", "llama.cpp"]
  },
  {
    "name": "Qwen3 4B Instruct",
    "description": "Alibaba's latest Qwen3 generation with 4B parameters, enhanced reasoning and 128K context length.",
    "size": "2.9 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/Qwen3-4B-Instruct-2507-GGUF/resolve/main/Qwen3-4B-Instruct-2507-Q5_K_M.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "4 Billion",
    "quantization": "Q5_K_M",
    "tags": ["recommended", "llama.cpp"]
  },
  {
    "name": "Qwen3-VL 4B Instruct",
    "description": "Alibaba's latest vision-language model with 4B parameters for multimodal understanding and generation.",
    "size": "2.8 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/Qwen3-VL-4B-Instruct-GGUF/resolve/main/Qwen3-VL-4B-Instruct-Q4_K_M.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "4 Billion",
    "quantization": "Q4_K_M",
    "tags": ["vision", "llama.cpp"],
    "modelType": ModelType.VISION,
    "capabilities": ["vision", "text"],
    "supportsMultimodal": true,
    "additionalFiles": [
      {
        "name": "mmproj-Qwen3-VL-4B-Instruct-Q4_K_M.gguf",
        "url": "https://huggingface.co/unsloth/Qwen3-VL-4B-Instruct-GGUF/resolve/main/mmproj-Qwen3-VL-4B-Instruct-Q4_K_M.gguf",
        "description": "Multimodal projector for Qwen3-VL 4B"
      }
    ]
  },
  {
    "name": "Gemma 3n-E4B Instruct (Q4_K_S)",
    "description": "Google's enhanced Gemma 3 variant with balanced performance and quality optimization.",
    "size": "4.1 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/gemma-3n-E4B-it-GGUF/resolve/main/gemma-3n-E4B-it-Q4_K_S.gguf",
    "licenseLink": "https://ai.google.dev/gemma/terms",
    "modelFamily": "4 Billion",
    "quantization": "Q4_K_S",
    "tags": ["llama.cpp"]
  },
  {
    "name": "Gemma 3n-E4B Instruct (Q2_K)",
    "description": "Google's enhanced Gemma 3 variant with optimized efficiency and fast inference capabilities.",
    "size": "2.76 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/gemma-3n-E4B-it-GGUF/resolve/main/gemma-3n-E4B-it-Q2_K.gguf",
    "licenseLink": "https://ai.google.dev/gemma/terms",
    "modelFamily": "4 Billion",
    "quantization": "Q2_K",
    "tags": ["recommended", "llama.cpp"]
  },
  {
    "name": "Gemma 3n E4B Instruct",
    "description": "Google's Gemma 3n E4B with multimodal input (text, vision, audio) support and 4096 context length.",
    "size": "4.58 GB",
    "huggingFaceLink": "https://huggingface.co/google/gemma-3n-E4B-it-litert-lm/resolve/main/gemma-3n-E4B-it-int4.litertlm",
    "licenseLink": "https://ai.google.dev/gemma/terms",
    "modelFamily": "4 Billion",
    "quantization": "int4",
    "tags": ["vision", "litert"],
    "modelType": ModelType.VISION,
    "modelFormat": ModelFormat.LITERT,
    "capabilities": ["vision", "text", "audio"],
    "supportsMultimodal": true
  },
  {
    "name": "Gemma 3n E2B Instruct",
    "description": "Google's Gemma 3n E2B with multimodal input (text, vision, audio) support and 4096 context length.",
    "size": "3.41 GB",
    "huggingFaceLink": "https://huggingface.co/google/gemma-3n-E2B-it-litert-lm/resolve/main/gemma-3n-E2B-it-int4.litertlm",
    "licenseLink": "https://ai.google.dev/gemma/terms",
    "modelFamily": "2 Billion",
    "quantization": "int4",
    "tags": ["vision", "fastest", "litert"],
    "modelType": ModelType.VISION,
    "modelFormat": ModelFormat.LITERT,
    "capabilities": ["vision", "text", "audio"],
    "supportsMultimodal": true
  },
  {
    "name": "Phi-4 Mini Reasoning",
    "description": "Microsoft's latest mini reasoning model with enhanced logic and problem-solving in a compact 4B parameter size.",
    "size": "2.5 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/Phi-4-mini-reasoning-GGUF/resolve/main/Phi-4-mini-reasoning-Q4_K_M.gguf",
    "licenseLink": "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct/resolve/main/LICENSE",
    "modelFamily": "4 Billion",
    "quantization": "Q4_K_M",
    "tags": ["reasoning", "fastest", "llama.cpp"]
  },
  {
    "name": "Gemma 3 Vision 4B",
    "description": "Google's multimodal Gemma 3 with vision capabilities for image understanding and visual reasoning.",
    "size": "2.92 GB",
    "huggingFaceLink": "https://huggingface.co/ggml-org/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q4_K_M.gguf",
    "licenseLink": "https://ai.google.dev/gemma/terms",
    "modelFamily": "4 Billion",
    "quantization": "Q4_K_M",
    "tags": ["vision", "recommended", "llama.cpp"],
    "modelType": ModelType.VISION,
    "capabilities": ["vision", "text"],
    "supportsMultimodal": true,
    "additionalFiles": [
      {
        "name": "mmproj-model-f16.gguf",
        "url": "https://huggingface.co/ggml-org/gemma-3-4b-it-GGUF/resolve/main/mmproj-model-f16.gguf",
        "description": "Multimodal projector for Gemma 3 Vision"
      }
    ]
  },
  {
    "name": "Gemma 3 Instruct - 4B",
    "description": "Google's latest compact instruction-tuned model with strong reasoning and fast inference with 4 billion parameters.",
    "size": "2.83 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/gemma-3-4b-it-GGUF/resolve/main/gemma-3-4b-it-Q5_K_M.gguf",
    "licenseLink": "https://ai.google.dev/gemma/terms",
    "modelFamily": "4 Billion",
    "quantization": "Q5_K_M",
    "tags": ["recommended", "llama.cpp"]
  },
  {
    "name": "Gemma 3 1B Instruct (LiteRT)",
    "description": "Compact Gemma 3 1B with 4-bit quantization optimized for fast on-device inference.",
    "size": "0.54 GB",
    "huggingFaceLink": "https://huggingface.co/litert-community/Gemma3-1B-IT/resolve/main/gemma3-1b-it-int4.litertlm",
    "licenseLink": "https://ai.google.dev/gemma/terms",
    "modelFamily": "1 Billion",
    "quantization": "int4",
    "tags": ["fastest", "recommended", "litert"],
    "modelFormat": ModelFormat.LITERT
  },
  {
    "name": "Gemma 3 Instruct - 1B",
    "description": "Google's latest compact instruction-tuned model with strong reasoning and fast inference with 1 billion parameters.",
    "size": "1.07 GB",
    "huggingFaceLink": "https://huggingface.co/unsloth/gemma-3-1b-it-GGUF/resolve/main/gemma-3-1b-it-Q8_0.gguf",
    "licenseLink": "https://ai.google.dev/gemma/terms",
    "modelFamily": "1 Billion",
    "quantization": "Q8_0",
    "tags": ["recommended", "fastest", "llama.cpp"]
  },
  {
    "name": "SmolVLM2 Instruct",
    "description": "Compact vision-language model with 2.2B parameters optimized for multimodal tasks.",
    "size": "2.5 GB",
    "huggingFaceLink": "https://huggingface.co/ggml-org/SmolVLM2-2.2B-Instruct-GGUF/resolve/main/SmolVLM2-2.2B-Instruct-Q8_0.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "2.2 Billion",
    "quantization": "Q8_0",
    "tags": ["vision", "fastest", "llama.cpp"],
    "modelType": ModelType.VISION,
    "capabilities": ["vision", "text"],
    "supportsMultimodal": true,
    "additionalFiles": [
      {
        "name": "mmproj-SmolVLM2-2.2B-Instruct-Q8_0.gguf",
        "url": "https://huggingface.co/ggml-org/SmolVLM2-2.2B-Instruct-GGUF/resolve/main/mmproj-SmolVLM2-2.2B-Instruct-Q8_0.gguf",
        "description": "Multimodal projector for SmolVLM2"
      }
    ]
  },
  {
    "name": "SmolVLM2 500M Video Instruct",
    "description": "Ultra-compact vision-language model with 500M parameters specialized for visual understanding and instruction following.",
    "size": "1.02 GB",
    "huggingFaceLink": "https://huggingface.co/ggml-org/SmolVLM2-500M-Video-Instruct-GGUF/resolve/main/SmolVLM2-500M-Video-Instruct-f16.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "500 Million",
    "quantization": "f16",
    "tags": ["vision", "video", "fastest", "llama.cpp"],
    "modelType": ModelType.VISION,
    "capabilities": ["vision", "text", "video"],
    "supportsMultimodal": true,
    "additionalFiles": [
      {
        "name": "mmproj-SmolVLM2-500M-Video-Instruct-f16.gguf",
        "url": "https://huggingface.co/ggml-org/SmolVLM2-500M-Video-Instruct-GGUF/resolve/main/mmproj-SmolVLM2-500M-Video-Instruct-f16.gguf",
        "description": "Multimodal projector for SmolVLM2 Video"
      }
    ]
  },
  {
    "name": "DeepSeek R1 Distill Qwen 1.5B (LiteRT)",
    "description": "DeepSeek's R1 reasoning model distilled into Qwen 1.5B, optimized for on-device deployment with LiteRT-LM.",
    "size": "1.71 GB",
    "huggingFaceLink": "https://huggingface.co/litert-community/DeepSeek-R1-Distill-Qwen-1.5B/resolve/main/DeepSeek-R1-Distill-Qwen-1.5B_multi-prefill-seq_q8_ekv4096.litertlm",
    "licenseLink": "https://opensource.org/licenses/MIT",
    "modelFamily": "1.5 Billion",
    "quantization": "q8",
    "tags": ["reasoning", "fastest", "litert"],
    "modelFormat": ModelFormat.LITERT
  },
  {
    "name": "Qwen 2.5 Instruct",
    "description": "Alibaba's general-purpose instruction-tuned model with strong multilingual capabilities.",
    "size": "5.2 GB",
    "huggingFaceLink": "https://huggingface.co/bartowski/Qwen2.5-7B-Instruct-GGUF/resolve/main/Qwen2.5-7B-Instruct-Q6_K.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "7 Billion",
    "quantization": "Q6_K",
    "tags": ["llama.cpp"]
  },
  {
    "name": "Qwen 2.5 Coder 7B Instruct",
    "description": "Alibaba's larger coding model with superior code generation and 128K context length for complex projects.",
    "size": "4.5 GB",
    "huggingFaceLink": "https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct-GGUF/resolve/main/qwen2.5-coder-7b-instruct-q4_k_m.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "7 Billion",
    "quantization": "Q4_K_M",
    "tags": ["recommended", "llama.cpp"]
  },
  {
    "name": "Qwen 2.5 Coder Instruct",
    "description": "Alibaba's specialized coding model with excellent code completion and explanation abilities.",
    "size": "2.27 GB",
    "huggingFaceLink": "https://huggingface.co/Qwen/Qwen2.5-Coder-3B-Instruct-GGUF/resolve/main/qwen2.5-coder-3b-instruct-q5_k_m.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "7 Billion",
    "quantization": "Q5_K_M",
    "tags": ["fastest", "llama.cpp"]
  },
  {
    "name": "Qwen 2.5 1.5B Instruct (LiteRT)",
    "description": "Alibaba's Qwen 2.5 1.5B instruction-tuned model optimized for on-device deployment with LiteRT-LM.",
    "size": "1.49 GB",
    "huggingFaceLink": "https://huggingface.co/litert-community/Qwen2.5-1.5B-Instruct/resolve/main/Qwen2.5-1.5B-Instruct_multi-prefill-seq_q8_ekv4096.litertlm",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "1.5 Billion",
    "quantization": "q8",
    "tags": ["fastest", "litert"],
    "modelFormat": ModelFormat.LITERT
  },
  {
    "name": "LLaMA 3.1 Instruct",
    "description": "Meta's latest instruction-tuned model with improved reasoning and instruction following.",
    "size": "4.7 GB",
    "huggingFaceLink": "https://huggingface.co/bartowski/Meta-Llama-3.1-8B-Instruct-GGUF/resolve/main/Meta-Llama-3.1-8B-Instruct-Q4_K_M.gguf",
    "licenseLink": "https://ai.meta.com/llama/license/",
    "modelFamily": "8 Billion",
    "quantization": "Q4_K_M",
    "tags": ["llama.cpp"]
  },
  {
    "name": "Gemma 2 Instruct",
    "description": "Google's previous instruction-tuned model with excellent reasoning and helpfulness.",
    "size": "5.4 GB",
    "huggingFaceLink": "https://huggingface.co/bartowski/gemma-2-9b-it-GGUF/resolve/main/gemma-2-9b-it-Q4_K_M.gguf",
    "licenseLink": "https://ai.google.dev/gemma/terms",
    "modelFamily": "9 Billion",
    "quantization": "Q4_K_M",
    "tags": ["llama.cpp"]
  },
  {
    "name": "CodeGemma Instruct",
    "description": "Google's code-focused model with strong programming and technical documentation capabilities.",
    "size": "5.1 GB",
    "huggingFaceLink": "https://huggingface.co/bartowski/codegemma-7b-it-GGUF/resolve/main/codegemma-7b-it-Q6_K.gguf",
    "licenseLink": "https://ai.google.dev/gemma/terms",
    "modelFamily": "7 Billion",
    "quantization": "Q6_K",
    "tags": ["llama.cpp"]
  },
  {
    "name": "Phi-3 Mini Instruct",
    "description": "Microsoft's compact instruction-tuned model with strong reasoning capabilities despite its small size.",
    "size": "2.2 GB",
    "huggingFaceLink": "https://huggingface.co/bartowski/Phi-3-mini-4k-instruct-GGUF/resolve/main/Phi-3-mini-4k-instruct-Q4_K_M.gguf",
    "licenseLink": "https://huggingface.co/microsoft/Phi-3-mini-4k-instruct/resolve/main/LICENSE",
    "modelFamily": "3.8 Billion",
    "quantization": "Q4_K_M",
    "tags": ["fastest", "llama.cpp"]
  },
  {
    "name": "Mistral Instruct",
    "description": "Instruction-tuned version of Mistral's powerful base model with excellent reasoning abilities.",
    "size": "4.1 GB",
    "huggingFaceLink": "https://huggingface.co/TheBloke/Mistral-7B-Instruct-v0.2-GGUF/resolve/main/mistral-7b-instruct-v0.2.Q4_K_M.gguf",
    "licenseLink": "https://www.apache.org/licenses/LICENSE-2.0",
    "modelFamily": "7 Billion",
    "quantization": "Q4_K_M",
    "tags": ["llama.cpp"]
  },
  {
    "name": "CodeLlama",
    "description": "Meta's code-specialized model trained on code repositories with strong programming capabilities.",
    "size": "2.95 GB",
    "huggingFaceLink": "https://huggingface.co/TheBloke/CodeLlama-7B-GGUF/resolve/main/codellama-7b.Q3_K_S.gguf",
    "licenseLink": "https://ai.meta.com/llama/license/",
    "modelFamily": "7 Billion",
    "quantization": "Q3_K_S",
    "tags": ["llama.cpp"]
  }
];
