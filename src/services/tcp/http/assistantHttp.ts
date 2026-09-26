import type { Assistant } from '../../../types/assistant';
import assistantService from '../../AssistantService';

export const ASSISTANT_NOT_FOUND = 'assistant_not_found';

export type AssistantHttpError = {
  status: 404;
  code: typeof ASSISTANT_NOT_FOUND;
};

export function extractAssistantId(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.assistant === 'string' && record.assistant.length > 0) {
    return record.assistant;
  }
  return undefined;
}

export function payloadHasSystemMessage(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') {
    return false;
  }
  const record = payload as Record<string, unknown>;
  if (typeof record.system === 'string' && record.system.trim().length > 0) {
    return true;
  }
  const options = record.options;
  if (options && typeof options === 'object') {
    const systemPrompt = (options as Record<string, unknown>).system_prompt;
    if (typeof systemPrompt === 'string' && systemPrompt.trim().length > 0) {
      return true;
    }
  }
  if (!Array.isArray(record.messages)) {
    return false;
  }
  for (const entry of record.messages) {
    if (entry && typeof entry === 'object' && (entry as { role?: string }).role === 'system') {
      return true;
    }
  }
  return false;
}

export function prependAssistantPrompt(
  messages: Array<{ role: string; content: string }>,
  assistant: Assistant
): Array<{ role: string; content: string }> {
  if (!assistant.systemPrompt.trim()) {
    return messages;
  }
  return [{ role: 'system', content: assistant.systemPrompt }, ...messages];
}

export async function resolveAssistantForChat(
  payload: unknown,
  messages: Array<{ role: string; content: string }>
): Promise<
  | { messages: Array<{ role: string; content: string }> }
  | { error: AssistantHttpError }
> {
  const assistantId = extractAssistantId(payload);
  if (!assistantId) {
    return { messages };
  }

  const assistant = await assistantService.getLocalById(assistantId);
  if (!assistant) {
    return { error: { status: 404, code: ASSISTANT_NOT_FOUND } };
  }

  if (payloadHasSystemMessage(payload)) {
    return { messages };
  }

  return { messages: prependAssistantPrompt(messages, assistant) };
}
