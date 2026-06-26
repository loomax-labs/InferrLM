import { fs as FileSystem } from './fs';
import { EventEmitter } from './EventEmitter';
import { ImportProgressEvent } from './ModelDownloaderTypes';

export class FileManager extends EventEmitter {
  private readonly baseDir: string;
  private readonly downloadDir: string;

  constructor() {
    super();
    this.baseDir = `${FileSystem.documentDirectory}models`;
    this.downloadDir = `${FileSystem.documentDirectory}temp`;
  }

  async initializeDirectories(): Promise<void> {
    try {
      
      const modelsDirInfo = await FileSystem.getInfoAsync(this.baseDir);
      if (!modelsDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.baseDir, { intermediates: true });
      } else {
      }
      
      const tempDirInfo = await FileSystem.getInfoAsync(this.downloadDir);
      if (!tempDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(this.downloadDir, { intermediates: true });
      } else {
      }
      
      try {
        const modelFiles = await FileSystem.readDirectoryAsync(this.baseDir);
      } catch (error) {
      }
      
      try {
        const tempFiles = await FileSystem.readDirectoryAsync(this.downloadDir);
      } catch (error) {
      }
    } catch (error) {
      throw error;
    }
  }

  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    
    try {
      const modelName = destPath.split('/').pop() || 'model';
      
      this.emit('importProgress', {
        modelName,
        status: 'importing'
      } as ImportProgressEvent);

      const sourceInfo = await FileSystem.getInfoAsync(sourcePath);
      if (!sourceInfo.exists) {
        const destInfoCheck = await FileSystem.getInfoAsync(destPath);
        if (destInfoCheck.exists) {
          this.emit('importProgress', { modelName, status: 'completed' } as ImportProgressEvent);
          return;
        }
        throw new Error(`Source file does not exist: ${sourcePath}`);
      }
      
      const destDir = destPath.substring(0, destPath.lastIndexOf('/'));
      const destDirInfo = await FileSystem.getInfoAsync(destDir);
      if (!destDirInfo.exists) {
        await FileSystem.makeDirectoryAsync(destDir, { intermediates: true });
      }
      
      const destInfo = await FileSystem.getInfoAsync(destPath);
      if (destInfo.exists) {
        await FileSystem.deleteAsync(destPath, { idempotent: true });
      }
      
      await FileSystem.moveAsync({
        from: sourcePath,
        to: destPath
      });
      
      const newDestInfo = await FileSystem.getInfoAsync(destPath);
      if (!newDestInfo.exists) {
        throw new Error(`File was not moved successfully to ${destPath}`);
      }

      this.emit('importProgress', {
        modelName,
        status: 'completed'
      } as ImportProgressEvent);
      
    } catch (error) {
      if (error instanceof Error && error.message.includes('NoSuchFileException')) {
        const destInfoCheck = await FileSystem.getInfoAsync(destPath);
        if (destInfoCheck.exists) {
          const modelName = destPath.split('/').pop() || 'model';
          this.emit('importProgress', { modelName, status: 'completed' } as ImportProgressEvent);
          return;
        }
      }

      const modelName = destPath.split('/').pop() || 'model';
      
      this.emit('importProgress', {
        modelName,
        status: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      } as ImportProgressEvent);

      throw error;
    }
  }

  async getFileSize(path: string): Promise<number> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(path);
      if (!fileInfo.exists) {
        return 0;
      }
      
      const statInfo = await FileSystem.getInfoAsync(path, { size: true });
      
      return ((statInfo as any).size) || 0;
    } catch (error) {
      return 0;
    }
  }

  async deleteFile(path: string): Promise<void> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(path);
      if (fileInfo.exists) {
        await FileSystem.deleteAsync(path, { idempotent: true });
      } else {
      }
    } catch (error) {
      throw error;
    }
  }

  async cleanupTempDirectory(activeDownloads: Set<string> = new Set()): Promise<void> {
    try {
      const tempDirInfo = await FileSystem.getInfoAsync(this.downloadDir);
      if (!tempDirInfo.exists) {
        return;
      }
      
      const contents = await FileSystem.readDirectoryAsync(this.downloadDir);
      const now = Date.now();
      const staleThreshold = 24 * 60 * 60 * 1000;
      
      for (const filename of contents) {
        if (activeDownloads.has(filename)) {
          continue;
        }
        
        const filePath = `${this.downloadDir}/${filename}`;
        
        try {
          const info = await FileSystem.getInfoAsync(filePath, { size: true });
          if (!info.exists) continue;
          
          const modTime = (info as any).modificationTime || 0;
          const isStale = modTime > 0 && (now - modTime * 1000) > staleThreshold;
          const isEmpty = (info as any).size === 0;
          
          if (isEmpty || isStale) {
            await FileSystem.deleteAsync(filePath, { idempotent: true });
            console.log('temp_cleaned', filename);
          }
        } catch {
          console.log('temp_cleanup_error', filename);
        }
      }
    } catch (error) {
      console.log('cleanup_dir_error', error);
    }
  }

  getBaseDir(): string {
    return this.baseDir;
  }

  getDownloadDir(): string {
    return this.downloadDir;
  }
} 
