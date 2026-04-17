import { llamaManager } from '../utils/LlamaManager';
import { BenchmarkSample, EngineCaps, GenOpts, InferenceManager, Msg } from './inference-manager';

const caps: EngineCaps = {
  embeddings: true,
  vision: true,
  audio: true,
  rag: true,
  grammar: true,
  jinja: true,
  dry: true,
  mirostat: true,
  xtc: true,
};

class LlamaAdapter implements InferenceManager {
  async init(modelPath: string, projectorPath?: string) {
    await llamaManager.initializeModel(modelPath, projectorPath);
  }

  async gen(messages: Msg[], opts?: GenOpts) {
    return llamaManager.generateResponse(messages, opts?.onToken, opts?.settings as any);
  }

  async embed(text: string) {
    return llamaManager.generateEmbedding(text);
  }

  async benchmark(prompt: string, opts?: GenOpts): Promise<BenchmarkSample> {
    return llamaManager.benchmark(prompt, opts?.settings as any);
  }

  async release() {
    await llamaManager.unloadModel();
  }

  stop() {
    llamaManager.stopCompletion();
  }

  caps() {
    return caps;
  }

  ready() {
    return llamaManager.isInitialized();
  }
}

export const llamaAdapter = new LlamaAdapter();
