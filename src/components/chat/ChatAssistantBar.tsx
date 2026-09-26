import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import type { Assistant } from '../../types/assistant';
import { assistantService } from '../../services/AssistantService';
import chatManager from '../../utils/ChatManager';

type ChatAssistantBarProps = {
  chatId: string;
  assistantId?: string;
  onAssistantChange?: () => void;
};

export default function ChatAssistantBar({
  chatId,
  assistantId,
  onAssistantChange,
}: ChatAssistantBarProps) {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme as 'light' | 'dark'];
  const [open, setOpen] = useState(false);
  const [assistants, setAssistants] = useState<Assistant[]>([]);
  const [active, setActive] = useState<Assistant | null>(null);

  const refresh = useCallback(async () => {
    const list = await assistantService.list();
    setAssistants(list);
    if (assistantId) {
      const match = list.find(item => item.id === assistantId)
        ?? await assistantService.getById(assistantId);
      setActive(match);
    } else {
      setActive(null);
    }
  }, [assistantId]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const applySelection = async (id: string | null) => {
    await chatManager.setChatAssistantId(chatId, id);
    setOpen(false);
    onAssistantChange?.();
    await refresh();
  };

  const label = active?.name ?? 'No assistant';

  return (
    <View style={[styles.row, { borderBottomColor: themeColors.borderColor }]}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => setOpen(true)}
        accessibilityRole="button"
        accessibilityLabel="Choose assistant for this chat"
      >
        <MaterialCommunityIcons
          name="account-tie-outline"
          size={18}
          color={active ? themeColors.primary : themeColors.textSecondary}
        />
        <Text
          style={[styles.label, { color: active ? themeColors.text : themeColors.textSecondary }]}
          numberOfLines={1}
        >
          {label}
        </Text>
        <MaterialCommunityIcons name="chevron-down" size={18} color={themeColors.textSecondary} />
      </TouchableOpacity>

      {active ? (
        <TouchableOpacity
          onPress={() => applySelection(null)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          accessibilityLabel="Clear assistant from chat"
        >
          <MaterialCommunityIcons name="close-circle-outline" size={20} color={themeColors.textSecondary} />
        </TouchableOpacity>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          <Pressable
            style={[styles.sheet, { backgroundColor: themeColors.cardBackground }]}
            onPress={e => e.stopPropagation()}
          >
            <Text style={[styles.sheetTitle, { color: themeColors.text }]}>Chat assistant</Text>
            <ScrollView style={styles.list}>
              <TouchableOpacity
                style={styles.option}
                onPress={() => applySelection(null)}
              >
                <Text style={{ color: themeColors.text }}>None (global prompt)</Text>
              </TouchableOpacity>
              {assistants.map(item => (
                <TouchableOpacity
                  key={item.id}
                  style={styles.option}
                  onPress={() => applySelection(item.id)}
                >
                  <Text style={{ color: themeColors.text, fontWeight: item.id === assistantId ? '600' : '400' }}>
                    {item.name}
                  </Text>
                  {item.task ? (
                    <Text style={{ color: themeColors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                      {item.task}
                    </Text>
                  ) : null}
                </TouchableOpacity>
              ))}
              {assistants.length === 0 ? (
                <Text style={[styles.empty, { color: themeColors.textSecondary }]}>
                  No saved assistants yet. Create one under Labs → Assistants.
                </Text>
              ) : null}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 8,
  },
  selector: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  label: {
    flex: 1,
    fontSize: 14,
  },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'flex-end',
  },
  sheet: {
    maxHeight: '55%',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  list: {
    maxHeight: 320,
  },
  option: {
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(128,128,128,0.25)',
  },
  empty: {
    paddingVertical: 16,
    fontSize: 13,
  },
});
