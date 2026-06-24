import React, { useRef, useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Animated, LayoutChangeEvent } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';

export type TabType = 'stored' | 'downloadable' | 'remote';

interface ModelScreenTabsProps {
  activeTab: TabType;
  onTabPress: (tab: TabType) => void;
  enableRemoteModels: boolean;
}

export const ModelScreenTabs: React.FC<ModelScreenTabsProps> = ({
  activeTab,
  onTabPress,
  enableRemoteModels
}) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme as 'light' | 'dark'];

  const tabs: TabType[] = enableRemoteModels
    ? ['stored', 'downloadable', 'remote']
    : ['stored', 'downloadable'];

  const tabIndex = tabs.indexOf(activeTab);
  const slideAnim = useRef(new Animated.Value(tabIndex)).current;
  const [containerWidth, setContainerWidth] = useState(0);

  useEffect(() => {
    Animated.spring(slideAnim, {
      toValue: tabIndex,
      useNativeDriver: true,
      tension: 60,
      friction: 10,
    }).start();
  }, [tabIndex]);

  const tabWidth = containerWidth > 0 ? containerWidth / tabs.length : 0;

  const translateX = slideAnim.interpolate({
    inputRange: tabs.map((_, i) => i),
    outputRange: tabs.map((_, i) => i * tabWidth),
  });

  const onLayout = (e: LayoutChangeEvent) => {
    setContainerWidth(e.nativeEvent.layout.width);
  };

  const tabIcons: Record<TabType, React.ComponentProps<typeof MaterialCommunityIcons>['name']> = {
    stored: 'folder',
    downloadable: 'cloud-download',
    remote: 'cloud',
  };

  const tabLabels: Record<TabType, string> = {
    stored: 'Stored Models',
    downloadable: 'Download Models',
    remote: 'Remote Models',
  };

  return (
    <View style={styles.tabContainer}>
      <View
        style={[styles.segmentedControl, { backgroundColor: themeColors.borderColor }]}
        onLayout={onLayout}
      >
        {tabWidth > 0 && (
          <Animated.View
            style={[
              styles.slidingPill,
              {
                width: tabWidth,
                backgroundColor: themeColors.primary,
                transform: [{ translateX }],
              },
            ]}
          />
        )}
        {tabs.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <TouchableOpacity
              key={tab}
              activeOpacity={1}
              style={styles.segmentButton}
              onPress={() => onTabPress(tab)}
            >
              <MaterialCommunityIcons
                name={tabIcons[tab]}
                size={18}
                color={isActive ? '#fff' : themeColors.text}
                style={styles.segmentIcon}
              />
              <Text style={[styles.segmentText, { color: isActive ? '#fff' : themeColors.text }]}>
                {tabLabels[tab]}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  segmentedControl: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  slidingPill: {
    position: 'absolute',
    top: 2,
    bottom: 2,
    borderRadius: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 3,
  },
  segmentButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  segmentIcon: {
    marginRight: 6,
  },
});

