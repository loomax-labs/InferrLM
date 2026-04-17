import type { BenchmarkSample, EngineId, GenSettings } from '../managers/inference-manager';

export type BenchmarkValueStats = {
  min: number;
  max: number;
  avg: number;
  median: number;
  p25: number;
  p75: number;
};

export type BenchmarkMetrics = {
  promptTokens: BenchmarkValueStats;
  completionTokens: BenchmarkValueStats;
  totalTokens: BenchmarkValueStats;
  ttftMs: BenchmarkValueStats;
  totalTimeMs: BenchmarkValueStats;
  prefillTokensPerSecond: BenchmarkValueStats;
  decodeTokensPerSecond: BenchmarkValueStats;
};

export type BenchmarkConfig = {
  modelPath: string;
  modelName: string;
  prompt: string;
  warmupRuns: number;
  benchmarkRuns: number;
  settings?: Partial<GenSettings>;
};

export type BenchmarkResult = {
  id: string;
  modelPath: string;
  modelName: string;
  engine: EngineId;
  prompt: string;
  warmupRuns: number;
  benchmarkRuns: number;
  createdAt: string;
  samples: BenchmarkSample[];
  metrics: BenchmarkMetrics;
};

export type BenchmarkProgress = {
  phase: 'loading' | 'warmup' | 'benchmark' | 'saving' | 'done';
  current: number;
  total: number;
  sample?: BenchmarkSample;
  result?: BenchmarkResult;
};

export type BenchmarkDelta = {
  ttftMs: number;
  totalTimeMs: number;
  prefillTokensPerSecond: number;
  decodeTokensPerSecond: number;
};
