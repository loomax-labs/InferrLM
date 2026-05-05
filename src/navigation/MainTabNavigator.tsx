import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Platform, TouchableOpacity, View, Text, StyleSheet, Keyboard } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BottomTabBarProps } from '@react-navigation/bottom-tabs';
import React, { useState, useEffect } from 'react';
import HomeScreen from '../screens/HomeScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ModelScreen from '../screens/ModelScreen';
import LocalServerScreen from '../screens/LocalServerScreen';
import BenchmarkScreen from '../screens/BenchmarkScreen';
import WideScreenLayout from '../components/WideScreenLayout';
import { TabParamList } from '../types/navigation';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import { OpenSansFont } from '../hooks/OpenSansFont';
import { useResponsiveLayout } from '../hooks/useResponsiveLayout';

const Tab = createBottomTabNavigator<TabParamList>();


function CustomTabBar({ state, descriptors, navigation }: BottomTabBarProps) {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const insets = useSafeAreaInsets();
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const { fonts } = OpenSansFont();

  useEffect(() => {
    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => {
        setKeyboardVisible(true);
      }
    );
    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardVisible(false);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  if (isKeyboardVisible) {
    return null;
  }

  return (
    <View style={[
      styles.tabBar,
      {
        backgroundColor: themeColors.tabBarBackground,
        height: 70 + insets.bottom,
        paddingBottom: insets.bottom,
      }
    ]}>
      {state.routes.map((route, index) => {
        const { options } = descriptors[route.key];
        const label = options.tabBarLabel || route.name;
        const isFocused = state.index === index;

        let iconName: string;
        switch (route.name) {
          case 'HomeTab':
            iconName = isFocused ? 'home' : 'home-outline';
            break;
          case 'ModelTab':
            iconName = isFocused ? 'cube' : 'cube-outline';
            break;
          case 'LocalServerTab':
            iconName = isFocused ? 'server' : 'server';
            break;
          case 'BenchmarkTab':
            iconName = isFocused ? 'tools' : 'tools';
            break;
          case 'SettingsTab':
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
              {route.name === 'LocalServerTab' && (
                <View style={styles.betaBadge}>
                  <Text style={styles.betaText}>Beta</Text>
                </View>
              )}
            </View>
            <Text
              style={[
                {
                  color: isFocused ? themeColors.tabBarActiveText : themeColors.tabBarInactiveText,
                  fontSize: 12,
                  marginTop: 4,
                },
                fonts.medium
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

export default function MainTabNavigator() {
  const { isWideScreen } = useResponsiveLayout();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  if (isWideScreen) {
    return <WideScreenLayout />;
  }

  return (
    <Tab.Navigator
      backBehavior="history"
      tabBar={props => <CustomTabBar {...props} />}
      detachInactiveScreens={false}
      screenOptions={{
        headerShown: false,
        freezeOnBlur: false,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{
          tabBarLabel: 'Chat'
        }}
      />
      <Tab.Screen
        name="ModelTab"
        component={ModelScreen}
        options={{
          tabBarLabel: 'Models'
        }}
      />
      <Tab.Screen
        name="LocalServerTab"
        component={LocalServerScreen}
        options={{
          tabBarLabel: 'Server'
        }}
      />
      <Tab.Screen
        name="BenchmarkTab"
        component={BenchmarkScreen}
        options={{
          tabBarLabel: 'Tools'
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsScreen}
        options={{
          tabBarLabel: 'Settings'
        }}
      />
    </Tab.Navigator>
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
  betaBadge: {
    position: 'absolute',
    top: -6,
    right: -14,
    backgroundColor: '#FF6B00',
    borderRadius: 4,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  betaText: {
    color: '#FFFFFF',
    fontSize: 7,
    fontWeight: '700',
  },
}); 
