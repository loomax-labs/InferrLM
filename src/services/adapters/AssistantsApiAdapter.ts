import { api } from './ApiClient';
import type { Assistant } from '../../types/assistant';

type AssistantsListResponse = {
  assistants: Assistant[];
};

function toCloudPayload(assistant: Assistant): Assistant {
  return {
    ...assistant,
    deployment: 'cloud',
  };
}

export async function fetchCloudAssistants(): Promise<Assistant[]> {
  const data = await api.get<AssistantsListResponse>('/me/assistants');
  const list = Array.isArray(data.assistants) ? data.assistants : [];
  return list.map(item => ({
    ...item,
    deployment: 'cloud',
    skillIds: Array.isArray(item.skillIds) ? item.skillIds : [],
  }));
}

export async function putCloudAssistant(assistant: Assistant): Promise<Assistant> {
  const payload = toCloudPayload(assistant);
  const saved = await api.put<Assistant>(`/me/assistants/${encodeURIComponent(payload.id)}`, payload);
  return {
    ...saved,
    deployment: 'cloud',
    skillIds: Array.isArray(saved.skillIds) ? saved.skillIds : [],
  };
}

export async function deleteCloudAssistant(id: string): Promise<void> {
  await api.delete(`/me/assistants/${encodeURIComponent(id)}`);
}
