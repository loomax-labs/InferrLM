import { requireNativeModule, EventEmitter as ExpoEventEmitter } from 'expo-modules-core';
import { fs as FileSystem } from '../fs';

import {
  DownloadEventCallbacks,
  DownloadJob,
  DownloadMap,
  DownloadNativeEvent,
  DownloadProgress,
} from './types';

import {StoredModel} from '../ModelDownloaderTypes';
import {normalizePath, getFileName} from '../../utils/pathUtils';

let TransferModule: any;
try {
  TransferModule = requireNativeModule('TransferModule');
} catch (_) {
  TransferModule = null;
}

export class BackgroundDownloadService {
  private activeTransfers: DownloadMap;
  private eventCallbacks: DownloadEventCallbacks = {};
  private expoEventEmitter: InstanceType<typeof ExpoEventEmitter> | null = null;
  private eventSubscriptions: Array<{ remove(): void }> = [];
  private staleMap: Map<string, number> = new Map();

  constructor() {
    this.activeTransfers = new Map();

    if (TransferModule) {
      this.setupNativeEventHandlers();
    }
  }

  private setupNativeEventHandlers() {
    this.expoEventEmitter = new ExpoEventEmitter(TransferModule);

    this.eventSubscriptions.push(
      this.expoEventEmitter.addListener('onTransferProgress', (event: any) => {
      const jsRecvTime = Date.now();
      let derivedModelName = event.modelName || this.extractModelName(event.destination, event.url);

      let transfer = derivedModelName ? this.activeTransfers.get(derivedModelName) : undefined;

      if (!transfer && event.downloadId) {
        const entry = Array.from(this.activeTransfers.entries()).find(([, job]) => job.downloadId === event.downloadId);
        if (entry) {
          derivedModelName = entry[0];
          transfer = entry[1];
        }
      }

      if (!transfer && derivedModelName) {
        transfer = this.createTransferJobFromNativeEvent(derivedModelName, event);
      }

      if (!transfer || !derivedModelName) {
        return;
      }

      if (event.downloadId) {
        transfer.downloadId = event.downloadId;
      }

      const bytesWritten = event.bytesWritten ?? transfer.state.progress?.bytesDownloaded ?? 0;
      const totalBytes = event.totalBytes ?? transfer.state.progress?.bytesTotal ?? 0;

      const computedProgress = totalBytes > 0
        ? Math.min(Math.round((bytesWritten / totalBytes) * 100), 100)
        : Math.round(event.progress ?? transfer.state.progress?.progress ?? 0);

      const currentTimestamp = Date.now();
      const timeSinceLastUIUpdate = currentTimestamp - ((transfer as any).lastUIUpdateTime || 0);

      transfer.state.progress = {
        bytesDownloaded: bytesWritten,
        bytesTotal: totalBytes,
        progress: computedProgress,
        speed: transfer.state.progress?.speed ?? '0 B/s',
        eta: transfer.state.progress?.eta ?? 'calculating',
        rawSpeed: transfer.state.progress?.rawSpeed ?? 0,
        rawEta: transfer.state.progress?.rawEta ?? 0,
      };

      if (timeSinceLastUIUpdate >= 1000 || computedProgress === 100) {
        const timeDelta = currentTimestamp - transfer.lastUpdateTime;
        const bytesDelta = bytesWritten - transfer.lastBytesWritten;

        let transferSpeedBps = transfer.state.progress?.rawSpeed ?? 0;
        if (timeDelta > 0 && bytesDelta >= 0) {
          transferSpeedBps = (bytesDelta / timeDelta) * 1000;
        }

        transfer.state.progress = {
          bytesDownloaded: bytesWritten,
          bytesTotal: totalBytes,
          progress: computedProgress,
          speed: this.formatTransferSpeed(transferSpeedBps),
          eta: this.calculateTransferEta(bytesWritten, totalBytes, transferSpeedBps),
          rawSpeed: transferSpeedBps,
          rawEta: transferSpeedBps > 0 && (totalBytes - bytesWritten) > 0
            ? (totalBytes - bytesWritten) / transferSpeedBps
            : 0,
        };

        (transfer as any).lastUIUpdateTime = currentTimestamp;
        const cbStart = Date.now();
        this.eventCallbacks.onProgress?.(derivedModelName, transfer.state.progress);
        const cbMs = Date.now() - cbStart;
        const totalMs = Date.now() - jsRecvTime;
        console.log('mgr_onProgress', derivedModelName.slice(0, 30), 'pct', computedProgress, 'bytes', bytesWritten, totalBytes, 'speed', transfer.state.progress.speed, 'cb', cbMs + 'ms', 'total', totalMs + 'ms');
      } else {
        console.log('mgr_skip', derivedModelName.slice(0, 30), 'pct', computedProgress, 'sinceLast', timeSinceLastUIUpdate + 'ms');
      }

      transfer.lastBytesWritten = bytesWritten;
      transfer.lastUpdateTime = currentTimestamp;
    }));

    this.eventSubscriptions.push(
      this.expoEventEmitter.addListener('onTransferComplete', (event: any) => {
      const derivedModelName = event.modelName || this.extractModelName(event.destination, event.url);

      let transfer: DownloadJob | undefined = derivedModelName
        ? this.activeTransfers.get(derivedModelName)
        : undefined;

      if (!transfer) {
        transfer = Array.from(this.activeTransfers.values()).find(
          _transfer => _transfer.downloadId === event.downloadId,
        );
      }

      if (!transfer && derivedModelName) {
        transfer = this.createTransferJobFromNativeEvent(derivedModelName, event);
      }

      if (!transfer) {
        return;
      }

      const modelName = transfer.model.name;
      const totalBytes = event.totalBytes ?? transfer.state.progress?.bytesTotal ?? 0;

      transfer.state.isDownloading = false;
      transfer.state.progress = {
        bytesDownloaded: totalBytes,
        bytesTotal: totalBytes,
        progress: 100,
        speed: '0 B/s',
        eta: '0 sec',
        rawSpeed: 0,
        rawEta: 0,
      };

      this.eventCallbacks.onComplete?.(modelName);
      this.activeTransfers.delete(modelName);
    }));

    this.eventSubscriptions.push(
      this.expoEventEmitter.addListener('onTransferError', (event: any) => {
      const derivedModelName = event.modelName || this.extractModelName(event.destination, event.url);

      let transfer: DownloadJob | undefined = derivedModelName
        ? this.activeTransfers.get(derivedModelName)
        : undefined;

      if (!transfer) {
        transfer = Array.from(this.activeTransfers.values()).find(
          _transfer => _transfer.downloadId === event.downloadId,
        );
      }

      if (!transfer && derivedModelName) {
        transfer = this.createTransferJobFromNativeEvent(derivedModelName, event, false);
      }

      if (!transfer) {
        return;
      }

      transfer.state.isDownloading = false;
      transfer.state.progress = undefined;
      
      const error = new Error(event.error);
      this.eventCallbacks.onError?.(transfer.model.name, error);
      this.activeTransfers.delete(transfer.model.name);
    }));

    this.eventSubscriptions.push(
      this.expoEventEmitter.addListener('onTransferCancelled', (event: any) => {
      const derivedModelName = event.modelName || this.extractModelName(event.destination, event.url);

      let transfer: DownloadJob | undefined = derivedModelName
        ? this.activeTransfers.get(derivedModelName)
        : undefined;

      if (!transfer) {
        transfer = Array.from(this.activeTransfers.values()).find(
          _transfer => _transfer.downloadId === event.downloadId,
        );
      }

      if (!transfer && derivedModelName) {
        transfer = this.createTransferJobFromNativeEvent(derivedModelName, event, false);
      }

      if (!transfer) {
        return;
      }

      const bytesWritten = event.bytesWritten ?? transfer.state.progress?.bytesDownloaded ?? 0;
      const totalBytes = event.totalBytes ?? transfer.state.progress?.bytesTotal ?? 0;

      if (totalBytes > 0) {
        const computedProgress = Math.min(Math.round((bytesWritten / totalBytes) * 100), 100);
        transfer.state.progress = {
          bytesDownloaded: bytesWritten,
          bytesTotal: totalBytes,
          progress: computedProgress,
          speed: '0 B/s',
          eta: '0 sec',
          rawSpeed: 0,
          rawEta: 0,
        };
      } else {
        transfer.state.progress = undefined;
      }

      transfer.state.isDownloading = false;
      this.activeTransfers.delete(transfer.model.name);

      this.eventCallbacks.onCancelled?.(transfer.model.name);
    }));
  }

  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  private formatTransferSpeed(bytesPerSecond: number): string {
    if (bytesPerSecond === 0) return '0 B/s';
    return `${this.formatFileSize(bytesPerSecond)}/s`;
  }

  private calculateTransferEta(
    bytesTransferred: number,
    totalBytes: number,
    speedBps: number,
  ): string {
    if (speedBps === 0 || bytesTransferred >= totalBytes) {
      return '0 sec';
    }

    const remainingBytes = totalBytes - bytesTransferred;
    const etaSeconds = remainingBytes / speedBps;

    if (etaSeconds < 60) {
      return `${Math.round(etaSeconds)} sec`;
    } else if (etaSeconds < 3600) {
      return `${Math.round(etaSeconds / 60)} min`;
    } else {
      return `${Math.round(etaSeconds / 3600)} hr`;
    }
  }

  setEventHandlers(callbacks: DownloadEventCallbacks) {
    this.eventCallbacks = callbacks;
  }

  isTransferActive(modelName: string): boolean {
    const transfer = this.activeTransfers.get(modelName);
    return transfer ? transfer.state.isDownloading : false;
  }

  getTransferProgress(modelName: string): number {
    const transfer = this.activeTransfers.get(modelName);
    return transfer?.state.progress?.progress || 0;
  }

  async initiateTransfer(
    model: StoredModel,
    destinationPath: string,
    authToken?: string | null,
  ): Promise<string | undefined> {
    if (this.isTransferActive(model.name)) {
      return this.activeTransfers.get(model.name)?.downloadId;
    }

    const directoryPath = destinationPath.substring(
      0,
      destinationPath.lastIndexOf('/'),
    );
    try {
      await FileSystem.makeDirectoryAsync(directoryPath, { intermediates: true });
    } catch (err) {
      throw err;
    }

    if (TransferModule) {
      return await this.startNativeTransfer(model, destinationPath, authToken);
    }

    throw new Error('TransferModule is not available');
  }

  private async startNativeTransfer(
    model: StoredModel,
    destinationPath: string,
    authToken?: string | null,
  ): Promise<string> {
    if (!TransferModule) {
      throw new Error('TransferModule is not available');
    }

    try {
      const result = await TransferModule.beginTransfer(
        model.path,
        destinationPath,
        authToken ? {Authorization: `Bearer ${authToken}`} : undefined,
      );

      if (!result || !result.transferId) {
        throw new Error('Failed to start transfer - no transfer ID returned');
      }

      const transferJob: DownloadJob = {
        model,
        downloadId: result.transferId,
        state: {
          isDownloading: true,
          progress: {
            bytesDownloaded: 0,
            bytesTotal: 0,
            progress: 0,
            speed: '0 B/s',
            eta: 'calculating',
            rawSpeed: 0,
            rawEta: 0,
          },
        },
        lastBytesWritten: 0,
        lastUpdateTime: Date.now(),
      };

      this.activeTransfers.set(model.name, transferJob);

      this.eventCallbacks.onStart?.(model.name, result.transferId);

      return result.transferId;
    } catch (error) {
      throw error;
    }
  }

  async abortTransfer(modelName: string): Promise<void> {
    const transfer = this.activeTransfers.get(modelName);
    if (!transfer) {
      return;
    }

    transfer.state.isCancelling = true;

    try {
      if (TransferModule) {
        await TransferModule.cancelTransfer(transfer.downloadId);
      }

      this.activeTransfers.delete(modelName);
    } catch (error) {
      this.activeTransfers.delete(modelName);
      throw error;
    }
  }

  private extractModelName(destination?: string, fallbackPath?: string): string | undefined {
    const source = destination || fallbackPath;
    if (!source) {
      return undefined;
    }

    const name = getFileName(normalizePath(source));
    return name || undefined;
  }

  private createTransferJobFromNativeEvent(
    modelName: string,
    event: Partial<DownloadNativeEvent>,
    emitStarted: boolean = true,
  ): DownloadJob {
    const totalBytes = event.totalBytes ?? 0;
    const bytesWritten = event.bytesWritten ?? 0;
    const speed = event.speed ?? 0;
    const progressPercent = totalBytes > 0
      ? Math.min((bytesWritten / totalBytes) * 100, 100)
      : event.progress ?? 0;

    const storedModel: StoredModel = {
      id: `${modelName}-${Date.now()}`,
      name: modelName,
      path: event.url ?? '',
      size: totalBytes,
      modified: new Date().toISOString(),
      downloaded: false,
    };

    const downloadJob: DownloadJob = {
      model: storedModel,
      downloadId: event.downloadId ?? Date.now().toString(),
      state: {
        isDownloading: true,
        progress: {
          bytesDownloaded: bytesWritten,
          bytesTotal: totalBytes,
          progress: progressPercent,
          speed: this.formatTransferSpeed(speed),
          eta: this.calculateTransferEta(bytesWritten, totalBytes, speed),
          rawSpeed: speed,
          rawEta: speed > 0 && totalBytes - bytesWritten > 0
            ? (totalBytes - bytesWritten) / speed
            : 0,
        },
      },
      lastBytesWritten: bytesWritten,
      lastUpdateTime: Date.now(),
    };

    this.activeTransfers.set(modelName, downloadJob);

    if (emitStarted) {
      this.eventCallbacks.onStart?.(modelName, downloadJob.downloadId);
    }

    return downloadJob;
  }

  async synchronizeWithActiveTransfers(models: StoredModel[] = []): Promise<void> {
    if (!TransferModule) {
      return;
    }

    try {
      const activeTransferList = await TransferModule.getOngoingTransfers();

      const nativeNames = new Set<string>(
        activeTransferList
          .map((t: any) => t.modelName || this.extractModelName(t.destination, t.url))
          .filter(Boolean),
      );

      const now = Date.now();
      for (const [modelName, job] of this.activeTransfers.entries()) {
        if (!nativeNames.has(modelName) && job.state.isDownloading) {
          const first = this.staleMap.get(modelName);
          if (!first) {
            this.staleMap.set(modelName, now);
          } else if (now - first > 5000) {
            console.log('stale_transfer_recovery', modelName);
            this.staleMap.delete(modelName);
            this.activeTransfers.delete(modelName);
            this.eventCallbacks.onComplete?.(modelName);
          }
        } else {
          this.staleMap.delete(modelName);
        }
      }

      for (const transfer of activeTransferList) {
        const modelName = transfer.modelName || this.extractModelName(transfer.destination, transfer.url);
        if (!modelName) {
          continue;
        }

        let transferJob = this.activeTransfers.get(modelName);

        if (!transferJob) {
          const fallbackModel =
            models.find(m => m.name === modelName) ?? {
              name: modelName,
              path: transfer.url ?? '',
              size: transfer.totalBytes ?? 0,
              modified: new Date().toISOString(),
            };

          transferJob = this.createTransferJobFromNativeEvent(
            modelName,
            {
              downloadId: transfer.id,
              bytesWritten: transfer.bytesWritten,
              totalBytes: transfer.totalBytes,
              progress: transfer.progress,
              url: fallbackModel.path,
            },
          );
        }

        transferJob.downloadId = transfer.id;
        transferJob.lastBytesWritten = transfer.bytesWritten;
        transferJob.lastUpdateTime = Date.now();
        transferJob.state.isDownloading = true;
        transferJob.state.progress = {
          bytesDownloaded: transfer.bytesWritten,
          bytesTotal: transfer.totalBytes,
          progress: transfer.progress,
          speed: '0 B/s',
          eta: 'calculating...',
          rawSpeed: 0,
          rawEta: 0,
        };

        this.eventCallbacks.onProgress?.(modelName, transferJob.state.progress);
      }
    } catch (error) {
    }
  }

  setEventCallbacks(callbacks: DownloadEventCallbacks): void {
    this.eventCallbacks = callbacks;
  }

  getActiveTransferCount(): number {
    return this.activeTransfers.size;
  }

  shutdownService(): void {
    this.eventSubscriptions.forEach(sub => sub.remove());
    this.eventSubscriptions = [];
    
    this.activeTransfers.clear();
    this.eventCallbacks = {};
  }
}

export const backgroundDownloadService = new BackgroundDownloadService();
