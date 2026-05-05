import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainTabNavigator from './MainTabNavigator';
import SettingsScreen from '../screens/SettingsScreen';
import ChatHistoryScreen from '../screens/ChatHistoryScreen';
import DownloadsScreen from '../screens/DownloadsScreen';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import ProfileScreen from '../screens/ProfileScreen';
import DeleteAccountScreen from '../screens/DeleteAccountScreen';
import LicensesScreen from '../screens/LicensesScreen';
import ContentTermsScreen from '../screens/ContentTermsScreen';
import ReportScreen from '../screens/ReportScreen';
import BenchmarkScreen from '../screens/BenchmarkScreen';
import BenchmarkRunnerScreen from '../screens/BenchmarkRunnerScreen';
import PromptLabScreen from '../screens/PromptLabScreen';
import SkillManagerScreen from '../screens/SkillManagerScreen';
import AudioScribeScreen from '../screens/AudioScribeScreen';
import MobileActionsScreen from '../screens/MobileActionsScreen';
import TinyGardenScreen from '../screens/TinyGardenScreen';
import ModelSettingsScreen from '../screens/ModelSettingsScreen';
import {
  LlamaCppSettingsScreen,
  MlxSettingsScreen,
  LiteRTSettingsScreen,
} from '../screens/EngineSettingsScreen';
import ServerLogsScreen from '../screens/ServerLogsScreen';
import APISetupScreen from '../screens/APISetupScreen';
import { RootStackParamList } from '../types/navigation';

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function RootNavigator() {

  return (
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          gestureEnabled: true,
          fullScreenGestureEnabled: true,
        }}
      >
        <Stack.Screen name="MainTabs" component={MainTabNavigator} />
        <Stack.Screen name="Settings" component={SettingsScreen} />
        <Stack.Screen 
          name="ChatHistory" 
          component={ChatHistoryScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen name="Downloads" component={DownloadsScreen} />
        <Stack.Screen 
          name="Login" 
          component={LoginScreen}
          options={{
            animation: 'slide_from_bottom'
          }}
        />
        <Stack.Screen 
          name="Register" 
          component={RegisterScreen}
          options={{
            animation: 'slide_from_bottom'
          }}
        />
        <Stack.Screen 
          name="Profile" 
          component={ProfileScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="DeleteAccount" 
          component={DeleteAccountScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="Licenses" 
          component={LicensesScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="ContentTerms" 
          component={ContentTermsScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="Report" 
          component={ReportScreen}
          options={{
            animation: 'slide_from_bottom'
          }}
        />
        <Stack.Screen 
          name="ModelSettings" 
          component={ModelSettingsScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="Benchmark" 
          component={BenchmarkRunnerScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="PromptLab" 
          component={PromptLabScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="SkillManager" 
          component={SkillManagerScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="AudioScribe" 
          component={AudioScribeScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="MobileActions" 
          component={MobileActionsScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="TinyGarden" 
          component={TinyGardenScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="LlamaCppSettings" 
          component={LlamaCppSettingsScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="MlxSettings" 
          component={MlxSettingsScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="LiteRTSettings" 
          component={LiteRTSettingsScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="ServerLogs" 
          component={ServerLogsScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
        <Stack.Screen 
          name="APISetup" 
          component={APISetupScreen}
          options={{
            animation: 'slide_from_right'
          }}
        />
      </Stack.Navigator>
  );
} 
