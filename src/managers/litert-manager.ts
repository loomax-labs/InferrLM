import { Platform } from 'react-native';
import {
  createLLM,
  type LLMConfig,
  type LiteRTLMInstance,
} from 'react-native-litert-lm';

import { BenchmarkSample, EngineCaps, GenOpts, GenSettings, InferenceManager, Msg } from './inference-manager';
import { getLiteRTRecommendedBackend, type LiteRTBackend } from '../services/LiteRTBackendService';
import { modelSettingsService } from '../services/ModelSettingsService';

type ParsedInput = {
  text: string;
  imagePath?: string;
  audioPath?: string;
};

const caps: EngineCaps = {
  embeddings: false,
  vision: Platform.OS !== 'ios',
  audio: Platform.OS !== 'ios',
  rag: false,
  grammar: false,
  jinja: false,
  dry: false,
  mirostat: false,
  xtc: false,
};

class LiteRTManager implements InferenceManager {
  private instance: LiteRTLMInstance | null = null;
  private modelPath: string | null = null;
  private configKey = '';

  private normalizePath(path: string): string {
    return path.startsWith('file://') ? path.slice(7) : path;
  }

  private getModelSettingPaths(): string[] {
    if (!this.modelPath) {
      return [];
    }

    const rawPath = this.modelPath;
    const filePath = rawPath.startsWith('file://') ? rawPath : `file://${rawPath}`;

    return Array.from(new Set([rawPath, filePath]));
  }

  private async resolveBackend(): Promise<LiteRTBackend> {
    for (const path of this.getModelSettingPaths()) {
      const config = await modelSettingsService.getModelSettings(path);
      if (config.litertBackend) {
        return config.litertBackend;
      }
    }

    return getLiteRTRecommendedBackend();
  }

  private async createConfig(): Promise<LLMConfig> {
    return {
      backend: await this.resolveBackend(),
      maxTokens: 1024,
      temperature: 0.7,
      topK: 40,
      topP: 0.95,
    };
  }

  private getConfigKey(config: LLMConfig): string {
    return JSON.stringify({
      backend: config.backend ?? getLiteRTRecommendedBackend(),
      maxTokens: config.maxTokens ?? 1024,
      temperature: config.temperature ?? 0.7,
      topK: config.topK ?? 40,
      topP: config.topP ?? 0.95,
      systemPrompt: config.systemPrompt ?? '',
    });
  }

  private async buildConfig(messages: Msg[], settings?: Partial<GenSettings>): Promise<LLMConfig> {
    const config = await this.createConfig();
    const systemPrompt = this.extractSystemPrompt(messages, settings);

    if (typeof settings?.maxTokens === 'number') {
      config.maxTokens = settings.maxTokens;
    }
    if (typeof settings?.temperature === 'number') {
      config.temperature = settings.temperature;
    }
    if (typeof settings?.topK === 'number') {
      config.topK = settings.topK;
    }
    if (typeof settings?.topP === 'number') {
      config.topP = settings.topP;
    }
    if (systemPrompt) {
      config.systemPrompt = systemPrompt;
    }

    return config;
  }

  private getInstance(): LiteRTLMInstance {
    if (!this.instance) {
      this.instance = createLLM();
    }
    return this.instance;
  }

  private async ensureLoaded(config: LLMConfig): Promise<LiteRTLMInstance> {
    if (!this.modelPath) {
      throw new Error('engine_not_ready');
    }

    const key = this.getConfigKey(config);
    const current = this.getInstance();
    if (current.isReady() && this.configKey === key) {
      return current;
    }

    try {
      current.close();
    } catch {
    }

    this.instance = createLLM();
    await this.instance.loadModel(this.modelPath, config);
    this.configKey = key;
    return this.instance;
  }

  private extractSystemPrompt(messages: Msg[], settings?: Partial<GenSettings>): string | undefined {
    const firstMessage = messages[0];
    if (firstMessage?.role === 'system') {
      const text = this.extractText(firstMessage.content);
      if (text) {
        return text;
      }
    }

    const fallback = settings?.systemPrompt?.trim();
    return fallback || undefined;
  }

  private extractText(content: unknown): string {
    if (typeof content !== 'string') {
      return '';
    }

    const raw = content.trim();
    if (!raw) {
      return '';
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return raw;
      }

      if (parsed.type === 'multimodal' && Array.isArray(parsed.content)) {
        const textPart = parsed.content.find(
          (item: { type?: string; text?: string }) => item?.type === 'text' && typeof item?.text === 'string',
        );
        return (textPart?.text || '').trim();
      }

      if (parsed.type === 'ocr_result') {
        const userPrompt = typeof parsed.userPrompt === 'string' ? parsed.userPrompt.trim() : '';
        if (userPrompt) {
          return userPrompt;
        }
        const extractedText = typeof parsed.extractedText === 'string' ? parsed.extractedText.trim() : '';
        if (extractedText) {
          return extractedText;
        }
        return '';
      }

      if (parsed.type === 'file_upload') {
        const userContent = typeof parsed.userContent === 'string' ? parsed.userContent.trim() : '';
        if (userContent) {
          return userContent;
        }
        const instruction = typeof parsed.internalInstruction === 'string'
          ? parsed.internalInstruction.trim()
          : '';
        return instruction;
      }

      if (parsed.type === 'photo_upload' || parsed.type === 'audio_upload') {
        const userContent = typeof parsed.userContent === 'string' ? parsed.userContent.trim() : '';
        return userContent;
      }

      return raw;
    } catch {
      return raw;
    }
  }

  private extractMediaPath(instruction: string, label: 'Photo URI' | 'Audio URI'): string | undefined {
    const match = instruction.match(new RegExp(`${label}:\\s*(.+)`));
    if (!match?.[1]) {
      return undefined;
    }
    return this.normalizePath(match[1].trim());
  }

  private parseInput(content: unknown): ParsedInput {
    if (typeof content !== 'string') {
      return { text: '' };
    }

    const raw = content.trim();
    if (!raw) {
      return { text: '' };
    }

    try {
      const parsed = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') {
        return { text: raw };
      }

      if (parsed.type === 'multimodal' && Array.isArray(parsed.content)) {
        let text = '';
        let imagePath: string | undefined;
        let audioPath: string | undefined;

        for (const item of parsed.content) {
          if (item?.type === 'text' && typeof item?.text === 'string') {
            text = item.text.trim();
            continue;
          }
          if (!imagePath && item?.type === 'image' && typeof item?.uri === 'string') {
            imagePath = this.normalizePath(item.uri);
            continue;
          }
          if (!audioPath && item?.type === 'audio' && typeof item?.uri === 'string') {
            audioPath = this.normalizePath(item.uri);
          }
        }

        return { text, imagePath, audioPath };
      }

      if (parsed.type === 'photo_upload') {
        return {
          text: typeof parsed.userContent === 'string' && parsed.userContent.trim()
            ? parsed.userContent.trim()
            : 'Describe this image.',
          imagePath: this.extractMediaPath(String(parsed.internalInstruction || ''), 'Photo URI'),
        };
      }

      if (parsed.type === 'audio_upload') {
        return {
          text: typeof parsed.userContent === 'string' && parsed.userContent.trim()
            ? parsed.userContent.trim()
            : 'Transcribe or describe this audio.',
          audioPath: this.extractMediaPath(String(parsed.internalInstruction || ''), 'Audio URI'),
        };
      }

      if (parsed.type === 'ocr_result') {
        const userPrompt = typeof parsed.userPrompt === 'string' ? parsed.userPrompt.trim() : '';
        const extractedText = typeof parsed.extractedText === 'string' ? parsed.extractedText.trim() : '';
        return {
          text: userPrompt || extractedText,
        };
      }

      if (parsed.type === 'file_upload') {
        const userContent = typeof parsed.userContent === 'string' ? parsed.userContent.trim() : '';
        const instruction = typeof parsed.internalInstruction === 'string'
          ? parsed.internalInstruction.trim()
          : '';
        return {
          text: userContent || instruction,
        };
      }

      return { text: raw };
    } catch {
      return { text: raw };
    }
  }

  private getLastUserInput(messages: Msg[]): ParsedInput {
    for (let index = messages.length - 1; index >= 0; index -= 1) {
      const message = messages[index];
      if (message.role !== 'user') {
        continue;
      }

      const input = this.parseInput(message.content);
      if (input.text || input.imagePath || input.audioPath) {
        return input;
      }
    }

    return { text: '' };
  }

  async init(modelPath: string) {
    this.modelPath = this.normalizePath(modelPath);
    const config = await this.createConfig();
    const instance = this.getInstance();

    try {
      instance.close();
    } catch {
    }

    this.instance = createLLM();
    await this.instance.loadModel(this.modelPath, config);
    this.configKey = this.getConfigKey(config);
  }

  async gen(messages: Msg[], opts?: GenOpts) {
    const input = this.getLastUserInput(messages);
    if (!input.text && !input.imagePath && !input.audioPath) {
      return '';
    }

    const instance = await this.ensureLoaded(await this.buildConfig(messages, opts?.settings));
    const prompt = input.text || 'Describe this input.';

    if (input.imagePath && caps.vision) {
      const response = await instance.sendMessageWithImage(prompt, input.imagePath);
      opts?.onToken?.(response);
      return response;
    }

    if (input.audioPath && caps.audio) {
      const response = await instance.sendMessageWithAudio(prompt, input.audioPath);
      opts?.onToken?.(response);
      return response;
    }

    if (!opts?.onToken) {
      return instance.sendMessage(prompt);
    }

    return await new Promise<string>((resolve, reject) => {
      let output = '';
      try {
        instance.sendMessageAsync(prompt, (token, done) => {
          output += token;
          opts.onToken?.(token);
          if (done) {
            resolve(output);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async benchmark(prompt: string, opts?: GenOpts): Promise<BenchmarkSample> {
    const messages: Msg[] = [];
    const systemPrompt = opts?.settings?.systemPrompt?.trim();

    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    messages.push({ role: 'user', content: prompt });

    const instance = await this.ensureLoaded(await this.buildConfig(messages, opts?.settings));
    await instance.resetConversation();
    await instance.sendMessage(prompt);
    const stats = instance.getStats();
    const promptTokens = stats.promptTokens || Math.max(prompt.length / 4, 1);
    const completionTokens = stats.completionTokens || Math.max(stats.totalTokens - promptTokens, 1);
    const ttftMs = stats.timeToFirstToken || 0;
    const totalTimeMs = stats.totalTime || 0;
    const decodeWindowMs = Math.max(totalTimeMs - ttftMs, 1);

    return {
      promptTokens,
      completionTokens,
      totalTokens: promptTokens + completionTokens,
      ttftMs,
      totalTimeMs,
      prefillTokensPerSecond: ttftMs > 0 ? promptTokens / (ttftMs / 1000) : 0,
      decodeTokensPerSecond: completionTokens > 0
        ? completionTokens / (decodeWindowMs / 1000)
        : stats.tokensPerSecond || 0,
    };
  }

  async release() {
    if (this.instance) {
      try {
        this.instance.close();
      } catch {
      }
    }

    this.instance = null;
    this.modelPath = null;
    this.configKey = '';
  }

  stop() {
  }

  caps() {
    return caps;
  }

  ready() {
    return Boolean(this.instance?.isReady());
  }
}

export const litertManager = new LiteRTManager();