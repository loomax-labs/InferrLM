jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

import {
  ASSISTANT_NOT_FOUND,
  extractAssistantId,
  payloadHasSystemMessage,
  prependAssistantPrompt,
  resolveAssistantForChat,
} from '../assistantHttp';
import assistantService from '../../../AssistantService';
import type { Assistant } from '../../../../types/assistant';

const baseAssistant: Assistant = {
  id: 'a1',
  name: 'Coder',
  task: 'Code',
  systemPrompt: 'You are a coding assistant.',
  skillIds: [],
  deployment: 'local',
  revision: 1,
  updatedAt: 1,
};

describe('assistantHttp', () => {
  afterEach(() => {
    assistantService.clearCache();
  });

  it('extracts assistant id from payload', () => {
    expect(extractAssistantId({ assistant: 'x' })).toBe('x');
    expect(extractAssistantId({})).toBeUndefined();
  });

  it('detects system messages in the raw payload', () => {
    expect(payloadHasSystemMessage({ messages: [{ role: 'user', content: 'hi' }] })).toBe(false);
    expect(payloadHasSystemMessage({ messages: [{ role: 'system', content: 's' }] })).toBe(true);
    expect(payloadHasSystemMessage({ system: 's', messages: [] })).toBe(true);
  });

  it('prepends assistant prompt when no system message is present', async () => {
    await assistantService.replaceAll([baseAssistant]);
    const result = await resolveAssistantForChat(
      { assistant: 'a1', messages: [{ role: 'user', content: 'hi' }] },
      [{ role: 'user', content: 'hi' }]
    );
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.messages[0]).toEqual({ role: 'system', content: baseAssistant.systemPrompt });
    }
  });

  it('returns assistant_not_found for unknown ids', async () => {
    await assistantService.replaceAll([]);
    const result = await resolveAssistantForChat(
      { assistant: 'missing', messages: [{ role: 'user', content: 'hi' }] },
      [{ role: 'user', content: 'hi' }]
    );
    expect(result).toEqual({ error: { status: 404, code: ASSISTANT_NOT_FOUND } });
  });

  it('does not prepend when the client supplied a system message', async () => {
    await assistantService.replaceAll([baseAssistant]);
    const messages = [{ role: 'system', content: 'custom' }, { role: 'user', content: 'hi' }];
    const result = await resolveAssistantForChat(
      { assistant: 'a1', messages },
      messages
    );
    expect('error' in result).toBe(false);
    if (!('error' in result)) {
      expect(result.messages).toEqual(messages);
    }
  });

  it('prependAssistantPrompt skips empty prompts', () => {
    const messages = [{ role: 'user', content: 'hi' }];
    expect(prependAssistantPrompt(messages, { ...baseAssistant, systemPrompt: '   ' })).toEqual(messages);
  });
});
