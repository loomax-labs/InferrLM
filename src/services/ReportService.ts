import { Platform } from 'react-native';
import { fs as FileSystem } from './fs';
import * as ImageManipulator from 'expo-image-manipulator';
import { apiRequest } from './adapters/ApiClient';

interface ReportData {
  messageContent: string;
  provider: string;
  modelName?: string
  category: string;
  description: string;
  email: string;
  userId?: string | null;
  timestamp: string;
  appVersion: string;
  platform: string;
  attachments?: Array<{
    uri: string;
    type: 'image';
    fileName: string;
    fileSize: number;
  }>;
}

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB maximum input size
const TARGET_FILE_SIZE = 800 * 1024; // 800KB target after compression
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

const getFileType = (fileName: string): string => {
  const extension = fileName.toLowerCase().split('.').pop();
  
  switch (extension) {
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg';
    case 'png':
      return 'image/png';
    case 'gif':
      return 'image/gif';
    case 'webp':
      return 'image/webp';
    default:
      return 'image/jpeg';
  }
};

const validateFile = (fileSize: number, fileType: string): void => {
  if (fileSize > MAX_FILE_SIZE) {
    const sizeMB = (fileSize / (1024 * 1024)).toFixed(1);
    throw new Error(`File size (${sizeMB}MB) exceeds the 5MB limit`);
  }

  if (!ALLOWED_IMAGE_TYPES.includes(fileType)) {
    throw new Error(`File type ${fileType} is not allowed. Only images are supported.`);
  }
};

const compressImage = async (uri: string): Promise<{ uri: string; base64: string; size: number }> => {
  try {
    const originalInfo = await FileSystem.getInfoAsync(uri);
    if (!originalInfo.exists) {
      throw new Error('File does not exist');
    }
    
    let quality = 0.8;
    let compressedResult;
    let attempts = 0;
    const maxAttempts = 5;
    
    do {
      attempts++;
      
      compressedResult = await ImageManipulator.manipulateAsync(
        uri,
        [{ resize: { width: 1920 } }],
        {
          compress: quality,
          format: ImageManipulator.SaveFormat.JPEG,
          base64: true,
        }
      );
      
      const compressedSize = compressedResult.base64?.length || 0;
      const estimatedFileSize = (compressedSize * 3) / 4;
      
      if (estimatedFileSize <= TARGET_FILE_SIZE || quality <= 0.1 || attempts >= maxAttempts) {
        break;
      }
      
      quality -= 0.15;
    } while (true);
    
    if (!compressedResult.base64) {
      throw new Error('Failed to generate base64 data');
    }
    
    const finalSize = (compressedResult.base64.length * 3) / 4;
    
    return {
      uri: compressedResult.uri,
      base64: compressedResult.base64,
      size: finalSize
    };
  } catch (error) {
    throw new Error('Failed to compress image');
  }
};

export const submitReport = async (reportData: ReportData): Promise<void> => {
  try {
    const form = new FormData();

    form.append('messageContent', String(reportData.messageContent));
    form.append('provider', String(reportData.provider));
    form.append('modelName', reportData.modelName ? String(reportData.modelName) : '');
    form.append('category', String(reportData.category));
    form.append('description', String(reportData.description || ''));
    form.append('email', String(reportData.email));
    form.append('appVersion', String(reportData.appVersion || ''));
    form.append('platform', String(reportData.platform || Platform.OS));

    if (reportData.attachments && reportData.attachments.length > 0) {
      for (const attachment of reportData.attachments) {
        const fileType = getFileType(attachment.fileName);
        validateFile(attachment.fileSize, fileType);

        const compressed = await compressImage(attachment.uri);

        form.append('files', {
          uri: compressed.uri,
          name: attachment.fileName || 'photo.jpg',
          type: 'image/jpeg',
        } as any);
      }
    }

    await apiRequest('/reports', {
      method: 'POST',
      body: form,
      formData: true,
      auth: true,
    });
  } catch (error: any) {
    const errorMessage = error instanceof Error ? error.message : 'Failed to submit report';
    throw new Error(errorMessage);
  }
};


