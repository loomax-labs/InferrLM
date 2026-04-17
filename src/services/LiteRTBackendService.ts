import {
  checkBackendSupport,
  getRecommendedBackend,
  type Backend,
} from '@inferrlm/react-native-litert-lm';

export type LiteRTBackend = Backend;

const BACKEND_LABELS: Record<LiteRTBackend, string> = {
  cpu: 'CPU',
  gpu: 'GPU',
  npu: 'NPU',
};

export const litertBackendOptions: LiteRTBackend[] = ['cpu', 'gpu', 'npu'];

export const formatLiteRTBackend = (backend: LiteRTBackend): string => BACKEND_LABELS[backend];

export const getLiteRTRecommendedBackend = (): LiteRTBackend => getRecommendedBackend();

export const getLiteRTBackendWarning = (backend: LiteRTBackend): string | undefined => checkBackendSupport(backend);

export const isLiteRTBackendSelectable = (backend: LiteRTBackend): boolean => {
  const warning = getLiteRTBackendWarning(backend);
  if (!warning) {
    return true;
  }

  return !warning.toLowerCase().includes('not yet supported');
};