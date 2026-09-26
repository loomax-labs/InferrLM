/** Mirrors @inferrlm/core Assistant (app does not depend on core package yet). */
export type AssistantDeployment = 'local' | 'cloud';

export type AssistantModelRef = {
  provider: 'local' | 'gemini' | 'chatgpt' | 'claude' | 'apple-foundation';
  modelId: string;
};

export type Assistant = {
  id: string;
  name: string;
  task: string;
  systemPrompt: string;
  skillIds: string[];
  model?: AssistantModelRef;
  deployment: AssistantDeployment;
  revision: number;
  updatedAt: number;
};
