import { extractUserBasePrompt } from '../constants/agentSkillsPrompt';
import type { Assistant } from '../types/assistant';

export type TurnPromptPlan = {
  bound: boolean;
  rawBase: string;
  skillScope: string[] | null;
  assistant: Assistant | null;
};

export function planTurnPrompt(
  settingsSystemPrompt: string,
  assistant: Assistant | null,
): TurnPromptPlan {
  if (!assistant) {
    return {
      bound: false,
      rawBase: extractUserBasePrompt(settingsSystemPrompt),
      skillScope: null,
      assistant: null,
    };
  }
  return {
    bound: true,
    rawBase: assistant.systemPrompt.trim(),
    skillScope: [...assistant.skillIds],
    assistant,
  };
}
