import { DOWNLOADABLE_MODELS } from '../constants/DownloadableModels';
import { DownloadableModel } from '../components/model/DownloadableModelItem';
import { ModelFormat, ModelType } from '../types/models';
import type {
  ExpertiseLevel,
  OnboardingIntentId,
  OnboardingProfile,
} from './types';

export interface RecommendDeviceContext {
  totalMemoryBytes: number;
  platform: 'android' | 'ios';
  freeDiskBytes: number;
}

export type RecommendationReason =
  | 'default'
  | 'recommended'
  | 'fast'
  | 'vision'
  | 'audio'
  | 'coding'
  | 'reasoning';

export interface RecommendedModel {
  model: DownloadableModel;
  preselected: boolean;
  reason: RecommendationReason;
}

const MIN_FREE_SPACE_BYTES = 100 * 1024 * 1024;
const ADDITIONAL_FILE_ESTIMATE_BYTES = 600 * 1024 * 1024;

const FALLBACK_MODEL_NAMES = [
  'Gemma 4 E2B Instruct',
  'Gemma 4 E2B Instruct (LiteRT)',
  'Qwen3.5 0.8B Instruct',
  'Qwen3.5 2B Instruct',
] as const;

const MAX_RECOMMENDATIONS = 5;

export function parseModelSizeBytes(size: string): number {
  const trimmed = size.trim();
  const match = trimmed.match(/^([\d.]+)\s*(GB|MB|KB|B)$/i);
  if (!match) {
    return 0;
  }
  const value = parseFloat(match[1]);
  if (!Number.isFinite(value) || value < 0) {
    return 0;
  }
  const unit = match[2].toUpperCase();
  const multipliers: Record<string, number> = {
    B: 1,
    KB: 1024,
    MB: 1024 ** 2,
    GB: 1024 ** 3,
  };
  return Math.round(value * multipliers[unit]);
}

export function getModelDownloadSizeBytes(model: DownloadableModel): number {
  let total = parseModelSizeBytes(model.size);
  if (model.additionalFiles?.length) {
    for (const file of model.additionalFiles) {
      const fileWithSize = file as { size?: string };
      if (fileWithSize.size) {
        total += parseModelSizeBytes(fileWithSize.size);
      } else {
        total += ADDITIONAL_FILE_ESTIMATE_BYTES;
      }
    }
  }
  return total;
}

export function requiredDiskBytesForDownload(downloadBytes: number): number {
  const buffer = Math.max(MIN_FREE_SPACE_BYTES, downloadBytes * 0.1);
  return downloadBytes + buffer;
}

export function modelFitsOnDevice(
  model: DownloadableModel,
  freeDiskBytes: number,
): boolean {
  const downloadBytes = getModelDownloadSizeBytes(model);
  return freeDiskBytes >= requiredDiskBytesForDownload(downloadBytes);
}

function isLiteRTModel(model: DownloadableModel): boolean {
  return (
    model.modelFormat === ModelFormat.LITERT ||
    model.tags?.includes('litert') === true
  );
}

function isVisionModel(model: DownloadableModel): boolean {
  return (
    model.modelType === ModelType.VISION ||
    model.supportsMultimodal === true ||
    model.tags?.includes('vision') === true ||
    model.capabilities?.includes('vision') === true
  );
}

function hasAudioCapability(model: DownloadableModel): boolean {
  return model.capabilities?.includes('audio') === true;
}

function isCodingModel(model: DownloadableModel): boolean {
  return /coder/i.test(model.name);
}

function isReasoningModel(model: DownloadableModel): boolean {
  return (
    model.tags?.includes('reasoning') === true ||
    /reasoning/i.test(model.name)
  );
}

function maxModelBytesForRam(totalMemoryBytes: number): number {
  const ramGb = totalMemoryBytes / 1024 ** 3;
  if (ramGb < 4) {
    return 2 * 1024 ** 3;
  }
  if (ramGb < 6) {
    return 3.2 * 1024 ** 3;
  }
  if (ramGb < 8) {
    return 4.8 * 1024 ** 3;
  }
  return 6 * 1024 ** 3;
}

function modelWithinRamBudget(
  model: DownloadableModel,
  totalMemoryBytes: number,
): boolean {
  return getModelDownloadSizeBytes(model) <= maxModelBytesForRam(totalMemoryBytes);
}

function intentsNeedVision(intents: OnboardingIntentId[]): boolean {
  return intents.includes('photos');
}

function intentsNeedAudio(intents: OnboardingIntentId[]): boolean {
  return intents.includes('voice');
}

function intentsNeedCoding(intents: OnboardingIntentId[]): boolean {
  return intents.includes('coding');
}

function intentsNeedReasoning(intents: OnboardingIntentId[]): boolean {
  return intents.includes('reasoning');
}

function hasSpecialIntentFilters(intents: OnboardingIntentId[]): boolean {
  return intents.some((id) =>
    ['photos', 'voice', 'coding', 'reasoning'].includes(id),
  );
}

function matchesIntentUnion(
  model: DownloadableModel,
  intents: OnboardingIntentId[],
): boolean {
  if (!hasSpecialIntentFilters(intents)) {
    return true;
  }

  const checks: boolean[] = [];

  if (intentsNeedVision(intents)) {
    checks.push(isVisionModel(model));
  }
  if (intentsNeedAudio(intents)) {
    checks.push(hasAudioCapability(model));
  }
  if (intentsNeedCoding(intents)) {
    checks.push(isCodingModel(model));
  }
  if (intentsNeedReasoning(intents)) {
    checks.push(isReasoningModel(model));
  }

  return checks.some(Boolean);
}

function engineSortScore(
  model: DownloadableModel,
  device: RecommendDeviceContext,
  intents: OnboardingIntentId[],
): number {
  if (device.platform === 'ios') {
    return isLiteRTModel(model) ? -100 : 0;
  }

  const preferLiteRT =
    intentsNeedVision(intents) || intentsNeedAudio(intents);

  if (preferLiteRT) {
    return isLiteRTModel(model) ? 20 : 0;
  }

  return isLiteRTModel(model) ? -5 : 5;
}

function tagScore(model: DownloadableModel): number {
  let score = 0;
  if (model.tags?.includes('recommended')) {
    score += 12;
  }
  if (model.tags?.includes('fastest')) {
    score += 6;
  }
  if (model.tags?.includes('reasoning')) {
    score += 4;
  }
  return score;
}

function intentRankScore(
  model: DownloadableModel,
  intents: OnboardingIntentId[],
): number {
  let score = 0;

  if (intentsNeedVision(intents) && isVisionModel(model)) {
    score += 30;
  }
  if (intentsNeedAudio(intents) && hasAudioCapability(model)) {
    score += 28;
  }
  if (intentsNeedCoding(intents) && isCodingModel(model)) {
    score += 26;
    if (/Qwen3\.5 Coder 3B/i.test(model.name)) {
      score += 8;
    }
    if (/Qwen3\.5 Coder 7B/i.test(model.name)) {
      score += 2;
    }
    if (/Qwen 2\.5 Coder Instruct/i.test(model.name) && !/7B/.test(model.name)) {
      score += 4;
    }
  }
  if (intentsNeedReasoning(intents) && isReasoningModel(model)) {
    score += 24;
    if (/VibeThinker|Phi-4 Mini Reasoning/i.test(model.name)) {
      score += 6;
    }
    if (/Ministral 3 8B|Qwen3\.5 9B/i.test(model.name)) {
      score += 3;
    }
  }

  const generalIntents =
    intents.includes('chat') ||
    intents.includes('explore') ||
    intents.includes('files') ||
    intents.includes('api');

  if (generalIntents && !isVisionModel(model) && model.tags?.includes('recommended')) {
    score += 18;
  }

  return score;
}

function expertiseSizeBias(
  model: DownloadableModel,
  expertise: ExpertiseLevel,
): number {
  const size = getModelDownloadSizeBytes(model);
  if (expertise === 'new') {
    return Math.max(0, 40 - size / (128 * 1024 ** 2));
  }
  if (expertise === 'comfortable') {
    return model.tags?.includes('recommended') ? 10 : 0;
  }
  return 0;
}

function compareModels(
  a: DownloadableModel,
  b: DownloadableModel,
  profile: Pick<OnboardingProfile, 'expertise' | 'intents'>,
  device: RecommendDeviceContext,
): number {
  const scoreA =
    intentRankScore(a, profile.intents) +
    engineSortScore(a, device, profile.intents) +
    tagScore(a) +
    expertiseSizeBias(a, profile.expertise);
  const scoreB =
    intentRankScore(b, profile.intents) +
    engineSortScore(b, device, profile.intents) +
    tagScore(b) +
    expertiseSizeBias(b, profile.expertise);

  if (scoreB !== scoreA) {
    return scoreB - scoreA;
  }

  if (profile.expertise === 'new') {
    return getModelDownloadSizeBytes(a) - getModelDownloadSizeBytes(b);
  }

  return getModelDownloadSizeBytes(b) - getModelDownloadSizeBytes(a);
}

function filterCatalog(
  device: RecommendDeviceContext,
): DownloadableModel[] {
  return DOWNLOADABLE_MODELS.filter((model) => {
    if (device.platform === 'ios' && isLiteRTModel(model)) {
      return false;
    }
    if (!modelWithinRamBudget(model, device.totalMemoryBytes)) {
      return false;
    }
    if (!modelFitsOnDevice(model, device.freeDiskBytes)) {
      return false;
    }
    return true;
  });
}

function expandForExperienced(
  sorted: DownloadableModel[],
): DownloadableModel[] {
  if (sorted.length === 0) {
    return sorted;
  }

  const primary = sorted[0];
  const primarySize = getModelDownloadSizeBytes(primary);
  const smaller = sorted.find(
    (m) => getModelDownloadSizeBytes(m) < primarySize * 0.9,
  );
  const larger = [...sorted]
    .reverse()
    .find((m) => getModelDownloadSizeBytes(m) > primarySize * 1.1);

  const seen = new Set<string>();
  const result: DownloadableModel[] = [];

  for (const model of [primary, smaller, larger, ...sorted]) {
    if (!model || seen.has(model.name)) {
      continue;
    }
    seen.add(model.name);
    result.push(model);
    if (result.length >= MAX_RECOMMENDATIONS) {
      break;
    }
  }

  return result;
}

function pickFallbackModels(
  device: RecommendDeviceContext,
): DownloadableModel[] {
  const byName = new Map(
    DOWNLOADABLE_MODELS.map((model) => [model.name, model]),
  );

  const orderedNames =
    device.platform === 'android'
      ? FALLBACK_MODEL_NAMES
      : FALLBACK_MODEL_NAMES.filter((name) => !name.includes('LiteRT'));

  const fits: DownloadableModel[] = [];
  for (const name of orderedNames) {
    const model = byName.get(name);
    if (!model) {
      continue;
    }
    if (device.platform === 'ios' && isLiteRTModel(model)) {
      continue;
    }
    if (!modelFitsOnDevice(model, device.freeDiskBytes)) {
      continue;
    }
    fits.push(model);
  }

  return fits.slice(0, MAX_RECOMMENDATIONS);
}

function reasonForModel(
  model: DownloadableModel,
  intents: OnboardingIntentId[],
): RecommendationReason {
  if (intentsNeedVision(intents) && isVisionModel(model)) {
    return 'vision';
  }
  if (intentsNeedAudio(intents) && hasAudioCapability(model)) {
    return 'audio';
  }
  if (intentsNeedCoding(intents) && isCodingModel(model)) {
    return 'coding';
  }
  if (intentsNeedReasoning(intents) && isReasoningModel(model)) {
    return 'reasoning';
  }
  if (model.tags?.includes('fastest')) {
    return 'fast';
  }
  if (model.tags?.includes('recommended')) {
    return 'recommended';
  }
  return 'default';
}

function withPreselection(
  models: DownloadableModel[],
  profile: Pick<OnboardingProfile, 'expertise' | 'intents'>,
): RecommendedModel[] {
  if (models.length === 0) {
    return [];
  }

  let preselectedIndex = 0;

  if (profile.expertise === 'new') {
    const tagged = models.findIndex(
      (m) =>
        m.tags?.includes('recommended') || m.tags?.includes('fastest'),
    );
    if (tagged >= 0) {
      preselectedIndex = tagged;
    } else {
      preselectedIndex = models.reduce(
        (bestIdx, model, idx, arr) =>
          getModelDownloadSizeBytes(model) <
          getModelDownloadSizeBytes(arr[bestIdx])
            ? idx
            : bestIdx,
        0,
      );
    }
  }

  return models.map((model, index) => ({
    model,
    preselected: index === preselectedIndex,
    reason: reasonForModel(model, profile.intents),
  }));
}

export function recommendModels(
  profile: Pick<OnboardingProfile, 'expertise' | 'intents'>,
  device: RecommendDeviceContext,
): RecommendedModel[] {
  const intents: OnboardingIntentId[] =
    profile.intents.length > 0 ? profile.intents : ['chat'];
  const expertise: ExpertiseLevel = profile.expertise ?? 'comfortable';
  const rankedProfile = { expertise, intents };

  let candidates = filterCatalog(device).filter((model) =>
    matchesIntentUnion(model, intents),
  );

  candidates.sort((a, b) => compareModels(a, b, rankedProfile, device));

  if (expertise === 'experienced') {
    candidates = expandForExperienced(candidates);
  } else {
    const seen = new Set<string>();
    candidates = candidates.filter((model) => {
      if (seen.has(model.name)) {
        return false;
      }
      seen.add(model.name);
      return true;
    });
    candidates = candidates.slice(0, MAX_RECOMMENDATIONS);
  }

  if (candidates.length === 0) {
    candidates = pickFallbackModels(device);
  }

  return withPreselection(candidates, rankedProfile);
}
