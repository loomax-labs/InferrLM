import {
  NEW_USER_BANNED_JARGON,
  LESSONS,
  allNewBodies,
  intentLabel,
  lessonBody,
  lessonsFor,
  lessonIdsFor,
  type OnboardingIntent,
  type OnboardingProfile,
} from '../lessons';

const profile = (
  expertise: OnboardingProfile['expertise'],
  intents: OnboardingIntent[],
): OnboardingProfile => ({ expertise, intents });

const containsBanned = (text: string): string | undefined => {
  const lower = text.toLowerCase();
  for (const term of NEW_USER_BANNED_JARGON) {
    const needle = term.toLowerCase();
    if (needle.includes(' ') || needle.includes('.')) {
      if (lower.includes(needle)) return term;
      continue;
    }
    const re = new RegExp(`\\b${needle}\\b`, 'i');
    if (re.test(text)) return term;
  }
  return undefined;
};

describe('lessons copy', () => {
  it('static new bodies avoid banned jargon', () => {
    for (const body of allNewBodies()) {
      expect(containsBanned(body)).toBeUndefined();
    }
  });

  it('new teach steps avoid banned jargon', () => {
    const intents: OnboardingIntent[] = [
      'chat',
      'coding',
      'reasoning',
      'photos',
      'voice',
      'files',
      'api',
    ];
    const steps = lessonsFor(profile('new', intents));
    for (const step of steps) {
      expect(containsBanned(step.body)).toBeUndefined();
    }
  });

  it('experienced bodies are shorter than new for the same feature lesson', () => {
    const featureIds = Object.keys(LESSONS).filter((id) => id.startsWith('feature-'));
    for (const id of featureIds) {
      const newText = lessonBody(id as keyof typeof LESSONS, 'new');
      const experiencedText = lessonBody(id as keyof typeof LESSONS, 'experienced');
      expect(newText.length).toBeGreaterThan(0);
      expect(experiencedText.length).toBeGreaterThan(0);
      expect(experiencedText.length).toBeLessThan(newText.length);
    }
  });
});

describe('intent filtering', () => {
  it('includes only feature lessons matching selected intents', () => {
    const steps = lessonsFor(profile('comfortable', ['coding']));
    const featureSteps = steps.filter((s) => s.id.startsWith('feature-'));
    expect(featureSteps.map((s) => s.id)).toEqual(['feature-coding']);
  });

  it('explore alone yields only the chat feature lesson', () => {
    const steps = lessonsFor(profile('comfortable', ['explore']));
    const featureSteps = steps.filter((s) => s.id.startsWith('feature-'));
    expect(featureSteps.map((s) => s.id)).toEqual(['feature-chat']);
  });

  it('omits photo lesson when photos intent is not selected', () => {
    const steps = lessonsFor(profile('new', ['chat', 'coding']));
    expect(steps.some((s) => s.id === 'feature-photos')).toBe(false);
  });
});

describe('expertise paths', () => {
  it('new path includes glossary and split how-to steps', () => {
    const ids = lessonIdsFor(profile('new', ['chat']));
    expect(ids).toContain('glossary');
    expect(ids).toContain('howto-download');
    expect(ids).toContain('howto-turn-on');
    expect(ids).toContain('howto-send');
    expect(ids).not.toContain('howto-combined');
  });

  it('new path adds attach how-to when media or file intents are selected', () => {
    const withAttach = lessonIdsFor(profile('new', ['chat', 'photos']));
    const without = lessonIdsFor(profile('new', ['chat']));
    expect(withAttach).toContain('howto-attach');
    expect(without).not.toContain('howto-attach');
  });

  it('comfortable path skips glossary and uses one combined how-to', () => {
    const ids = lessonIdsFor(profile('comfortable', ['chat', 'coding']));
    expect(ids).not.toContain('glossary');
    expect(ids).toContain('howto-combined');
    expect(ids.filter((id) => id.startsWith('howto-'))).toHaveLength(1);
  });

  it('experienced default path is only the app map', () => {
    const ids = lessonIdsFor(profile('experienced', ['chat', 'coding', 'photos']));
    expect(ids).toEqual(['app-map']);
  });

  it('experienced optional how-to adds one combined step', () => {
    const ids = lessonIdsFor(profile('experienced', ['chat']), { includeHowTo: true });
    expect(ids).toEqual(['app-map', 'howto-combined']);
  });

  it('new path has more teach steps than experienced for the same intents', () => {
    const intents: OnboardingIntent[] = ['chat', 'coding', 'photos'];
    const newCount = lessonsFor(profile('new', intents)).length;
    const experiencedCount = lessonsFor(profile('experienced', intents)).length;
    expect(newCount).toBeGreaterThan(experiencedCount);
  });

  it('caps feature screens for new and comfortable multi-intent profiles', () => {
    const allIntents: OnboardingIntent[] = [
      'chat',
      'coding',
      'reasoning',
      'photos',
      'voice',
      'files',
      'api',
    ];
    const newFeatures = lessonsFor(profile('new', allIntents)).filter((s) =>
      s.id.startsWith('feature-'),
    );
    const comfortableFeatures = lessonsFor(profile('comfortable', allIntents)).filter((s) =>
      s.id.startsWith('feature-'),
    );
    expect(newFeatures.length).toBeLessThanOrEqual(4);
    expect(comfortableFeatures.length).toBeLessThanOrEqual(3);
  });
});

describe('intent labels', () => {
  it('uses plain labels for new users', () => {
    expect(intentLabel('chat', 'new')).toBe('Chat and write');
    expect(intentLabel('api', 'new')).toBe('Let other apps connect to this phone');
  });

  it('uses product labels for comfortable and experienced', () => {
    expect(intentLabel('files', 'comfortable')).toBe('Search my own files');
    expect(intentLabel('files', 'experienced')).toBe('Search my own files');
  });
});
