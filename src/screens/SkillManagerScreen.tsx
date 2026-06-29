import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Modal,
  Pressable,
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
import Dialog from '../components/Dialog';
import SkillResultRenderer from '../components/chat/SkillResultRenderer';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { skillExecutor } from '../services/SkillExecutor';
import { skillManager } from '../services/SkillManager';
import type { Skill, SkillResult } from '../types/skill';

const MAX_SKILL_COUNT = 15;
const COMMUNITY_SKILLS_URL = 'https://github.com/topics/agent-skills';

type AddOption = {
  id: string;
  title: string;
  desc: string;
  icon: React.ComponentProps<typeof MaterialCommunityIcons>['name'];
  action: () => void;
};

type SkillRowProps = {
  skill: Skill;
  themeColors: (typeof theme)['light'];
  inMulti: boolean;
  picked: boolean;
  busy: boolean;
  onToggle: () => void;
  onPick: () => void;
  onLong: () => void;
  onView: () => void;
  onSecret: () => void;
  onDelete: () => void;
  onHome: (url: string) => void;
};

function SkillRow({
  skill,
  themeColors,
  inMulti,
  picked,
  busy,
  onToggle,
  onPick,
  onLong,
  onView,
  onSecret,
  onDelete,
  onHome,
}: SkillRowProps) {
  const isCustom = skill.source !== 'builtin';
  const homepage = skill.metadata?.homepage;
  const needsSecret = !!skill.secret;

  return (
    <Pressable
      onLongPress={isCustom ? onLong : undefined}
      onPress={inMulti && isCustom ? onPick : undefined}
      style={[
        styles.skillRow,
        { backgroundColor: themeColors.cardBackground },
        inMulti && !isCustom ? styles.dimRow : null,
      ]}
    >
      {inMulti && isCustom ? (
        <TouchableOpacity onPress={onPick} style={styles.checkWrap}>
          <MaterialCommunityIcons
            name={picked ? 'checkbox-marked' : 'checkbox-blank-outline'}
            size={22}
            color={themeColors.primary}
          />
        </TouchableOpacity>
      ) : null}

      <View style={styles.skillMain}>
        <View style={styles.skillTop}>
          <View style={styles.skillText}>
            {homepage ? (
              <TouchableOpacity style={styles.linkRow} onPress={() => onHome(homepage)}>
                <Text style={[styles.skillName, { color: themeColors.primary }]}>{skill.name}</Text>
                <MaterialCommunityIcons name="open-in-new" size={14} color={themeColors.primary} />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.skillName, { color: themeColors.text }]}>{skill.name}</Text>
            )}
            <Text style={[styles.skillDesc, { color: themeColors.secondaryText }]}>
              {skill.description.replace(/\n/g, ' ')}
            </Text>
          </View>
          <Switch
            value={skill.enabled}
            onValueChange={onToggle}
            disabled={busy || inMulti}
            trackColor={{ false: themeColors.borderColor, true: themeColors.primary + '80' }}
            thumbColor={skill.enabled ? themeColors.primary : themeColors.secondaryText}
          />
        </View>

        {!inMulti ? (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={[styles.tonalBtn, { backgroundColor: themeColors.borderColor }]}
              onPress={onView}
            >
              <MaterialCommunityIcons name="eye-outline" size={16} color={themeColors.secondaryText} />
              <Text style={[styles.tonalText, { color: themeColors.text }]}>View</Text>
            </TouchableOpacity>

            {needsSecret ? (
              <TouchableOpacity
                style={[styles.tonalBtn, { backgroundColor: themeColors.borderColor }]}
                onPress={onSecret}
              >
                <MaterialCommunityIcons name="key-outline" size={16} color={themeColors.secondaryText} />
                <Text style={[styles.tonalText, { color: themeColors.text }]}>Secret</Text>
              </TouchableOpacity>
            ) : null}

            {isCustom ? (
              <TouchableOpacity
                style={[styles.tonalBtn, { backgroundColor: '#C6282818' }]}
                onPress={onDelete}
              >
                <MaterialCommunityIcons name="trash-can-outline" size={16} color="#C62828" />
                <Text style={[styles.tonalText, { color: '#C62828' }]}>Delete</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

export default function SkillManagerScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [builtInOpen, setBuiltInOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(true);
  const [inMulti, setInMulti] = useState(false);
  const [pickedIds, setPickedIds] = useState<string[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showLimit, setShowLimit] = useState(false);

  const [showAdd, setShowAdd] = useState(false);
  const [showUrl, setShowUrl] = useState(false);
  const [importUrl, setImportUrl] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [deleteIds, setDeleteIds] = useState<string[]>([]);

  const [viewSkill, setViewSkill] = useState<Skill | null>(null);
  const [secretSkill, setSecretSkill] = useState<Skill | null>(null);
  const [secretVal, setSecretVal] = useState('');
  const [previewIn, setPreviewIn] = useState('hello world');
  const [previewOut, setPreviewOut] = useState<SkillResult | null>(null);

  const listRef = useRef<ScrollView>(null);
  const initExpand = useRef(false);

  const loadSkills = async () => {
    console.log('skills_load');
    setLoading(true);
    try {
      const next = await skillManager.getAll();
      setSkills(next);
      if (!initExpand.current) {
        const hasCustom = next.some(skill => skill.source !== 'builtin');
        setBuiltInOpen(!hasCustom);
        setCustomOpen(true);
        initExpand.current = true;
      }
      await skillManager.syncTools();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSkills();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return skills;
    }
    return skills.filter(
      skill =>
        skill.name.toLowerCase().includes(q) ||
        skill.description.toLowerCase().includes(q),
    );
  }, [skills, search]);

  const builtIn = useMemo(
    () => filtered.filter(skill => skill.source === 'builtin'),
    [filtered],
  );
  const custom = useMemo(
    () => filtered.filter(skill => skill.source !== 'builtin'),
    [filtered],
  );

  const enabledCount = useMemo(
    () => skills.filter(skill => skill.enabled).length,
    [skills],
  );

  useEffect(() => {
    if (enabledCount > MAX_SKILL_COUNT) {
      setShowLimit(true);
      const t = setTimeout(() => setShowLimit(false), 3000);
      return () => clearTimeout(t);
    }
  }, [enabledCount]);

  useEffect(() => {
    if (search) {
      setBuiltInOpen(true);
      setCustomOpen(true);
      listRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [search]);

  useEffect(() => {
    const loadSecret = async () => {
      if (!secretSkill?.secret) {
        setSecretVal('');
        return;
      }
      const val = await skillManager.getSecret(secretSkill.id);
      setSecretVal(val || '');
    };
    loadSecret();
  }, [secretSkill?.id, secretSkill?.secret]);

  useEffect(() => {
    setPreviewOut(null);
    setPreviewIn('hello world');
  }, [viewSkill?.id]);

  const handleToggle = async (skillId: string) => {
    try {
      setBusyId(skillId);
      await skillManager.toggle(skillId);
      await loadSkills();
    } catch (error) {
      Alert.alert('Skill update failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusyId(null);
    }
  };

  const handleAll = async (on: boolean) => {
    try {
      setBusyId('all');
      await skillManager.setAllEnabled(on);
      await loadSkills();
    } catch (error) {
      Alert.alert('Update failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setBusyId(null);
    }
  };

  const handleImportUrl = async () => {
    if (!importUrl.trim()) {
      return;
    }
    try {
      setBusyId('import-url');
      await skillManager.importFromUrl(importUrl.trim());
      setImportUrl('');
      setShowUrl(false);
      await loadSkills();
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Could not import skill');
    } finally {
      setBusyId(null);
    }
  };

  const handleImportFile = async () => {
    setShowAdd(false);
    try {
      setBusyId('import-file');
      await skillManager.importFromFile();
      await loadSkills();
    } catch (error) {
      Alert.alert('Import failed', error instanceof Error ? error.message : 'Could not import skill file');
    } finally {
      setBusyId(null);
    }
  };

  const confirmDelete = async () => {
    try {
      setBusyId('delete');
      await skillManager.removeMany(deleteIds);
      setPickedIds([]);
      setInMulti(false);
      setShowDelete(false);
      setDeleteIds([]);
      await loadSkills();
    } catch (error) {
      Alert.alert('Delete failed', error instanceof Error ? error.message : 'Could not delete skill');
    } finally {
      setBusyId(null);
    }
  };

  const handleSaveSecret = async () => {
    if (!secretSkill) {
      return;
    }
    try {
      setBusyId(`secret-${secretSkill.id}`);
      await skillManager.setSecret(secretSkill.id, secretVal);
      setSecretSkill(null);
      Alert.alert('Saved', 'Skill secret updated.');
    } catch (error) {
      Alert.alert('Save failed', error instanceof Error ? error.message : 'Could not save secret');
    } finally {
      setBusyId(null);
    }
  };

  const handlePreview = async () => {
    if (!viewSkill) {
      return;
    }
    try {
      setBusyId(`preview-${viewSkill.id}`);
      if (viewSkill.type === 'js') {
        setPreviewOut(
          await skillExecutor.runJs(viewSkill, {
            scriptName: viewSkill.metadata?.scriptName,
            data: previewIn,
          }),
        );
        return;
      }
      setPreviewOut(await skillExecutor.run(viewSkill, { input: previewIn }));
    } catch (error) {
      setPreviewOut({
        error: error instanceof Error ? error.message : 'Preview failed',
      });
    } finally {
      setBusyId(null);
    }
  };

  const openDelete = (ids: string[]) => {
    setDeleteIds(ids);
    setShowDelete(true);
  };

  const togglePick = (id: string) => {
    setPickedIds(prev => {
      const next = prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id];
      if (next.length === 0) {
        setInMulti(false);
      }
      return next;
    });
  };

  const startMulti = (id: string) => {
    setInMulti(true);
    setPickedIds([id]);
  };

  const exitMulti = () => {
    setInMulti(false);
    setPickedIds([]);
  };

  const addOptions: AddOption[] = [
    {
      id: 'url',
      title: 'Add from URL',
      desc: 'Import a skill from a remote URL',
      icon: 'link-variant',
      action: () => {
        setShowAdd(false);
        setShowUrl(true);
      },
    },
    {
      id: 'file',
      title: 'Import from device',
      desc: 'Import a skill file from local storage',
      icon: 'folder-upload-outline',
      action: () => {
        handleImportFile();
      },
    },
    {
      id: 'community',
      title: 'View Community Skills',
      desc: 'Explore community contributed agent skills online',
      icon: 'open-in-new',
      action: () => {
        setShowAdd(false);
        Linking.openURL(COMMUNITY_SKILLS_URL).catch(() => {
          Alert.alert('Open failed', 'Could not open community skills page.');
        });
      },
    },
  ];

  const renderSection = (
    title: string,
    items: Skill[],
    open: boolean,
    onToggle: () => void,
  ) => {
    if (items.length === 0) {
      return null;
    }
    return (
      <View style={styles.section}>
        <TouchableOpacity style={styles.sectionHead} onPress={onToggle}>
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>{title}</Text>
          <MaterialCommunityIcons
            name={open ? 'chevron-up' : 'chevron-down'}
            size={22}
            color={themeColors.secondaryText}
          />
        </TouchableOpacity>
        {open
          ? items.map(skill => (
              <SkillRow
                key={skill.id}
                skill={skill}
                themeColors={themeColors}
                inMulti={inMulti}
                picked={pickedIds.includes(skill.id)}
                busy={busyId === skill.id}
                onToggle={() => handleToggle(skill.id)}
                onPick={() => {
                  const wasPicked = pickedIds.includes(skill.id);
                  if (wasPicked && pickedIds.length === 1) {
                    exitMulti();
                    return;
                  }
                  togglePick(skill.id);
                }}
                onLong={() => startMulti(skill.id)}
                onView={() => setViewSkill(skill)}
                onSecret={() => setSecretSkill(skill)}
                onDelete={() => openDelete([skill.id])}
                onHome={url => Linking.openURL(url).catch(() => Alert.alert('Open failed', 'Could not open homepage.'))}
              />
            ))
          : null}
      </View>
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AppHeader title="Skills" showBackButton showLogo={false} rightButtons={[]} />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (
        <View style={styles.body}>
          {showLimit ? (
            <View style={[styles.banner, { backgroundColor: themeColors.primary + '20' }]}>
              <Text style={[styles.bannerText, { color: themeColors.text }]}>
                {`More than ${MAX_SKILL_COUNT} skills enabled may affect performance.`}
              </Text>
            </View>
          ) : null}

          {inMulti ? (
            <View style={styles.multiBar}>
              <TouchableOpacity onPress={exitMulti}>
                <MaterialCommunityIcons name="close" size={24} color={themeColors.text} />
              </TouchableOpacity>
              <Text style={[styles.multiLabel, { color: themeColors.text }]}>
                {`${pickedIds.length} selected`}
              </Text>
              <TouchableOpacity
                onPress={() => pickedIds.length > 0 && openDelete(pickedIds)}
                disabled={pickedIds.length === 0}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={24}
                  color={pickedIds.length > 0 ? '#C62828' : themeColors.secondaryText}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.headBlock}>
              <Text style={[styles.pageTitle, { color: themeColors.text }]}>Manage Skills</Text>
              <Text style={[styles.pageDesc, { color: themeColors.secondaryText }]}>
                Enable skills to extend agent capabilities. Create your own or explore community skills.
              </Text>
            </View>
          )}

          <View style={styles.searchRow}>
            <View style={[styles.searchBox, { backgroundColor: themeColors.cardBackground }]}>
              <MaterialCommunityIcons name="magnify" size={20} color={themeColors.secondaryText} />
              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search skills"
                placeholderTextColor={themeColors.secondaryText}
                style={[styles.searchInput, { color: themeColors.text }]}
                autoCapitalize="none"
              />
              {search ? (
                <TouchableOpacity onPress={() => setSearch('')}>
                  <MaterialCommunityIcons name="close-circle" size={18} color={themeColors.secondaryText} />
                </TouchableOpacity>
              ) : null}
            </View>
            <TouchableOpacity
              style={[styles.addBtn, { backgroundColor: themeColors.primary }]}
              onPress={() => {
                setSearch('');
                setShowAdd(true);
              }}
            >
              <MaterialCommunityIcons name="plus" size={24} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {!search ? (
            <View style={styles.countRow}>
              <Text style={[styles.countText, { color: themeColors.secondaryText }]}>
                {`${skills.length} skill${skills.length === 1 ? '' : 's'}`}
              </Text>
              <View style={styles.countActions}>
                <TouchableOpacity onPress={() => handleAll(true)} disabled={busyId === 'all'}>
                  <Text style={[styles.countAction, { color: themeColors.primary }]}>Turn on all</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => handleAll(false)} disabled={busyId === 'all'}>
                  <Text style={[styles.countAction, { color: themeColors.primary }]}>Turn off all</Text>
                </TouchableOpacity>
              </View>
            </View>
          ) : null}

          <ScrollView
            ref={listRef}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {renderSection('Built-in Skills', builtIn, builtInOpen, () => setBuiltInOpen(v => !v))}
            {renderSection('Custom Skills', custom, customOpen, () => setCustomOpen(v => !v))}
          </ScrollView>
        </View>
      )}

      <Modal visible={showAdd} transparent animationType="slide" onRequestClose={() => setShowAdd(false)}>
        <Pressable style={styles.sheetBackdrop} onPress={() => setShowAdd(false)}>
          <Pressable style={[styles.sheet, { backgroundColor: themeColors.background }]} onPress={e => e.stopPropagation()}>
            <Text style={[styles.sheetTitle, { color: themeColors.text }]}>Add Skill</Text>
            {addOptions.map(opt => (
              <TouchableOpacity key={opt.id} style={styles.sheetOpt} onPress={opt.action}>
                <MaterialCommunityIcons name={opt.icon} size={24} color={themeColors.text} />
                <View style={styles.sheetOptText}>
                  <Text style={[styles.sheetOptTitle, { color: themeColors.text }]}>{opt.title}</Text>
                  <Text style={[styles.sheetOptDesc, { color: themeColors.secondaryText }]}>{opt.desc}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </Pressable>
        </Pressable>
      </Modal>

      <Dialog
        visible={showUrl}
        onClose={() => setShowUrl(false)}
        title="Add from URL"
        description="Enter the URL of a skill definition file."
        dismissOnBackdropPress
        primaryButtonText="Import"
        primaryButtonLoading={busyId === 'import-url'}
        onPrimaryPress={handleImportUrl}
        secondaryButtonText="Cancel"
        onSecondaryPress={() => setShowUrl(false)}
      >
        <TextInput
          value={importUrl}
          onChangeText={setImportUrl}
          placeholder="https://example.com/skill.json"
          placeholderTextColor={themeColors.secondaryText}
          autoCapitalize="none"
          style={[
            styles.dialogInput,
            { color: themeColors.text, backgroundColor: themeColors.cardBackground },
          ]}
        />
      </Dialog>

      <Dialog
        visible={showDelete}
        onClose={() => setShowDelete(false)}
        title={deleteIds.length > 1 ? 'Delete selected skills' : 'Delete skill'}
        description={
          deleteIds.length > 1
            ? `Delete ${deleteIds.length} custom skills? This cannot be undone.`
            : 'Delete this custom skill? This cannot be undone.'
        }
        dismissOnBackdropPress
        primaryButtonText="Delete"
        primaryButtonColor="#C62828"
        primaryButtonLoading={busyId === 'delete'}
        onPrimaryPress={confirmDelete}
        secondaryButtonText="Cancel"
        onSecondaryPress={() => setShowDelete(false)}
      />

      <Dialog
        visible={!!secretSkill}
        onClose={() => setSecretSkill(null)}
        title="Edit Secret"
        description={secretSkill?.secret?.label}
        dismissOnBackdropPress
        primaryButtonText="Save"
        primaryButtonLoading={busyId?.startsWith('secret-') ?? false}
        onPrimaryPress={handleSaveSecret}
        secondaryButtonText="Cancel"
        onSecondaryPress={() => setSecretSkill(null)}
      >
        <TextInput
          value={secretVal}
          onChangeText={setSecretVal}
          secureTextEntry
          placeholder="Enter secret value"
          placeholderTextColor={themeColors.secondaryText}
          style={[
            styles.dialogInput,
            { color: themeColors.text, backgroundColor: themeColors.cardBackground },
          ]}
        />
      </Dialog>

      <Dialog
        visible={!!viewSkill}
        onClose={() => setViewSkill(null)}
        dismissOnBackdropPress
        maxWidth={480}
      >
        <Dialog.Title>{viewSkill?.name}</Dialog.Title>
        <Dialog.Content>
          <ScrollView style={styles.viewScroll} showsVerticalScrollIndicator={false}>
            <Text style={[styles.viewDesc, { color: themeColors.secondaryText }]}>
              {viewSkill?.description}
            </Text>
            <View style={styles.badgeRow}>
              <View style={[styles.badge, { backgroundColor: themeColors.primary + '18' }]}>
                <Text style={[styles.badgeText, { color: themeColors.primary }]}>
                  {viewSkill?.type.toUpperCase()}
                </Text>
              </View>
              <View style={[styles.badge, { backgroundColor: themeColors.borderColor }]}>
                <Text style={[styles.badgeText, { color: themeColors.text }]}>
                  {viewSkill?.source.toUpperCase()}
                </Text>
              </View>
            </View>
            {viewSkill?.metadata?.homepage ? (
              <TouchableOpacity
                onPress={() =>
                  Linking.openURL(viewSkill.metadata!.homepage!).catch(() =>
                    Alert.alert('Open failed', 'Could not open homepage.'),
                  )
                }
              >
                <Text style={[styles.homeLink, { color: themeColors.primary }]}>Homepage</Text>
              </TouchableOpacity>
            ) : null}
            <Text style={[styles.instructions, { color: themeColors.text }]}>
              {viewSkill?.instructions}
            </Text>

            <View style={[styles.previewBox, { backgroundColor: themeColors.cardBackground }]}>
              <Text style={[styles.previewTitle, { color: themeColors.text }]}>
                {viewSkill?.type === 'js' ? 'Skill Preview' : 'Prompt Preview'}
              </Text>
              <TextInput
                value={previewIn}
                onChangeText={setPreviewIn}
                placeholder={
                  viewSkill?.type === 'js'
                    ? 'Preview input for the skill'
                    : 'Input passed into the skill context'
                }
                placeholderTextColor={themeColors.secondaryText}
                multiline
                style={[styles.previewInput, { color: themeColors.text, backgroundColor: themeColors.background }]}
              />
              <TouchableOpacity
                style={[styles.tonalBtn, { backgroundColor: themeColors.borderColor, alignSelf: 'flex-start' }]}
                onPress={handlePreview}
                disabled={busyId === `preview-${viewSkill?.id}`}
              >
                <MaterialCommunityIcons name="play-outline" size={16} color={themeColors.text} />
                <Text style={[styles.tonalText, { color: themeColors.text }]}>Run Preview</Text>
              </TouchableOpacity>
              {busyId === `preview-${viewSkill?.id}` ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : null}
              {previewOut ? <SkillResultRenderer result={previewOut} /> : null}
            </View>
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <TouchableOpacity
            style={[styles.tonalBtn, { backgroundColor: themeColors.primary }]}
            onPress={() => setViewSkill(null)}
          >
            <Text style={[styles.tonalText, { color: '#FFFFFF' }]}>Close</Text>
          </TouchableOpacity>
        </Dialog.Actions>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  banner: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    marginTop: 8,
    marginBottom: 4,
  },
  bannerText: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
  },
  headBlock: {
    paddingTop: 8,
    paddingBottom: 4,
  },
  pageTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  pageDesc: {
    marginTop: 4,
    fontSize: 14,
    lineHeight: 20,
  },
  multiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    gap: 12,
  },
  multiLabel: {
    flex: 1,
    fontSize: 17,
    fontWeight: '600',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  searchBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 999,
    paddingHorizontal: 14,
    minHeight: 48,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 10,
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  countText: {
    fontSize: 13,
    fontWeight: '700',
  },
  countActions: {
    flexDirection: 'row',
    gap: 12,
  },
  countAction: {
    fontSize: 13,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
    gap: 12,
  },
  section: {
    gap: 12,
    marginBottom: 12,
  },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  skillRow: {
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  dimRow: {
    opacity: 0.5,
  },
  checkWrap: {
    paddingTop: 4,
  },
  skillMain: {
    flex: 1,
    gap: 8,
  },
  skillTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  skillText: {
    flex: 1,
    gap: 6,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skillName: {
    fontSize: 15,
    fontWeight: '600',
  },
  skillDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tonalBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 6,
    minHeight: 32,
  },
  tonalText: {
    fontSize: 13,
    fontWeight: '600',
  },
  sheetBackdrop: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  sheet: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 32,
    gap: 8,
  },
  sheetTitle: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 8,
  },
  sheetOpt: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 16,
    paddingVertical: 12,
  },
  sheetOptText: {
    flex: 1,
    gap: 4,
  },
  sheetOptTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  sheetOptDesc: {
    fontSize: 13,
    lineHeight: 18,
  },
  dialogInput: {
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    marginTop: 8,
  },
  viewScroll: {
    maxHeight: 420,
  },
  viewDesc: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 10,
  },
  badge: {
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  homeLink: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 10,
  },
  instructions: {
    fontSize: 14,
    lineHeight: 21,
    marginBottom: 12,
  },
  previewBox: {
    borderRadius: 16,
    padding: 12,
    gap: 10,
  },
  previewTitle: {
    fontSize: 14,
    fontWeight: '700',
  },
  previewInput: {
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    minHeight: 88,
    textAlignVertical: 'top',
  },
});
