import type { ProviderType } from './ModelManagementService';
import { isKitchenEndPhrase, kitchenSessionStore } from './KitchenSessionStore';

const DM_PROMPT = [
  'You are the Head Chef DM for Kitchen Adventure.',
  'Respond as dungeon master for a kitchen appliance world.',
  'Use this structure:',
  '### [Location Name]',
  '*One short sensory sentence.*',
  '---',
  '**The Situation:** One or two short sentences.',
  '**What do you do?** Three brief action options.',
  'Never write player dialogue. Stay serious-whimsical.',
].join('\n');

type GenFn = (
  provider: ProviderType | null,
  messages: Array<{ role: string; content: string }>,
  settings: any,
) => Promise<string>;

const toTranscript = (messages: any[]): Array<{ role: string; content: string }> => {
  return messages
    .filter(entry => entry.role === 'user' || entry.role === 'assistant')
    .slice(-8)
    .map(entry => ({
      role: entry.role,
      content: typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content),
    }));
};

export const runKitchenSkill = async (
  userText: string,
  messages: any[],
  settings: any,
  provider: ProviderType | null,
  generate: GenFn,
): Promise<string | null> => {
  const active = await kitchenSessionStore.isActive();
  if (!active) {
    return null;
  }

  if (isKitchenEndPhrase(userText)) {
    await kitchenSessionStore.end();
    return 'The kitchen adventure ends. The appliances rest until you return.';
  }

  console.log('kitchen_skill_turn');
  const transcript = toTranscript(messages);
  const loopMessages = [
    { role: 'system', content: DM_PROMPT },
    ...transcript,
    { role: 'user', content: userText.trim() },
  ];

  const response = await generate(provider, loopMessages, {
    ...settings,
    maxTokens: Math.min(settings.maxTokens || 512, 512),
    temperature: Math.max(settings.temperature ?? 0.7, 0.6),
  });

  const text = response.trim();
  if (!text) {
    return null;
  }

  console.log('kitchen_skill_ok', text.length);
  return text;
};
