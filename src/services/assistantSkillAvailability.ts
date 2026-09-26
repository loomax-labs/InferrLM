import type { Skill } from '../types/skill';

export function getMissingSkillIds(skillIds: string[], installedSkills: Skill[]): string[] {
  const installed = new Set(installedSkills.map(skill => skill.id));
  return skillIds.filter(id => !installed.has(id));
}
