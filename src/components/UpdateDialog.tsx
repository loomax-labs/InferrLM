import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import Dialog from './Dialog';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import { updateService } from '../services/UpdateService';
import { cjkTextStyle, useCjkChrome } from '../i18n/chrome';

export default function UpdateDialog() {
  const [visible, setVisible] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [changelog, setChangelog] = useState<string[]>([]);
  const [updateId, setUpdateId] = useState('');
  const { theme: currentTheme } = useTheme();
  const cjk = useCjkChrome();
  const themeColors = theme[currentTheme as 'light' | 'dark'];

  useEffect(() => {
    check();
  }, []);

  async function check() {
    await updateService.incrementOpenCount();
    const result = await updateService.checkForUpdate();
    if (!result || !result.manifest) return;
    if (updateService.isManifestAutoUpdate(result.manifest)) return;
    const id = updateService.getUpdateId(result.manifest);
    if (!id) return;
    if (await updateService.isSkipped(id)) return;
    if (!(await updateService.shouldRemind(id))) return;
    setUpdateId(id);
    setChangelog(updateService.getChangelog(result.manifest));
    setVisible(true);
  }

  function handleClose() {
    if (installing) return;
    setVisible(false);
  }

  async function handleSkip() {
    await updateService.skipUpdate(updateId);
    setVisible(false);
  }

  async function handleRemind() {
    await updateService.remindLater(updateId);
    setVisible(false);
  }

  async function handleInstall() {
    setInstalling(true);
    try {
      await updateService.fetchAndReload();
    } catch {
      setInstalling(false);
    }
  }

  if (!visible) return null;

  return (
    <Dialog visible={visible} onDismiss={handleClose}>
      <View style={styles.titleRow}>
        <Text style={[styles.title, { color: themeColors.text }]}>
          Update Available
        </Text>
        <TouchableOpacity
          onPress={handleClose}
          disabled={installing}
          hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}
        >
          <MaterialCommunityIcons
            name="close"
            size={20}
            color={themeColors.secondaryText}
          />
        </TouchableOpacity>
      </View>

      {changelog.length > 0 ? (
        <ScrollView style={styles.changelog} nestedScrollEnabled>
          <Text style={[styles.label, cjkTextStyle(cjk), { color: themeColors.secondaryText }]}>
            What's new
          </Text>
          {changelog.map((item, i) => (
            <View key={`cl-${i}`} style={styles.row}>
              <Text style={[styles.bullet, { color: themeColors.primary }]}>
                {'\u2022'}
              </Text>
              <Text style={[styles.itemText, { color: themeColors.text }]}>
                {item}
              </Text>
            </View>
          ))}
        </ScrollView>
      ) : (
        <Text style={[styles.noChangelog, { color: themeColors.secondaryText }]}>
          A new version is available.
        </Text>
      )}

      {installing ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color={themeColors.primary} />
          <Text
            style={[styles.loadingText, { color: themeColors.secondaryText }]}
          >
            Installing...
          </Text>
        </View>
      ) : (
        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.btn, { backgroundColor: themeColors.primary }]}
            onPress={handleInstall}
          >
            <Text style={styles.installText}>Install Now</Text>
          </TouchableOpacity>
          <View style={styles.secondaryRow}>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.secondaryBtn,
                { borderColor: themeColors.borderColor },
              ]}
              onPress={handleRemind}
            >
              <Text style={[styles.secondaryText, { color: themeColors.text }]}>
                Remind Me Later
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.btn,
                styles.secondaryBtn,
                { borderColor: themeColors.borderColor },
              ]}
              onPress={handleSkip}
            >
              <Text
                style={[
                  styles.secondaryText,
                  { color: themeColors.secondaryText },
                ]}
              >
                Skip This Update
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </Dialog>
  );
}

const styles = StyleSheet.create({
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    flex: 1,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  changelog: {
    maxHeight: 200,
    marginBottom: 4,
  },
  row: {
    flexDirection: 'row',
    marginBottom: 6,
    paddingRight: 8,
  },
  bullet: {
    fontSize: 15,
    marginRight: 8,
    lineHeight: 22,
  },
  itemText: {
    fontSize: 15,
    lineHeight: 22,
    flex: 1,
  },
  noChangelog: {
    fontSize: 15,
    lineHeight: 22,
    marginBottom: 4,
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 12,
  },
  loadingText: {
    fontSize: 15,
  },
  actions: {
    marginTop: 20,
  },
  btn: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  installText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  secondaryBtn: {
    flex: 1,
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  secondaryText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
