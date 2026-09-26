import { onlineModelService } from '../OnlineModelService';
import { isRemoteProviderOffered, rejectBlockedEndpoint } from '../regionPolicy';
import { fs as FileSystem } from '../fs';

export type GeminiFile = {
  name: string;
  displayName?: string;
  mimeType: string;
  sizeBytes: number;
  createTime?: string;
  updateTime?: string;
  expirationTime?: string;
  uri?: string;
  downloadUri?: string;
  state?: 'PROCESSING' | 'ACTIVE' | 'FAILED' | string;
};

const ALLOWED_EXTENSIONS = [
  'pdf', 'txt', 'md', 'csv', 'json', 'jsonl', 'html', 'xml',
  'jpg', 'jpeg', 'png', 'gif', 'webp', 'heic', 'heif',
  'mp3', 'wav', 'm4a', 'aac', 'ogg',
  'mp4', 'mov', 'mpeg', 'mpg', 'webm',
];

const IMAGE_EXTENSIONS = [
  'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif',
];

const MAX_FILE_SIZE = 2 * 1024 * 1024 * 1024;

export const isGeminiImageFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return IMAGE_EXTENSIONS.includes(ext);
};

export const isGeminiUploadable = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return ALLOWED_EXTENSIONS.includes(ext);
};

export const getGeminiMimeType = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    md: 'text/markdown',
    csv: 'text/csv',
    json: 'application/json',
    jsonl: 'application/jsonl',
    html: 'text/html',
    xml: 'application/xml',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    bmp: 'image/bmp',
    heic: 'image/heic',
    heif: 'image/heif',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    m4a: 'audio/mp4',
    aac: 'audio/aac',
    ogg: 'audio/ogg',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    mpeg: 'video/mpeg',
    mpg: 'video/mpeg',
    webm: 'video/webm',
  };
  return mimeMap[ext] || 'application/octet-stream';
};

const parseSize = (value: unknown): number => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const toGeminiFile = (data: any): GeminiFile => ({
  name: data.name,
  displayName: data.displayName,
  mimeType: data.mimeType,
  sizeBytes: parseSize(data.sizeBytes),
  createTime: data.createTime,
  updateTime: data.updateTime,
  expirationTime: data.expirationTime,
  uri: data.uri,
  downloadUri: data.downloadUri,
  state: data.state,
});

const validateFile = async (fileUri: string, filename: string): Promise<void> => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type for Gemini Files API: .${ext}`);
  }

  const info = await FileSystem.getInfoAsync(fileUri, { size: true });
  if (!info.exists) {
    throw new Error('File not found');
  }
  if (info.size && info.size > MAX_FILE_SIZE) {
    throw new Error('File exceeds 2GB limit');
  }
};

class GeminiFileAdapterClass {
  private async getAuth(provider: string): Promise<{ apiKey: string; baseUrl: string }> {
    if (!isRemoteProviderOffered(provider)) {
      throw new Error('This model is not available.');
    }
    const apiKey = await onlineModelService.getApiKey(provider);
    if (!apiKey) {
      throw new Error('Gemini API key not found');
    }
    const baseUrl = await onlineModelService.getBaseUrl(provider);
    rejectBlockedEndpoint(baseUrl);
    return { apiKey, baseUrl };
  }

  private getBaseApiRoot(baseUrl: string): string {
    return baseUrl.replace(/\/v1beta\/?$/, '');
  }

  async upload(fileUri: string, filename: string, provider = 'gemini'): Promise<GeminiFile> {
    await validateFile(fileUri, filename);
    const { apiKey, baseUrl } = await this.getAuth(provider);
    const mimeType = getGeminiMimeType(filename);

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as any);

    const uploadUrl = `${this.getBaseApiRoot(baseUrl)}/upload/v1beta/files?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini file upload failed: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    if (data.file) {
      return toGeminiFile(data.file);
    }
    return toGeminiFile(data);
  }

  async list(provider = 'gemini'): Promise<GeminiFile[]> {
    const { apiKey, baseUrl } = await this.getAuth(provider);
    const response = await fetch(`${baseUrl}/files?key=${encodeURIComponent(apiKey)}`);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to list Gemini files: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return (data.files || []).map((f: any) => toGeminiFile(f));
  }

  async remove(fileName: string, provider = 'gemini'): Promise<void> {
    const { apiKey, baseUrl } = await this.getAuth(provider);
    const response = await fetch(`${baseUrl}/${encodeURIComponent(fileName)}?key=${encodeURIComponent(apiKey)}`, {
      method: 'DELETE',
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to delete Gemini file: ${response.status} - ${errText}`);
    }
  }

  async getMetadata(fileName: string, provider = 'gemini'): Promise<GeminiFile> {
    const { apiKey, baseUrl } = await this.getAuth(provider);
    const response = await fetch(`${baseUrl}/${encodeURIComponent(fileName)}?key=${encodeURIComponent(apiKey)}`);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to get Gemini file metadata: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return toGeminiFile(data);
  }
}

export const geminiFileAdapter = new GeminiFileAdapterClass();
