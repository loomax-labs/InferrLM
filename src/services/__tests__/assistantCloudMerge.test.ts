import { mergeAssistantsByRevision } from '../assistantCloudMerge';
import type { Assistant } from '../../types/assistant';

const base = (overrides: Partial<Assistant>): Assistant => ({
  id: 'a1',
  name: 'Test',
  task: 'Task',
  systemPrompt: 'Prompt',
  skillIds: [],
  deployment: 'local',
  revision: 1,
  updatedAt: 1,
  ...overrides,
});

describe('mergeAssistantsByRevision', () => {
  it('keeps local-only rows', () => {
    const local = [base({ id: 'local-only', deployment: 'local', revision: 2 })];
    const merged = mergeAssistantsByRevision(local, []);
    expect(merged).toHaveLength(1);
    expect(merged[0].id).toBe('local-only');
  });

  it('prefers higher revision for the same id', () => {
    const local = [base({ revision: 2, deployment: 'local', name: 'Local' })];
    const remote = [base({ revision: 5, deployment: 'cloud', name: 'Cloud' })];
    const merged = mergeAssistantsByRevision(local, remote);
    expect(merged[0].name).toBe('Cloud');
    expect(merged[0].deployment).toBe('cloud');
  });

  it('keeps local when revision is newer', () => {
    const local = [base({ revision: 9, name: 'Local wins', deployment: 'local' })];
    const remote = [base({ revision: 3, name: 'Cloud', deployment: 'cloud' })];
    const merged = mergeAssistantsByRevision(local, remote);
    expect(merged[0].name).toBe('Local wins');
  });
});
