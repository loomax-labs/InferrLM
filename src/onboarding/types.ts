export type ExpertiseLevel = 'new' | 'comfortable' | 'experienced';

/** Intended-use ids aligned with onboarding lesson and profile screens. */
export type OnboardingIntentId =
  | 'chat'
  | 'coding'
  | 'reasoning'
  | 'photos'
  | 'voice'
  | 'files'
  | 'api'
  | 'explore';

export const ONBOARDING_INTENT_IDS: readonly OnboardingIntentId[] = [
  'chat',
  'coding',
  'reasoning',
  'photos',
  'voice',
  'files',
  'api',
  'explore',
];

export interface OnboardingProfile {
  completed: boolean;
  skipped: boolean;
  expertise: ExpertiseLevel | null;
  intents: OnboardingIntentId[];
  selectedModelNames: string[];
  lessonIds: string[];
  completedAt: string | null;
}

export function createEmptyOnboardingProfile(): OnboardingProfile {
  return {
    completed: false,
    skipped: false,
    expertise: null,
    intents: [],
    selectedModelNames: [],
    lessonIds: [],
    completedAt: null,
  };
}
