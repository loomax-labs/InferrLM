import { onlineModelService } from '../OnlineModelService';
import { isMainlandChina, isRemoteProviderOffered, rejectBlockedEndpoint, userFacingApiName } from '../regionPolicy';
import { fs as FileSystem } from '../fs';

export type ImageSize = '1024x1024' | '1024x1792' | '1792x1024' | '256x256' | '512x512';
export type ImageQuality = 'standard' | 'hd' | 'low' | 'medium' | 'high' | 'auto';
export type ImageStyle = 'vivid' | 'natural';

export type ImageGenOptions = {
  model?: string;
  size?: ImageSize;
  quality?: ImageQuality;
  style?: ImageStyle;
  n?: number;
};

export type GeneratedImage = {
  url?: string;
  b64Json?: string;
  revisedPrompt?: string;
  localUri?: string;
};

class OpenAIImageAdapterClass {
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

  async generate(
    prompt: string,
    options: ImageGenOptions = {},
    provider = 'chatgpt'
  ): Promise<GeneratedImage> {
    if (!prompt || prompt.trim().length === 0) {
      throw new Error('Prompt cannot be empty');
    }

    const { apiKey, baseUrl } = await this.getAuth(provider);
    const model = options.model || (isMainlandChina() ? '' : 'gpt-image-1');
    if (!model) {
      throw new Error('Set a model name in Settings.');
    }
    const size = options.size || '1024x1024';
    const quality = options.quality || 'auto';
    const n = options.n || 1;

    const body: Record<string, any> = {
      model,
      prompt: prompt.trim().substring(0, 4000),
      n,
      size,
      quality,
    };

    if (options.style && model !== 'gpt-image-1') {
      body.style = options.style;
    }

    if (model === 'gpt-image-1') {
      body.output_format = 'png';
    } else {
      body.response_format = 'b64_json';
    }

    const response = await fetch(`${baseUrl}/images/generations`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errText = await response.text();
      if (response.status === 400 && errText.includes('content_policy')) {
        throw new Error('CONTENT_FILTERED: Image generation blocked by content policy.');
      }
      throw new Error(`Image generation failed: ${response.status} - ${errText}`);
    }

    const data = await response.json();
    const imageData = data.data?.[0];
    if (!imageData) {
      throw new Error('No image returned from API');
    }

    const result: GeneratedImage = {
      revisedPrompt: imageData.revised_prompt,
    };

    if (imageData.b64_json) {
      result.b64Json = imageData.b64_json;
      result.localUri = await this.saveBase64Image(imageData.b64_json);
    } else if (imageData.url) {
      result.url = imageData.url;
      result.localUri = await this.downloadImage(imageData.url);
    }

    return result;
  }

  private async saveBase64Image(b64: string): Promise<string> {
    const dir = `${FileSystem.cacheDirectory}generated_images/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const filename = `img_${Date.now()}.png`;
    const path = `${dir}${filename}`;

    const binaryStr = atob(b64);
    const bytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      bytes[i] = binaryStr.charCodeAt(i);
    }

    const blob = new Blob([bytes], { type: 'image/png' });
    const reader = new FileReader();

    const dataUrl = await new Promise<string>((resolve, reject) => {
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const base64Only = dataUrl.split(',')[1];
    const { File } = await import('expo-file-system');
    const file = new File(path);
    file.create();

    const writeBytes = new Uint8Array(binaryStr.length);
    for (let i = 0; i < binaryStr.length; i++) {
      writeBytes[i] = binaryStr.charCodeAt(i);
    }
    file.write(writeBytes);

    return path;
  }

  private async downloadImage(url: string): Promise<string> {
    const dir = `${FileSystem.cacheDirectory}generated_images/`;
    await FileSystem.makeDirectoryAsync(dir, { intermediates: true });
    const filename = `img_${Date.now()}.png`;
    const path = `${dir}${filename}`;

    const response = await fetch(url);
    if (!response.ok) {
      throw new Error('Failed to download generated image');
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    const { File } = await import('expo-file-system');
    const file = new File(path);
    file.create();
    file.write(bytes);

    return path;
  }
}

export const openAIImageAdapter = new OpenAIImageAdapterClass();
