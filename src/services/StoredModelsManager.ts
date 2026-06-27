import { fs as FileSystem } from './fs';
import * as Sharing from 'expo-sharing';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import { EventEmitter } from './EventEmitter';
import { FileManager } from './FileManager';
import { StoredModel } from './ModelDownloaderTypes';
import { detectVisionCapabilities } from '../utils/multimodalHelpers';
import { ModelType, ModelFormat } from '../types/models';
import { mlxStorageManager } from './MLXStorageManager';
import { ModelManager } from '@inferrlm/react-native-mlx';

export const SHARE_CANCELLED_ERROR = 'share_cancelled';

export class StoredModelsManager extends EventEmitter {
  private fileManager: FileManager;
  private readonly STORAGE_KEY = 'stored_models_list';
  private ready: boolean = false;
  private starting: boolean = false;
  private startPromise: Promise<void> | null = null;
  private mutex: Promise<void> = Promise.resolve();

  constructor(fileManager: FileManager) {
    super();
    this.fileManager = fileManager;
  }

  private async lock<T>(fn: () => Promise<T>): Promise<T> {
    const prev = this.mutex;
    let release: () => void;
    this.mutex = new Promise(r => { release = r; });
    await prev;
    try {
      return await fn();
    } finally {
      release!();
    }
  }

  private async fileExists(path: string): Promise<boolean> {
    try {
      const info = await FileSystem.getInfoAsync(path);
      return info.exists;
    } catch {
      return false;
    }
  }

  private async findMlxDir(modelId: string): Promise<string | null> {
    const nitroModelId = modelId.replace(/\//g, '_');
    const candidates = [
      mlxStorageManager.getMLXModelDirectory(modelId),
      mlxStorageManager.getMLXModelDirectory(nitroModelId),
      `${FileSystem.documentDirectory}huggingface/models/${nitroModelId}`,
      `${FileSystem.documentDirectory}huggingface/models/${modelId}`,
    ];

    for (const candidate of candidates) {
      try {
        const info = await FileSystem.getInfoAsync(candidate);
        if (info.exists && info.isDirectory) {
          return candidate;
        }
      } catch {
      }
    }

    return null;
  }

  private async getDirStats(dirPath: string): Promise<{ size: number; fileCount: number }> {
    let size = 0;
    let fileCount = 0;

    const walk = async (currentPath: string): Promise<void> => {
      const entries = await FileSystem.readDirectoryAsync(currentPath);
      for (const entry of entries) {
        const fullPath = `${currentPath}/${entry}`;
        const info = await FileSystem.getInfoAsync(fullPath, { size: true });
        if (!info.exists) {
          continue;
        }

        if (info.isDirectory) {
          await walk(fullPath);
        } else {
          fileCount += 1;
          size += (info as any).size || 0;
        }
      }
    };

    await walk(dirPath);
    return { size, fileCount };
  }

  private detectStandaloneModelFormat(fileName: string): ModelFormat | null {
    const lower = fileName.toLowerCase();

    if (lower.endsWith('.gguf')) {
      return ModelFormat.GGUF;
    }

    if (lower.endsWith('.litertlm') || lower.endsWith('.task')) {
      return ModelFormat.LITERT;
    }

    return null;
  }

  private async collectModelFiles(baseDir: string): Promise<Array<{ name: string; path: string; size: number }>> {
    const files: Array<{ name: string; path: string; size: number }> = [];

    const walk = async (currentDir: string, relativeDir: string): Promise<void> => {
      const entries = await FileSystem.readDirectoryAsync(currentDir);

      for (const entry of entries) {
        if (!relativeDir && entry === 'mlx') {
          continue;
        }

        const fullPath = `${currentDir}/${entry}`;
        const relativePath = relativeDir ? `${relativeDir}/${entry}` : entry;
        const info = await FileSystem.getInfoAsync(fullPath, { size: true });

        if (!info.exists) {
          continue;
        }

        if (info.isDirectory) {
          await walk(fullPath, relativePath);
          continue;
        }

        if (!this.detectStandaloneModelFormat(relativePath)) {
          continue;
        }

        files.push({
          name: relativePath,
          path: fullPath,
          size: (info as any).size || 0,
        });
      }
    };

    await walk(baseDir, '');
    return files;
  }

  private async confirmFilesExist(models: StoredModel[]): Promise<StoredModel[]> {
    const result: StoredModel[] = [];
    for (const model of models) {
      const exists = await this.fileExists(model.path);
      if (exists) {
        result.push(model);
      } else {
        console.log('model_file_missing', model.name);
      }
    }
    return result;
  }

  async initialize(): Promise<void> {
    if (this.ready) {
      return;
    }
    if (this.starting) {
      await this.startPromise;
      return;
    }

    this.starting = true;
    this.startPromise = (async () => {
      console.log('models_init_start');
      try {
        await this.syncOnLaunch();
        this.ready = true;
        console.log('models_init_done');
      } catch (err) {
        console.log('models_init_err', err);
        throw err;
      } finally {
        this.starting = false;
      }
    })();

    await this.startPromise;
  }

  async getStoredModels(): Promise<StoredModel[]> {
    try {
      const storedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      if (storedData) {
        return JSON.parse(storedData);
      }
    } catch (error) {
      console.log('storage_read_error', error);
    }

    console.log('no_cached_models');
    return [];
  }

  private async getMlxIds(): Promise<string[]> {
    if (Platform.OS !== 'ios') return [];

    const ids = new Set<string>();

    try {
      const regIds = await ModelManager.getDownloadedModels();
      for (const id of regIds) {
        ids.add(id);
      }
    } catch (error) {
      console.log('mlx_registry_list_error', error);
    }

    try {
      const fsModels = await mlxStorageManager.listMLXModels();
      for (const model of fsModels) {
        ids.add(model.modelId);
      }
    } catch (error) {
      console.log('mlx_fs_list_error', error);
    }

    return Array.from(ids);
  }

  private async scanAndPersist(): Promise<StoredModel[]> {
    return this.lock(async () => {
      console.log('scan_filesystem_start');
      try {
        const baseDir = this.fileManager.getBaseDir();
        console.log('base_dir', baseDir);

        const dirInfo = await FileSystem.getInfoAsync(baseDir);
        if (!dirInfo.exists) {
          console.log('dir_not_exists');
          await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
          const emptyModels: StoredModel[] = [];
          await this.saveModelsToStorage(emptyModels);
          return emptyModels;
        }

        console.log('reading_directory');
        const discoveredFiles = await this.collectModelFiles(baseDir);
        console.log('files_found', discoveredFiles.length);

        const models: StoredModel[] = [];
        if (discoveredFiles.length > 0) {
          console.log('processing_files');
          for (const file of discoveredFiles) {
            try {
              const name = file.name;
              const path = file.path;
              const size = file.size;
              const modelFormat = this.detectStandaloneModelFormat(name);
              if (!modelFormat) {
                continue;
              }
              const modified = new Date().toISOString();

              const capabilities = detectVisionCapabilities(name);
              const modelType = capabilities.isProjection
                ? ModelType.PROJECTION
                : capabilities.isVision
                  ? ModelType.VISION
                  : ModelType.LLM;

              models.push({
                id: `${name}-${Date.now()}`,
                name,
                path,
                size,
                modified,
                isExternal: false,
                downloaded: true,
                modelType,
                modelFormat,
                isDirectory: false,
                capabilities: capabilities.capabilities,
                supportsMultimodal: capabilities.isVision,
                compatibleProjectionModels: capabilities.compatibleProjections,
                defaultProjectionModel: capabilities.defaultProjection,
              });
            } catch (fileError) {
              console.log('scan_file_error', name, fileError);
            }
          }
        }

        console.log('scanning_mlx_models');
        try {
          const mlxModelIds = await this.getMlxIds();
          console.log('mlx_models_found', mlxModelIds.length);

          for (const modelId of mlxModelIds) {
            try {
              const modelPath = await this.findMlxDir(modelId);
              if (!modelPath) {
                console.log('mlx_dir_missing', modelId);
                continue;
              }

              const dirInfo = await FileSystem.getInfoAsync(modelPath);
              if (!dirInfo.exists || !dirInfo.isDirectory) {
                console.log('mlx_dir_invalid', modelId);
                continue;
              }

              const { size, fileCount } = await this.getDirStats(modelPath);

              models.push({
                id: `${modelId}-${Date.now()}`,
                name: modelId,
                path: modelPath,
                size,
                modified: new Date((dirInfo as any).modificationTime || Date.now()).toISOString(),
                isExternal: false,
                downloaded: true,
                modelType: ModelType.LLM,
                modelFormat: ModelFormat.MLX,
                isDirectory: true,
                fileCount,
                capabilities: ['text'],
                supportsMultimodal: false,
              });
            } catch (modelError) {
              console.log('mlx_model_scan_error', modelId, modelError);
            }
          }
        } catch (error) {
          console.log('mlx_scan_error', error);
        }

        console.log('saving_to_storage', models.length);
        await this.saveModelsToStorage(models);
        console.log('scan_complete');
        return models;
      } catch (error) {
        console.log('scan_error', error);
        const emptyModels: StoredModel[] = [];
        await this.saveModelsToStorage(emptyModels);
        return emptyModels;
      }
    });
  }

  private async syncOnLaunch(): Promise<void> {
    console.log('sync_start');
    try {
      const baseDir = this.fileManager.getBaseDir();
      const dirInfo = await FileSystem.getInfoAsync(baseDir);
      
      if (!dirInfo.exists) {
        console.log('dir_not_exists_creating');
        await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
        await this.saveModelsToStorage([]);
        return;
      }

      const storedData = await AsyncStorage.getItem(this.STORAGE_KEY);
      const storedModels: StoredModel[] = storedData ? JSON.parse(storedData) : [];
      const mlxInStorage = storedModels.filter(m => m.modelFormat === ModelFormat.MLX).length;
      
      let needsRescan = storedModels.length === 0;
      
      if (!needsRescan && mlxInStorage === 0) {
        try {
          const mlxModelIds = await this.getMlxIds();
          if (mlxModelIds.length > 0) {
            needsRescan = true;
          }
        } catch (error) {
          console.log('mlx_disk_check_error', error);
        }
      }
      
      if (needsRescan) {
        const filesOnDisk = await FileSystem.readDirectoryAsync(baseDir);
        let hasModels = filesOnDisk.length > 0;
        
        if (!hasModels) {
          try {
            const mlxModelIds = await this.getMlxIds();
            hasModels = mlxModelIds.length > 0;
          } catch (error) {
            console.log('mlx_check_error', error);
          }
        }
        
        if (hasModels) {
          await this.scanAndPersist();
          return;
        }
      }

      const validated = await this.confirmFilesExist(storedModels);
      if (validated.length !== storedModels.length) {
        console.log('sync_removed_missing', storedModels.length - validated.length);
        await this.saveModelsToStorage(validated);
      }
      
      console.log('sync_complete');
    } catch (error) {
      console.log('sync_error', error);
      await this.scanAndPersist();
    }
  }

  private async saveModelsToStorage(models: StoredModel[]): Promise<void> {
    console.log('save_storage_start', models.length);
    try {
      await AsyncStorage.setItem(this.STORAGE_KEY, JSON.stringify(models));
      console.log('save_storage_complete');
    } catch (error) {
      console.log('save_storage_error', error);
      throw error;
    }
  }

  async deleteModel(path: string): Promise<void> {
    return this.lock(async () => {
      const currentModels = await this.getStoredModels();
      const modelToDelete = currentModels.find(m => m.path === path);
      
      if (modelToDelete && modelToDelete.modelFormat === ModelFormat.MLX) {
        try {
          const modelId = modelToDelete.name;
          if (Platform.OS === 'ios') {
            await ModelManager.deleteModel(modelId);
          }
          console.log('mlx_model_deleted', modelId);
        } catch (error) {
          console.log('mlx_delete_error', error);
        }
        
        const updated = currentModels.filter(m => m.path !== path);
        await this.saveModelsToStorage(updated);
        this.emit('modelsChanged');
        return;
      }
      
      const hasProjectionPair = modelToDelete?.modelFormat === ModelFormat.GGUF;
      const dir = path.substring(0, path.lastIndexOf('/'));
      const baseName = path.substring(path.lastIndexOf('/') + 1);
      const projectorName = hasProjectionPair
        ? baseName.replace('.gguf', '-mmproj-f16.gguf')
        : '';
      const projectorPath = projectorName ? `${dir}/${projectorName}` : '';
      
      let hasProjector = false;
      if (projectorPath) {
        try {
          const projInfo = await FileSystem.getInfoAsync(projectorPath);
          hasProjector = projInfo?.exists ?? false;
        } catch {
          hasProjector = false;
        }
      }
      
      let updated = currentModels.filter(m => m.path !== path);
      if (hasProjector) {
        updated = updated.filter(m => m.path !== projectorPath);
      }
      await this.saveModelsToStorage(updated);
      
      try {
        await this.fileManager.deleteFile(path);
        if (hasProjector) {
          await this.fileManager.deleteFile(projectorPath);
          console.log('mmproj_deleted', projectorName);
        }
      } catch (err) {
        console.log('file_delete_error', err);
      }
      
      this.emit('modelsChanged');
    });
  }

  async registerModel(name: string, path: string, size: number): Promise<StoredModel> {
    return this.lock(async () => {
      const sanitized = name.replace(/\s+/g, '_');
      const modelFormat = this.detectStandaloneModelFormat(sanitized);
      if (!modelFormat) {
        throw new Error('Unsupported model format');
      }
      const current = await this.getStoredModels();
      const exists = current.some(m => m.name === sanitized || m.path === path);
      if (exists) {
        throw new Error('Model already registered');
      }

      const capabilities = detectVisionCapabilities(sanitized);
      const modelType = capabilities.isProjection
        ? ModelType.PROJECTION
        : capabilities.isVision
          ? ModelType.VISION
          : ModelType.LLM;

      const model: StoredModel = {
        id: `${sanitized}-${Date.now()}`,
        name: sanitized,
        path,
        size,
        modified: new Date().toISOString(),
        isExternal: false,
        downloaded: true,
        modelType,
        modelFormat,
        capabilities: capabilities.capabilities,
        supportsMultimodal: capabilities.isVision,
        compatibleProjectionModels: capabilities.compatibleProjections,
        defaultProjectionModel: capabilities.defaultProjection,
      };

      const updated = [...current, model];
      await this.saveModelsToStorage(updated);
      this.emit('modelsChanged');
      return model;
    });
  }

  async setDownloadStatus(name: string, downloaded: boolean): Promise<void> {
    return this.lock(async () => {
      const current = await this.getStoredModels();
      const idx = current.findIndex(m => m.name === name);
      if (idx === -1) {
        console.log('model_not_found', name);
        return;
      }
      current[idx] = { ...current[idx], downloaded };
      await this.saveModelsToStorage(current);
      this.emit('modelsChanged');
    });
  }

  private refreshTimer: ReturnType<typeof setTimeout> | null = null;

  public refresh(): void {
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
    }
    this.refreshTimer = setTimeout(async () => {
      this.refreshTimer = null;
      try {
        await this.scanAndPersist();
        this.emit('modelsChanged');
      } catch (err) {
        console.log('refresh_scan_error', err);
      }
    }, 500);
  }

  async clearAllModels(): Promise<void> {
    try {
      const models = await this.getStoredModels();

      /*
        Unregister each MLX model from the nitro registry
        so stale entries don't linger after file deletion.
      */
      for (const m of models) {
        if (m.modelFormat === ModelFormat.MLX && Platform.OS === 'ios') {
          try {
            await ModelManager.deleteModel(m.name);
          } catch {
            console.log('mlx_registry_delete_skip', m.name);
          }
        }
      }

      const baseDir = this.fileManager.getBaseDir();
      const hfDir = `${FileSystem.documentDirectory}huggingface`;

      /*
        Delete the main models directory, the huggingface
        directory, and any stray temp / export residue that
        may consume storage.
      */
      const dirsToRemove = [
        baseDir,
        hfDir,
        `${FileSystem.documentDirectory}temp`,
        `${FileSystem.cacheDirectory}export`,
      ];

      for (const dir of dirsToRemove) {
        try {
          const info = await FileSystem.getInfoAsync(dir);
          if (info.exists) {
            await FileSystem.deleteAsync(dir, { idempotent: true });
          }
        } catch (err) {
          console.log('dir_delete_skip', dir, err);
        }
      }

      await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
      await this.saveModelsToStorage([]);
      this.emit('modelsChanged');
      console.log('all_models_cleared');
    } catch (error) {
      console.log('clear_all_models_error', error);
      throw error;
    }
  }

  async reloadStoredModels(): Promise<StoredModel[]> {
    const models = await this.scanAndPersist();
    this.emit('modelsChanged');
    return models;
  }

  async refreshStoredModels(): Promise<void> {
    try {
      const storedModels = await this.getStoredModels();
      const storedPaths = new Set(storedModels.map(m => m.path));
      
      const baseDir = this.fileManager.getBaseDir();
      const files = await this.collectModelFiles(baseDir);
      
      for (const file of files) {
        if (storedPaths.has(file.path)) {
          continue;
        }

        try {
          await this.registerModel(file.name, file.path, file.size);
          console.log('auto_registered', file.name);
        } catch {
          console.log('register_skipped', file.name);
        }
      }
    } catch (error) {
      console.log('refresh_error', error);
    }
  }

  async linkExternalModel(uri: string, fileName: string): Promise<void> {
    return this.lock(async () => {
      const sanitized = fileName.replace(/\s+/g, '_');
      const modelFormat = this.detectStandaloneModelFormat(sanitized);
      if (!modelFormat) {
        throw new Error('Unsupported model format');
      }
      const baseDir = this.fileManager.getBaseDir();
      const destPath = `${baseDir}/${sanitized}`;
      
      const stored = await this.getStoredModels();
      const nameExists = stored.some(m => m.name === sanitized);
      if (nameExists) {
        throw new Error('A model with this name already exists');
      }
      
      const destInfo = await FileSystem.getInfoAsync(destPath);
      if (destInfo.exists) {
        throw new Error('A file with this name already exists');
      }

      const fileInfo = await FileSystem.getInfoAsync(uri, { size: true });
      if (!fileInfo.exists) {
        throw new Error('External file does not exist');
      }

      const dirInfo = await FileSystem.getInfoAsync(baseDir);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(baseDir, { intermediates: true });
      }

      await FileSystem.copyAsync({
        from: uri,
        to: destPath
      });

      const size = (fileInfo as any).size || 0;
      const capabilities = detectVisionCapabilities(sanitized);
      const modelType = capabilities.isProjection
        ? ModelType.PROJECTION
        : capabilities.isVision
          ? ModelType.VISION
          : ModelType.LLM;

      const newModel: StoredModel = {
        id: `${sanitized}-${Date.now()}`,
        name: sanitized,
        path: destPath,
        size,
        modified: new Date().toISOString(),
        isExternal: true,
        downloaded: true,
        modelType,
        modelFormat,
        capabilities: capabilities.capabilities,
        supportsMultimodal: capabilities.isVision,
        compatibleProjectionModels: capabilities.compatibleProjections,
        defaultProjectionModel: capabilities.defaultProjection,
      };

      const currentModels = await this.getStoredModels();
      const updatedModels = [...currentModels, newModel];
      await this.saveModelsToStorage(updatedModels);

      this.emit('modelsChanged');
    });
  }

  async exportModel(modelPath: string, modelName: string): Promise<void> {
    let tempFilePath = '';
    try {
      const fileInfo = await FileSystem.getInfoAsync(modelPath);
      if (!fileInfo.exists) {
        throw new Error('Model file does not exist');
      }

      const isAvailable = await Sharing.isAvailableAsync();
      if (!isAvailable) {
        throw new Error('Sharing is not available on this device');
      }

      const tempDir = FileSystem.cacheDirectory + 'export/';
      const tempDirInfo = await FileSystem.getInfoAsync(tempDir);
      if (!tempDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
      }

      tempFilePath = `${tempDir}${Date.now()}-${modelName}`;
      
      await FileSystem.copyAsync({
        from: modelPath,
        to: tempFilePath
      });

      try {
        await Sharing.shareAsync(tempFilePath, {
          mimeType: 'application/octet-stream',
          dialogTitle: `Export ${modelName}`,
        });
      } catch (error) {
        const raw = (error as { message?: string } | undefined)?.message ?? String(error ?? '');
        const message = raw.toLowerCase();
        if (message.includes('cancel')) {
          throw new Error(SHARE_CANCELLED_ERROR);
        }
        throw error;
      }

      
      this.emit('modelExported', { modelName, tempFilePath });

    } finally {
      if (tempFilePath) {
        await FileSystem.deleteAsync(tempFilePath, { idempotent: true }).catch(() => {});
      }
    }
  }
}
