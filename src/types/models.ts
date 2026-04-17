export enum ModelType {
  PROJECTION = 'projection',
  VISION = 'vision',
  LLM = 'llm',
}

export enum ModelFormat {
  GGUF = 'gguf',
  MLX = 'mlx',
  LITERT = 'litert',
  UNKNOWN = 'unknown',
}

export interface ModelFile {
  rfilename: string;
  size?: number;
  url?: string;
}

export interface MLXFileGroup {
  required: ModelFile[];
  optional: ModelFile[];
  totalSize: number;
  isSharded: boolean;
}

export interface ModelCapabilities {
  vision?: boolean;
  text?: boolean;
  code?: boolean;
}

export interface EnhancedStoredModel {
  name: string;
  path: string;
  size: number;
  modified: string;
  isExternal?: boolean;
  modelType?: ModelType;
  modelFormat?: ModelFormat;
  isDirectory?: boolean;
  fileCount?: number;
  capabilities?: string[];
  supportsMultimodal?: boolean;
  compatibleProjectionModels?: string[];
  defaultProjectionModel?: string;
}

export interface VisionModelSizeBreakdown {
  llmSize: number;
  projectionSize: number;
  totalSize: number;
  hasProjection: boolean;
}
