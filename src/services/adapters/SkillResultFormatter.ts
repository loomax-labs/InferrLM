import type { Skill, SkillResult } from '../../types/skill';

type WikiPayload = SkillResult & {
  title?: string;
  summary?: string;
  facts?: string[];
};

const stripWikiNoise = (value: string): string => {
  return value
    .replace(/\.mw-[\w-]+/g, '')
    .replace(/\{[^}]*\}/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

const pickSentences = (text: string, max = 3): string => {
  const clean = stripWikiNoise(text);
  if (!clean) {
    return '';
  }
  const parts = clean.match(/[^.!?]+[.!?]+/g);
  if (!parts || parts.length === 0) {
    return clean.length > 480 ? `${clean.slice(0, 480).trim()}...` : clean;
  }
  return parts.slice(0, max).join(' ').trim();
};

const legacyWikiBody = (body: string): string => {
  const summaryMatch = body.match(/---\s*SUMMARY\s*---\s*([\s\S]*)/i);
  if (summaryMatch?.[1]) {
    return summaryMatch[1].trim();
  }
  return body.replace(/---\s*INFOBOX\s*---[\s\S]*/i, '').trim();
};

const formatWiki = (payload: WikiPayload): string => {
  const title = typeof payload.title === 'string' ? payload.title.trim() : '';
  let summary = typeof payload.summary === 'string' ? payload.summary.trim() : '';

  if (!summary && typeof payload.result === 'string') {
    summary = legacyWikiBody(payload.result);
  }

  if (!summary && payload.result && typeof payload.result === 'object') {
    const record = payload.result as Record<string, unknown>;
    if (typeof record.summary === 'string') {
      summary = record.summary.trim();
    } else if (typeof record.result === 'string') {
      summary = legacyWikiBody(record.result);
    }
  }

  const brief = pickSentences(summary, 3);
  const facts = Array.isArray(payload.facts)
    ? payload.facts.slice(0, 4)
    : [];

  const lines: string[] = [];
  if (title) {
    lines.push(title);
  }
  if (brief) {
    lines.push(brief);
  }
  if (facts.length > 0) {
    lines.push(facts.join('\n'));
  }

  console.log('skill_fmt_wiki', { titleLen: title.length, briefLen: brief.length, factCount: facts.length });
  return lines.join('\n\n').trim() || title || 'Wikipedia';
};

export const formatSkillChatText = (skill: Skill, payload: WikiPayload): string => {
  if (payload.error) {
    console.log('skill_fmt_error', skill.id);
    return `Skill "${skill.name}" failed: ${payload.error}`;
  }

  if (skill.id === 'query-wikipedia') {
    return formatWiki(payload);
  }

  const raw = payload.result;
  if (typeof raw === 'string' && raw.trim()) {
    const text = raw.trim();
    console.log('skill_fmt_text', { id: skill.id, len: text.length });
    return text.length > 1200 ? `${text.slice(0, 1200).trim()}...` : text;
  }

  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    if (typeof record.result === 'string' && record.result.trim()) {
      const text = record.result.trim();
      console.log('skill_fmt_obj', { id: skill.id, len: text.length });
      return text.length > 1200 ? `${text.slice(0, 1200).trim()}...` : text;
    }
  }

  console.log('skill_fmt_done', skill.id);
  return 'Done.';
};
