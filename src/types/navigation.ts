export type EngineSettingsParams = {
  modelName?: string;
  modelPath?: string;
} | undefined;

export type RootStackParamList = {
  Login: {
    redirectTo?: string;
    redirectParams?: any;
  };
  Register: {
    redirectTo?: string;
    redirectParams?: any;
  };
  MainTabs: {
    screen: string;
    params?: {
      modelPath?: string;
      loadChatId?: string;
      autoEnableRemoteModels?: boolean;
      openRemoteTab?: boolean;
    };
  };
  Home: undefined;
  Settings: undefined;
  Model: undefined;
  ChatHistory: undefined;
  Downloads: undefined;
  Profile: undefined;
  DeleteAccount: undefined;
  Licenses: undefined;
  ContentTerms: undefined;
  Report: {
    messageContent: string;
    provider: string;
  };
  ModelSettings: {
    modelName: string;
    modelPath: string;
  };
  Benchmark: {
    modelName?: string;
    modelPath?: string;
  } | undefined;
  PromptLab: undefined;
  SkillManager: undefined;
  AudioScribe: undefined;
  MobileActions: undefined;
  LlamaCppSettings: EngineSettingsParams;
  MlxSettings: EngineSettingsParams;
  LiteRTSettings: EngineSettingsParams;
  ServerLogs: undefined;
  APISetup: undefined;
  LocalServer: undefined;
};

export type TabParamList = {
  HomeTab: {
    modelPath?: string;
    loadChatId?: string;
  };
  SettingsTab: undefined;
  ModelTab:
    | {
        autoEnableRemoteModels?: boolean;
        openRemoteTab?: boolean;
      }
    | undefined;
  BenchmarkTab: undefined;
  NotificationsTab: undefined;
  SearchTab: undefined;
}; 
