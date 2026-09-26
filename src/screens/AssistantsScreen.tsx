import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AppHeader from '../components/AppHeader';
import Dialog from '../components/Dialog';
import ModelSelector from '../components/ModelSelector';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import {
  ASSISTANT_LIMITS,
  AssistantValidationError,
  assistantService,
} from '../services/AssistantService';
import { skillManager } from '../services/SkillManager';
import type { Assistant, AssistantModelRef } from '../types/assistant';
import type { Skill } from '../types/skill';
import type { ProviderType } from '../services/ModelManagementService';
import { OnlineModelService } from '../services/OnlineModelService';

const formatModelLabel = (model?: AssistantModelRef): string => {
  if (!model) {
    return 'None (use chat default)';
  }
  if (model.provider === 'local') {
    const leaf = model.modelId.split('/').pop() || model.modelId;
    return leaf.replace(/\.(gguf|litertlm|task)$/i, '');
  }
  if (model.provider === 'apple-foundation') {
    return 'Apple Foundation';
  }
  const parts = model.modelId.split('_');
  return parts.length > 1 ? parts.slice(1).join(' ') : model.modelId;
};

type EditorDraft = {
  name: string;
  task: string;
  systemPrompt: string;
  skillIds: string[];
  model?: AssistantModelRef;
};

const emptyDraft = (): EditorDraft => ({
  name: '',
  task: '',
  systemPrompt: '',
  skillIds: [],
  model: undefined,
});

const draftFromAssistant = (assistant: Assistant): EditorDraft => ({
  name: assistant.name,
  task: assistant.task,
  systemPrompt: assistant.systemPrompt,
  skillIds: [...assistant.skillIds],
  model: assistant.model,
});

export default function AssistantsScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [skills, setSkills] = useState<Skill[]>([]);
  const [mode, setMode] = useState<'list' | 'edit'>('list');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draft, setDraft] = useState<EditorDraft>(emptyDraft());
  const [deleteTarget, setDeleteTarget] = useState<Assistant | null>(null);
  const [modelPickerOpen, setModelPickerOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [list, allSkills] = await Promise.all([
        assistantService.list(),
        skillManager.getAll(),
      ]);
      setAssistants(list);
      setSkills(allSkills);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const openCreate = () => {
    setEditingId(null);
    setDraft(emptyDraft());
    setMode('edit');
  };

  const openEdit = (assistant: Assistant) => {
    setEditingId(assistant.id);
    setDraft(draftFromAssistant(assistant));
    setMode('edit');
  };

  const closeEditor = () => {
    setMode('list');
    setEditingId(null);
    setDraft(emptyDraft());
    setModelPickerOpen(false);
  };

  const toggleSkill = (skillId: string) => {
    setDraft(prev => {
      const has = prev.skillIds.includes(skillId);
      if (has) {
        return { ...prev, skillIds: prev.skillIds.filter(id => id !== skillId) };
      }
      if (prev.skillIds.length >= ASSISTANT_LIMITS.maxSkills) {
        Alert.alert('Skill limit', `At most ${ASSISTANT_LIMITS.maxSkills} skills per assistant.`);
        return prev;
      }
      return { ...prev, skillIds: [...prev.skillIds, skillId] };
    });
  };

  const handleModelSelect = (provider: ProviderType, modelPath?: string) => {
    setModelPickerOpen(false);
    if (provider === 'local' && modelPath) {
      setDraft(prev => ({
        ...prev,
        model: { provider: 'local', modelId: modelPath },
      }));
      return;
    }
    if (provider === 'apple-foundation') {
      setDraft(prev => ({
        ...prev,
        model: { provider: 'apple-foundation', modelId: 'apple-foundation' },
      }));
      return;
    }
    const base = OnlineModelService.getBaseProvider(provider);
    setDraft(prev => ({
      ...prev,
      model: {
        provider: base as AssistantModelRef['provider'],
        modelId: provider,
      },
    }));
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      if (editingId) {
        await assistantService.update(editingId, draft);
      } else {
        await assistantService.create(draft);
      }
      await load();
      closeEditor();
    } catch (error) {
      const message =
        error instanceof AssistantValidationError
          ? error.message
          : error instanceof Error
            ? error.message
            : 'Could not save assistant.';
      Alert.alert('Save failed', message);
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }
    try {
      setSaving(true);
      await assistantService.delete(deleteTarget.id);
      setDeleteTarget(null);
      if (editingId === deleteTarget.id) {
        closeEditor();
      }
      await load();
    } catch (error) {
      Alert.alert(
        'Delete failed',
        error instanceof Error ? error.message : 'Could not delete assistant.',
      );
    } finally {
      setSaving(false);
    }
  };

  const headerTitle = mode === 'list' ? 'Assistants' : editingId ? 'Edit assistant' : 'New assistant';

  const headerRight =
    mode === 'list' ? (
      <TouchableOpacity onPress={openCreate} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
        <MaterialCommunityIcons name="plus" size={24} color={themeColors.headerText} />
      </TouchableOpacity>
    ) : (
      <TouchableOpacity
        onPress={handleSave}
        disabled={saving}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        {saving ? (
          <ActivityIndicator size="small" color={themeColors.headerText} />
        ) : (
          <Text style={[styles.saveHeader, { color: themeColors.headerText }]}>Save</Text>
        )}
      </TouchableOpacity>
    );

  const renderList = () => (
    <ScrollView style={styles.body} contentContainerStyle={styles.listContent} showsVerticalScrollIndicator={false}>
      <Text style={[styles.hint, { color: themeColors.secondaryText }]}>
        Task-focused profiles with their own prompt, skills, and optional preferred model. Stored on this device.
      </Text>
      {assistants.length === 0 ? (
        <View style={[styles.emptyCard, { backgroundColor: themeColors.cardBackground }]}>
          <MaterialCommunityIcons name="account-cog-outline" size={40} color={themeColors.secondaryText} />
          <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No assistants yet</Text>
          <Text style={[styles.emptyDesc, { color: themeColors.secondaryText }]}>
            Create one to bundle a system prompt and skills for a specific job.
          </Text>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: themeColors.primary }]}
            onPress={openCreate}
          >
            <Text style={styles.primaryBtnText}>Create assistant</Text>
          </TouchableOpacity>
        </View>
      ) : (
        assistants.map(assistant => (
          <Pressable
            key={assistant.id}
            onPress={() => openEdit(assistant)}
            style={[styles.rowCard, { backgroundColor: themeColors.cardBackground }]}
          >
            <View style={styles.rowMain}>
              <Text style={[styles.rowTitle, { color: themeColors.text }]} numberOfLines={1}>
                {assistant.name}
              </Text>
              <Text style={[styles.rowTask, { color: themeColors.secondaryText }]} numberOfLines={2}>
                {assistant.task}
              </Text>
              <Text style={[styles.rowMeta, { color: themeColors.secondaryText }]} numberOfLines={1}>
                {`${assistant.skillIds.length} skill${assistant.skillIds.length === 1 ? '' : 's'}`}
                {assistant.model ? ` · ${formatModelLabel(assistant.model)}` : ''}
              </Text>
            </View>
            <MaterialCommunityIcons name="chevron-right" size={22} color={themeColors.secondaryText} />
          </Pressable>
        ))
      )}
      <Text style={[styles.countFoot, { color: themeColors.secondaryText }]}>
        {`${assistants.length} / ${ASSISTANT_LIMITS.maxAssistants}`}
      </Text>
    </ScrollView>
  );

  const renderEditor = () => (
    <ScrollView style={styles.body} contentContainerStyle={styles.editorContent} keyboardShouldPersistTaps="handled">
      <Field
        label="Name"
        value={draft.name}
        onChangeText={text => setDraft(prev => ({ ...prev, name: text }))}
        maxLength={ASSISTANT_LIMITS.maxName}
        themeColors={themeColors}
        placeholder="e.g. Research helper"
      />
      <Counter
        current={draft.name.length}
        max={ASSISTANT_LIMITS.maxName}
        themeColors={themeColors}
      />

      <Field
        label="Task"
        value={draft.task}
        onChangeText={text => setDraft(prev => ({ ...prev, task: text }))}
        maxLength={ASSISTANT_LIMITS.maxTask}
        themeColors={themeColors}
        placeholder="What this assistant is for"
      />
      <Counter current={draft.task.length} max={ASSISTANT_LIMITS.maxTask} themeColors={themeColors} />

      <Text style={[styles.fieldLabel, { color: themeColors.secondaryText }]}>System prompt</Text>
      <TextInput
        value={draft.systemPrompt}
        onChangeText={text => setDraft(prev => ({ ...prev, systemPrompt: text }))}
        placeholder="Instructions and behavior"
        placeholderTextColor={themeColors.secondaryText}
        multiline
        maxLength={ASSISTANT_LIMITS.maxPrompt}
        style={[
          styles.promptInput,
          { color: themeColors.text, backgroundColor: themeColors.cardBackground },
        ]}
      />
      <Counter
        current={draft.systemPrompt.length}
        max={ASSISTANT_LIMITS.maxPrompt}
        themeColors={themeColors}
      />

      <Text style={[styles.fieldLabel, { color: themeColors.secondaryText }]}>
        {`Skills (${draft.skillIds.length} / ${ASSISTANT_LIMITS.maxSkills})`}
      </Text>
      <View style={[styles.skillList, { backgroundColor: themeColors.cardBackground }]}>
        {skills.length === 0 ? (
          <Text style={[styles.skillEmpty, { color: themeColors.secondaryText }]}>
            No skills installed. Add skills from the Skills lab.
          </Text>
        ) : (
          skills.map(skill => {
            const picked = draft.skillIds.includes(skill.id);
            return (
              <TouchableOpacity
                key={skill.id}
                style={styles.skillRow}
                onPress={() => toggleSkill(skill.id)}
              >
                <MaterialCommunityIcons
                  name={picked ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={22}
                  color={picked ? themeColors.primary : themeColors.secondaryText}
                />
                <View style={styles.skillText}>
                  <Text style={[styles.skillName, { color: themeColors.text }]}>{skill.name}</Text>
                  <Text style={[styles.skillDesc, { color: themeColors.secondaryText }]} numberOfLines={2}>
                    {skill.description.replace(/\n/g, ' ')}
                  </Text>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      <Text style={[styles.fieldLabel, { color: themeColors.secondaryText }]}>Preferred model (optional)</Text>
      <TouchableOpacity
        style={[styles.modelRow, { backgroundColor: themeColors.cardBackground }]}
        onPress={() => setModelPickerOpen(true)}
      >
        <Text style={[styles.modelValue, { color: themeColors.text }]} numberOfLines={1}>
          {formatModelLabel(draft.model)}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={20} color={themeColors.secondaryText} />
      </TouchableOpacity>
      {draft.model ? (
        <TouchableOpacity onPress={() => setDraft(prev => ({ ...prev, model: undefined }))}>
          <Text style={[styles.clearModel, { color: themeColors.primary }]}>Clear preferred model</Text>
        </TouchableOpacity>
      ) : null}

      {editingId ? (
        <TouchableOpacity
          style={styles.deleteBtn}
          onPress={() => {
            const target = assistants.find(a => a.id === editingId);
            if (target) {
              setDeleteTarget(target);
            }
          }}
        >
          <Text style={styles.deleteText}>Delete assistant</Text>
        </TouchableOpacity>
      ) : null}
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AppHeader
        title={headerTitle}
        showBackButton
        showLogo={false}
        onBackPress={mode === 'edit' ? closeEditor : undefined}
        rightButtons={headerRight}
      />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : mode === 'list' ? (
        renderList()
      ) : (
        renderEditor()
      )}

      <ModelSelector
        isOpen={modelPickerOpen}
        onClose={() => setModelPickerOpen(false)}
        onModelSelect={handleModelSelect}
      />

      <Dialog
        visible={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        title="Delete assistant?"
        description={deleteTarget ? `Remove “${deleteTarget.name}” from this device?` : undefined}
        dismissOnBackdropPress
        primaryButtonText="Delete"
        primaryButtonLoading={saving}
        onPrimaryPress={confirmDelete}
        secondaryButtonText="Cancel"
        onSecondaryPress={() => setDeleteTarget(null)}
      />
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  maxLength,
  themeColors,
  placeholder,
}: {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  maxLength: number;
  themeColors: (typeof theme)['light'];
  placeholder?: string;
}) {
  return (
    <>
      <Text style={[styles.fieldLabel, { color: themeColors.secondaryText }]}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={themeColors.secondaryText}
        maxLength={maxLength}
        style={[
          styles.textInput,
          { color: themeColors.text, backgroundColor: themeColors.cardBackground },
        ]}
      />
    </>
  );
}

function Counter({
  current,
  max,
  themeColors,
}: {
  current: number;
  max: number;
  themeColors: (typeof theme)['light'];
}) {
  return (
    <Text style={[styles.counter, { color: themeColors.secondaryText }]}>
      {`${current} / ${max}`}
    </Text>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  editorContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hint: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  emptyCard: {
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 8,
  },
  primaryBtn: {
    borderRadius: 10,
    paddingHorizontal: 18,
    paddingVertical: 10,
    marginTop: 4,
  },
  primaryBtnText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 15,
  },
  rowCard: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },
  rowMain: {
    flex: 1,
    paddingRight: 8,
  },
  rowTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  rowTask: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 4,
  },
  rowMeta: {
    fontSize: 12,
  },
  countFoot: {
    fontSize: 12,
    textAlign: 'right',
    marginTop: 8,
  },
  fieldLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0.4,
    marginTop: 14,
    marginBottom: 6,
  },
  textInput: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
  },
  promptInput: {
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 15,
    minHeight: 140,
    textAlignVertical: 'top',
  },
  counter: {
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
    marginBottom: 2,
  },
  skillList: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  skillEmpty: {
    padding: 14,
    fontSize: 13,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  skillText: {
    flex: 1,
  },
  skillName: {
    fontSize: 15,
    fontWeight: '600',
    marginBottom: 2,
  },
  skillDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  modelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  modelValue: {
    flex: 1,
    fontSize: 15,
    marginRight: 8,
  },
  clearModel: {
    fontSize: 13,
    marginTop: 8,
  },
  deleteBtn: {
    marginTop: 28,
    alignItems: 'center',
    paddingVertical: 12,
  },
  deleteText: {
    color: '#C62828',
    fontSize: 15,
    fontWeight: '600',
  },
  saveHeader: {
    fontSize: 16,
    fontWeight: '600',
  },
});
