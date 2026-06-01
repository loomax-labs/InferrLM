import { skillExecutor } from '../SkillExecutor';
import { skillManager } from '../SkillManager';
import { toolRegistry, type ToolSchema } from './ToolRegistry';

const SKILL_TOOL_NAMES = ['list_skills', 'load_skill', 'run_skill', 'run_js', 'run_intent'] as const;

const LOAD_SKILL_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'load_skill',
    description: 'Load a skill by name or id and return its instructions.',
    parameters: {
      type: 'object',
      properties: {
        skillName: {
          type: 'string',
          description: 'The skill id or display name to load.',
        },
      },
      required: ['skillName'],
    },
  },
};

const RUN_JS_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'run_js',
    description: 'Run a JavaScript skill against an input payload.',
    parameters: {
      type: 'object',
      properties: {
        skillName: {
          type: 'string',
          description: 'The skill id or display name to run.',
        },
        scriptName: {
          type: 'string',
          description: 'The script entry point to run inside the skill.',
        },
        data: {
          type: 'string',
          description: 'The raw input for the skill.',
        },
      },
      required: ['skillName'],
    },
  },
};

const RUN_INTENT_TOOL: ToolSchema = {
  type: 'function',
  function: {
    name: 'run_intent',
    description: 'Execute a supported native intent with structured parameters.',
    parameters: {
      type: 'object',
      properties: {
        intent: {
          type: 'string',
          description: 'The native intent name, such as open_map or send_email.',
        },
        parameters: {
          type: 'object',
          description: 'A JSON object of parameters for the intent.',
        },
      },
      required: ['intent'],
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

  toolRegistry.register('load_skill', LOAD_SKILL_TOOL, async ({ skillName }) => {
    const match = await resolveSkill(String(skillName || ''));
    if (!match) {
      throw new Error('skill_not_found');
    }
    return match.instructions;
  });

  toolRegistry.register('run_js', RUN_JS_TOOL, async ({ skillName, scriptName, data }) => {
    const match = await resolveSkill(String(skillName || ''));
    if (!match) {
      throw new Error('skill_not_found');
    }
    const result = await skillExecutor.runJs(match, {
      scriptName: String(scriptName || match.metadata?.scriptName || 'main'),
      data: data || '',
    });
    return JSON.stringify(result);
  });

  toolRegistry.register('run_intent', RUN_INTENT_TOOL, async ({ intent, parameters }) => {
    const result = await skillExecutor.runIntent(
      String(intent || ''),
      parameters && typeof parameters === 'object' && !Array.isArray(parameters)
        ? parameters as Record<string, any>
        : {},
    );
    return JSON.stringify(result);
  });
};
