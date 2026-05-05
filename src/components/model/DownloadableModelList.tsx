import React, { useState } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import DownloadableModelItem, { DownloadableModel } from './DownloadableModelItem';
import { modelDownloader } from '../../services/ModelDownloader';
import Dialog from '../Dialog';

interface DownloadableModelListProps {
  models: DownloadableModel[];
  storedModels: any[];
  downloadProgress: any;
  setDownloadProgress: React.Dispatch<React.SetStateAction<any>>;
  onDownload?: (model: DownloadableModel) => void;
}

const DownloadableModelList: React.FC<DownloadableModelListProps> = ({ 
  models,
  storedModels,
  downloadProgress, 
  setDownloadProgress,
  onDownload
}) => {
  const navigation = useNavigation();
  const [initializingDownloads, setInitializingDownloads] = useState<{ [key: string]: boolean }>({});


  const [dialogVisible, setDialogVisible] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogMessage, setDialogMessage] = useState('');

  const showDialog = (title: string, message: string) => {
    setDialogTitle(title);
    setDialogMessage(message);
    setDialogVisible(true);
  };

  const hideDialog = () => setDialogVisible(false);

  const getModelFilename = (model: DownloadableModel) =>
    model.huggingFaceLink.split('/').pop() || model.name;

  const isModelDownloaded = (filename: string) => {
    return storedModels.some(storedModel => {
      const storedName = storedModel.name.replace(/\.(gguf|bin|litertlm|task)$/i, '');
      const checkName = filename.replace(/\.(gguf|bin|litertlm|task)$/i, '');
      return storedName.toLowerCase() === checkName.toLowerCase();
    });
  };

  const isModelDownloading = (model: DownloadableModel) => {
    const filename = getModelFilename(model);
    const mainFileDownloading = Boolean(downloadProgress[filename]);
    
    if (model.additionalFiles && model.additionalFiles.length > 0) {
      const additionalFilesDownloading = model.additionalFiles.some(file => 
        Boolean(downloadProgress[file.url.split('/').pop() || file.name])
      );
      return mainFileDownloading || additionalFilesDownloading;
    }
    
    return mainFileDownloading;
  };

  const isModelInitializing = (model: DownloadableModel) => {
    const filename = getModelFilename(model);
    const mainFileInitializing = Boolean(initializingDownloads[filename]);
    
    if (model.additionalFiles && model.additionalFiles.length > 0) {
      const additionalFilesInitializing = model.additionalFiles.some(file => 
        Boolean(initializingDownloads[file.url.split('/').pop() || file.name])
      );
      return mainFileInitializing || additionalFilesInitializing;
    }
    
    return mainFileInitializing;
  };

  const handleDownload = async (model: DownloadableModel) => {
    const mainFilename = getModelFilename(model);
    if (isModelDownloaded(mainFilename)) {
      showDialog(
        'Model Already Downloaded',
        'This model is already in your stored models.'
      );
      return;
    }

    if (onDownload) {
      onDownload(model);
      return;
    }

    navigation.navigate('Downloads' as never);
    
    const filesToDownload = [
      { filename: mainFilename, downloadUrl: model.huggingFaceLink }
    ];

    if (model.additionalFiles && model.additionalFiles.length > 0) {
      model.additionalFiles.forEach(file => {
        filesToDownload.push({
          filename: file.url.split('/').pop() || file.name,
          downloadUrl: file.url
        });
      });
    }

    for (const file of filesToDownload) {
      try {
        setInitializingDownloads(prev => ({ ...prev, [file.filename]: true }));
        
        setDownloadProgress((prev: any) => ({
          ...prev,
          [file.filename]: {
            progress: 0,
            bytesDownloaded: 0,
            totalBytes: 0,
            status: 'starting',
            downloadId: 0
          }
        }));
        
        const { downloadId } = await modelDownloader.downloadModel(
          file.downloadUrl, 
          file.filename
        );
        
        setDownloadProgress((prev: any) => ({
          ...prev,
          [file.filename]: {
            ...prev[file.filename],
            downloadId
          }
        }));

      } catch (error) {
        setDownloadProgress((prev: any) => {
          const newProgress = { ...prev };
          delete newProgress[file.filename];
          return newProgress;
        });
        showDialog('Error', `Failed to start download for ${file.filename}`);
      } finally {
        setInitializingDownloads(prev => ({ ...prev, [file.filename]: false }));
      }
    }
  };

  return (
    <ScrollView 
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {models.map(model => (
        <DownloadableModelItem
          key={model.name}
          model={model}
          isDownloaded={isModelDownloaded(getModelFilename(model))}
          isDownloading={isModelDownloading(model)}
          isInitializing={isModelInitializing(model)}
          downloadProgress={downloadProgress[getModelFilename(model)]}
          onDownload={onDownload || handleDownload}
        />
      ))}

      <Dialog
        visible={dialogVisible}
        onDismiss={hideDialog}
        title={dialogTitle}
        description={dialogMessage}
        buttonText="OK"
        onClose={hideDialog}
      />
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    padding: 16,
    paddingTop: 0,
  },
});

export default DownloadableModelList; 
