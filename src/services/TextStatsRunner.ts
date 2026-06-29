import type { Skill } from '../types/skill';
import { formatSkillChatText } from './adapters/SkillResultFormatter';
import { skillExecutor } from './SkillExecutor';

const extractStatsText = (userText: string): string | null => {
  const quoted = userText.match(/["']([^"']{3,})["']/);
  if (quoted?.[1]) {
    return quoted[1].trim();
  }

  const patterns = [
    /(?:stats? for|analyze|word count(?: for)?|text stats(?: for)?|count (?:words|characters) (?:in|for))\s*[:\s]+(.+)/i,
    /(?:how many words in)\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = userText.match(pattern);
    if (match?.[1]) {
      const text = match[1].trim();
      if (text.length >= 3) {
        return text;
      }
    }
  }

  const stripped = userText
    .replace(/^(text stats|word count|character count|reading time)\s*/i, '')
    .trim();

  if (stripped.length >= 8 && stripped !== userText.trim()) {
    return stripped;
  }

  if (userText.trim().length >= 20 && /\b(stats|count|analyze)\b/i.test(userText)) {
    return stripped || userText.trim();
  }

  return null;
};

export const runTextStatsSkill = async (skill: Skill, userText: string): Promise<string | null> => {
  console.log('stats_skill_run');
  const text = extractStatsText(userText);
  if (!text) {
    console.log('stats_skill_parse_miss');
    return null;
  }

  const result = await skillExecutor.runJs(skill, {
    scriptName: skill.metadata?.scriptName || 'main',
    data: JSON.stringify({ text }),
  });

  return formatSkillChatText(skill, result);
};
