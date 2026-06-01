import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { EngineId, InferenceManager } from '../managers/inference-manager';
import { llamaAdapter } from '../managers/llama-manager';
import { litertManager } from '../managers/litert-manager';
import { mlxManager } from '../managers/mlx-manager';
import { featureCaps, isFeatureOn } from './feature-availability';

const keyActive = 'inference_engine_active';
const keyEnabled = 'inference_engine_enabled';

class EngineService {
  private engine: EngineId = 'llama';
  private enabled: Record<EngineId, boolean> = {
    llama: true,
    mlx: Platform.OS === 'ios',
    litert: true,
  };
  private activeModelPath: string | null = null;
  private map: Record<EngineId, InferenceManager> = {
    llama: llamaAdapter,
    mlx: mlxManager,
    litert: litertManager,
  };

  private normalizeEnabled(enabled: Record<EngineId, boolean>) {
    if (enabled.llama || enabled.mlx || enabled.litert) {
      return enabled;
    }

    return {
      ...enabled,
      llama: true,
    };
  }

  async load() {
    const [storedActive, storedEnabled] = await Promise.all([
      AsyncStorage.getItem(keyActive),
      AsyncStorage.getItem(keyEnabled),
    ]);

    if (storedActive === 'mlx' || storedActive === 'llama' || storedActive === 'litert') {
      if (storedActive === 'mlx' && Platform.OS === 'android') {
        this.engine = 'llama';
      } else {
        this.engine = storedActive;
      }
    }

    if (storedEnabled) {
      try {
        const parsed = JSON.parse(storedEnabled) as Record<EngineId, boolean>;
        this.enabled = this.normalizeEnabled({
          llama: parsed.llama !== false,
          mlx: Platform.OS === 'ios' ? (parsed.mlx !== false) : false,
          litert: parsed.litert !== false,
        });
      } catch {
      }
    }

    return { active: this.engine, enabled: { ...this.enabled } };
  }

  async set(engine: EngineId) {
    this.engine = engine;
    await AsyncStorage.setItem(keyActive, engine);
  }

  async setEnabled(engine: EngineId, value: boolean) {
    this.enabled = this.normalizeEnabled({ ...this.enabled, [engine]: value });
    await AsyncStorage.setItem(keyEnabled, JSON.stringify(this.enabled));
  }

  get() {
    return this.engine;
  }

  getEnabled() {
    return { ...this.enabled };
  }

  isEnabled(engine: EngineId) {
    return Boolean(this.enabled[engine]);
  }

  getActiveModelPath() {
    return this.activeModelPath;
  }

  getEngineForModel(modelPath: string, modelFormat?: string): EngineId {
    if (modelFormat === 'gguf') return 'llama';
    if (modelFormat === 'mlx') return 'mlx';
    if (modelFormat === 'litert') return 'litert';
    const lower = modelPath.toLowerCase();
    if (lower.endsWith('.gguf')) return 'llama';
    if (lower.endsWith('.litertlm') || lower.endsWith('.task')) return 'litert';
    if (
      lower.endsWith('.safetensors') ||
      lower.endsWith('.json') ||
      lower.includes('/huggingface/models/') ||
      lower.includes('mlx-community') ||
      lower.includes('mlx')
    ) return 'mlx';
    return 'llama';
  }

  async initModel(modelPath: string, projectorPath?: string, modelFormat?: string) {
    const engine = this.getEngineForModel(modelPath, modelFormat);
    if (!this.isEnabled(engine)) {
      throw new Error('engine_disabled');
    }

    if (engine !== this.engine) {
      if (this.map[this.engine].ready()) {
        await this.map[this.engine].release();
      }
      this.activeModelPath = null;
      await this.set(engine);
    } else if (this.map[engine].ready()) {
      await this.map[engine].release();
      this.activeModelPath = null;
    }

    await this.map[this.engine].init(modelPath, projectorPath);
    this.activeModelPath = modelPath;
  }

  async release() {
    await this.map[this.engine].release();
    this.activeModelPath = null;
  }

  mgr() {
    return this.map[this.engine];
  }

  stop() {
    this.map[this.engine].stop?.();
  }

  ready() {
    return this.map[this.engine].ready();
  }

  caps() {
    return featureCaps[this.engine];
  }

  on(feature: keyof typeof featureCaps['llama']) {
    return isFeatureOn(this.engine, feature);
  }

  needsRestart() {
    return false;
  }
}

export const engineService = new EngineService();
