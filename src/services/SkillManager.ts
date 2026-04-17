import AsyncStorage from '@react-native-async-storage/async-storage';
import * as DocumentPicker from 'expo-document-picker';
import * as SecureStore from 'expo-secure-store';

import { fs as FileSystem } from './fs';
import type { Skill, SkillImportPayload } from '../types/skill';
import { registerSkillTools } from './tools/SkillTools';

const CUSTOM_SKILLS_KEY = '@skills_custom_v1';
const ENABLED_SKILLS_KEY = '@skills_enabled_v1';
const SECRET_PREFIX = 'skill_secret_';

const BUILTIN_SKILLS: Skill[] = [
  {
    id: 'web-research',
    name: 'Web Research',
    description: 'Structure quick research tasks before using web-enabled tools.',
    type: 'text',
    instructions:
      'Break the task into search queries, collect sources, summarize evidence, and report uncertainty when sources conflict.',
    source: 'builtin',
    enabled: true,
  },
  {
    id: 'task-brief',
    name: 'Task Brief',
    description: 'Turn vague user asks into a concise execution brief.',
    type: 'text',
    instructions:
      'Rewrite the request as a short execution brief with goal, constraints, and expected output. Ask for clarification only when the task is blocked.',
    source: 'builtin',
    enabled: false,
  },
  {
    id: 'private-context',
    name: 'Private Context',
    description: 'Use a secure token or note as a hidden instruction source.',
    type: 'text',
    instructions:
      'Use the stored secret as private context. Never expose the raw secret value in the final answer.',
    source: 'builtin',
    enabled: false,
    secret: {
      label: 'Secret note',
      required: true,
    },
  },
];

class SkillManager {
  private async getCustomSkills(): Promise<Skill[]> {
    try {
      const raw = await AsyncStorage.getItem(CUSTOM_SKILLS_KEY);
      if (!raw) {
        return [];
      }
      const parsed = JSON.parse(raw) as Skill[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  private async saveCustomSkills(skills: Skill[]): Promise<void> {
    await AsyncStorage.setItem(CUSTOM_SKILLS_KEY, JSON.stringify(skills));
  }

  private async getEnabledMap(): Promise<Record<string, boolean>> {
    try {
      const raw = await AsyncStorage.getItem(ENABLED_SKILLS_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
      return {};
    }
  }

  private async saveEnabledMap(enabled: Record<string, boolean>): Promise<void> {
    await AsyncStorage.setItem(ENABLED_SKILLS_KEY, JSON.stringify(enabled));
  }

  private normalizeImportedSkill(payload: SkillImportPayload, source: Skill['source'], sourceUrl?: string): Skill {
    return {
      id: `${payload.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now()}`,
      name: payload.name.trim(),
      description: payload.description?.trim() || 'Imported custom skill',
      type: payload.type === 'js' ? 'js' : 'text',
      instructions: payload.instructions.trim(),
      source,
      sourceUrl,
      enabled: true,
      secret: payload.secret,
      handler: payload.handler,
    };
  }

  private parseImportedText(content: string, fallbackName: string): SkillImportPayload {
    try {
      const parsed = JSON.parse(content) as SkillImportPayload;
      if (parsed && parsed.name && parsed.instructions) {
        return parsed;
      }
    } catch {
    }

    return {
      name: fallbackName,
      instructions: content.trim(),
      description: 'Imported text skill',
      type: 'text',
    };
  }

  async getAll(): Promise<Skill[]> {
    const [customSkills, enabledMap] = await Promise.all([
      this.getCustomSkills(),
      this.getEnabledMap(),
    ]);

    const builtins = BUILTIN_SKILLS.map(skill => ({
      ...skill,
      enabled: enabledMap[skill.id] ?? skill.enabled,
    }));

    const custom = customSkills.map(skill => ({
      ...skill,
      enabled: enabledMap[skill.id] ?? skill.enabled,
    }));

    return [...builtins, ...custom];
  }

  async getEnabled(): Promise<Skill[]> {
    const skills = await this.getAll();
    return skills.filter(skill => skill.enabled);
  }

  async getSkill(id: string): Promise<Skill | null> {
    const skills = await this.getAll();
    return skills.find(skill => skill.id === id) || null;
  }

  async toggle(id: string): Promise<void> {
    const skills = await this.getAll();
    const target = skills.find(skill => skill.id === id);
    if (!target) {
      throw new Error('skill_not_found');
    }

    const enabledMap = await this.getEnabledMap();
    enabledMap[id] = !target.enabled;
    await this.saveEnabledMap(enabledMap);
    await this.syncTools();
  }

  async remove(id: string): Promise<void> {
    const skills = await this.getCustomSkills();
    const next = skills.filter(skill => skill.id !== id);
    await this.saveCustomSkills(next);

    const enabledMap = await this.getEnabledMap();
    delete enabledMap[id];
    await this.saveEnabledMap(enabledMap);
    await SecureStore.deleteItemAsync(`${SECRET_PREFIX}${id}`);
    await this.syncTools();
  }

  async importFromUrl(url: string): Promise<Skill> {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('skill_import_failed');
    }

    const text = await response.text();
    const fallbackName = url.split('/').pop()?.replace(/\.[^.]+$/, '') || 'Imported Skill';
    const payload = this.parseImportedText(text, fallbackName);
    const skill = this.normalizeImportedSkill(payload, 'url', url);

    const customSkills = await this.getCustomSkills();
    customSkills.unshift(skill);
    await this.saveCustomSkills(customSkills);

    const enabledMap = await this.getEnabledMap();
    enabledMap[skill.id] = true;
    await this.saveEnabledMap(enabledMap);
    await this.syncTools();
    return skill;
  }

  async importFromFile(): Promise<Skill | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'text/plain', 'text/markdown', 'text/x-markdown'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets[0]) {
      return null;
    }

    const asset = result.assets[0];
    const text = await FileSystem.readAsStringAsync(asset.uri);
    const fallbackName = asset.name?.replace(/\.[^.]+$/, '') || 'Imported Skill';
    const payload = this.parseImportedText(text, fallbackName);
    const skill = this.normalizeImportedSkill(payload, 'local');

    const customSkills = await this.getCustomSkills();
    customSkills.unshift(skill);
    await this.saveCustomSkills(customSkills);

    const enabledMap = await this.getEnabledMap();
    enabledMap[skill.id] = true;
    await this.saveEnabledMap(enabledMap);
    await this.syncTools();
    return skill;
  }

  async setSecret(skillId: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(`${SECRET_PREFIX}${skillId}`, value);
  }

  async getSecret(skillId: string): Promise<string | null> {
    return SecureStore.getItemAsync(`${SECRET_PREFIX}${skillId}`);
  }

  async buildSystemPrompt(basePrompt?: string): Promise<string> {
    const enabled = await this.getEnabled();
    if (enabled.length === 0) {
      return basePrompt || '';
    }

    const skillList = enabled
      .map(skill => `- ${skill.name}: ${skill.description}`)
      .join('\n');

    const skillPrompt = `You can use these enabled skills when they help:\n${skillList}\nLoad a skill before relying on its instructions.`;
    return [basePrompt?.trim(), skillPrompt].filter(Boolean).join('\n\n');
  }

  async syncTools(): Promise<void> {
    await registerSkillTools();
  }
}

export const skillManager = new SkillManager();
