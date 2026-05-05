import type { EngineId } from '../managers/inference-manager';

export type EngineSettingsRoute = 'LlamaCppSettings' | 'MlxSettings' | 'LiteRTSettings';

export const engineSettingsRoutes: Record<EngineId, EngineSettingsRoute> = {
  llama: 'LlamaCppSettings',
  mlx: 'MlxSettings',
  litert: 'LiteRTSettings',
};

export const getEngineSettingsRoute = (engine: EngineId): EngineSettingsRoute =>
  engineSettingsRoutes[engine];