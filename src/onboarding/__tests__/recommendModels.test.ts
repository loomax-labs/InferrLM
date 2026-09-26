import {
  recommendModels,
  parseModelSizeBytes,
  getModelDownloadSizeBytes,
  modelFitsOnDevice,
  RecommendDeviceContext,
} from '../recommendModels';
import type { OnboardingProfile } from '../types';

function device(overrides: Partial<RecommendDeviceContext> = {}): RecommendDeviceContext {
  return {
    totalMemoryBytes: 8 * 1024 ** 3,
    platform: 'ios',
    freeDiskBytes: 64 * 1024 ** 3,
    ...overrides,
  };
}

function profile(
  overrides: Partial<Pick<OnboardingProfile, 'expertise' | 'intents'>> = {},
): Pick<OnboardingProfile, 'expertise' | 'intents'> {
  return {
    expertise: 'comfortable',
    intents: ['chat'],
    ...overrides,
  };
}

describe('parseModelSizeBytes', () => {
  it('parses GB and MB size strings', () => {
    expect(parseModelSizeBytes('4.98 GB')).toBeCloseTo(4.98 * 1024 ** 3, -3);
    expect(parseModelSizeBytes('0.53 GB')).toBeCloseTo(0.53 * 1024 ** 3, -3);
    expect(parseModelSizeBytes('512 MB')).toBe(512 * 1024 ** 2);
  });

  it('includes additional file estimates in download size', () => {
    const gemma = {
      name: 'Gemma 4 E4B Instruct',
      size: '4.98 GB',
      huggingFaceLink: 'https://example.com/a.gguf',
      licenseLink: 'https://example.com/license',
      modelFamily: '4 Billion',
      quantization: 'Q4_K_M',
      additionalFiles: [{ name: 'mmproj.gguf', url: 'https://example.com/mmproj.gguf' }],
    };
    const base = parseModelSizeBytes(gemma.size);
    expect(getModelDownloadSizeBytes(gemma)).toBeGreaterThan(base);
  });
});

describe('recommendModels RAM bands', () => {
  it('excludes large models on low RAM devices', () => {
    const lowRam = device({ totalMemoryBytes: 3 * 1024 ** 3 });
    const names = recommendModels(profile(), lowRam).map((r) => r.model.name);
    expect(names.some((n) => /Qwen3\.5 9B/i.test(n))).toBe(false);
    expect(names.some((n) => /0\.8B|2B|1B|1\.5B/i.test(n))).toBe(true);
  });

  it('allows larger models when RAM is high', () => {
    const highRam = device({ totalMemoryBytes: 12 * 1024 ** 3 });
    const names = recommendModels(profile(), highRam).map((r) => r.model.name);
    expect(names.length).toBeGreaterThan(0);
    expect(names.length).toBeLessThanOrEqual(5);
  });
});

describe('recommendModels vision intent', () => {
  it('prefers vision-capable models', () => {
    const names = recommendModels(
      profile({ intents: ['photos'] }),
      device({ platform: 'ios' }),
    ).map((r) => r.model.name);
    expect(names.length).toBeGreaterThan(0);
    expect(
      names.every((name) => {
        const rec = recommendModels(profile({ intents: ['photos'] }), device({ platform: 'ios' }))
          .find((r) => r.model.name === name);
        return (
          rec?.model.tags?.includes('vision') ||
          rec?.model.supportsMultimodal ||
          rec?.model.capabilities?.includes('vision')
        );
      }),
    ).toBe(true);
  });

  it('prefers LiteRT on Android for vision', () => {
    const results = recommendModels(
      profile({ intents: ['photos'] }),
      device({ platform: 'android', totalMemoryBytes: 8 * 1024 ** 3 }),
    );
    const top = results[0]?.model.name ?? '';
    expect(top).toMatch(/LiteRT/i);
  });
});

describe('recommendModels coding intent', () => {
  it('surfaces coder models and prefers smaller coder on tight RAM', () => {
    const tight = device({ totalMemoryBytes: 4.5 * 1024 ** 3, platform: 'ios' });
    const names = recommendModels(
      profile({ intents: ['coding'] }),
      tight,
    ).map((r) => r.model.name);
    expect(names.some((n) => /Qwen3\.8|LFM2\.5 2\.6B|Granite 4\.2/i.test(n))).toBe(true);
    expect(names.some((n) => /Qwen 2\.5|CodeLlama|Gemma 2 /i.test(n))).toBe(false);
  });
});

describe('recommendModels audio intent', () => {
  it('prefers LiteRT models with audio capability on Android', () => {
    const results = recommendModels(
      profile({ intents: ['voice'] }),
      device({ platform: 'android', totalMemoryBytes: 8 * 1024 ** 3 }),
    );
    expect(results.length).toBeGreaterThan(0);
    const top = results[0].model;
    expect(top.capabilities?.includes('audio')).toBe(true);
    expect(top.tags?.includes('litert') || top.name.includes('LiteRT')).toBe(true);
  });
});

describe('recommendModels disk rejection', () => {
  it('drops models that do not fit free disk with buffer', () => {
    const huge = getModelDownloadSizeBytes({
      name: 'Qwen3.5 9B Instruct',
      size: '5.68 GB',
      huggingFaceLink: 'https://example.com/q.gguf',
      licenseLink: 'https://example.com/license',
      modelFamily: '9 Billion',
      quantization: 'Q4_K_M',
    });
    const cramped = device({
      freeDiskBytes: huge,
      totalMemoryBytes: 12 * 1024 ** 3,
    });
    expect(
      modelFitsOnDevice(
        {
          name: 'Qwen3.5 9B Instruct',
          size: '5.68 GB',
          huggingFaceLink: 'https://example.com/q.gguf',
          licenseLink: 'https://example.com/license',
          modelFamily: '9 Billion',
          quantization: 'Q4_K_M',
        },
        cramped.freeDiskBytes,
      ),
    ).toBe(false);

    const names = recommendModels(profile(), cramped).map((r) => r.model.name);
    expect(names.some((n) => /Qwen3\.5 9B/i.test(n))).toBe(false);
  });
});

describe('recommendModels expertise', () => {
  it('preselects exactly one model', () => {
    const results = recommendModels(profile({ expertise: 'new' }), device());
    expect(results.filter((r) => r.preselected).length).toBe(1);
  });
});
