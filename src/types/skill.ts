export type SkillType = 'text' | 'js';

export type SkillSource = 'builtin' | 'url' | 'local';

export type SkillSecret = {
  label: string;
  required: boolean;
};

export type Skill = {
  id: string;
  name: string;
  description: string;
  type: SkillType;
  instructions: string;
  source: SkillSource;
  sourceUrl?: string;
  enabled: boolean;
  secret?: SkillSecret;
  handler?: string;
};

export type SkillImportPayload = {
  name: string;
  description?: string;
  instructions: string;
  type?: SkillType;
  secret?: SkillSecret;
  handler?: string;
};
