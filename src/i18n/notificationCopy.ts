import { requireNativeModule } from 'expo-modules-core';

import { t } from './index';

type CopyModule = {
  setCopy?: (copy: Record<string, string>) => Promise<boolean>;
};

let nativeModule: CopyModule | null = null;

const readModule = (): CopyModule | null => {
  if (nativeModule) {
    return nativeModule;
  }
  try {
    nativeModule = requireNativeModule('DownloadNotification');
    return nativeModule;
  } catch {
    return null;
  }
};

export const pushDownloadNotificationCopy = async (): Promise<void> => {
  const module = readModule();
  if (!module?.setCopy) {
    return;
  }
  try {
    await module.setCopy({
      channelName: t('notifications.channelName'),
      channelDescription: t('notifications.channelDescription'),
      complete: t('notifications.complete'),
      failed: t('notifications.failed'),
      paused: t('notifications.paused'),
      pausedDetail: t('notifications.pausedDetail'),
      progress: t('notifications.progress'),
      progressShort: t('notifications.progressShort'),
    });
  } catch {
    // Native download notifications are Android-only.
  }
};
