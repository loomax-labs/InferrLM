import * as SecureStore from 'expo-secure-store';

import {
  deleteCloudAssistant,
  fetchCloudAssistants,
  putCloudAssistant,
} from './adapters/AssistantsApiAdapter';
import { mergeAssistantsByRevision } from './assistantCloudMerge';
import assistantService, { type AssistantWriteInput } from './AssistantService';
import type { Assistant, AssistantDeployment } from '../types/assistant';
import { logger } from '../utils/logger';
import { AUTH_SECURE_STORE_OPTIONS } from './AuthStorage';

const ACCESS_KEY = 'inferra_access_token';

async function hasApiSession(): Promise<boolean> {
  try {
    const token = await SecureStore.getItemAsync(ACCESS_KEY, AUTH_SECURE_STORE_OPTIONS);
    return typeof token === 'string' && token.length > 0;
  } catch {
    return false;
  }
}

export async function pullCloudAssistantsAndMerge(): Promise<void> {
  if (!(await hasApiSession())) {
    return;
  }

  try {
    const remote = await fetchCloudAssistants();
    const local = await assistantService.list();
    const merged = mergeAssistantsByRevision(local, remote);
    await assistantService.replaceAll(merged);
    logger.info('assistants_cloud_pull_ok', 'assistants', {
      params: { remoteCount: remote.length, mergedCount: merged.length },
    });
  } catch (error: any) {
    logger.warn('assistants_cloud_pull_fail', 'assistants', {
      params: {
        status: error?.status,
        code: error?.body?.error,
      },
    });
  }
}

export async function pushAssistantToCloud(assistant: Assistant): Promise<void> {
  if (!(await hasApiSession())) {
    throw new Error('assistants_cloud_session_required');
  }
  const saved = await putCloudAssistant({
    ...assistant,
    deployment: 'cloud',
  });
  const list = await assistantService.list();
  const index = list.findIndex(item => item.id === saved.id);
  if (index >= 0) {
    const next = [...list];
    next[index] = { ...saved, deployment: 'cloud' };
    await assistantService.replaceAll(next);
  }
}

export async function removeAssistantFromCloud(id: string): Promise<void> {
  if (!(await hasApiSession())) {
    return;
  }
  try {
    await deleteCloudAssistant(id);
    logger.info('assistants_cloud_delete_ok', 'assistants', {
      params: { assistantId: id },
    });
  } catch (error: any) {
    const code = error?.body?.error;
    if (code === 'assistant_not_found') {
      return;
    }
    logger.warn('assistants_cloud_delete_fail', 'assistants', {
      params: { assistantId: id, status: error?.status, code },
    });
    throw error;
  }
}

export async function saveAssistantWithCloudSync(
  id: string,
  input: AssistantWriteInput,
): Promise<Assistant> {
  const saved = await assistantService.update(id, input);
  if (saved.deployment === 'cloud') {
    await pushAssistantToCloud(saved);
  }
  return saved;
}

export async function createAssistantWithCloudSync(
  input: AssistantWriteInput,
): Promise<Assistant> {
  const created = await assistantService.create(input);
  if (created.deployment === 'cloud') {
    await pushAssistantToCloud(created);
  }
  return created;
}

export async function setAssistantDeployment(
  id: string,
  deployment: AssistantDeployment,
): Promise<Assistant> {
  const current = await assistantService.getById(id);
  if (!current) {
    throw new Error('assistant_not_found');
  }

  if (deployment === 'cloud') {
    if (!(await hasApiSession())) {
      throw new Error('assistants_cloud_session_required');
    }
    const next = await assistantService.update(id, {
      name: current.name,
      task: current.task,
      systemPrompt: current.systemPrompt,
      skillIds: current.skillIds,
      model: current.model,
      deployment: 'cloud',
    });
    await pushAssistantToCloud(next);
    return next;
  }

  if (current.deployment === 'cloud') {
    await removeAssistantFromCloud(id);
  }

  return assistantService.update(id, {
    name: current.name,
    task: current.task,
    systemPrompt: current.systemPrompt,
    skillIds: current.skillIds,
    model: current.model,
    deployment: 'local',
  });
}
