import AsyncStorage from '@react-native-async-storage/async-storage';

import type { BenchmarkSample } from '../managers/inference-manager';
import type {
  BenchmarkConfig,
  BenchmarkMetrics,
  BenchmarkProgress,
  BenchmarkResult,
  BenchmarkValueStats,
} from '../types/benchmark';
import { engineService } from './inference-engine-service';
import { modelDownloader } from './ModelDownloader';

const STORAGE_KEY = '@benchmark_history_v1';

class BenchmarkService {
  private percentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) {
      return 0;
    }

    const index = (sortedValues.length - 1) * percentile;
    const lower = Math.floor(index);
    const upper = Math.ceil(index);

    if (lower === upper) {
      return sortedValues[lower];
    }

    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private buildStats(values: number[]): BenchmarkValueStats {
    if (values.length === 0) {
      return { min: 0, max: 0, avg: 0, median: 0, p25: 0, p75: 0 };
    }

    const sorted = [...values].sort((left, right) => left - right);
    const sum = sorted.reduce((total, value) => total + value, 0);

    return {
      min: sorted[0],
      max: sorted[sorted.length - 1],
      avg: sum / sorted.length,
      median: this.percentile(sorted, 0.5),
      p25: this.percentile(sorted, 0.25),
      p75: this.percentile(sorted, 0.75),
    };
  }

  private aggregate(samples: BenchmarkSample[]): BenchmarkMetrics {
    return {
      promptTokens: this.buildStats(samples.map(sample => sample.promptTokens)),
      completionTokens: this.buildStats(samples.map(sample => sample.completionTokens)),
      totalTokens: this.buildStats(samples.map(sample => sample.totalTokens)),
      ttftMs: this.buildStats(samples.map(sample => sample.ttftMs)),
      totalTimeMs: this.buildStats(samples.map(sample => sample.totalTimeMs)),
      prefillTokensPerSecond: this.buildStats(samples.map(sample => sample.prefillTokensPerSecond)),
      decodeTokensPerSecond: this.buildStats(samples.map(sample => sample.decodeTokensPerSecond)),
    };
  }

  private async getAllHistory(): Promise<BenchmarkResult[]> {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (!stored) {
        return [];
      }

      const parsed = JSON.parse(stored) as BenchmarkResult[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  async save(result: BenchmarkResult): Promise<void> {
    const history = await this.getAllHistory();
    const next = [result, ...history].slice(0, 50);
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }

  async getHistory(modelPath?: string): Promise<BenchmarkResult[]> {
    const history = await this.getAllHistory();
    if (!modelPath) {
      return history;
    }
    return history.filter(entry => entry.modelPath === modelPath);
  }

  exportCsv(results: BenchmarkResult[]): string {
    const header = [
      'id',
      'created_at',
      'model_name',
      'engine',
      'warmup_runs',
      'benchmark_runs',
      'ttft_avg_ms',
      'total_time_avg_ms',
      'prefill_avg_tps',
      'decode_avg_tps',
    ];

    const rows = results.map(result => [
      result.id,
      result.createdAt,
      result.modelName,
      result.engine,
      String(result.warmupRuns),
      String(result.benchmarkRuns),
      result.metrics.ttftMs.avg.toFixed(2),
      result.metrics.totalTimeMs.avg.toFixed(2),
      result.metrics.prefillTokensPerSecond.avg.toFixed(2),
      result.metrics.decodeTokensPerSecond.avg.toFixed(2),
    ]);

    return [header, ...rows]
      .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n');
  }

  async *run(config: BenchmarkConfig): AsyncGenerator<BenchmarkProgress> {
    const totalRuns = config.warmupRuns + config.benchmarkRuns;
    const storedModels = await modelDownloader.getStoredModels();
    const targetModel = storedModels.find(model => model.path === config.modelPath);

    if (!targetModel) {
      throw new Error('benchmark_model_not_found');
    }

    yield {
      phase: 'loading',
      current: 0,
      total: totalRuns,
    };

    await engineService.initModel(config.modelPath, undefined, targetModel.modelFormat);
    const manager = engineService.mgr();

    if (!manager.benchmark) {
      throw new Error('benchmark_not_supported');
    }

    for (let index = 0; index < config.warmupRuns; index += 1) {
      await manager.benchmark(config.prompt, { settings: config.settings });
      yield {
        phase: 'warmup',
        current: index + 1,
        total: totalRuns,
      };
    }

    const samples: BenchmarkSample[] = [];
    for (let index = 0; index < config.benchmarkRuns; index += 1) {
      const sample = await manager.benchmark(config.prompt, { settings: config.settings });
      samples.push(sample);
      yield {
        phase: 'benchmark',
        current: config.warmupRuns + index + 1,
        total: totalRuns,
        sample,
      };
    }

    const result: BenchmarkResult = {
      id: `${config.modelPath}-${Date.now()}`,
      modelPath: config.modelPath,
      modelName: config.modelName,
      engine: engineService.get(),
      prompt: config.prompt,
      warmupRuns: config.warmupRuns,
      benchmarkRuns: config.benchmarkRuns,
      createdAt: new Date().toISOString(),
      samples,
      metrics: this.aggregate(samples),
    };

    yield {
      phase: 'saving',
      current: totalRuns,
      total: totalRuns,
      result,
    };

    await this.save(result);

    yield {
      phase: 'done',
      current: totalRuns,
      total: totalRuns,
      result,
    };
  }
}

export const benchmarkService = new BenchmarkService();
