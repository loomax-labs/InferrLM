import { onlineModelService } from '../OnlineModelService';
import { isRemoteProviderOffered, rejectBlockedEndpoint, userFacingApiName } from '../regionPolicy';
import { fs as FileSystem } from '../fs';

export type FilePurpose = 'assistants' | 'fine-tune' | 'batch' | 'vision';

export type OpenAIFile = {
  id: string;
  object: string;
  bytes: number;
  filename: string;
  purpose: string;
  createdAt: number;
  status: string;
};

const ALLOWED_EXTENSIONS = [
  'pdf', 'txt', 'csv', 'json', 'jsonl',
  'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx',
  'md', 'html', 'css', 'js', 'ts', 'py', 'c', 'cpp',
  'jpg', 'jpeg', 'png', 'gif', 'webp',
];

const MAX_FILE_SIZE = 512 * 1024 * 1024;

export const isOpenAIUploadable = (filename: string): boolean => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  return ALLOWED_EXTENSIONS.includes(ext);
};

export const getMimeType = (filename: string): string => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  const mimeMap: Record<string, string> = {
    pdf: 'application/pdf',
    txt: 'text/plain',
    csv: 'text/csv',
    json: 'application/json',
    jsonl: 'application/jsonl',
    doc: 'application/msword',
    docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    xls: 'application/vnd.ms-excel',
    xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    ppt: 'application/vnd.ms-powerpoint',
    pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    md: 'text/markdown',
    html: 'text/html',
    css: 'text/css',
    js: 'text/javascript',
    ts: 'text/typescript',
    py: 'text/x-python',
    c: 'text/x-c',
    cpp: 'text/x-c++',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
  };
  return mimeMap[ext] || 'application/octet-stream';
};

const validateFile = async (fileUri: string, filename: string): Promise<void> => {
  const ext = filename.toLowerCase().split('.').pop() || '';
  if (!ALLOWED_EXTENSIONS.includes(ext)) {
    throw new Error(`Unsupported file type: .${ext}`);
  }

  const info = await FileSystem.getInfoAsync(fileUri, { size: true });
  if (!info.exists) {
    throw new Error('File not found');
  }
  if (info.size && info.size > MAX_FILE_SIZE) {
    throw new Error('File exceeds 512MB limit');
  }
};

class OpenAIFileAdapterClass {
  private async getAuth(provider: string): Promise<{ apiKey: string; baseUrl: string }> {
    if (!isRemoteProviderOffered(provider)) {
      throw new Error('This model is not available.');
    }
    const apiKey = await onlineModelService.getApiKey(provider);
    if (!apiKey) {
      throw new Error(`${userFacingApiName()} key not found`);
    }
    const baseUrl = await onlineModelService.getBaseUrl(provider);
    rejectBlockedEndpoint(baseUrl);
    return { apiKey, baseUrl };
  }

  async upload(
    fileUri: string,
    filename: string,
    purpose: FilePurpose = 'assistants',
    provider = 'chatgpt'
  ): Promise<OpenAIFile> {
    await validateFile(fileUri, filename);
    const { apiKey, baseUrl } = await this.getAuth(provider);

    const mimeType = getMimeType(filename);

    const formData = new FormData();
    formData.append('purpose', purpose);
    formData.append('file', {
      uri: fileUri,
      name: filename,
      type: mimeType,
    } as any);

    const response = await fetch(`${baseUrl}/files`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}` },
      body: formData,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`File upload failed: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    return {
      id: data.id,
      object: data.object,
      bytes: data.bytes,
      filename: data.filename,
      purpose: data.purpose,
      createdAt: data.created_at,
      status: data.status,
    };
  }

  async list(provider = 'chatgpt'): Promise<OpenAIFile[]> {
    const { apiKey, baseUrl } = await this.getAuth(provider);

    const response = await fetch(`${baseUrl}/files`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      throw new Error(`Failed to list files: ${response.status}`);
    }

    const data = await response.json();
    return (data.data || []).map((f: any) => ({
      id: f.id,
      object: f.object,
      bytes: f.bytes,
      filename: f.filename,
      purpose: f.purpose,
      createdAt: f.created_at,
      status: f.status,
    }));
  }

  async remove(fileId: string, provider = 'chatgpt'): Promise<void> {
    const { apiKey, baseUrl } = await this.getAuth(provider);

    const response = await fetch(`${baseUrl}/files/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${apiKey}` },
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Failed to delete file: ${response.status} - ${errText}`);
    }
  }

  async getContent(fileId: string, provider = 'chatgpt'): Promise<string> {
    const { apiKey, baseUrl } = await this.getAuth(provider);

    const response = await fetch(
      `${baseUrl}/files/${encodeURIComponent(fileId)}/content`,
      { headers: { Authorization: `Bearer ${apiKey}` } }
    );

    if (!response.ok) {
      throw new Error(`Failed to get file content: ${response.status}`);
    }

    return response.text();
  }
}

export const openAIFileAdapter = new OpenAIFileAdapterClass();
