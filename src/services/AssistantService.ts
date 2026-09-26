import AsyncStorage from '@react-native-async-storage/async-storage';

import type { Assistant, AssistantDeployment, AssistantModelRef } from '../types/assistant';

const STORAGE_KEY = '@assistants_v1';

export const ASSISTANT_LIMITS = {
  maxName: 80,
  maxTask: 200,
  maxPrompt: 16_384,
  maxSkills: 20,
  maxAssistants: 50,
} as const;

const MODEL_PROVIDERS = new Set<AssistantModelRef['provider']>([
  'local',
  'gemini',
  'chatgpt',
  'claude',
  'apple-foundation',
]);

export type AssistantWriteInput = {
  name: string;
  task: string;
  systemPrompt: string;
  skillIds: string[];
  model?: AssistantModelRef;
  deployment?: AssistantDeployment;
};

export class AssistantValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AssistantValidationError';
  }
}

function newAssistantId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function normalizeSkillIds(skillIds: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const id of skillIds) {
    const trimmed = id.trim();
    if (!trimmed || seen.has(trimmed)) {
      continue;
    }
    seen.add(trimmed);
    out.push(trimmed);
  }
  return out;
}

function validateModel(model?: AssistantModelRef): AssistantModelRef | undefined {
  if (!model) {
    return undefined;
  }
  const provider = model.provider;
  const modelId = model.modelId?.trim() ?? '';
  if (!MODEL_PROVIDERS.has(provider)) {
    throw new AssistantValidationError('Invalid model provider.');
  }
  if (!modelId) {
    throw new AssistantValidationError('Model id is required when a model is set.');
  }
  return { provider, modelId };
}

export function validateAssistantFields(input: AssistantWriteInput): AssistantWriteInput {
  const name = input.name.trim();
  const task = input.task.trim();
  const systemPrompt = input.systemPrompt.trim();
  const skillIds = normalizeSkillIds(input.skillIds ?? []);

  if (!name) {
    throw new AssistantValidationError('Name is required.');
  }
  if (name.length > ASSISTANT_LIMITS.maxName) {
    throw new AssistantValidationError(`Name must be at most ${ASSISTANT_LIMITS.maxName} characters.`);
  }
  if (!task) {
    throw new AssistantValidationError('Task description is required.');
  }
  if (task.length > ASSISTANT_LIMITS.maxTask) {
    throw new AssistantValidationError(`Task must be at most ${ASSISTANT_LIMITS.maxTask} characters.`);
  }
  if (systemPrompt.length > ASSISTANT_LIMITS.maxPrompt) {
    throw new AssistantValidationError(`System prompt must be at most ${ASSISTANT_LIMITS.maxPrompt} characters.`);
  }
  if (skillIds.length > ASSISTANT_LIMITS.maxSkills) {
    throw new AssistantValidationError(`At most ${ASSISTANT_LIMITS.maxSkills} skills allowed.`);
  }

  const deployment = input.deployment === 'cloud' ? 'cloud' : 'local';
  const model = validateModel(input.model);

  return {
    name,
    task,
    systemPrompt,
    skillIds,
    model,
    deployment,
  };
}

class AssistantService {
  private cache: Assistant[] | null = null;

  private async load(): Promise<Assistant[]> {
    if (this.cache) {
      return this.cache;
    }
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEY);
      if (!raw) {
        this.cache = [];
        return this.cache;
      }
      const parsed = JSON.parse(raw) as Assistant[];
      this.cache = Array.isArray(parsed) ? parsed : [];
      return this.cache;
    } catch {
      this.cache = [];
      return this.cache;
    }
  }

  private async persist(list: Assistant[]): Promise<void> {
    this.cache = list;
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  }

  async list(): Promise<Assistant[]> {
    const items = await this.load();
    return [...items].sort((a, b) => b.updatedAt - a.updatedAt);
  }

  async getById(id: string): Promise<Assistant | null> {
    const items = await this.load();
    return items.find(item => item.id === id) ?? null;
  }

  async getLocalById(id: string): Promise<Assistant | null> {
    const item = await this.getById(id);
    if (!item || item.deployment !== 'local') {
      return null;
    }
    return item;
  }

  async listLocalForApi(): Promise<
    Array<Pick<Assistant, 'id' | 'name' | 'task' | 'model'>>
  > {
    const items = await this.list();
    return items
      .filter(item => item.deployment === 'local')
      .map(({ id, name, task, model }) => ({ id, name, task, model }));
  }

  async create(input: AssistantWriteInput): Promise<Assistant> {
    const list = await this.load();
    if (list.length >= ASSISTANT_LIMITS.maxAssistants) {
      throw new AssistantValidationError(
        `You can save at most ${ASSISTANT_LIMITS.maxAssistants} assistants.`,
      );
    }
    const fields = validateAssistantFields(input);
    const assistant: Assistant = {
      id: newAssistantId(),
      ...fields,
      deployment: fields.deployment ?? 'local',
      revision: 1,
      updatedAt: Date.now(),
    };
    await this.persist([...list, assistant]);
    return assistant;
  }

  async update(id: string, input: AssistantWriteInput): Promise<Assistant> {
    const list = await this.load();
    const index = list.findIndex(item => item.id === id);
    if (index < 0) {
      throw new AssistantValidationError('Assistant not found.');
    }
    const current = list[index];
    const fields = validateAssistantFields({
      ...input,
      deployment: input.deployment ?? current.deployment,
    });
    const next: Assistant = {
      ...current,
      ...fields,
      id: current.id,
      revision: current.revision + 1,
      updatedAt: Date.now(),
    };
    const updated = [...list];
    updated[index] = next;
    await this.persist(updated);
    return next;
  }

  async delete(id: string): Promise<void> {
    const list = await this.load();
    const next = list.filter(item => item.id !== id);
    if (next.length === list.length) {
      throw new AssistantValidationError('Assistant not found.');
    }
    await this.persist(next);
  }

  /** Used by sync/tests to replace the full list. */
  async replaceAll(assistants: Assistant[]): Promise<void> {
    if (assistants.length > ASSISTANT_LIMITS.maxAssistants) {
      throw new AssistantValidationError(
        `You can save at most ${ASSISTANT_LIMITS.maxAssistants} assistants.`,
      );
    }
    for (const item of assistants) {
      validateAssistantFields(item);
    }
    await this.persist(assistants);
  }

  clearCache(): void {
    this.cache = null;
  }
}

export const assistantService = new AssistantService();
export default assistantService;
