import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { modelDownloader } from '../services/ModelDownloader';

interface DownloadProgressData {
  progress: number;
  bytesDownloaded: number;
  totalBytes: number;
  status: string;
  downloadId: number;
  isPaused?: boolean;
  error?: string;
}

interface DownloadProgress {
  [key: string]: DownloadProgressData;
}

type SetDownloadProgress = React.Dispatch<React.SetStateAction<DownloadProgress>>;

const DownloadProgressContext = createContext<DownloadProgress>({});
const DownloadDispatchContext = createContext<SetDownloadProgress>(() => {});

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [downloadProgress, setDownloadProgress] = useState<DownloadProgress>({});
  const isLoadedRef = useRef(false);
  const cancelledRef = useRef<Set<string>>(new Set());
  const lastUpdateRef = useRef<Record<string, number>>({});
  const pendingRef = useRef<Record<string, any>>({});
  const timerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  useEffect(() => {
    const loadSavedStates = async () => {
      try {
        const savedProgress = await AsyncStorage.getItem('download_progress');
        let merged: DownloadProgress = {};

        if (savedProgress) {
          const parsedProgress = JSON.parse(savedProgress);
          merged = Object.entries(parsedProgress).reduce((acc, [key, value]) => {
            if (key.startsWith('com.inferra.transfer.')) {
              return acc;
            }
            if (value && typeof value === 'object' &&
                'status' in value &&
                value.status !== 'completed' &&
                value.status !== 'failed' &&
                value.status !== 'cancelled') {
              acc[key] = value as DownloadProgressData;
            }
            return acc;
          }, {} as DownloadProgress);
        }

        try {
          const taskDownloads = await modelDownloader.getActiveDownloadsList();
          const activeNames = new Set(
            taskDownloads
              .filter(dl =>
                dl.modelName &&
                !dl.modelName.startsWith('com.inferra.transfer.') &&
                dl.status !== 'completed' &&
                dl.status !== 'failed' &&
                dl.status !== 'cancelled'
              )
              .map(dl => dl.modelName)
          );

          Object.keys(merged).forEach(key => {
            if (!activeNames.has(key)) {
              delete merged[key];
            }
          });

          for (const dl of taskDownloads) {
            if (
              dl.modelName &&
              !dl.modelName.startsWith('com.inferra.transfer.') &&
              dl.status !== 'completed' &&
              dl.status !== 'failed' &&
              dl.status !== 'cancelled' &&
              !merged[dl.modelName]
            ) {
              merged[dl.modelName] = {
                progress: dl.progress || 0,
                bytesDownloaded: dl.bytesDownloaded || 0,
                totalBytes: dl.totalBytes || 0,
                status: dl.status || 'downloading',
                downloadId: dl.downloadId || 0,
              };
            }
          }
        } catch (_) {}

        setDownloadProgress(merged);
        isLoadedRef.current = true;
      } catch (error) {
        isLoadedRef.current = true;
      }
    };
    
    loadSavedStates();

    const handleDownloadStarted = (data: any) => {
      console.log('DownloadContext: download_started:', data);
      if (!data.modelName || data.modelName.startsWith('com.inferra.transfer.')) {
        return;
      }

      if (timerRef.current[data.modelName]) {
        clearTimeout(timerRef.current[data.modelName]);
        delete timerRef.current[data.modelName];
      }
      delete pendingRef.current[data.modelName];
      delete lastUpdateRef.current[data.modelName];

      setDownloadProgress(prev => ({
        ...prev,
        [data.modelName]: {
          progress: 0,
          bytesDownloaded: 0,
          totalBytes: 0,
          status: 'downloading',
          downloadId: data.downloadId || 0,
          isPaused: false
        }
      }));
    };

    const handleDownloadCompleted = (data: any) => {
      console.log('DownloadContext: download_completed:', data);
      if (!data.modelName || data.modelName.startsWith('com.inferra.transfer.')) {
        return;
      }

      if (timerRef.current[data.modelName]) {
        clearTimeout(timerRef.current[data.modelName]);
        delete timerRef.current[data.modelName];
      }
      delete pendingRef.current[data.modelName];
      delete lastUpdateRef.current[data.modelName];

      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        if (newProgress[data.modelName]) {
          newProgress[data.modelName] = {
            ...newProgress[data.modelName],
            progress: 100,
            status: 'completed'
          };
        }
        return newProgress;
      });
      setTimeout(() => {
        setDownloadProgress(prev => {
          const next = { ...prev };
          delete next[data.modelName];
          return next;
        });
      }, 3000);
    };

    const handleDownloadFailed = (data: any) => {
      console.log('DownloadContext: download_failed:', data);
      if (!data.modelName || data.modelName.startsWith('com.inferra.transfer.')) {
        return;
      }

      if (timerRef.current[data.modelName]) {
        clearTimeout(timerRef.current[data.modelName]);
        delete timerRef.current[data.modelName];
      }
      delete pendingRef.current[data.modelName];
      delete lastUpdateRef.current[data.modelName];

      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        if (newProgress[data.modelName]) {
          newProgress[data.modelName] = {
            ...newProgress[data.modelName],
            status: 'failed',
            error: data.error,
          };
        }
        return newProgress;
      });
      setTimeout(() => {
        setDownloadProgress(prev => {
          const next = { ...prev };
          delete next[data.modelName];
          return next;
        });
      }, 3000);
    };

    const handleDownloadCancelled = (data: any) => {
      if (!data.modelName || data.modelName.startsWith('com.inferra.transfer.')) {
        return;
      }

      if (timerRef.current[data.modelName]) {
        clearTimeout(timerRef.current[data.modelName]);
        delete timerRef.current[data.modelName];
      }
      delete pendingRef.current[data.modelName];
      delete lastUpdateRef.current[data.modelName];

      cancelledRef.current.add(data.modelName);
      setTimeout(() => cancelledRef.current.delete(data.modelName), 30000);
      setDownloadProgress(prev => {
        const newProgress = { ...prev };
        delete newProgress[data.modelName];
        return newProgress;
      });
    };

    const handleProgress = (data: any) => {
      if (!data.modelName || data.modelName.startsWith('com.inferra.transfer.')) {
        return;
      }
      if (data.status === 'completed' || data.status === 'failed' || data.status === 'cancelled') {
        return;
      }
      if (cancelledRef.current.has(data.modelName)) {
        return;
      }

      const now = Date.now();
      const last = lastUpdateRef.current[data.modelName] || 0;
      const minInterval = 500;

      pendingRef.current[data.modelName] = data;

      if (now - last >= minInterval) {
        lastUpdateRef.current[data.modelName] = now;
        flushPending(data.modelName);
      } else if (!timerRef.current[data.modelName]) {
        const delay = minInterval - (now - last);
        timerRef.current[data.modelName] = setTimeout(() => {
          lastUpdateRef.current[data.modelName] = Date.now();
          delete timerRef.current[data.modelName];
          flushPending(data.modelName);
        }, delay);
      }
    };

    const flushPending = (modelName: string) => {
      const data = pendingRef.current[modelName];
      if (!data) return;
      delete pendingRef.current[modelName];

      setDownloadProgress(prev => ({
        ...prev,
        [modelName]: {
          progress: data.progress || 0,
          bytesDownloaded: data.bytesDownloaded || 0,
          totalBytes: data.totalBytes || 0,
          status: data.status || 'downloading',
          downloadId: data.downloadId || prev[modelName]?.downloadId || 0,
          isPaused: prev[modelName]?.isPaused,
        }
      }));
    };

    modelDownloader.on('downloadStarted', handleDownloadStarted);
    modelDownloader.on('downloadCompleted', handleDownloadCompleted);
    modelDownloader.on('downloadFailed', handleDownloadFailed);
    modelDownloader.on('downloadCancelled', handleDownloadCancelled);
    modelDownloader.on('downloadProgress', handleProgress);

    return () => {
      modelDownloader.off('downloadStarted', handleDownloadStarted);
      modelDownloader.off('downloadCompleted', handleDownloadCompleted);
      modelDownloader.off('downloadFailed', handleDownloadFailed);
      modelDownloader.off('downloadCancelled', handleDownloadCancelled);
      modelDownloader.off('downloadProgress', handleProgress);

      Object.values(timerRef.current).forEach(clearTimeout);
      timerRef.current = {};
      pendingRef.current = {};
      lastUpdateRef.current = {};
    };
  }, []);

  const progressValue = useMemo(() => downloadProgress, [downloadProgress]);

  return (
    <DownloadProgressContext.Provider value={progressValue}>
      <DownloadDispatchContext.Provider value={setDownloadProgress}>
        {children}
      </DownloadDispatchContext.Provider>
    </DownloadProgressContext.Provider>
  );
};

export const useDownloadProgress = () => useContext(DownloadProgressContext);

export const useDownloadDispatch = () => useContext(DownloadDispatchContext);

/*
  Legacy hook for backward compatibility.
  Prefer useDownloadProgress or useDownloadDispatch individually
  to avoid unnecessary re-renders.
*/
export const useDownloads = () => {
  const downloadProgress = useContext(DownloadProgressContext);
  const setDownloadProgress = useContext(DownloadDispatchContext);
  return { downloadProgress, setDownloadProgress };
};
