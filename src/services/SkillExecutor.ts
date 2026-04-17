import type { Skill } from '../types/skill';

class SkillExecutor {
  async run(skill: Skill, args: Record<string, any>): Promise<string> {
    if (skill.type === 'text' || !skill.handler) {
      const payload = Object.keys(args).length > 0 ? JSON.stringify(args, null, 2) : 'No input provided.';
      return `${skill.instructions}\n\nInput:\n${payload}`;
    }

    throw new Error('unsupported_skill_handler');
  }
}

export const skillExecutor = new SkillExecutor();
