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
  ModelParameters: {
    modelName?: string;
  } | undefined;
  ServerLogs: undefined;
  APISetup: undefined;
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
  LocalServerTab: undefined;
  NotificationsTab: undefined;
  SearchTab: undefined;
}; 
