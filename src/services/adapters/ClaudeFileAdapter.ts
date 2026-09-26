import { onlineModelService } from '../OnlineModelService';
import { isRemoteProviderOffered, rejectBlockedEndpoint } from '../regionPolicy';
import { fs as FileSystem } from '../fs';

export type ClaudeFile = {
  id: string;
  type: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  downloadable: boolean;
};

const BETA_HEADER = 'files-api-2025-04-14';

const ALLOWED_EXTENSIONS = [
  'pdf', 'txt',
  'jpg', 'jpeg', 'png', 'gif', 'webp',
];

const MAX_FILE_SIZE = 500 * 1024 * 1024;

export const getClaudeMimeType = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeMap[ext] || 'application/octet-stream';
};

const IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp'];

export const isClaudeImageFile = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return IMAGE_EXTENSIONS.includes(ext);
};

export const isClaudeUploadable = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return ALLOWED_EXTENSIONS.includes(ext);
};

const validateFile = async (fileUri: string, filename: string): Promise<void> => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type for Claude Files API: .${ext}`);
  }

  const info = await FileSystem.getInfoAsync(fileUri, { size: true });
  if (!info.exists) {
    throw new Error('File not found');
  }
  if (info.size && info.size > MAX_FILE_SIZE) {
    throw new Error('File exceeds 500MB limit');
  }
};

class ClaudeFileAdapterClass {
  private async getAuth(provider: string): Promise<{ apiKey: string; baseUrl: string }> {
    if (!isRemoteProviderOffered(provider)) {
      throw new Error('This model is not available.');
    }
    const apiKey = await onlineModelService.getApiKey(provider);
    if (!apiKey) {
      throw new Error('Claude API key not found');
    }
    const baseUrl = await onlineModelService.getBaseUrl(provider);
    rejectBlockedEndpoint(baseUrl);
    return { apiKey, baseUrl };
  }

  private getHeaders(apiKey: string): Record<string, string> {
    return {
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-beta': BETA_HEADER,
    };
  }

  async upload(
    fileUri: string,
    filename: string,
    provider = 'claude'
  ): Promise<ClaudeFile> {
    await validateFile(fileUri, filename);
    const { apiKey, baseUrl } = await this.getAuth(provider);

    const mimeType = getClaudeMimeType(filename);

    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as any);

    const response = await fetch(`${baseUrl}/files`, {
      method: 'POST',
      headers: {
        ...this.getHeaders(apiKey),
      },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Claude file upload failed: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      type: data.type,
      filename: data.filename,
      mimeType: data.mime_type,
      sizeBytes: data.size_bytes,
      createdAt: data.created_at,
      downloadable: data.downloadable ?? false,
    };
  }

  async list(provider = 'claude'): Promise<ClaudeFile[]> {
    const { apiKey, baseUrl } = await this.getAuth(provider);

    const response = await fetch(`${baseUrl}/files`, {
      headers: this.getHeaders(apiKey),
    });

    if (!response.ok) {
      throw new Error(`Failed to list Claude files: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).map((f: any) => ({
      id: f.id,
      type: f.type,
      filename: f.filename,
      mimeType: f.mime_type,
      sizeBytes: f.size_bytes,
      createdAt: f.created_at,
      downloadable: f.downloadable ?? false,
    }));
  }

  async remove(fileId: string, provider = 'claude'): Promise<void> {
    const { apiKey, baseUrl } = await this.getAuth(provider);

    const response = await fetch(`${baseUrl}/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: this.getHeaders(apiKey),
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to delete Claude file: ${response.status} - ${errText}`);
    }
  }

  async getMetadata(fileId: string, provider = 'claude'): Promise<ClaudeFile> {
    const { apiKey, baseUrl } = await this.getAuth(provider);

    const response = await fetch(`${baseUrl}/files/${encodeURIComponent(fileId)}`, {
      headers: this.getHeaders(apiKey),
    });

    if (!response.ok) {
      throw new Error(`Failed to get Claude file metadata: ${response.status}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      type: data.type,
      filename: data.filename,
      mimeType: data.mime_type,
      sizeBytes: data.size_bytes,
      createdAt: data.created_at,
      downloadable: data.downloadable ?? false,
    };
  }
}

export const claudeFileAdapter = new ClaudeFileAdapterClass();
