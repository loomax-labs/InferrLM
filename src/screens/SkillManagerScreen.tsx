import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Linking,
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
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { skillManager } from '../services/SkillManager';
import type { Skill } from '../types/skill';

const MAX_SKILL_COUNT = 15;
const COMMUNITY_SKILLS_URL = 'https://github.com/topics/agent-skills';

type FilterTab = 'all' | 'builtin' | 'custom';

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

const skillIcon = (skill: Skill): React.ComponentProps<typeof MaterialCommunityIcons>['name'] => {
  if (skill.type === 'js') {
    return 'code-braces';
  }
  if (skill.secret) {
    return 'key-variant';
  }
  return 'text-box-outline';
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
  const accent = skill.enabled ? themeColors.primary : themeColors.secondaryText;

  return (
    <Pressable
      onLongPress={isCustom ? onLong : undefined}
      onPress={inMulti && isCustom ? onPick : undefined}
      style={[
        styles.skillRow,
        { backgroundColor: themeColors.cardBackground },
        skill.enabled ? { backgroundColor: themeColors.primary + '14' } : null,
        inMulti && !isCustom ? styles.dimRow : null,
      ]}
    >
      <View style={[styles.accentBar, { backgroundColor: accent }]} />

      {inMulti && isCustom ? (
        <TouchableOpacity onPress={onPick} style={styles.pickBtn}>
          <MaterialCommunityIcons
            name={picked ? 'check-circle' : 'checkbox-blank-circle-outline'}
            size={24}
            color={picked ? themeColors.primary : themeColors.secondaryText}
          />
        </TouchableOpacity>
      ) : (
        <View style={[styles.iconWrap, { backgroundColor: themeColors.background }]}>
          <MaterialCommunityIcons name={skillIcon(skill)} size={20} color={accent} />
        </View>
      )}

      <View style={styles.skillBody}>
        <View style={styles.skillHead}>
          <View style={styles.skillText}>
            {homepage ? (
              <TouchableOpacity style={styles.linkRow} onPress={() => onHome(homepage)}>
                <Text style={[styles.skillName, { color: themeColors.text }]}>{skill.name}</Text>
                <MaterialCommunityIcons name="open-in-new" size={13} color={themeColors.primary} />
              </TouchableOpacity>
            ) : (
              <Text style={[styles.skillName, { color: themeColors.text }]}>{skill.name}</Text>
            )}
            <Text style={[styles.skillDesc, { color: themeColors.secondaryText }]} numberOfLines={2}>
              {skill.description.replace(/\n/g, ' ')}
            </Text>
            <View style={styles.metaRow}>
              <View style={[styles.metaTag, { backgroundColor: themeColors.background }]}>
                <Text style={[styles.metaText, { color: themeColors.secondaryText }]}>
                  {skill.type.toUpperCase()}
                </Text>
              </View>
              <View style={[styles.metaTag, { backgroundColor: themeColors.background }]}>
                <Text style={[styles.metaText, { color: themeColors.secondaryText }]}>
                  {isCustom ? 'CUSTOM' : 'BUILT-IN'}
                </Text>
              </View>
            </View>
          </View>

          {!inMulti ? (
            <TouchableOpacity
              onPress={onToggle}
              disabled={busy}
              style={[
                styles.statePill,
                {
                  backgroundColor: skill.enabled ? themeColors.primary : themeColors.background,
                },
              ]}
            >
              <Text
                style={[
                  styles.statePillText,
                  { color: skill.enabled ? '#FFFFFF' : themeColors.secondaryText },
                ]}
              >
                {skill.enabled ? 'On' : 'Off'}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {!inMulti ? (
          <View style={styles.actionRow}>
            <TouchableOpacity style={[styles.iconBtn, { backgroundColor: themeColors.background }]} onPress={onView}>
              <MaterialCommunityIcons name="file-document-outline" size={18} color={themeColors.text} />
            </TouchableOpacity>
            {needsSecret ? (
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: themeColors.background }]} onPress={onSecret}>
                <MaterialCommunityIcons name="key-outline" size={18} color={themeColors.text} />
              </TouchableOpacity>
            ) : null}
            {isCustom ? (
              <TouchableOpacity style={[styles.iconBtn, { backgroundColor: '#C6282818' }]} onPress={onDelete}>
                <MaterialCommunityIcons name="trash-can-outline" size={18} color="#C62828" />
              </TouchableOpacity>
            ) : null}
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function FilterChip({
  label,
  active,
  count,
  onPress,
  themeColors,
}: {
  label: string;
  active: boolean;
  count: number;
  onPress: () => void;
  themeColors: (typeof theme)['light'];
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={[
        styles.filterChip,
        {
          backgroundColor: active ? themeColors.primary : themeColors.cardBackground,
        },
      ]}
    >
      <Text style={[styles.filterChipText, { color: active ? '#FFFFFF' : themeColors.text }]}>
        {label}
      </Text>
      <View
        style={[
          styles.filterCount,
          { backgroundColor: active ? '#FFFFFF30' : themeColors.background },
        ]}
      >
        <Text style={[styles.filterCountText, { color: active ? '#FFFFFF' : themeColors.secondaryText }]}>
          {count}
        </Text>
      </View>
    </TouchableOpacity>
  );
}

export default function SkillManagerScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];

  const [skills, setSkills] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterTab, setFilterTab] = useState<FilterTab>('all');
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

  const listRef = useRef<ScrollView>(null);

  const loadSkills = async () => {
    console.log('skills_load');
    setLoading(true);
    try {
      const next = await skillManager.getAll();
      setSkills(next);
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
    let list = skills;
    if (filterTab === 'builtin') {
      list = list.filter(skill => skill.source === 'builtin');
    } else if (filterTab === 'custom') {
      list = list.filter(skill => skill.source !== 'builtin');
    }
    if (!q) {
      return list;
    }
    return list.filter(
      skill =>
        skill.name.toLowerCase().includes(q) ||
        skill.description.toLowerCase().includes(q),
    );
  }, [skills, search, filterTab]);

  const builtInCount = useMemo(
    () => skills.filter(skill => skill.source === 'builtin').length,
    [skills],
  );
  const customCount = useMemo(
    () => skills.filter(skill => skill.source !== 'builtin').length,
    [skills],
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
      listRef.current?.scrollTo({ y: 0, animated: false });
    }
  }, [search, filterTab]);

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

  const handleCopyView = () => {
    if (!viewSkill?.instructions) {
      return;
    }
    Clipboard.setString(viewSkill.instructions);
    console.log('skill_view_copied', viewSkill.id);
    Alert.alert('Copied', 'Skill content copied to clipboard.');
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
      title: 'Import from URL',
      desc: 'Load a skill definition from the web',
      icon: 'link-variant',
      action: () => {
        setShowAdd(false);
        setShowUrl(true);
      },
    },
    {
      id: 'file',
      title: 'Import from device',
      desc: 'Pick a local skill file',
      icon: 'folder-upload-outline',
      action: () => {
        handleImportFile();
      },
    },
    {
      id: 'community',
      title: 'Browse community skills',
      desc: 'Open the public skills index',
      icon: 'earth',
      action: () => {
        setShowAdd(false);
        Linking.openURL(COMMUNITY_SKILLS_URL).catch(() => {
          Alert.alert('Open failed', 'Could not open community skills page.');
        });
      },
    },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AppHeader title="Skills" showBackButton showLogo={false} rightButtons={[]} />

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={themeColors.primary} />
        </View>
      ) : (
        <View style={styles.body}>
          {inMulti ? (
            <View style={[styles.multiBar, { backgroundColor: themeColors.primary }]}>
              <TouchableOpacity onPress={exitMulti} style={styles.multiBtn}>
                <MaterialCommunityIcons name="close" size={22} color="#FFFFFF" />
              </TouchableOpacity>
              <Text style={styles.multiLabel}>{`${pickedIds.length} selected`}</Text>
              <TouchableOpacity
                onPress={() => pickedIds.length > 0 && openDelete(pickedIds)}
                disabled={pickedIds.length === 0}
                style={styles.multiBtn}
              >
                <MaterialCommunityIcons
                  name="trash-can-outline"
                  size={22}
                  color={pickedIds.length > 0 ? '#FFFFFF' : '#FFFFFF60'}
                />
              </TouchableOpacity>
            </View>
          ) : (
            <View style={[styles.statsBar, { backgroundColor: themeColors.cardBackground }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeColors.primary }]}>{enabledCount}</Text>
                <Text style={[styles.statLabel, { color: themeColors.secondaryText }]}>Active</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: themeColors.background }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeColors.text }]}>{skills.length}</Text>
                <Text style={[styles.statLabel, { color: themeColors.secondaryText }]}>Total</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: themeColors.background }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: themeColors.text }]}>{customCount}</Text>
                <Text style={[styles.statLabel, { color: themeColors.secondaryText }]}>Custom</Text>
              </View>
            </View>
          )}

          {showLimit ? (
            <View style={[styles.banner, { backgroundColor: '#C6282818' }]}>
              <MaterialCommunityIcons name="alert-circle-outline" size={18} color="#C62828" />
              <Text style={[styles.bannerText, { color: themeColors.text }]}>
                {`Over ${MAX_SKILL_COUNT} active skills may slow responses.`}
              </Text>
            </View>
          ) : null}

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.filterRow}
          >
            <FilterChip
              label="All"
              count={skills.length}
              active={filterTab === 'all'}
              onPress={() => setFilterTab('all')}
              themeColors={themeColors}
            />
            <FilterChip
              label="Built-in"
              count={builtInCount}
              active={filterTab === 'builtin'}
              onPress={() => setFilterTab('builtin')}
              themeColors={themeColors}
            />
            <FilterChip
              label="Yours"
              count={customCount}
              active={filterTab === 'custom'}
              onPress={() => setFilterTab('custom')}
              themeColors={themeColors}
            />
          </ScrollView>

          <View style={[styles.searchBox, { backgroundColor: themeColors.cardBackground }]}>
            <MaterialCommunityIcons name="magnify" size={20} color={themeColors.secondaryText} />
            <TextInput
              value={search}
              onChangeText={setSearch}
              placeholder="Filter by name or description"
              placeholderTextColor={themeColors.secondaryText}
              style={[styles.searchInput, { color: themeColors.text }]}
              autoCapitalize="none"
            />
            {search ? (
              <TouchableOpacity onPress={() => setSearch('')}>
                <MaterialCommunityIcons name="close" size={18} color={themeColors.secondaryText} />
              </TouchableOpacity>
            ) : null}
          </View>

          <View style={styles.toolbar}>
            <TouchableOpacity
              onPress={() => handleAll(true)}
              disabled={busyId === 'all'}
              style={[styles.toolBtn, { backgroundColor: themeColors.cardBackground }]}
            >
              <MaterialCommunityIcons name="toggle-switch" size={18} color={themeColors.primary} />
              <Text style={[styles.toolBtnText, { color: themeColors.text }]}>Enable all</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleAll(false)}
              disabled={busyId === 'all'}
              style={[styles.toolBtn, { backgroundColor: themeColors.cardBackground }]}
            >
              <MaterialCommunityIcons name="toggle-switch-off" size={18} color={themeColors.secondaryText} />
              <Text style={[styles.toolBtnText, { color: themeColors.text }]}>Disable all</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => {
                setSearch('');
                setShowAdd(true);
              }}
              style={[styles.toolBtn, { backgroundColor: themeColors.primary }]}
            >
              <MaterialCommunityIcons name="plus" size={18} color="#FFFFFF" />
              <Text style={[styles.toolBtnText, { color: '#FFFFFF' }]}>Import</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            ref={listRef}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {filtered.length === 0 ? (
              <View style={[styles.emptyBox, { backgroundColor: themeColors.cardBackground }]}>
                <MaterialCommunityIcons name="puzzle-outline" size={36} color={themeColors.secondaryText} />
                <Text style={[styles.emptyTitle, { color: themeColors.text }]}>No skills here</Text>
                <Text style={[styles.emptyDesc, { color: themeColors.secondaryText }]}>
                  Try another filter or import a skill.
                </Text>
              </View>
            ) : (
              filtered.map(skill => (
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
            )}
          </ScrollView>
        </View>
      )}

      <Dialog
        visible={showAdd}
        onClose={() => setShowAdd(false)}
        title="Import skill"
        description="Choose how to add a skill to your agent."
        dismissOnBackdropPress
        secondaryButtonText="Cancel"
        onSecondaryPress={() => setShowAdd(false)}
      >
        <View style={styles.addList}>
          {addOptions.map(opt => (
            <TouchableOpacity
              key={opt.id}
              style={[styles.addRow, { backgroundColor: themeColors.cardBackground }]}
              onPress={opt.action}
            >
              <View style={[styles.addIcon, { backgroundColor: themeColors.background }]}>
                <MaterialCommunityIcons name={opt.icon} size={22} color={themeColors.primary} />
              </View>
              <View style={styles.addText}>
                <Text style={[styles.addTitle, { color: themeColors.text }]}>{opt.title}</Text>
                <Text style={[styles.addDesc, { color: themeColors.secondaryText }]}>{opt.desc}</Text>
              </View>
              <MaterialCommunityIcons name="chevron-right" size={22} color={themeColors.secondaryText} />
            </TouchableOpacity>
          ))}
        </View>
      </Dialog>

      <Dialog
        visible={showUrl}
        onClose={() => setShowUrl(false)}
        title="Import from URL"
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
              <View style={[styles.badge, { backgroundColor: themeColors.cardBackground }]}>
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
            <View style={styles.viewFieldHead}>
              <Text style={[styles.viewFieldLabel, { color: themeColors.text }]}>Instructions</Text>
              <TouchableOpacity
                style={[styles.copyBtn, { backgroundColor: themeColors.cardBackground }]}
                onPress={handleCopyView}
              >
                <MaterialCommunityIcons name="content-copy" size={16} color={themeColors.text} />
                <Text style={[styles.copyBtnText, { color: themeColors.text }]}>Copy</Text>
              </TouchableOpacity>
            </View>
            <TextInput
              value={viewSkill?.instructions ?? ''}
              editable={false}
              multiline
              scrollEnabled={false}
              style={[
                styles.viewField,
                { color: themeColors.text, backgroundColor: themeColors.cardBackground },
              ]}
            />
          </ScrollView>
        </Dialog.Content>
        <Dialog.Actions>
          <TouchableOpacity
            style={[styles.closeBtn, { backgroundColor: themeColors.primary }]}
            onPress={() => setViewSkill(null)}
          >
            <Text style={styles.closeBtnText}>Close</Text>
          </TouchableOpacity>
        </Dialog.Actions>
      </Dialog>
    </View>
  );
}

const styles = StyleSheet.create({
  body: {
    flex: 1,
    paddingHorizontal: 14,
    paddingBottom: 14,
  },
  loadingWrap: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  statsBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 14,
    marginTop: 10,
    marginBottom: 10,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
    gap: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  statLabel: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.4,
  },
  statDivider: {
    width: 1,
    height: 32,
  },
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },
  bannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
  },
  multiBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 10,
    marginTop: 10,
    marginBottom: 10,
    gap: 8,
  },
  multiBtn: {
    padding: 6,
  },
  multiLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  filterRow: {
    gap: 8,
    paddingBottom: 10,
  },
  filterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  filterChipText: {
    fontSize: 14,
    fontWeight: '600',
  },
  filterCount: {
    minWidth: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  filterCountText: {
    fontSize: 11,
    fontWeight: '700',
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    paddingHorizontal: 12,
    minHeight: 44,
    gap: 8,
    marginBottom: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 8,
  },
  toolbar: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  toolBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
  },
  toolBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    paddingBottom: 24,
    gap: 8,
  },
  skillRow: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderRadius: 10,
    overflow: 'hidden',
    minHeight: 88,
  },
  accentBar: {
    width: 4,
  },
  pickBtn: {
    alignSelf: 'center',
    paddingHorizontal: 10,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginLeft: 10,
  },
  skillBody: {
    flex: 1,
    paddingVertical: 10,
    paddingRight: 12,
    paddingLeft: 10,
    gap: 8,
  },
  skillHead: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  skillText: {
    flex: 1,
    gap: 4,
  },
  linkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  skillName: {
    fontSize: 15,
    fontWeight: '700',
  },
  skillDesc: {
    fontSize: 12,
    lineHeight: 17,
  },
  metaRow: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 2,
  },
  metaTag: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  metaText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  statePill: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    minWidth: 40,
    alignItems: 'center',
  },
  statePillText: {
    fontSize: 12,
    fontWeight: '700',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 8,
  },
  iconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dimRow: {
    opacity: 0.45,
  },
  emptyBox: {
    alignItems: 'center',
    paddingVertical: 40,
    paddingHorizontal: 24,
    borderRadius: 10,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 4,
  },
  emptyDesc: {
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 18,
  },
  addList: {
    gap: 8,
    marginTop: 4,
  },
  addRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: 10,
  },
  addIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addText: {
    flex: 1,
    gap: 2,
  },
  addTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  addDesc: {
    fontSize: 12,
    lineHeight: 16,
  },
  dialogInput: {
    borderRadius: 8,
    paddingHorizontal: 12,
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
    borderRadius: 6,
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
  viewFieldHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  viewFieldLabel: {
    fontSize: 14,
    fontWeight: '700',
  },
  copyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  copyBtnText: {
    fontSize: 13,
    fontWeight: '600',
  },
  viewField: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    lineHeight: 21,
    minHeight: 160,
    textAlignVertical: 'top',
    marginBottom: 8,
  },
  closeBtn: {
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
});
