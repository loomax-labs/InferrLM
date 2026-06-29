import type { ProviderType } from './ModelManagementService';
import type { Skill } from '../types/skill';
import { formatSkillChatText } from './adapters/SkillResultFormatter';
import { skillActivityAdapter } from './adapters/SkillActivityAdapter';
import { appleFoundationService } from './AppleFoundationService';
import { onlineModelService } from './OnlineModelService';
import { skillExecutor } from './SkillExecutor';
import { skillManager } from './SkillManager';
import { parseToolCallsFromText } from './skillsToolParser';
import { engineService } from './runtime-service';
import { toolAgentService } from './ToolAgentService';
import { toolExecutor } from './tools/ToolExecutor';
import { toolRegistry, type ToolCall } from './tools/ToolRegistry';

const ORCHESTRATOR_PROVIDERS = ['gemini', 'chatgpt', 'claude'] as const;
const MAX_DEVICE_ITERATIONS = 5;

type SkillRouteBoost = {
  pattern: RegExp;
  skillId: string;
  boost: number;
};

const ROUTE_BOOSTS: SkillRouteBoost[] = [
  { pattern: /\bwikipedia\b|\bwiki\b/i, skillId: 'query-wikipedia', boost: 12 },
  { pattern: /\bremind\b|\bnotification\b|\bschedule\b/i, skillId: 'schedule-notification', boost: 12 },
  { pattern: /\bhash\b|\bsha-?256\b/i, skillId: 'calculate-hash', boost: 10 },
  { pattern: /\bqr\b|\bqr code\b/i, skillId: 'qr-code', boost: 10 },
  { pattern: /\bmap\b|\blocation\b|\bnavigate\b/i, skillId: 'interactive-map', boost: 8 },
  { pattern: /\bcalendar\b|\bevent\b/i, skillId: 'create-calendar-event', boost: 8 },
  { pattern: /\bemail\b|\bsend mail\b/i, skillId: 'send-email', boost: 8 },
  { pattern: /\bspin\b|\bspinner\b/i, skillId: 'text-spinner', boost: 8 },
  { pattern: /\bjson\b/i, skillId: 'json-toolkit', boost: 8 },
  { pattern: /\bunit\b|\bconvert\b|\btemperature\b/i, skillId: 'unit-convert', boost: 6 },
  { pattern: /\btip\b|\bsplit\b/i, skillId: 'tip-split', boost: 6 },
  { pattern: /\bencode\b|\bbase64\b/i, skillId: 'encode-tool', boost: 6 },
  { pattern: /\bcall\b|\bdial\b/i, skillId: 'quick-call', boost: 6 },
  { pattern: /\bsms\b|\btext message\b/i, skillId: 'quick-sms', boost: 6 },
  { pattern: /\bweb search\b|\bsearch the web\b/i, skillId: 'web-search', boost: 10 },
];

const pickSkill = (query: string, skills: Skill[]): Skill | null => {
  let best: Skill | null = null;
  let bestScore = 0;

  for (const skill of skills) {
    let score = 0;
    for (const boost of ROUTE_BOOSTS) {
      if (skill.id === boost.skillId && boost.pattern.test(query)) {
        score += boost.boost;
      }
    }

    const nameWords = skill.name.toLowerCase().split(/\s+/);
    const q = query.toLowerCase();
    for (const word of q.split(/\s+/)) {
      if (word.length < 3) {
        continue;
      }
      if (nameWords.some(entry => entry.includes(word) || word.includes(entry))) {
        score += 2;
      }
      if (skill.description.toLowerCase().includes(word)) {
        score += 1;
      }
    }

    if (score > bestScore) {
      bestScore = score;
      best = skill;
    }
  }

  if (best) {
    console.log('skill_pick', { id: best.id, score: bestScore });
  }
  return bestScore >= 6 ? best : null;
};

const buildJsData = (skill: Skill, userText: string): string => {
  if (skill.id === 'query-wikipedia') {
    const topic = userText
      .replace(/search\s+wikipedia\s+(about|for)?/gi, '')
      .replace(/query\s+wikipedia\s+(about|for)?/gi, '')
      .replace(/wikipedia\s+(about|for)?/gi, '')
      .replace(/^(tell me about|who is|what is)\s+/gi, '')
      .trim();
    return JSON.stringify({ topic: topic || userText.trim(), lang: 'en' });
  }

  return userText.trim();
};

const toLoopMessages = (messages: any[]) => {
  return messages
    .filter(entry => entry.role === 'system' || entry.role === 'user' || entry.role === 'assistant')
    .map(entry => ({
      role: entry.role as 'system' | 'user' | 'assistant',
      content: typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content),
    }));
};

const buildDeviceToolPrompt = (basePrompt: string): string => {
  const schemas = toolRegistry
    .getAllTools()
    .filter(tool => 'function' in tool)
    .map(tool => JSON.stringify((tool as { function: unknown }).function))
    .join('\n');

  return `${basePrompt}\n\nWhen you need to call a tool, respond with ONLY a single JSON object and no other text:\n{"name":"<tool_name>","arguments":{...}}\n\nAvailable tools:\n${schemas}`;
};

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

  supportsDeviceLoop(activeProvider: ProviderType | null): boolean {
    return activeProvider === 'local' || activeProvider === 'apple-foundation';
  }

  async resolveOrchestratorProvider(): Promise<string | null> {
    for (const provider of ORCHESTRATOR_PROVIDERS) {
      const hasKey = await onlineModelService.hasApiKey(provider);
      if (hasKey) {
        console.log('skill_orch_provider', provider);
        return provider;
      }
    }
    console.log('skill_orch_none');
    return null;
  }

  async runOnlineLoop(messages: any[], settings: any): Promise<string | null> {
    const provider = await this.resolveOrchestratorProvider();
    if (!provider) {
      return null;
    }

    const chatMessages = messages
      .filter(entry => entry.role === 'system' || entry.role === 'user' || entry.role === 'assistant')
      .map(entry => ({
        id: entry.id || `msg-${Date.now()}`,
        role: entry.role,
        content: typeof entry.content === 'string' ? entry.content : JSON.stringify(entry.content),
      }));

    console.log('skill_orch_start', { provider, msgCount: chatMessages.length });
    const result = await toolAgentService.run(provider, chatMessages as any, {
      temperature: settings.temperature,
      maxTokens: settings.maxTokens,
      topP: settings.topP,
      systemPrompt: settings.systemPrompt,
    });
    return result.finalText?.trim() || null;
  }

  private async generateDeviceText(
    activeProvider: ProviderType | null,
    messages: Array<{ role: string; content: string }>,
    settings: any,
  ): Promise<string> {
    if (activeProvider === 'apple-foundation') {
      return appleFoundationService.generateResponse(
        messages.map(entry => ({
          role: entry.role as 'system' | 'user' | 'assistant',
          content: entry.content,
        })),
        {
          temperature: settings.temperature,
          maxTokens: settings.maxTokens,
          topP: settings.topP,
        },
      );
    }

    const response = await engineService.mgr().gen(
      messages as any,
      {
        settings: {
          ...settings,
          maxTokens: Math.min(settings.maxTokens || 1024, 1024),
        },
      },
    );
    return response || '';
  }

  private async executeToolCalls(toolCalls: ToolCall[]): Promise<string[]> {
    const outputs: string[] = [];
    for (const call of toolCalls) {
      const name = call.function.name;
      const stepId = skillActivityAdapter.start(`Calling ${name}`, call.function.arguments);
      try {
        const result = await toolExecutor.execute(call);
        skillActivityAdapter.done(stepId, `Called ${name}`);
        outputs.push(result.content);
      } catch (error) {
        skillActivityAdapter.done(stepId, `Failed ${name}`);
        outputs.push(error instanceof Error ? error.message : 'tool_error');
      }
    }
    return outputs;
  }

  async runDeviceToolLoop(
    activeProvider: ProviderType | null,
    messages: any[],
    settings: any,
  ): Promise<string | null> {
    if (!this.supportsDeviceLoop(activeProvider)) {
      return null;
    }

    if (activeProvider === 'apple-foundation') {
      if (!appleFoundationService.isAvailable() || !(await appleFoundationService.isEnabled())) {
        console.log('skill_device_apple_off');
        return null;
      }
    } else if (!engineService.ready()) {
      console.log('skill_device_engine_off');
      return null;
    }

    const basePrompt = settings.systemPrompt || '';
    const toolPrompt = buildDeviceToolPrompt(basePrompt);
    const loopMessages = toLoopMessages(messages).map(entry => (
      entry.role === 'system'
        ? { ...entry, content: toolPrompt }
        : entry
    ));

    if (!loopMessages.some(entry => entry.role === 'system')) {
      loopMessages.unshift({ role: 'system', content: toolPrompt });
    }

    console.log('skill_device_loop_start', { provider: activeProvider });

    for (let iteration = 0; iteration < MAX_DEVICE_ITERATIONS; iteration += 1) {
      if (toolExecutor.hasReachedLimit(iteration + 1)) {
        break;
      }

      const response = await this.generateDeviceText(activeProvider, loopMessages, settings);
      const toolCalls = parseToolCallsFromText(response);
      if (toolCalls.length === 0) {
        if (iteration > 0) {
          const text = response.trim();
          console.log('skill_device_loop_done', { iteration });
          return text || null;
        }
        console.log('skill_device_loop_no_tools');
        return null;
      }

      console.log('skill_device_tool_calls', { iteration, count: toolCalls.length });
      loopMessages.push({ role: 'assistant', content: response });
      const results = await this.executeToolCalls(toolCalls);
      for (let index = 0; index < results.length; index += 1) {
        const call = toolCalls[index];
        loopMessages.push({
          role: 'user',
          content: `Tool result for ${call.function.name}: ${results[index]}`,
        });
      }
    }

    return null;
  }

  async tryDirectRoute(userText: string): Promise<string | null> {
    const enabled = await skillManager.getEnabled();
    const skill = pickSkill(userText, enabled);
    if (!skill) {
      console.log('skill_route_miss');
      return null;
    }

    if (skill.type !== 'js') {
      console.log('skill_route_text_skip', skill.id);
      return null;
    }

    console.log('skill_route_hit', skill.id);
    const loadId = skillActivityAdapter.start(`Loading skill "${skill.name}"`, `Skill: ${skill.name}`);
    skillActivityAdapter.done(loadId, `Loaded skill "${skill.name}"`);
    const stepId = skillActivityAdapter.start(`Calling skill "${skill.name}"`);
    try {
      const result = await skillExecutor.runJs(skill, {
        scriptName: skill.metadata?.scriptName || 'main',
        data: buildJsData(skill, userText),
      });
      skillActivityAdapter.done(stepId, `Called skill "${skill.name}"`);
      const text = formatSkillChatText(skill, result);
      console.log('skill_route_ok', { id: skill.id, len: text.length });
      return text;
    } catch (error) {
      skillActivityAdapter.done(stepId, `Failed skill "${skill.name}"`);
      console.log('skill_route_fail', error instanceof Error ? error.message : 'unknown');
      return null;
    }
  }

  async run(
    messages: any[],
    settings: any,
    userText: string,
    activeProvider: ProviderType | null,
  ): Promise<string | null> {
    console.log('skills_run_start', { provider: activeProvider, queryLen: userText.length });

    const online = await this.runOnlineLoop(messages, settings);
    if (online) {
      console.log('skill_orch_done', { len: online.length });
      return online;
    }

    const direct = await this.tryDirectRoute(userText);
    if (direct) {
      console.log('skill_route_done', { len: direct.length });
      return direct;
    }

    const device = await this.runDeviceToolLoop(activeProvider, messages, settings);
    if (device) {
      console.log('skill_device_done', { len: device.length });
      return device;
    }

    console.log('skills_run_miss');
    return null;
  }
}

export const skillsOrchestrator = new SkillsOrchestrator();
