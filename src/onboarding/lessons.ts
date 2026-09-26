/**
 * Onboarding lesson copy and ordering. Bodies are keyed by expertise level.
 */

import { localApiWording } from '../services/regionPolicy';
import type {
  ExpertiseLevel,
  OnboardingIntentId,
  OnboardingProfile as FullOnboardingProfile,
} from './types';

export type OnboardingExpertise = ExpertiseLevel;
export type OnboardingIntent = OnboardingIntentId;

export type OnboardingProfile = Pick<
  FullOnboardingProfile,
  'expertise' | 'intents'
> & { expertise: ExpertiseLevel };

export type LessonId =
  | 'glossary'
  | 'app-map'
  | 'feature-chat'
  | 'feature-coding'
  | 'feature-reasoning'
  | 'feature-photos'
  | 'feature-voice'
  | 'feature-files'
  | 'feature-api'
  | 'howto-download'
  | 'howto-turn-on'
  | 'howto-send'
  | 'howto-attach'
  | 'howto-combined'
  | 'what-happens-next';

export type ExpertiseBodies = Record<OnboardingExpertise, string>;

export type LessonDefinition = {
  id: LessonId;
  bodies: ExpertiseBodies;
};

export type LessonStep = {
  id: LessonId;
  body: string;
};

export type LessonsForOptions = {
  /** Experienced users: include the comfortable combined how-to (e.g. "Show me how"). */
  includeHowTo?: boolean;
  /** After confirm: whether a download was started (affects what-happens-next copy). */
  downloadStarted?: boolean;
};

/** Jargon that must not appear in `new` copy (tests scan all new bodies). */
export const NEW_USER_BANNED_JARGON: readonly string[] = [
  'llama.cpp',
  'litert',
  'gguf',
  'mmproj',
  'quantization',
  'rag',
  'composer',
  'system prompt',
  'stream',
  'openai-compatible',
  'openai compatible',
];

const INTENT_TO_FEATURE: Record<OnboardingIntent, LessonId | null> = {
  chat: 'feature-chat',
  coding: 'feature-coding',
  reasoning: 'feature-reasoning',
  photos: 'feature-photos',
  voice: 'feature-voice',
  files: 'feature-files',
  api: 'feature-api',
  explore: 'feature-chat',
};

const FEATURE_ORDER: LessonId[] = [
  'feature-chat',
  'feature-coding',
  'feature-reasoning',
  'feature-photos',
  'feature-voice',
  'feature-files',
  'feature-api',
];

const NEW_INTENT_LABELS: Record<OnboardingIntent, string> = {
  chat: 'Chat and write',
  coding: 'Help with code',
  reasoning: 'Math and hard questions',
  photos: 'Look at photos and files',
  voice: 'Listen to audio',
  files: 'Ask questions about my files',
  api: 'Let other apps connect to this phone',
  explore: 'I just want to look around',
};

const COMFORTABLE_INTENT_LABELS: Record<OnboardingIntent, string> = {
  chat: 'Everyday chat and writing',
  coding: 'Coding',
  reasoning: 'Reasoning and study',
  photos: 'Photos and documents',
  voice: 'Voice and audio',
  files: 'Search my own files',
  api: 'Local API',
  explore: 'Just looking around',
};

export const LESSONS: Record<LessonId, LessonDefinition> = {
  glossary: {
    id: 'glossary',
    bodies: {
      new: [
        'A model is a file you download. It is what writes the replies.',
        'Chat is where you type.',
        'The file stays on this phone. You do not need an account.',
      ].join('\n'),
      comfortable: '',
      experienced: '',
    },
  },
  'app-map': {
    id: 'app-map',
    bodies: {
      new: '', // filled per profile in bodyForAppMap
      comfortable: '', // filled per profile
      experienced: [
        'Chat: composer, stream, stop, history in the header, thinking panel on supported models.',
        'Models: download and manage GGUF / LiteRT builds; history of chats is not here.',
        'Tools: Prompt Lab, Skills, Audio Scribe, Mobile Actions, Benchmark, Local Server (OpenAI-compatible when started).',
        'Settings: theme, runtime, system prompt, storage.',
        'Downloads start from Models. Root and AppFunctions stay off under Settings → Advanced capabilities.',
      ].join('\n'),
    },
  },
  'feature-chat': {
    id: 'feature-chat',
    bodies: {
      new: [
        'Type a message and wait.',
        'The reply is written on this phone.',
        'You can start over or open old chats from the top.',
      ].join('\n'),
      comfortable: [
        'Type in Chat and get a local reply.',
        'Some models show thinking notes before the answer.',
        'Open past chats from the header.',
      ].join('\n'),
      experienced:
        'Chat: composer, stream, stop generation, history in header, thinking panel when the model supports it.',
    },
  },
  'feature-coding': {
    id: 'feature-coding',
    bodies: {
      new: [
        'A coding model is better at code than a general chat file.',
        'You can try prompts in Tools under Prompt Lab.',
      ].join('\n'),
      comfortable:
        'Use a coding-capable model. Prompt Lab under Tools is a live place to try prompts.',
      experienced:
        'Prompt Lab for trials; prefer a Coder quant that fits RAM when you download.',
    },
  },
  'feature-reasoning': {
    id: 'feature-reasoning',
    bodies: {
      new: [
        'Some models show notes about how they thought before the answer.',
        'Bigger ones need more phone memory, so we may suggest a smaller file.',
      ].join('\n'),
      comfortable:
        'Reasoning models use a thinking panel; larger files need more memory—pick a size that fits your phone.',
      experienced:
        'Prefer models tagged reasoning; use a smaller distill if RAM is tight.',
    },
  },
  'feature-photos': {
    id: 'feature-photos',
    bodies: {
      new: [
        'You can add a photo from the chat box.',
        'The download may include a second helper file so the model can see pictures.',
        'If this model cannot read a file, the app will say so and offer to use the text instead.',
      ].join('\n'),
      comfortable:
        'Attach photos or documents in chat. A helper file may ship with the model; text fallback if vision is unavailable.',
      experienced:
        'Vision via mmproj when required; respect vision caps; text fallback in attach flow.',
    },
  },
  'feature-voice': {
    id: 'feature-voice',
    bodies: {
      new: [
        'Open Tools, then Audio Scribe, to turn speech into text.',
        'Some models can also take audio in chat.',
      ].join('\n'),
      comfortable:
        'Audio Scribe in Tools transcribes speech; some chat models accept audio input.',
      experienced:
        'Audio Scribe plus audio capability on LiteRT Gemma when that build is your pick.',
    },
  },
  'feature-files': {
    id: 'feature-files',
    bodies: {
      new: [
        'You can save a file in the chat and ask questions about it later.',
        'That switch is separate from the model download.',
      ].join('\n'),
      comfortable:
        'File search (RAG) lets you query saved files from chat; enable it separately from the model file.',
      experienced: 'RAG lives in the attach flow, not in the GGUF download itself.',
    },
  },
  'feature-api': {
    id: 'feature-api',
    bodies: {
      new: [
        'Tools → Local Server lets another app on this phone talk to the model.',
        'It stays off until you start it. There is a setup page there.',
      ].join('\n'),
      comfortable:
        'Local server under Tools: address, QR, setup guide; auto-start stays off until you enable it.',
      experienced:
        'OpenAI-compatible local server: URL, QR, API setup guide; auto-start off by default.',
    },
  },
  'howto-download': {
    id: 'howto-download',
    bodies: {
      new: 'The next screen suggests one file. You can leave the app while it downloads.',
      comfortable: '',
      experienced: '',
    },
  },
  'howto-turn-on': {
    id: 'howto-turn-on',
    bodies: {
      new:
        'When the download finishes, open Chat, tap the model button, and choose that file. Chat does not answer until you do this.',
      comfortable: '',
      experienced: '',
    },
  },
  'howto-send': {
    id: 'howto-send',
    bodies: {
      new: [
        'Type and send. You can stop a reply.',
        'How the assistant should behave and light or dark look are in Settings.',
      ].join('\n'),
      comfortable: '',
      experienced: '',
    },
  },
  'howto-attach': {
    id: 'howto-attach',
    bodies: {
      new: [
        'Use the attach button in the chat box.',
        'For saved files, turn on "use my files" in that menu.',
        'For audio you want as text first, open Audio Scribe in Tools.',
      ].join('\n'),
      comfortable: '',
      experienced: '',
    },
  },
  'howto-combined': {
    id: 'howto-combined',
    bodies: {
      new: '',
      comfortable: [
        'Download a suggested model file; you can leave the app while it downloads.',
        'When it finishes, open Chat, pick that file from the model button—chat stays quiet until you do.',
        'Type to send; you can stop a reply. Behavior and theme live in Settings.',
      ].join('\n'),
      experienced: '', // uses comfortable text when includeHowTo
    },
  },
  'what-happens-next': {
    id: 'what-happens-next',
    bodies: {
      new: '', // built from downloadStarted
      comfortable: '',
      experienced: '',
    },
  },
};

const EXTRA_INTENT_SNIPPETS_NEW: Partial<Record<OnboardingIntent, string>> = {
  voice: 'You can also try Audio Scribe in Tools for speech to text.',
  files: 'You can turn on "use my files" in the chat attach menu when you are ready.',
  api: 'Other apps can talk to this phone through Local Server in Tools when you turn it on.',
};

function intentsNeedAttach(intents: OnboardingIntent[]): boolean {
  return intents.some((i) => i === 'photos' || i === 'files' || i === 'voice');
}

function toolLinesForMap(intents: OnboardingIntent[], expertise: OnboardingExpertise): string[] {
  const lines: string[] = [];
  const needsPromptLab = intents.includes('coding');
  const needsScribe = intents.includes('voice');
  const needsServer = intents.includes('api');

  if (expertise === 'new') {
    if (needsPromptLab) lines.push('Tools: Prompt Lab is where you can try coding prompts.');
    if (needsScribe) lines.push('Tools: Audio Scribe turns speech into text.');
    if (needsServer) lines.push('Tools: Local Server lets other apps on this phone connect.');
    return lines;
  }

  if (expertise === 'comfortable') {
    const named: string[] = [];
    if (needsPromptLab) named.push('Prompt Lab');
    if (needsScribe) named.push('Audio Scribe');
    if (needsServer) named.push('Local Server');
    if (named.length) {
      lines.push(`Tools tab: ${named.join(', ')} for what you picked.`);
    }
    lines.push('Other tools also live on the Tools tab.');
    return lines;
  }

  return [];
}

function appMapBody(profile: OnboardingProfile): string {
  const { expertise, intents } = profile;
  if (expertise === 'experienced') {
    return LESSONS['app-map'].bodies.experienced;
  }

  if (expertise === 'comfortable') {
    const parts = [
      'Chat: talk after a model is loaded; past chats from the header button.',
      'Models: download model files and manage storage.',
      'Settings: theme, storage, and app options.',
      ...toolLinesForMap(intents, 'comfortable'),
    ];
    return parts.join('\n');
  }

  const parts = [
    'Chat: where you talk after a model is turned on.',
    'Models: where you download that file.',
    'Settings: look, storage, and other options.',
    ...toolLinesForMap(intents, 'new'),
  ];
  return parts.join('\n');
}

function whatHappensNextBody(
  expertise: OnboardingExpertise,
  intents: OnboardingIntent[],
  downloadStarted: boolean,
): string {
  const needsExtras = intents.includes('api') || intents.includes('files');

  if (expertise === 'new') {
    const lines: string[] = [];
    if (downloadStarted) {
      lines.push(
        '1. The file is downloading. When it finishes, open Chat and turn the model on.',
      );
    } else {
      lines.push(
        '1. When you are ready, open Models and download one file. Then turn it on in Chat.',
      );
    }
    if (needsExtras) {
      lines.push(
        '2. Other apps use Local Server in Tools. Questions about your files use the attach menu.',
      );
    }
    return lines.join('\n');
  }

  if (expertise === 'comfortable') {
    const main = downloadStarted
      ? 'Download in progress—open Chat and select the model when it finishes.'
      : 'Grab a model from Models, then enable it in Chat.';
    if (needsExtras) {
      return `${main} Local server and file search are in Tools and the attach menu.`;
    }
    return main;
  }

  const main = downloadStarted
    ? 'Download running; load it from the model picker when done.'
    : 'Download a model from Models, then load it from the model picker.';
  if (needsExtras) {
    return `${main} RAG is in the attach menu; API via Local Server in Tools.`;
  }
  return main;
}

function featureLessonsForIntents(intents: OnboardingIntent[]): LessonId[] {
  const selected = new Set<OnboardingIntent>(intents.length ? intents : ['chat']);
  if (selected.has('explore') && selected.size === 1) {
    return ['feature-chat'];
  }
  const ids: LessonId[] = [];
  for (const lessonId of FEATURE_ORDER) {
    const intent = (Object.keys(INTENT_TO_FEATURE) as OnboardingIntent[]).find(
      (key) => INTENT_TO_FEATURE[key] === lessonId,
    );
    if (!intent) continue;
    if (intent === 'explore') continue;
    if (selected.has(intent)) ids.push(lessonId);
  }
  if (ids.length === 0) ids.push('feature-chat');
  return ids;
}

function mergeComfortableExtras(
  featureIds: LessonId[],
  intents: OnboardingIntent[],
  expertise: OnboardingExpertise,
): { ids: LessonId[]; lastBodySuffix: string } {
  const cap = expertise === 'new' ? 4 : 3;
  const allIds = featureLessonsForIntents(intents);
  if (allIds.length <= cap) {
    return { ids: allIds, lastBodySuffix: '' };
  }

  const kept = allIds.slice(0, cap);
  const dropped = allIds.slice(cap);
  const droppedIntents = dropped
    .map((id) =>
      (Object.entries(INTENT_TO_FEATURE) as [OnboardingIntent, LessonId | null][]).find(
        ([, lessonId]) => lessonId === id,
      )?.[0],
    )
    .filter(Boolean) as OnboardingIntent[];

  if (expertise === 'new') {
    const snippets = droppedIntents
      .map((i) => EXTRA_INTENT_SNIPPETS_NEW[i])
      .filter(Boolean);
    return { ids: kept, lastBodySuffix: snippets.join(' ') };
  }

  const mergeParts = droppedIntents.map((i) => lessonBody(INTENT_TO_FEATURE[i]!, 'comfortable'));
  return { ids: kept, lastBodySuffix: mergeParts.join('\n') };
}

export function lessonBody(id: LessonId, expertise: OnboardingExpertise): string {
  return localApiWording(LESSONS[id].bodies[expertise]);
}

export function intentLabel(intent: OnboardingIntent, expertise: OnboardingExpertise): string {
  if (expertise === 'new') return NEW_INTENT_LABELS[intent];
  return COMFORTABLE_INTENT_LABELS[intent];
}

export function intentLabelsForExpertise(
  expertise: OnboardingExpertise,
): { intent: OnboardingIntent; label: string }[] {
  const intents: OnboardingIntent[] = [
    'chat',
    'coding',
    'reasoning',
    'photos',
    'voice',
    'files',
    'api',
    'explore',
  ];
  return intents.map((intent) => ({
    intent,
    label: intentLabel(intent, expertise),
  }));
}

export function allNewBodies(): string[] {
  return Object.values(LESSONS)
    .map((lesson) => lesson.bodies.new)
    .filter((body) => body.length > 0);
}

export function lessonsFor(
  profile: OnboardingProfile,
  options: LessonsForOptions = {},
): LessonStep[] {
  const { expertise, intents } = profile;
  const steps: LessonStep[] = [];

  const push = (id: LessonId, bodyOverride?: string) => {
    let body = bodyOverride ?? lessonBody(id, expertise);
    if (!body && id === 'howto-combined' && options.includeHowTo && expertise === 'experienced') {
      body = lessonBody('howto-combined', 'comfortable');
      if (intentsNeedAttach(intents)) {
        body += `\n${lessonBody('howto-attach', 'new')}`;
      }
    }
    if (body) steps.push({ id, body });
  };

  if (expertise === 'new') {
    push('glossary');
    push('app-map', appMapBody(profile));

    const { ids, lastBodySuffix } = mergeComfortableExtras(
      featureLessonsForIntents(intents),
      intents,
      'new',
    );
    ids.forEach((id, index) => {
      let body = lessonBody(id, 'new');
      if (index === ids.length - 1 && lastBodySuffix) {
        body = `${body}\n${lastBodySuffix}`;
      }
      steps.push({ id, body });
    });

    push('howto-download');
    push('howto-turn-on');
    push('howto-send');
    if (intentsNeedAttach(intents)) {
      push('howto-attach');
    }
    return steps;
  }

  if (expertise === 'comfortable') {
    push('app-map', appMapBody(profile));
    const { ids, lastBodySuffix } = mergeComfortableExtras(
      featureLessonsForIntents(intents),
      intents,
      'comfortable',
    );
    ids.forEach((id, index) => {
      let body = lessonBody(id, 'comfortable');
      if (index === ids.length - 1 && lastBodySuffix) {
        body = `${body}\n${lastBodySuffix}`;
      }
      steps.push({ id, body });
    });

    let howto = lessonBody('howto-combined', 'comfortable');
    if (intentsNeedAttach(intents)) {
      howto += `\n${[
        'Use the attach button in chat.',
        'Turn on file search in that menu when you need saved files.',
        'Use Audio Scribe for speech you want as text first.',
      ].join(' ')}`;
    }
    push('howto-combined', howto);
    return steps;
  }

  // experienced default teach path
  push('app-map', appMapBody(profile));
  if (options.includeHowTo) {
    push('howto-combined');
  }
  return steps;
}

export function whatHappensNextLesson(
  profile: OnboardingProfile,
  downloadStarted: boolean,
): LessonStep {
  return {
    id: 'what-happens-next',
    body: whatHappensNextBody(profile.expertise, profile.intents, downloadStarted),
  };
}

/** Stable lesson ids for persistence (teach phase only). */
export function lessonIdsFor(profile: OnboardingProfile, options?: LessonsForOptions): LessonId[] {
  return lessonsFor(profile, options).map((step) => step.id);
}
