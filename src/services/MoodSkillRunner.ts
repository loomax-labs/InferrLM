import type { Skill } from '../types/skill';
import { formatSkillChatText } from './adapters/SkillResultFormatter';
import { skillExecutor } from './SkillExecutor';
import { parseHistoryDays, parseMoodDateLabel, parseTargetDate } from './skillDateParse';

type MoodPayload = {
  action: string;
  score?: number;
  comment?: string;
  date?: string;
  days?: number;
  show_dashboard?: boolean;
};

const extractScore = (text: string): number | null => {
  const patterns = [
    /\b(?:mood|score|feeling(?: like)?)\s*(?:as|of|is|at)?\s*(?:a\s*)?(\d{1,2})\b/i,
    /\b(\d{1,2})\s*(?:\/\s*10|out of 10)\b/i,
    /\b(?:rate|log|record)\s+(?:my\s+)?mood\s+(?:as\s+)?(\d{1,2})\b/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) {
      const value = Number(match[1]);
      if (value >= 1 && value <= 10) {
        return value;
      }
    }
  }

  return null;
};

const extractComment = (text: string): string => {
  const patterns = [
    /,\s*(?:feeling\s+)?(.+)$/i,
    /\b(?:feeling|because|note)[:\s]+(.+)/i,
    /\btoday[,\s]+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      const comment = match[1].trim();
      if (comment && !/^\d+$/.test(comment)) {
        return comment.replace(/\.$/, '');
      }
    }
  }

  return '';
};

const parseMoodPayload = (userText: string, base: Date): MoodPayload | null => {
  const lower = userText.toLowerCase();

  if (/\b(wipe|clear)\b.*\b(mood|history|data)\b/i.test(userText) || /\bwipe my data\b/i.test(lower)) {
    return { action: 'wipe_data' };
  }

  if (/\b(export|backup)\b.*\b(mood|data)\b/i.test(userText) || /\bexport my\b/i.test(lower)) {
    return { action: 'export_data' };
  }

  if (/\b(delete|remove)\b.*\bmood\b/i.test(lower)) {
    return {
      action: 'delete_mood',
      date: parseMoodDateLabel(userText, base),
    };
  }

  if (/\b(plot|chart|graph|visualize)\b/i.test(lower)) {
    return {
      action: 'get_history',
      days: parseHistoryDays(userText),
      show_dashboard: true,
    };
  }

  if (
    /\b(history|dashboard|lately|journey)\b/i.test(lower)
    || /\bhow have i been feeling\b/i.test(lower)
    || /\bpast \d+ days\b/i.test(lower)
    || /\blast week\b/i.test(lower)
  ) {
    return {
      action: 'get_history',
      days: parseHistoryDays(userText),
      show_dashboard: /\b(dashboard|chart|plot|graph)\b/i.test(lower),
    };
  }

  if (
    /\bwhat was my mood\b/i.test(lower)
    || (/\bmood\b/i.test(lower) && /\b(on|for|yesterday|today)\b/i.test(lower) && !/\blog\b/i.test(lower))
  ) {
    return {
      action: 'get_mood',
      date: parseMoodDateLabel(userText, base),
    };
  }

  const score = extractScore(userText);
  if (score != null || /\blog\b.*\bmood\b/i.test(lower) || /\brecord\b.*\bmood\b/i.test(lower) || /\bi(?:'m| am) feeling\b/i.test(lower)) {
    if (score == null) {
      return null;
    }
    return {
      action: 'log_mood',
      score,
      comment: extractComment(userText),
      date: parseMoodDateLabel(userText, base),
    };
  }

  return null;
};

export const runMoodSkill = async (skill: Skill, userText: string): Promise<string | null> => {
  console.log('mood_skill_run');
  const base = parseTargetDate('today', new Date());
  const payload = parseMoodPayload(userText, base);
  if (!payload) {
    console.log('mood_skill_parse_miss');
    return null;
  }

  console.log('mood_skill_action', payload.action);
  const result = await skillExecutor.runJs(skill, {
    scriptName: skill.metadata?.scriptName || 'index',
    data: JSON.stringify(payload),
  });

  return formatSkillChatText(skill, result);
};
