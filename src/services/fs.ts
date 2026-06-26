import { Directory, File, Paths } from 'expo-file-system';

type InfoOptions = {
  size?: boolean;
};

type ReadOptions = {
  encoding?: EncodingTypeValue;
};

type DirOptions = {
  intermediates?: boolean;
};

type DeleteOptions = {
  idempotent?: boolean;
};

type CopyMoveOptions = {
  from: string;
  to: string;
};

type InfoResult = {
  exists: boolean;
  isDirectory: boolean;
  size?: number;
  modificationTime?: number;
  uri?: string;
};

const EncodingType = {
  UTF8: 'utf8',
  Base64: 'base64',
} as const;

type EncodingTypeValue = (typeof EncodingType)[keyof typeof EncodingType];

const withSlash = (path: string): string => (path.endsWith('/') ? path : `${path}/`);
const isContentUri = (path: string): boolean => path.startsWith('content://');

const pathInfo = (path: string): { exists: boolean; isDirectory: boolean | null } => {
  try {
    return Paths.info(path);
  } catch {
    return {
      exists: false,
      isDirectory: null,
    };
  }
};

const buildFileInfo = (path: string, options?: InfoOptions): InfoResult => {
  const file = new File(path);
  const info = file.info();
  return {
    exists: info.exists,
    isDirectory: false,
    size: options?.size ? info.size ?? 0 : undefined,
    modificationTime: info.modificationTime ?? undefined,
    uri: info.uri,
  };
};

const buildDirectoryInfo = (path: string, options?: InfoOptions): InfoResult => {
  const directory = new Directory(path);
  const info = directory.info();
  return {
    exists: info.exists,
    isDirectory: true,
    size: options?.size ? info.size ?? 0 : undefined,
    modificationTime: info.modificationTime ?? undefined,
    uri: info.uri,
  };
};

const removePath = (path: string, options?: DeleteOptions): void => {
  const type = detectPathType(path);
  if (type === 'missing') {
    if (options?.idempotent) {
      return;
    }
    throw new Error(`Path does not exist: ${path}`);
  }

  if (type === 'directory') {
    new Directory(path).delete();
    return;
  }

  new File(path).delete();
};

const copyPath = ({ from, to }: CopyMoveOptions): void => {
  const type = detectPathType(from);
  if (type === 'missing') {
    throw new Error(`Source path does not exist: ${from}`);
  }

  try {
    if (type === 'directory') {
      new Directory(from).copy(new Directory(to));
      return;
    }

    new File(from).copy(new File(to));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`copy_failed: ${from} -> ${to}: ${msg}`);
  }
};

const movePath = ({ from, to }: CopyMoveOptions): void => {
  const type = detectPathType(from);
  if (type === 'missing') {
    throw new Error(`Source path does not exist: ${from}`);
  }

  try {
    if (type === 'directory') {
      new Directory(from).move(new Directory(to));
      return;
    }

    new File(from).move(new File(to));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`move_failed: ${from} -> ${to}: ${msg}`);
  }
};

const detectPathType = (path: string): 'file' | 'directory' | 'missing' => {
  const info = pathInfo(path);
  if (info.exists) {
    return info.isDirectory ? 'directory' : 'file';
  }

  try {
    const fileInfo = new File(path).info();
    if (fileInfo.exists) {
      return 'file';
    }
  } catch {}

  try {
    const dirInfo = new Directory(path).info();
    if (dirInfo.exists) {
      return 'directory';
    }
  } catch {}

  return 'missing';
};

export const fs = {
  documentDirectory: withSlash(Paths.document.uri),
  cacheDirectory: withSlash(Paths.cache.uri),
  EncodingType,

  async getInfoAsync(path: string, options?: InfoOptions): Promise<InfoResult> {
    if (isContentUri(path)) {
      try {
        const info = new File(path).info();
        return {
          exists: info.exists,
          isDirectory: false,
          size: options?.size ? info.size ?? 0 : undefined,
          modificationTime: info.modificationTime ?? undefined,
          uri: info.uri ?? path,
        };
      } catch {
        return {
          exists: false,
          isDirectory: false,
          uri: path,
        };
      }
    }

    const type = detectPathType(path);
    if (type === 'missing') {
      return {
        exists: false,
        isDirectory: false,
        uri: path,
      };
    }

    if (type === 'directory') {
      return buildDirectoryInfo(path, options);
    }

    return buildFileInfo(path, options);
  },

  async makeDirectoryAsync(path: string, options?: DirOptions): Promise<void> {
    const directory = new Directory(path);
    directory.create({
      intermediates: options?.intermediates ?? false,
      idempotent: true,
    });
  },

  async readDirectoryAsync(path: string): Promise<string[]> {
    const directory = new Directory(path);
    const entries = directory.list();
    return entries.map(entry => entry.name);
  },

  async readAsStringAsync(path: string, options?: ReadOptions): Promise<string> {
    const file = new File(path);
    const encoding = options?.encoding ?? EncodingType.UTF8;
    if (encoding === EncodingType.Base64) {
      return file.base64();
    }
    return file.text();
  },

  async getFreeDiskStorageAsync(): Promise<number> {
    return Paths.availableDiskSpace;
  },

  async getTotalDiskCapacityAsync(): Promise<number> {
    return Paths.totalDiskSpace;
  },

  async deleteAsync(path: string, options?: DeleteOptions): Promise<void> {
    removePath(path, options);
  },

  async copyAsync(options: CopyMoveOptions): Promise<void> {
    if (isContentUri(options.from) || isContentUri(options.to)) {
      try {
        new File(options.from).copy(new File(options.to));
        return;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        throw new Error(`copy_failed: ${options.from} -> ${options.to}: ${msg}`);
      }
    }

    copyPath(options);
  },

  async moveAsync(options: CopyMoveOptions): Promise<void> {
    movePath(options);
  },
};
