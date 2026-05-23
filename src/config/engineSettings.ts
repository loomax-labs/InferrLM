import type { ComponentProps } from 'react';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import type { EngineId } from '../managers/inference-manager';

export type EngineSettingsRoute = 'LlamaCppSettings' | 'MlxSettings' | 'LiteRTSettings';

type IconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

type EngineSettingsMeta = {
  title: string;
  entryLabel: string;
  entryDescription: string;
  badgeLabel: string;
  iconName: IconName;
  iconKey?: 'llama-cpp';
  accentColor?: string;
  globalSummary: string;
  modelSummary: (modelName: string) => string;
};

export const engineSettingsRoutes: Record<EngineId, EngineSettingsRoute> = {
  llama: 'LlamaCppSettings',
  mlx: 'MlxSettings',
  litert: 'LiteRTSettings',
};

export const engineSettingsMeta: Record<EngineId, EngineSettingsMeta> = {
  llama: {
    title: 'Llama.cpp Settings',
    entryLabel: 'Llama.cpp Settings',
    entryDescription: 'Sampling, penalties, grammar, DRY, and llama.cpp runtime tuning for GGUF models.',
    badgeLabel: 'GGUF',
    iconName: 'cog-outline',
    iconKey: 'llama-cpp',
    globalSummary: 'Applies to local GGUF models using llama.cpp.',
    modelSummary: (modelName: string) => `Applies only to ${modelName}.`,
  },
  mlx: {
    title: 'MLX Settings',
    entryLabel: 'MLX Settings',
    entryDescription: 'Apple MLX generation controls for local MLX models.',
    badgeLabel: 'MLX',
    iconName: 'apple-keyboard-command',
    accentColor: '#005b99',
    globalSummary: 'Applies to MLX models running on Apple devices.',
    modelSummary: (modelName: string) => `Applies only to ${modelName}.`,
  },
  litert: {
    title: 'LiteRT-LM Settings',
    entryLabel: 'LiteRT-LM Settings',
    entryDescription: 'Sampling controls for LiteRT-LM text generation and delegate-backed runtimes.',
    badgeLabel: 'LiteRT',
    iconName: 'memory',
    globalSummary: 'Applies to LiteRT-LM models and delegate-backed runtimes.',
    modelSummary: (modelName: string) => `Applies only to ${modelName}.`,
  },
};

export const getEngineSettingsRoute = (engine: EngineId): EngineSettingsRoute =>
  engineSettingsRoutes[engine];

export const getEngineSettingsMeta = (engine: EngineId): EngineSettingsMeta =>
  engineSettingsMeta[engine];