import { skillExecutor } from '../SkillExecutor';
import { skillManager } from '../SkillManager';
import { toolRegistry, type ToolSchema } from './ToolRegistry';

const SKILL_TOOL_NAMES = ['list_skills', 'load_skill', 'run_skill'] as const;

const LIST_SKILLS_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'list_skills',
    description: 'List the enabled skills available to the assistant.',
    parameters: {
      type: 'object',
      properties: {},
    },
  },
};

const LOAD_SKILL_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'load_skill',
    description: 'Load a skill by name or id and return its instructions.',
    parameters: {
      type: 'object',
      properties: {
        skill: {
          type: 'string',
          description: 'The skill id or display name to load.',
        },
      },
      required: ['skill'],
    },
  },
};

const RUN_SKILL_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'run_skill',
    description: 'Run a skill against an input payload.',
    parameters: {
      type: 'object',
      properties: {
        skill: {
          type: 'string',
          description: 'The skill id or display name to run.',
        },
        input: {
          type: 'string',
          description: 'The raw input for the skill.',
        },
      },
      required: ['skill'],
    },
  },
};

const resolveSkill = async (name: string) => {
  const skills = await skillManager.getEnabled();
  return skills.find(skill => skill.id === name || skill.name.toLowerCase() === name.toLowerCase()) || null;
};

export const unregisterSkillTools = () => {
  for (const name of SKILL_TOOL_NAMES) {
    toolRegistry.unregister(name);
  }
};

export const registerSkillTools = async () => {
  unregisterSkillTools();

  const enabled = await skillManager.getEnabled();
  if (enabled.length === 0) {
    return;
  }

  toolRegistry.register('list_skills', LIST_SKILLS_TOOL, async () => {
    const skills = await skillManager.getEnabled();
    if (skills.length === 0) {
      return 'No skills are enabled.';
    }
    return skills.map(skill => `${skill.name}: ${skill.description}`).join('\n');
  });

  toolRegistry.register('load_skill', LOAD_SKILL_TOOL, async ({ skill }) => {
    const match = await resolveSkill(String(skill || ''));
    if (!match) {
      throw new Error('skill_not_found');
    }
    return match.instructions;
  });

  toolRegistry.register('run_skill', RUN_SKILL_TOOL, async ({ skill, input }) => {
    const match = await resolveSkill(String(skill || ''));
    if (!match) {
      throw new Error('skill_not_found');
    }
    return skillExecutor.run(match, {
      input: input || '',
    });
  });
};
