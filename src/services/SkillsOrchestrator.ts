import type { ProviderType } from './ModelManagementService';
import { skillManager } from './SkillManager';
import { skillToolLoopService, type SkillLoopOpts } from './SkillToolLoopService';
import { toolRegistry } from './tools/ToolRegistry';

class SkillsOrchestrator {
  async shouldHandle(): Promise<boolean> {
    if (!(await skillManager.isModeEnabled())) {
      console.log('skills_mode_off');
      return false;
    }
    const ready = toolRegistry.hasTools();
    console.log('skills_tools_ready', ready);
    return ready;
  }

  async shouldTryForMessage(): Promise<boolean> {
    return this.shouldHandle();
  }

  async run(
    messages: any[],
    settings: any,
    activeProvider: ProviderType | null,
    loopOpts: Omit<SkillLoopOpts, 'settings'> = {},
  ): Promise<string | null> {
    if (!(await this.shouldHandle())) {
      return null;
    }

    console.log('skills_run_start', { provider: activeProvider });
    const result = await skillToolLoopService.run(activeProvider, messages, {
      settings,
      ...loopOpts,
    });

    if (result) {
      console.log('skills_run_done', { len: result.length });
    } else {
      console.log('skills_run_miss');
    }
    return result;
  }
}

export const skillsOrchestrator = new SkillsOrchestrator();
