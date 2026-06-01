import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { useTheme } from '../../src/context/ThemeContext';
import { theme } from '../../src/constants/theme';
import { OpenSansFont } from '../../src/hooks/OpenSansFont';
import { useResponsiveLayout } from '../../src/hooks/useResponsiveLayout';
import WideScreenLayout from '../../src/components/WideScreenLayout';

export default function TabLayout() {
  const { isWideScreen } = useResponsiveLayout();
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const { fonts } = OpenSansFont();

  if (isWideScreen) {
    return <WideScreenLayout />;
  }

  return (
    <NativeTabs
      backBehavior="history"
      labelVisibilityMode="labeled"
      backgroundColor={themeColors.tabBarBackground}
      disableTransparentOnScrollEdge={true}
      unstable_nativeProps={{ tabBarControllerMode: 'tabBar' }}
      tintColor={themeColors.tabBarActiveText}
      indicatorColor="rgba(255, 255, 255, 0.15)"
      rippleColor="rgba(255, 255, 255, 0.15)"
      iconColor={{
        default: themeColors.tabBarInactiveText,
        selected: themeColors.tabBarActiveText,
      }}
      labelStyle={{
        default: { fontFamily: fonts.medium.fontFamily, color: themeColors.tabBarInactiveText },
        selected: { fontFamily: fonts.medium.fontFamily, color: themeColors.tabBarActiveText },
      }}
    >
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'house', selected: 'house.fill' }}
          md={{ default: 'home', selected: 'home_filled' }}
        />
        <NativeTabs.Trigger.Label>Chat</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="models">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'cube', selected: 'cube.fill' }}
          md="deployed_code"
        />
        <NativeTabs.Trigger.Label>Models</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="tools">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'wrench.and.screwdriver', selected: 'wrench.and.screwdriver.fill' }}
          md="build"
        />
        <NativeTabs.Trigger.Label>Tools</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Icon
          sf={{ default: 'gearshape', selected: 'gearshape.fill' }}
          md="settings"
        />
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
