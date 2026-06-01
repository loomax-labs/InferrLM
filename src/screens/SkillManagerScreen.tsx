import React, { useEffect, useState } from 'react';
import { Linking } from 'react-native';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AppHeader from '../components/AppHeader';
import SkillResultRenderer from '../components/chat/SkillResultRenderer';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { skillExecutor } from '../services/SkillExecutor';
import { skillManager } from '../services/SkillManager';
import type { Skill, SkillResult } from '../types/skill';

export default function SkillManagerScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [importUrl, setImportUrl] = useState('');
  const [selectedSkillId, setSelectedSkillId] = useState<string | null>(null);
  const [secretValue, setSecretValue] = useState('');
  const [previewInput, setPreviewInput] = useState('hello world');
  const [previewResult, setPreviewResult] = useState<SkillResult | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);

  const loadSkills = async () => {
    setLoading(true);
    try {
      const nextSkills = await skillManager.getAll();
      setSkills(nextSkills);
      await skillManager.syncTools();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  const selectedSkill = skills.find(skill => skill.id === selectedSkillId) || null;

  useEffect(() => {
    const loadSecret = async () => {
      if (!selectedSkill?.secret) {
        setSecretValue('');
        return;
      }
      const secret = await skillManager.getSecret(selectedSkill.id);
      setSecretValue(secret || '');
    };

    loadSecret();
  }, [selectedSkill?.id, selectedSkill?.secret]);

  useEffect(() => {
    setPreviewResult(null);
    setPreviewInput('hello world');
  }, [selectedSkill?.id]);

  const handleToggle = async (skillId: string) => {
    try {
      setBusyAction(skillId);
      await skillManager.toggle(skillId);
      await loadSkills();
    } catch (error) {
      Alert.alert('Skill update failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusyAction(null);
    }
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) {
      return;
    }
    try {
      setBusyAction('import-url');
      await skillManager.importFromUrl(importUrl.trim());
      setImportUrl('');
      await loadSkills();
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Could not import skill');
    } finally {
      setBusyAction(null);
    }
  };

  const handleImportFile = async () => {
    try {
      setBusyAction('import-file');
      await skillManager.importFromFile();
      await loadSkills();
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Could not import skill file');
    } finally {
      setBusyAction(null);
    }
  };

  const handleDelete = async (skillId: string) => {
    try {
      setBusyAction(`delete-${skillId}`);
      await skillManager.remove(skillId);
      if (selectedSkillId === skillId) {
        setSelectedSkillId(null);
      }
      await loadSkills();
    } catch (error) {
      Alert.alert('Delete failed', error instanceof Error ? error.message : 'Could not delete skill');
    } finally {
      setBusyAction(null);
    }
  };

  const handleSaveSecret = async () => {
    if (!selectedSkill) {
      return;
    }
    try {
      setBusyAction(`secret-${selectedSkill.id}`);
      await skillManager.setSecret(selectedSkill.id, secretValue);
      Alert.alert('Saved', 'Skill secret updated.');
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Could not save secret');
    } finally {
      setBusyAction(null);
    }
  };

  const handleOpenHomepage = async (url: string) => {
    try {
      await Linking.openURL(url);
    } catch {
      Alert.alert('Open failed', 'Could not open the skill homepage.');
    }
  };

  const handlePreview = async () => {
    if (!selectedSkill) {
      return;
    }

    try {
      setBusyAction(`preview-${selectedSkill.id}`);
      if (selectedSkill.type === 'js') {
        setPreviewResult(await skillExecutor.runJs(selectedSkill, {
          scriptName: selectedSkill.metadata?.scriptName,
          data: previewInput,
        }));
        return;
      }

      setPreviewResult(await skillExecutor.run(selectedSkill, {
        input: previewInput,
      }));
    } catch (error) {
      setPreviewResult({
        error: error instanceof Error ? error.message : 'Preview failed',
      });
    } finally {
      setBusyAction(null);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AppHeader title="Skills" showBackButton showLogo={false} rightButtons={[]} />
      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (
        <ScrollView style={styles.container} contentContainerStyle={styles.content}>
          <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}> 
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Import Skills</Text>
            <TextInput
              value={importUrl}
              onChangeText={setImportUrl}
              placeholder="https://example.com/skill.json"
              placeholderTextColor={themeColors.secondaryText}
              style={[styles.urlInput, { color: themeColors.text, borderColor: themeColors.secondaryText + '30' }]}
              autoCapitalize="none"
            />
            <View style={styles.row}>
              <TouchableOpacity style={[styles.primaryButton, { backgroundColor: themeColors.primary }]} onPress={handleImportUrl}>
                <MaterialCommunityIcons name="cloud-download-outline" size={18} color="#FFFFFF" />
                <Text style={styles.primaryButtonText}>Import URL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.secondaryButton, { borderColor: themeColors.secondaryText + '30' }]} onPress={handleImportFile}>
                <MaterialCommunityIcons name="file-import-outline" size={18} color={themeColors.text} />
                <Text style={[styles.secondaryButtonText, { color: themeColors.text }]}>Import File</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}> 
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Available Skills</Text>
            {skills.map(skill => {
              const selected = skill.id === selectedSkillId;
              return (
                <View key={skill.id} style={[styles.skillCard, { borderColor: themeColors.secondaryText + '20' }]}>
                  <TouchableOpacity style={styles.skillHeader} onPress={() => setSelectedSkillId(selected ? null : skill.id)}>
                    <View style={styles.skillInfo}>
                      <Text style={[styles.skillName, { color: themeColors.text }]}>{skill.name}</Text>
                      <Text style={[styles.skillMeta, { color: themeColors.secondaryText }]}>{skill.description}</Text>
                    </View>
                    <View style={styles.skillControls}>
                      <Switch value={skill.enabled} onValueChange={() => handleToggle(skill.id)} disabled={busyAction === skill.id} />
                      <MaterialCommunityIcons name={selected ? 'chevron-up' : 'chevron-down'} size={20} color={themeColors.secondaryText} />
                    </View>
                  </TouchableOpacity>

                  {selected && (
                    <View style={styles.skillBody}>
                      <Text style={[styles.skillDetail, { color: themeColors.secondaryText }]}>Source: {skill.source}</Text>
                      <View style={styles.badgeRow}>
                        <View style={[styles.badge, { backgroundColor: themeColors.primary + '18' }]}>
                          <Text style={[styles.badgeText, { color: themeColors.primary }]}>{skill.type.toUpperCase()}</Text>
                        </View>
                        {skill.metadata?.homepage ? (
                          <TouchableOpacity style={[styles.badge, { backgroundColor: themeColors.secondaryText + '18' }]} onPress={() => handleOpenHomepage(skill.metadata!.homepage!)}>
                            <Text style={[styles.badgeText, { color: themeColors.text }]}>Homepage</Text>
                          </TouchableOpacity>
                        ) : null}
                      </View>
                      <Text style={[styles.instructions, { color: themeColors.text }]}>{skill.instructions}</Text>

                      <View style={[styles.previewCard, { borderColor: themeColors.secondaryText + '20', backgroundColor: themeColors.background }]}>
                        <Text style={[styles.previewTitle, { color: themeColors.text }]}>{skill.type === 'js' ? 'Skill Preview' : 'Prompt Preview'}</Text>
                        <TextInput
                          value={previewInput}
                          onChangeText={setPreviewInput}
                          placeholder={skill.type === 'js' ? 'Preview input for the skill' : 'Input passed into the skill context'}
                          placeholderTextColor={themeColors.secondaryText}
                          multiline
                          style={[
                            styles.previewInput,
                            {
                              color: themeColors.text,
                              borderColor: themeColors.secondaryText + '30',
                            },
                          ]}
                        />
                        <TouchableOpacity
                          style={[styles.secondaryButton, { borderColor: themeColors.secondaryText + '30' }]}
                          onPress={handlePreview}
                          disabled={busyAction === `preview-${skill.id}`}
                        >
                          <MaterialCommunityIcons name="play-outline" size={18} color={themeColors.text} />
                          <Text style={[styles.secondaryButtonText, { color: themeColors.text }]}>Run Preview</Text>
                        </TouchableOpacity>
                        {busyAction === `preview-${skill.id}` ? (
                          <ActivityIndicator size="small" color={themeColors.primary} />
                        ) : null}
                        {previewResult ? <SkillResultRenderer result={previewResult} /> : null}
                      </View>

                      {skill.secret && (
                        <View style={styles.secretWrap}>
                          <Text style={[styles.secretLabel, { color: themeColors.text }]}>{skill.secret.label}</Text>
                          <TextInput
                            value={secretValue}
                            onChangeText={setSecretValue}
                            secureTextEntry
                            placeholder="Enter secret value"
                            placeholderTextColor={themeColors.secondaryText}
                            style={[styles.urlInput, { color: themeColors.text, borderColor: themeColors.secondaryText + '30' }]}
                          />
                          <TouchableOpacity style={[styles.secondaryButton, { borderColor: themeColors.secondaryText + '30' }]} onPress={handleSaveSecret}>
                            <MaterialCommunityIcons name="content-save-outline" size={18} color={themeColors.text} />
                            <Text style={[styles.secondaryButtonText, { color: themeColors.text }]}>Save Secret</Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {skill.source !== 'builtin' && (
                        <TouchableOpacity style={styles.deleteButton} onPress={() => handleDelete(skill.id)}>
                          <MaterialCommunityIcons name="trash-can-outline" size={16} color="#C62828" />
                          <Text style={styles.deleteText}>Delete Skill</Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    borderRadius: 18,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  urlInput: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
  },
  row: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
  },
  primaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  secondaryButton: {
    minHeight: 48,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  skillCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    marginTop: 10,
  },
  skillHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  skillInfo: {
    flex: 1,
  },
  skillControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  skillName: {
    fontSize: 15,
    fontWeight: '700',
  },
  skillMeta: {
    marginTop: 4,
    fontSize: 13,
  },
  skillBody: {
    marginTop: 12,
    gap: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  skillDetail: {
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  instructions: {
    fontSize: 14,
    lineHeight: 21,
  },
  secretWrap: {
    gap: 10,
  },
  previewCard: {
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
    gap: 10,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  previewInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 96,
    textAlignVertical: 'top',
  },
  secretLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  deleteText: {
    color: '#C62828',
    fontSize: 13,
    fontWeight: '700',
  },
});
