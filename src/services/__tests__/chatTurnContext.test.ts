import { planTurnPrompt } from '../chatTurnPromptPlan';
import type { Assistant } from '../../types/assistant';

const sampleAssistant: Assistant = {
  id: 'a1',
  name: 'Coder',
  task: 'Write code',
  systemPrompt: 'You are a coding assistant.',
  skillIds: ['qr-code', 'json-toolkit'],
  deployment: 'local',
  revision: 1,
  updatedAt: 1,
};

describe('planTurnPrompt', () => {
  it('uses global settings prompt when chat is unbound', () => {
    const plan = planTurnPrompt('Global user prompt', null);
    expect(plan.bound).toBe(false);
    expect(plan.skillScope).toBeNull();
    expect(plan.rawBase).toBe('Global user prompt');
  });

  it('uses assistant prompt and skill ids when bound', () => {
    const plan = planTurnPrompt('Global user prompt', sampleAssistant);
    expect(plan.bound).toBe(true);
    expect(plan.rawBase).toBe('You are a coding assistant.');
    expect(plan.skillScope).toEqual(['qr-code', 'json-toolkit']);
  });
});
