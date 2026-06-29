import { executeMobileActionIntent } from './tools/MobileActionsTools';
import { backgroundWebViewManager } from './WebViewManager';
import { skillManager } from './SkillManager';
import type { Skill, SkillResult } from '../types/skill';

type SkillArgs = Record<string, any>;

class SkillExecutor {
  private formatInput(args: SkillArgs): string {
    return Object.keys(args).length > 0 ? JSON.stringify(args, null, 2) : 'No input provided.';
  }

  private parseJsInput(data: unknown): unknown {
    if (typeof data !== 'string') {
      return data;
    }

    const value = data.trim();
    if (!value) {
      return '';
    }

    try {
      return JSON.parse(value);
    } catch {
      return value;
    }
  }

  async run(skill: Skill, args: SkillArgs): Promise<SkillResult> {
    if (skill.type === 'text' || !skill.scriptHtml) {
      return {
        result: `${skill.instructions}\n\nInput:\n${this.formatInput(args)}`,
      };
    }

    return this.runJs(skill, {
      scriptName: skill.metadata?.scriptName,
      data: args.input ?? args.data ?? args,
    });
  }

  async runJs(skill: Skill, args: { scriptName?: string; data?: unknown }): Promise<SkillResult> {
    if (skill.type !== 'js' || !skill.scriptHtml) {
      throw new Error('skill_not_js');
    }

    console.log('skill_js_start', { id: skill.id, script: args.scriptName || 'main' });
    const secret = await skillManager.getSecret(skill.id);
    const out = await backgroundWebViewManager.runSkillHtml(skill.scriptHtml, {
      skillId: skill.id,
      skillName: skill.name,
      scriptName: args.scriptName || skill.metadata?.scriptName || 'main',
      data: this.parseJsInput(args.data),
      secret: secret || '',
    });
    console.log('skill_js_done', { id: skill.id, hasError: !!out.error });
    return out;
  }

  async runIntent(intent: string, parameters: Record<string, any>): Promise<SkillResult> {
    const result = await executeMobileActionIntent(intent, parameters);
    return {
      result,
    };
  }
}

export const skillExecutor = new SkillExecutor();
