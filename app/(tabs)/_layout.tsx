import { Tabs } from 'expo-router';
import { Platform, TouchableOpacity, View, Text, StyleSheet, Keyboard } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../src/context/ThemeContext';
import { theme } from '../../src/constants/theme';
import { OpenSansFont } from '../../src/hooks/OpenSansFont';
import { useResponsiveLayout } from '../../src/hooks/useResponsiveLayout';
import WideScreenLayout from '../../src/components/WideScreenLayout';
import type { BottomTabBarProps } from '@react-navigation/bottom-tabs';

function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const { fonts } = OpenSansFont();

  useEffect(() => {
    const showListener = Keyboard.addListener(
      'keyboardDidShow',
      () => setKeyboardVisible(true),
    );
    const hideListener = Keyboard.addListener(
      'keyboardDidHide',
      () => setKeyboardVisible(false),
    );
    return () => {
      showListener.remove();
      hideListener.remove();
    };
  }, []);

  if (isKeyboardVisible) return null;

  return (
    <View
      style={[
        styles.tabBar,
        {
          backgroundColor: themeColors.tabBarBackground,
          height: 70 + insets.bottom,
          paddingBottom: insets.bottom,
        },
      ]}
    >
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel || route.name;
        const isFocused = state.index === index;

        let iconName: string;
        switch (route.name) {
          case 'index':
            iconName = isFocused ? 'home' : 'home-outline';
            break;
          case 'models':
            iconName = isFocused ? 'cube' : 'cube-outline';
            break;
          case 'tools':
            iconName = 'tools';
            break;
          case 'settings':
            iconName = isFocused ? 'cog' : 'cog-outline';
            break;
          default:
            iconName = 'alert-circle';
        }

        const onPress = () => {
          const event = navigation.emit({
            type: 'tabPress',
            target: route.key,
            canPreventDefault: true,
          });
          if (!isFocused && !event.defaultPrevented) {
            navigation.navigate(route.name);
          }
        };

        return (
          <TouchableOpacity
            key={index}
            activeOpacity={1}
            onPress={onPress}
            style={styles.tabItem}
          >
            <View style={styles.iconContainer}>
              <MaterialCommunityIcons
                name={iconName as any}
                size={24}
                color={isFocused ? themeColors.tabBarActiveText : themeColors.tabBarInactiveText}
              />
            </View>
            <Text
              style={[
                {
                  color: isFocused ? themeColors.tabBarActiveText : themeColors.tabBarInactiveText,
                  fontSize: 12,
                  marginTop: 4,
                },
                fonts.medium,
              ]}
            >
              {label as string}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

function IOSTabLayout() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];

  return (
    <Tabs
      backBehavior="history"
      screenOptions={({ route }) => ({
        headerShown: false,
        freezeOnBlur: false,
        tabBarActiveTintColor: themeColors.tabBarActiveText,
        tabBarInactiveTintColor: themeColors.tabBarInactiveText,
        tabBarStyle: {
          backgroundColor: themeColors.tabBarBackground,
          borderTopWidth: 0,
        },
        tabBarLabelStyle: {
          fontFamily: 'OpenSans-Medium',
          fontSize: 12,
        },
        tabBarIcon: ({ focused, color }) => {
          let iconName: string;
          switch (route.name) {
            case 'index':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'models':
              iconName = focused ? 'cube' : 'cube-outline';
              break;
            case 'tools':
              iconName = 'tools';
              break;
            case 'settings':
              iconName = focused ? 'cog' : 'cog-outline';
              break;
            default:
              iconName = 'alert-circle';
          }
          return <MaterialCommunityIcons name={iconName as any} size={24} color={color} />;
        },
      })}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: 'Chat' }} />
      <Tabs.Screen name="models" options={{ tabBarLabel: 'Models' }} />
      <Tabs.Screen name="tools" options={{ tabBarLabel: 'Tools' }} />
      <Tabs.Screen name="settings" options={{ tabBarLabel: 'Settings' }} />
    </Tabs>
  );
}

export default function TabLayout() {
  const { isWideScreen } = useResponsiveLayout();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  if (isWideScreen) {
    return <WideScreenLayout />;
  }

  if (Platform.OS === 'ios') {
    return <IOSTabLayout />;
  }

  return (
    <Tabs
      backBehavior="history"
      tabBar={props => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
      }}
    >
      <Tabs.Screen name="index" options={{ tabBarLabel: 'Chat' }} />
      <Tabs.Screen name="models" options={{ tabBarLabel: 'Models' }} />
      <Tabs.Screen name="tools" options={{ tabBarLabel: 'Tools' }} />
      <Tabs.Screen name="settings" options={{ tabBarLabel: 'Settings' }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 0,
  },
  tabItem: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    position: 'relative',
  },
});
