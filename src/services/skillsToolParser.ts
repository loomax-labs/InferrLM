import { generateRandomId } from '../utils/homeScreenUtils';
import type { ToolCall } from './tools/ToolRegistry';

const SKILL_TOOL_NAMES = ['load_skill', 'run_js', 'run_intent'] as const;

const toToolCall = (name: string, args: Record<string, unknown>): ToolCall => ({
  id: generateRandomId(),
  type: 'function',
  function: {
    name,
    arguments: JSON.stringify(args),
  },
});

const parseObjectCall = (value: unknown): ToolCall | null => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = String(record.name || record.tool || record.function || '').trim();
  if (!SKILL_TOOL_NAMES.includes(name as typeof SKILL_TOOL_NAMES[number])) {
    return null;
  }

  const args = record.arguments ?? record.parameters ?? record.args ?? {};
  if (typeof args === 'string') {
    try {
      return toToolCall(name, JSON.parse(args) as Record<string, unknown>);
    } catch {
      return toToolCall(name, { raw: args });
    }
  }

  if (args && typeof args === 'object' && !Array.isArray(args)) {
    return toToolCall(name, args as Record<string, unknown>);
  }

  return toToolCall(name, {});
};

export const parseToolCallsFromText = (text: string): ToolCall[] => {
  const trimmed = text.trim();
  if (!trimmed) {
    return [];
  }

  const candidates: string[] = [trimmed];
  const fence = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence?.[1]) {
    candidates.unshift(fence[1].trim());
  }

  for (const candidate of candidates) {
    try {
      const parsed = JSON.parse(candidate);
      if (Array.isArray(parsed)) {
        const calls = parsed.map(parseObjectCall).filter(Boolean) as ToolCall[];
        if (calls.length > 0) {
          return calls;
        }
      }
      const single = parseObjectCall(parsed);
      if (single) {
        return [single];
      }
    } catch {
    }
  }

  for (const name of SKILL_TOOL_NAMES) {
    if (!trimmed.includes(name)) {
      continue;
    }
    const jsonMatch = trimmed.match(new RegExp(`\\{[^{}]*"name"\\s*:\\s*"${name}"[^{}]*\\}`, 's'));
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[0]);
        const call = parseObjectCall(parsed);
        if (call) {
          return [call];
        }
      } catch {
      }
    }
  }

  return [];
};
