import type { ProviderType } from './ModelManagementService';
import type { Skill } from '../types/skill';
import { formatSkillChatText } from './adapters/SkillResultFormatter';
import { skillActivityAdapter } from './adapters/SkillActivityAdapter';
import { appleFoundationService } from './AppleFoundationService';
import { onlineModelService } from './OnlineModelService';
import { skillExecutor } from './SkillExecutor';
import { skillManager } from './SkillManager';
import { parseToolCallsFromText } from './skillsToolParser';
import { runTextSkill } from './TextSkillRunner';
import { runLearnSkill } from './LearnSkillRunner';
import { runKitchenSkill } from './KitchenSkillRunner';
import { kitchenSessionStore } from './KitchenSessionStore';
import { runMoodSkill } from './MoodSkillRunner';
import { runTextStatsSkill } from './TextStatsRunner';
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
  { pattern: /\b(read|show|list|what).*\bcalendar\b/i, skillId: 'read-calendar-events', boost: 11 },
  { pattern: /\b(create|add|schedule|book).*\b(event|meeting)\b/i, skillId: 'create-calendar-event', boost: 11 },
  { pattern: /\bdirections\b|\broute to\b|\bnavigate to\b/i, skillId: 'route-planner', boost: 9 },
  { pattern: /\bhash\b|\bsha-?256\b/i, skillId: 'calculate-hash', boost: 10 },
  { pattern: /\bqr\b|\bqr code\b/i, skillId: 'qr-code', boost: 10 },
  { pattern: /\bword count\b|\btext stats\b|\breading time\b|\bcharacter count\b/i, skillId: 'text-stats', boost: 10 },
  { pattern: /\bmood\b|\bfeeling\b|\blog my mood\b/i, skillId: 'mood-tracker', boost: 10 },
  { pattern: /\bkitchen adventure\b/i, skillId: 'kitchen-adventure', boost: 10 },
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
  { pattern: /\bpiano\b|\bkeyboard\b/i, skillId: 'virtual-piano', boost: 10 },
  { pattern: /\brestaurant\b|\broulette\b|\bfood in\b/i, skillId: 'restaurant-roulette', boost: 10 },
  { pattern: /\bmood music\b|\bmusic for\b|\bplay music\b/i, skillId: 'mood-music', boost: 10 },
  { pattern: /\blearn something\b|\bteach me\b/i, skillId: 'learn-something-new', boost: 8 },
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

const extractWikiTitle = (messages: any[]): string | null => {
  const lastAssistant = [...messages].reverse().find(entry => entry.role === 'assistant');
  if (!lastAssistant) {
    return null;
  }

  const text = typeof lastAssistant.content === 'string' ? lastAssistant.content.trim() : '';
  if (!text) {
    return null;
  }

  const lines = text.split('\n').map(line => line.trim()).filter(Boolean);
  if (lines.length < 2) {
    return null;
  }

  const hasWikiFacts = /\b(Born|Origin|Genres|Occupations):/i.test(text);
  if (!hasWikiFacts) {
    return null;
  }

  return lines[0] || null;
};

const isContextualFollowUp = (userText: string): boolean => {
  return /\b(he|she|they|him|her|them|his|hers|their|it|that|this)\b/i.test(userText)
    || /\b(how|what|when|where|why|who|tall|height|age|born)\b/i.test(userText);
};

const canTryContextualFollowUp = (messages: any[], userText: string): boolean => {
  const userTurns = messages.filter(entry => entry.role === 'user').length;
  if (userTurns <= 1) {
    return false;
  }

  const title = extractWikiTitle(messages);
  if (!title) {
    return false;
  }

  return isContextualFollowUp(userText);
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

  if (skill.id === 'restaurant-roulette') {
    const locationMatch = userText.match(/\bin\s+([^.?!]+)/i);
    const cuisineMatch = userText.match(
      /\b(mexican|italian|indian|sushi|chinese|thai|japanese|korean|french|pizza|burger|vietnamese|mediterranean)\b/i,
    );
    return JSON.stringify({
      location: locationMatch?.[1]?.trim() || 'San Jose',
      cuisine: cuisineMatch?.[0] || 'Italian',
    });
  }

  if (skill.id === 'mood-music') {
    return JSON.stringify({
      genre: 'House',
      duration: 120,
      energy: 'high',
      mood: userText.trim(),
    });
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

  async shouldTryForMessage(userText: string, messages: any[]): Promise<boolean> {
    if (!(await this.shouldHandle())) {
      return false;
    }

    if (await kitchenSessionStore.isActive()) {
      console.log('skills_kitchen_active');
      return true;
    }

    const userTurns = messages.filter(entry => entry.role === 'user').length;
    if (userTurns <= 1) {
      return true;
    }

    const enabled = await skillManager.getEnabled();
    const skill = pickSkill(userText, enabled);
    if (skill) {
      console.log('skills_follow_hit', skill.id);
      return true;
    }

    if (canTryContextualFollowUp(messages, userText)) {
      console.log('skills_context_try');
      return true;
    }

    console.log('skills_skip_followup');
    return false;
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

  async tryContextualFollowUp(messages: any[], userText: string): Promise<string | null> {
    if (!canTryContextualFollowUp(messages, userText)) {
      return null;
    }

    const title = extractWikiTitle(messages);
    if (!title) {
      return null;
    }

    const enabled = await skillManager.getEnabled();
    const skill = enabled.find(entry => entry.id === 'query-wikipedia' && entry.type === 'js');
    if (!skill) {
      return null;
    }

    const topic = `${title} ${userText}`.trim();
    console.log('skill_ctx_wiki', { title, topicLen: topic.length });
    const loadId = skillActivityAdapter.start(`Loading skill "${skill.name}"`, `Skill: ${skill.name}`);
    skillActivityAdapter.done(loadId, `Loaded skill "${skill.name}"`);
    const stepId = skillActivityAdapter.start(`Calling skill "${skill.name}"`);
    try {
      const result = await skillExecutor.runJs(skill, {
        scriptName: skill.metadata?.scriptName || 'main',
        data: JSON.stringify({ topic, lang: 'en' }),
      });
      skillActivityAdapter.done(stepId, `Called skill "${skill.name}"`);
      const text = formatSkillChatText(skill, result);
      console.log('skill_ctx_ok', { len: text.length });
      return text;
    } catch (error) {
      skillActivityAdapter.done(stepId, `Failed skill "${skill.name}"`);
      console.log('skill_ctx_fail', error instanceof Error ? error.message : 'unknown');
      return null;
    }
  }

  async tryDirectRoute(
    userText: string,
    messages: any[],
    settings: any,
    activeProvider: ProviderType | null,
  ): Promise<string | null> {
    if (await kitchenSessionStore.isActive()) {
      const kitchenText = await runKitchenSkill(
        userText,
        messages,
        settings,
        activeProvider,
        (provider, loopMessages, loopSettings) => this.generateDeviceText(provider, loopMessages, loopSettings),
      );
      if (kitchenText) {
        console.log('skill_kitchen_done', kitchenText.length);
        return kitchenText;
      }
    }

    const enabled = await skillManager.getEnabled();
    const skill = pickSkill(userText, enabled);
    if (!skill) {
      console.log('skill_route_miss');
      return null;
    }

    if (skill.id === 'learn-something-new') {
      console.log('skill_route_learn');
      const stepId = skillActivityAdapter.start(`Calling skill "${skill.name}"`);
      const text = await runLearnSkill(skill, userText, messages);
      skillActivityAdapter.done(stepId, text ? `Called skill "${skill.name}"` : `Skipped skill "${skill.name}"`);
      if (text) {
        console.log('skill_route_learn_ok', text.length);
        return text;
      }
      return null;
    }

    if (skill.id === 'mood-tracker') {
      console.log('skill_route_mood');
      const stepId = skillActivityAdapter.start(`Calling skill "${skill.name}"`);
      const text = await runMoodSkill(skill, userText);
      skillActivityAdapter.done(stepId, text ? `Called skill "${skill.name}"` : `Skipped skill "${skill.name}"`);
      if (text) {
        console.log('skill_route_mood_ok', text.length);
        return text;
      }
      return null;
    }

    if (skill.id === 'text-stats') {
      console.log('skill_route_stats');
      const stepId = skillActivityAdapter.start(`Calling skill "${skill.name}"`);
      const text = await runTextStatsSkill(skill, userText);
      skillActivityAdapter.done(stepId, text ? `Called skill "${skill.name}"` : `Skipped skill "${skill.name}"`);
      if (text) {
        console.log('skill_route_stats_ok', text.length);
        return text;
      }
      return null;
    }

    if (skill.type !== 'js') {
      if (skill.type === 'text') {
        console.log('skill_route_text', skill.id);
        const stepId = skillActivityAdapter.start(`Calling skill "${skill.name}"`);
        const text = await runTextSkill(skill, userText);
        skillActivityAdapter.done(stepId, text ? `Called skill "${skill.name}"` : `Skipped skill "${skill.name}"`);
        if (text) {
          console.log('skill_route_text_ok', { id: skill.id, len: text.length });
          return text;
        }
      }
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

    const contextual = await this.tryContextualFollowUp(messages, userText);
    if (contextual) {
      console.log('skill_ctx_done', { len: contextual.length });
      return contextual;
    }

    const direct = await this.tryDirectRoute(userText, messages, settings, activeProvider);
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
