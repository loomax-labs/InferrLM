import type { Skill, SkillResult } from '../../types/skill';
import { formatSkillChatText } from '../adapters/SkillResultFormatter';
import { skillExecutor } from '../SkillExecutor';
import { runTextSkill } from '../TextSkillRunner';

type PreviewMeta = {
  input: string;
  hint: string;
};

const SAMPLES: Record<string, PreviewMeta> = {
  'calculate-hash': {
    input: 'inferrlm',
    hint: 'Text to hash',
  },
  'create-calendar-event': {
    input: 'Create a team meeting tomorrow at 2 PM',
    hint: 'Natural language event request',
  },
  'encode-tool': {
    input: '{"action":"base64_encode","text":"Hello"}',
    hint: 'JSON with action and text',
  },
  'interactive-map': {
    input: '{"location":"Golden Gate Bridge, San Francisco"}',
    hint: 'JSON with location',
  },
  'json-toolkit': {
    input: '{"action":"format","text":"{\\"name\\":\\"Ada\\",\\"role\\":\\"dev\\"}"}',
    hint: 'JSON with action and text',
  },
  'kitchen-adventure': {
    input: 'start kitchen adventure',
    hint: 'Adventure start phrase',
  },
  'learn-something-new': {
    input: '{"topic":"Photosynthesis","lang":"en"}',
    hint: 'JSON with topic and lang',
  },
  'mood-tracker': {
    input: '{"action":"log_mood","score":4,"note":"Steady day"}',
    hint: 'JSON mood action payload',
  },
  'qr-code': {
    input: '{"url":"https://inferrlm.app"}',
    hint: 'JSON with url',
  },
  'query-wikipedia': {
    input: '{"topic":"Ada Lovelace","lang":"en"}',
    hint: 'JSON with topic and lang',
  },
  'quick-call': {
    input: 'Call 555-0100',
    hint: 'Phone number to dial',
  },
  'quick-sms': {
    input: 'Text 555-0100 saying On my way',
    hint: 'SMS draft request',
  },
  'read-calendar-events': {
    input: 'Show my calendar events for tomorrow',
    hint: 'Date to read events for',
  },
  'route-planner': {
    input: 'Directions to Central Park, New York',
    hint: 'Destination query',
  },
  'schedule-notification': {
    input: 'Remind me to stretch in 2 minutes',
    hint: 'Reminder time and message',
  },
  'send-email': {
    input: 'Email hello@example.com subject Hello body Thanks for trying InferrLM',
    hint: 'Email draft request',
  },
  'text-stats': {
    input: '{"text":"The quick brown fox jumps over the lazy dog."}',
    hint: 'JSON with text',
  },
  'text-spinner': {
    input: '{"label":"InferrLM"}',
    hint: 'JSON with label',
  },
  'tip-split': {
    input: '{"total":84.5,"tipPercent":18,"people":4}',
    hint: 'JSON bill split payload',
  },
  'unit-convert': {
    input: '{"value":10,"from":"km","to":"mi"}',
    hint: 'JSON convert payload',
  },
  'web-search': {
    input: 'Search the web for React Native skills',
    hint: 'Search query',
  },
  'virtual-piano': {
    input: '{}',
    hint: 'Empty JSON opens piano',
  },
  'restaurant-roulette': {
    input: '{"location":"San Jose","cuisine":"Italian"}',
    hint: 'JSON with location and cuisine',
  },
  'mood-music': {
    input: '{"genre":"House","duration":30,"energy":"high"}',
    hint: 'JSON genre and mood',
  },
};

const defaultMeta = (skill: Skill): PreviewMeta => {
  if (skill.type === 'js') {
    return {
      input: '{}',
      hint: 'JSON input for the skill script',
    };
  }
  return {
    input: `Try the ${skill.name} skill`,
    hint: 'Natural language request',
  };
};

export const getSkillPreviewMeta = (skill: Skill): PreviewMeta => {
  const meta = SAMPLES[skill.id];
  if (meta) {
    return meta;
  }
  console.log('skill_preview_default', skill.id);
  return defaultMeta(skill);
};

export const getSkillPreviewInput = (skill: Skill): string => {
  return getSkillPreviewMeta(skill).input;
};

export const getSkillPreviewHint = (skill: Skill): string => {
  return getSkillPreviewMeta(skill).hint;
};

export const runSkillPreview = async (skill: Skill, input: string): Promise<SkillResult> => {
  console.log('skill_preview_run', skill.id);
  const raw = input.trim() || getSkillPreviewInput(skill);

  if (skill.type === 'text') {
    const text = await runTextSkill(skill, raw);
    if (!text) {
      return { error: 'preview_unavailable' };
    }
    return { result: text };
  }

  if (skill.type === 'js' && skill.scriptHtml) {
    const out = await skillExecutor.runJs(skill, {
      scriptName: skill.metadata?.scriptName,
      data: raw,
    });
    if (out.error) {
      return out;
    }
    const chat = formatSkillChatText(skill, out);
    if (chat && chat !== 'Done.') {
      return { ...out, result: chat };
    }
    return out;
  }

  const fallback = await skillExecutor.run(skill, { input: raw });
  return fallback;
};
