import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Dimensions,
  Easing,
  Platform,
  ScrollView,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Portal, Text } from 'react-native-paper';

import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { ThemeColors } from '../types/theme';
import { getThemeAwareColor } from '../utils/ColorUtils';
import { styles as modelStyles } from './ModelSelector.styles';
import { PROMPT_TEMPLATES, type PromptTemplate } from '../screens/promptLabTemplates';

type Props = {
  templateId: string;
  onSelect: (id: string) => void;
  disabled?: boolean;
};

const getScreenH = () => Dimensions.get('window').height;

export default function PromptModeSelector({ templateId, onSelect, disabled }: Props) {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme as ThemeColors];
  const [open, setOpen] = useState(false);
  const slideAnim = useRef(new Animated.Value(getScreenH())).current;
  const backdropAnim = useRef(new Animated.Value(0)).current;
  const [overlayActive, setOverlayActive] = useState(false);

  const active = useMemo(
    () => PROMPT_TEMPLATES.find(t => t.id === templateId) ?? PROMPT_TEMPLATES[0],
    [templateId],
  );

  const accent = getThemeAwareColor('#4a0660', currentTheme);
  const labelColor = currentTheme === 'dark' ? '#fff' : themeColors.secondaryText;
  const valueColor = currentTheme === 'dark' ? '#fff' : themeColors.text;

  useEffect(() => {
    if (open) {
      setOverlayActive(true);
      slideAnim.setValue(getScreenH());
      backdropAnim.setValue(0);
      Animated.parallel([
        Animated.timing(backdropAnim, {
          toValue: 1,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          damping: 500,
          stiffness: 1000,
          mass: 3,
          overshootClamping: true,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    backdropAnim.setValue(1);
    Animated.timing(slideAnim, {
      toValue: getScreenH(),
      duration: 160,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        backdropAnim.setValue(0);
        setOverlayActive(false);
      }
    });
  }, [open]);

  useEffect(() => {
    if (!open || Platform.OS !== 'android') return;
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      setOpen(false);
      return true;
    });
    return () => sub.remove();
  }, [open]);

  const handlePick = (item: PromptTemplate) => {
    onSelect(item.id);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity
        style={[
          modelStyles.selector,
          { backgroundColor: themeColors.borderColor },
          disabled && modelStyles.selectorDisabled,
        ]}
        onPress={() => {
          if (disabled) return;
          setOpen(true);
        }}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <View style={modelStyles.selectorContent}>
          <View style={modelStyles.modelIconWrapper}>
            <MaterialCommunityIcons
              name={active.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
              size={24}
              color={accent}
            />
          </View>
          <View style={modelStyles.selectorTextContainer}>
            <Text style={[modelStyles.selectorLabel, { color: labelColor }]}>Prompt Mode</Text>
            <View style={modelStyles.modelNameContainer}>
              <Text style={[modelStyles.selectorText, { color: valueColor }]}>{active.label}</Text>
              <View style={[modelStyles.connectionTypeBadge, { backgroundColor: accent + '22' }]}>
                <Text style={[modelStyles.connectionTypeText, { color: accent }]}>MODE</Text>
              </View>
            </View>
            <Text style={[modelStyles.projectorLabel, { color: labelColor }]} numberOfLines={1}>
              {active.hint}
            </Text>
          </View>
        </View>
        <View style={modelStyles.selectorActions}>
          <MaterialCommunityIcons name="chevron-right" size={20} color={labelColor} />
        </View>
      </TouchableOpacity>

      {overlayActive && (
        <Portal>
          <View style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }} pointerEvents="auto">
            <Animated.View style={[modelStyles.modalOverlay, { opacity: backdropAnim }]} pointerEvents="box-none">
              <Animated.View
                style={[
                  modelStyles.modalContent,
                  { backgroundColor: themeColors.background, transform: [{ translateY: slideAnim }] },
                ]}
              >
                <View style={modelStyles.modalHeader}>
                  <Text style={[modelStyles.modalTitle, { color: currentTheme === 'dark' ? '#fff' : themeColors.text }]}>
                    Select Mode
                  </Text>
                  <TouchableOpacity onPress={() => setOpen(false)} style={modelStyles.closeButton}>
                    <MaterialCommunityIcons name="close" size={24} color={currentTheme === 'dark' ? '#fff' : themeColors.text} />
                  </TouchableOpacity>
                </View>

                <ScrollView contentContainerStyle={modelStyles.modelList} showsVerticalScrollIndicator={false}>
                  {PROMPT_TEMPLATES.map(item => {
                    const picked = item.id === templateId;
                    const selectedColor = picked
                      ? currentTheme === 'dark'
                        ? '#C060E0'
                        : accent
                      : currentTheme === 'dark'
                        ? '#fff'
                        : themeColors.text;

                    return (
                      <TouchableOpacity
                        key={item.id}
                        style={[
                          modelStyles.modelItem,
                          { backgroundColor: themeColors.borderColor },
                          picked && (currentTheme === 'dark'
                            ? { backgroundColor: 'rgba(192, 96, 224, 0.22)' }
                            : modelStyles.selectedModelItem),
                          disabled && modelStyles.modelItemDisabled,
                        ]}
                        onPress={() => handlePick(item)}
                        disabled={disabled}
                        activeOpacity={0.75}
                      >
                        <View style={modelStyles.modelIconContainer}>
                          <MaterialCommunityIcons
                            name={item.icon as React.ComponentProps<typeof MaterialCommunityIcons>['name']}
                            size={28}
                            color={selectedColor}
                          />
                        </View>
                        <View style={modelStyles.modelInfo}>
                          <Text
                            style={[
                              modelStyles.modelName,
                              { color: currentTheme === 'dark' ? '#fff' : themeColors.text },
                              picked && { color: selectedColor, fontWeight: '600' },
                            ]}
                          >
                            {item.label}
                          </Text>
                          <Text style={[modelStyles.modelDetails, { color: themeColors.secondaryText }]}>
                            {item.hint}
                          </Text>
                        </View>
                        {picked && (
                          <MaterialCommunityIcons name="check-circle" size={22} color={selectedColor} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </Animated.View>
            </Animated.View>
          </View>
        </Portal>
      )}
    </>
  );
}
