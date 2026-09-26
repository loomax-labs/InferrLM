import { Platform, PermissionsAndroid } from 'react-native';
import { requireNativeModule } from 'expo-modules-core';
import { t } from '../i18n';

interface DownloadNotificationModuleInterface {
  requestPermissions?(): Promise<boolean>;
  showDownloadNotification(
    modelName: string,
    downloadId: string,
    progress: number,
    bytesDownloaded?: number,
    totalBytes?: number
  ): Promise<boolean>;
  updateDownloadProgress(
    downloadId: string,
    progress: number,
    bytesDownloaded?: number,
    totalBytes?: number,
    modelName?: string
  ): Promise<boolean>;
  cancelNotification(downloadId: string): Promise<boolean>;
}

const mockImplementation: DownloadNotificationModuleInterface = {
  requestPermissions: async () => false,
  showDownloadNotification: async () => false,
  updateDownloadProgress: async () => false,
  cancelNotification: async () => false,
};

let nativeModule: DownloadNotificationModuleInterface;
try {
  nativeModule = requireNativeModule('DownloadNotification');
} catch (_) {
  nativeModule = mockImplementation;
}

class DownloadNotifier {
  private hasPermission: boolean = false;

  async requestPermissions(): Promise<boolean> {
    try {
      if (Platform.OS === 'ios') {
        const granted = await nativeModule.requestPermissions?.();
        this.hasPermission = granted ?? false;
        return this.hasPermission;
      }

      if (Platform.OS !== 'android') {
        this.hasPermission = true;
        return this.hasPermission;
      }

      if (Platform.OS === 'android' && Platform.Version >= 33) {
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
          {
            title: t('notifications.permissionTitle'),
            message: t('notifications.permissionMessage'),
            buttonNeutral: t('notifications.askLater'),
            buttonNegative: t('common.cancel'),
            buttonPositive: t('common.ok'),
          }
        );
        
        this.hasPermission = granted === PermissionsAndroid.RESULTS.GRANTED;
        return this.hasPermission;
      }
      
      this.hasPermission = true;
      return true;
    } catch (error) {
      return false;
    }
  }

  async showNotification(
    modelName: string,
    downloadId: string | number,
    progress: number,
    bytesDownloaded: number = 0,
    totalBytes: number = 0
  ): Promise<boolean> {
    try {
      if (!this.hasPermission) {
        await this.requestPermissions();
      }

      if (!this.hasPermission) {
        return false;
      }

      return await nativeModule.showDownloadNotification(
        modelName, 
        downloadId.toString(), 
        Math.round(progress),
        bytesDownloaded,
        totalBytes
      );
    } catch (error) {
      return false;
    }
  }


  async updateProgress(
    downloadId: string | number,
    progress: number,
    bytesDownloaded: number = 0,
    totalBytes: number = 0,
    modelName?: string
  ): Promise<boolean> {
    try {
      if (!this.hasPermission) {
        await this.requestPermissions();
      }

      if (!this.hasPermission) {
        return false;
      }

      return await nativeModule.updateDownloadProgress(
        downloadId.toString(), 
        Math.round(progress),
        bytesDownloaded,
        totalBytes,
        modelName || downloadId.toString()
      );
    } catch (error) {
      return false;
    }
  }

  async cancelNotification(downloadId: string | number): Promise<boolean> {
    try {
      if (!this.hasPermission) {
        await this.requestPermissions();
      }

      return await nativeModule.cancelNotification(downloadId.toString());
    } catch (error) {
      return false;
    }
  }
}

export const downloadNotificationService = new DownloadNotifier(); 
