import type { Skill, SkillResult } from '../types/skill';
import { skillActivityAdapter } from './adapters/SkillActivityAdapter';
import { onlineModelService } from './OnlineModelService';
import { skillExecutor } from './SkillExecutor';
import { skillManager } from './SkillManager';
import { toolAgentService } from './ToolAgentService';
import { toolRegistry } from './tools/ToolRegistry';

const ORCHESTRATOR_PROVIDERS = ['gemini', 'chatgpt', 'claude'] as const;

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
  const q = query.toLowerCase();
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

const formatSkillResult = (skill: Skill, payload: SkillResult): string => {
  if (payload.error) {
    return `Skill "${skill.name}" failed: ${payload.error}`;
  }

  const raw = payload.result;
  if (typeof raw === 'string' && raw.trim()) {
    return `Used ${skill.name}. ${raw.trim()}`;
  }

  if (raw && typeof raw === 'object') {
    const record = raw as Record<string, unknown>;
    if (typeof record.result === 'string' && record.result.trim()) {
      const title = typeof record.title === 'string' ? record.title : skill.name;
      return `Used ${skill.name} (${title}). ${record.result.trim()}`;
    }
  }

  return `Used ${skill.name}. Done.`;
};

class LocalSkillsOrchestrator {
  async shouldHandle(): Promise<boolean> {
    if (!(await skillManager.isModeEnabled())) {
      return false;
    }
    return toolRegistry.hasTools();
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
      return formatSkillResult(skill, result);
    } catch (error) {
      skillActivityAdapter.done(stepId, `Failed skill "${skill.name}"`);
      console.log('skill_route_fail', error instanceof Error ? error.message : 'unknown');
      return null;
    }
  }

  async run(messages: any[], settings: any, userText: string): Promise<string | null> {
    const online = await this.runOnlineLoop(messages, settings);
    if (online) {
      console.log('skill_orch_done');
      return online;
    }

    const direct = await this.tryDirectRoute(userText);
    if (direct) {
      console.log('skill_route_done');
      return direct;
    }

    return null;
  }
}

export const localSkillsOrchestrator = new LocalSkillsOrchestrator();
