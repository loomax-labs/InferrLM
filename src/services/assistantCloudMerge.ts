import type { Assistant } from '../types/assistant';

/** Merge local device rows with cloud rows; higher revision wins per id. */
export function mergeAssistantsByRevision(local: Assistant[], remote: Assistant[]): Assistant[] {
  const byId = new Map<string, Assistant>();

  for (const item of local) {
    byId.set(item.id, item);
  }

  for (const item of remote) {
    const cloudItem: Assistant = {
      ...item,
      deployment: 'cloud',
      skillIds: Array.isArray(item.skillIds) ? item.skillIds : [],
    };
    const current = byId.get(item.id);
    if (!current || cloudItem.revision > current.revision) {
      byId.set(item.id, cloudItem);
    }
  }

  return Array.from(byId.values());
}
