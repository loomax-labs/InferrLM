import type { Chat } from '../utils/ChatManager';
import { isCapabilityQuestion } from '../constants/agentSkillsPrompt';
import type { Assistant } from '../types/assistant';
import { assistantService } from './AssistantService';
import { skillManager } from './SkillManager';
import { planTurnPrompt, type TurnPromptPlan } from './chatTurnPromptPlan';

export { planTurnPrompt, type TurnPromptPlan };

export async function resolveAssistantForChat(chat: Chat | null): Promise<Assistant | null> {
  if (!chat?.assistantId) {
    return null;
  }
  return assistantService.getById(chat.assistantId);
}

export type ConfigureTurnOptions = {
  isLocalLitert: boolean;
  lastUserText: string;
};

export async function configureSkillScopeForTurn(
  plan: TurnPromptPlan,
): Promise<() => void> {
  if (!plan.bound || !plan.skillScope) {
    return () => {};
  }
  return skillManager.beginSkillScope(plan.skillScope);
}

export async function buildSystemPromptForTurn(
  plan: TurnPromptPlan,
  options: ConfigureTurnOptions,
): Promise<string> {
  const { isLocalLitert, lastUserText } = options;
  const wantsCaps = isCapabilityQuestion(lastUserText);

  if (plan.bound) {
    if (wantsCaps && isLocalLitert) {
      return plan.rawBase;
    }
    return skillManager.buildSystemPrompt(plan.rawBase);
  }

  if (wantsCaps && !isLocalLitert) {
    return skillManager.buildSystemPrompt(plan.rawBase);
  }
  const fallback = await skillManager.buildConversationalSystemPrompt();
  return plan.rawBase.trim() || fallback;
}
