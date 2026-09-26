jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock'),
);

jest.mock('../SkillManager', () => ({
  skillManager: {
    buildSystemPrompt: jest.fn(async (base: string) => `skills:${base}`),
    buildConversationalSystemPrompt: jest.fn(async () => 'conversational'),
  },
}));

import { buildSystemPromptForTurn } from '../chatTurnContext';
import type { Assistant } from '../../types/assistant';
import { skillManager } from '../SkillManager';

const assistant: Assistant = {
  id: 'a1',
  name: 'Task bot',
  task: 'Do task',
  systemPrompt: 'Assistant base',
  skillIds: ['qr-code'],
  deployment: 'local',
  revision: 1,
  updatedAt: 1,
};

describe('buildSystemPromptForTurn', () => {
  it('builds from assistant prompt when bound', async () => {
    const prompt = await buildSystemPromptForTurn(
      {
        bound: true,
        rawBase: assistant.systemPrompt,
        skillScope: assistant.skillIds,
        assistant,
      },
      { isLocalLitert: false, lastUserText: 'hello' },
    );
    expect(prompt).toBe('skills:Assistant base');
    expect(skillManager.buildSystemPrompt).toHaveBeenCalledWith('Assistant base');
  });

  it('uses conversational fallback when unbound and no user prompt', async () => {
    const prompt = await buildSystemPromptForTurn(
      {
        bound: false,
        rawBase: '',
        skillScope: null,
        assistant: null,
      },
      { isLocalLitert: false, lastUserText: 'hello' },
    );
    expect(prompt).toBe('conversational');
  });
});
