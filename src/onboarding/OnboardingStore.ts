import AsyncStorage from '@react-native-async-storage/async-storage';

import {
  createEmptyOnboardingProfile,
  ExpertiseLevel,
  OnboardingIntentId,
  OnboardingProfile,
} from './types';

const STORAGE_KEY = '@inferrlm/onboarding';
const LEGACY_STORAGE_KEY = '@inferra/onboarding';

const INTENT_IDS = new Set<string>([
  'chat',
  'coding',
  'reasoning',
  'photos',
  'voice',
  'files',
  'api',
  'explore',
]);

const EXPERTISE_LEVELS = new Set<string>(['new', 'comfortable', 'experienced']);

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function normalizeProfile(raw: unknown): OnboardingProfile {
  const base = createEmptyOnboardingProfile();
  if (!raw || typeof raw !== 'object') {
    return base;
  }

  const record = raw as Record<string, unknown>;

  const expertise =
    typeof record.expertise === 'string' && EXPERTISE_LEVELS.has(record.expertise)
      ? (record.expertise as ExpertiseLevel)
      : null;

  const intents = isStringArray(record.intents)
    ? record.intents.filter((id): id is OnboardingIntentId => INTENT_IDS.has(id))
    : [];

  const selectedModelNames = isStringArray(record.selectedModelNames)
    ? record.selectedModelNames
    : [];

  const lessonIds = isStringArray(record.lessonIds) ? record.lessonIds : [];

  const completedAt =
    typeof record.completedAt === 'string' ? record.completedAt : null;

  return {
    completed: record.completed === true,
    skipped: record.skipped === true,
    expertise,
    intents,
    selectedModelNames,
    lessonIds,
    completedAt,
  };
}

async function readRaw(): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (raw != null) {
      return raw;
    }
    const legacy = await AsyncStorage.getItem(LEGACY_STORAGE_KEY);
    if (legacy != null) {
      await AsyncStorage.setItem(STORAGE_KEY, legacy);
      try {
        await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        // no-op
      }
      return legacy;
    }
    return null;
  } catch {
    return null;
  }
}

export const onboardingStore = {
  async load(): Promise<OnboardingProfile> {
    const raw = await readRaw();
    if (!raw) {
      return createEmptyOnboardingProfile();
    }
    try {
      return normalizeProfile(JSON.parse(raw));
    } catch {
      return createEmptyOnboardingProfile();
    }
  },

  async save(profile: OnboardingProfile): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(profile));
  },

  async reset(): Promise<void> {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
      await AsyncStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      // no-op
    }
  },

  async clearCompleted(): Promise<void> {
    const profile = await this.load();
    await this.save({
      ...profile,
      completed: false,
      skipped: false,
      completedAt: null,
    });
  },

  async isComplete(): Promise<boolean> {
    try {
      const profile = await this.load();
      return profile.completed;
    } catch {
      return true;
    }
  },

  async markComplete(profile: Partial<OnboardingProfile>): Promise<void> {
    const existing = await this.load();
    const merged: OnboardingProfile = {
      ...existing,
      ...profile,
      completed: true,
      skipped: profile.skipped ?? false,
      intents: profile.intents ?? existing.intents,
      selectedModelNames: profile.selectedModelNames ?? existing.selectedModelNames,
      lessonIds: profile.lessonIds ?? existing.lessonIds,
      completedAt: profile.completedAt ?? new Date().toISOString(),
    };
    await this.save(merged);
  },

  async markSkipped(): Promise<void> {
    const existing = await this.load();
    await this.save({
      ...existing,
      completed: true,
      skipped: true,
      completedAt: new Date().toISOString(),
    });
  },
};
