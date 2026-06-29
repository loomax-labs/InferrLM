import type { Skill } from '../types/skill';
import { formatSkillChatText, pickSentences } from './adapters/SkillResultFormatter';
import { skillExecutor } from './SkillExecutor';
import { runTextSkill } from './TextSkillRunner';
import { skillManager } from './SkillManager';

const BROAD_LEARN = /^(i want to learn something new!?|teach me something new!?|learn something new!?)$/i;

const isBroadLearnRequest = (text: string): boolean => {
  const trimmed = text.trim();
  if (BROAD_LEARN.test(trimmed)) {
    return true;
  }
  return /\b(learn something new|teach me something)\b/i.test(trimmed)
    && !extractTopic(trimmed);
};

const extractTopic = (text: string): string | null => {
  const trimmed = text.trim();
  const patterns = [
    /^(?:teach me about|tell me about|learn about|i want to learn about)\s+(.+)/i,
    /^(?:what is|who is)\s+(.+)/i,
  ];

  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match?.[1]) {
      const topic = match[1].replace(/\?+$/, '').trim();
      if (topic && !/\bsomething new\b/i.test(topic) && topic.length > 2) {
        return topic;
      }
    }
  }

  return null;
};

const lastAssistantText = (messages: any[]): string => {
  const entry = [...messages].reverse().find(item => item.role === 'assistant');
  return typeof entry?.content === 'string' ? entry.content.trim() : '';
};

const offeredReminder = (messages: any[]): boolean => {
  const text = lastAssistantText(messages);
  return /\blearning card for\b/i.test(text) && /\breminder\b/i.test(text);
};

const isReminderConfirm = (text: string): boolean => {
  return /^(yes|yeah|yep|sure|ok|okay|please do|set it up)\.?$/i.test(text.trim());
};

const buildLearnPrompt = (): string => {
  return [
    'I\'d love to help you learn something today! What topic sounds interesting to you? Here are a few ideas:',
    '* Dark Matter',
    '* The Immortal Jellyfish',
    '* The Antikythera Mechanism',
  ].join('\n');
};

const parseWikiResult = (raw: string): { title: string; extract: string } | null => {
  try {
    const payload = JSON.parse(raw);
    if (payload?.result === 'Not found') {
      return null;
    }
    if (typeof payload?.title === 'string' && typeof payload?.extract === 'string') {
      return { title: payload.title, extract: payload.extract };
    }
    if (typeof payload?.result === 'string') {
      const inner = JSON.parse(payload.result);
      if (inner?.title && inner?.extract) {
        return { title: inner.title, extract: inner.extract };
      }
    }
  } catch {
  }
  return null;
};

const runWikiQuery = async (skill: Skill, topic: string): Promise<{ title: string; extract: string } | null> => {
  console.log('learn_skill_query', topic);
  const result = await skillExecutor.runJs(skill, {
    scriptName: 'query',
    data: JSON.stringify({ topic, lang: 'en' }),
  });

  if (result.error || !result.result) {
    return null;
  }

  return parseWikiResult(typeof result.result === 'string' ? result.result : JSON.stringify(result.result));
};

const runLearnCard = async (skill: Skill, topic: string, description: string) => {
  console.log('learn_skill_card', topic);
  return skillExecutor.runJs(skill, {
    scriptName: 'index',
    data: JSON.stringify({ topic, description }),
  });
};

export const runLearnSkill = async (
  skill: Skill,
  userText: string,
  messages: any[],
): Promise<string | null> => {
  console.log('learn_skill_run');

  if (offeredReminder(messages) && isReminderConfirm(userText)) {
    console.log('learn_skill_reminder');
    const scheduleSkill = await skillManager.getSkill('schedule-notification');
    if (!scheduleSkill) {
      return null;
    }
    const text = await runTextSkill(
      scheduleSkill,
      'Remind me every day at 9 AM to learn something new',
    );
    return text || 'Daily learning reminder scheduled for 9 AM.';
  }

  if (isBroadLearnRequest(userText)) {
    console.log('learn_skill_state_a');
    return buildLearnPrompt();
  }

  const prior = lastAssistantText(messages);
  const topicFromFollowUp = prior.includes('What topic sounds interesting')
    ? userText.trim().replace(/\?+$/, '')
    : null;

  const topic = extractTopic(userText) || (topicFromFollowUp && topicFromFollowUp.length > 2 ? topicFromFollowUp : null);
  if (!topic) {
    if (/\b(learn|teach)\b/i.test(userText)) {
      return buildLearnPrompt();
    }
    console.log('learn_skill_no_topic');
    return null;
  }

  const wiki = await runWikiQuery(skill, topic);
  if (!wiki) {
    return 'I couldn\'t find an entry for that specific topic. Let\'s try exploring another concept! What else sounds curious to you?';
  }

  const description = pickSentences(wiki.extract, 2);
  const card = await runLearnCard(skill, wiki.title, description);
  const cardText = formatSkillChatText(skill, card);

  return [
    `Here is your learning card for ${wiki.title}!`,
    cardText !== 'Done.' ? cardText : '',
    'Do you want to learn something else today? Would you like me to set up a daily reminder at 9 AM so you never miss a concept?',
  ].filter(Boolean).join('\n\n');
};
