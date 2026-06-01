import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { isVisionRepo, detectVisionCapabilities } from '../utils/multimodalHelpers';
import { ModelFile, ModelFormat, MLXFileGroup } from '../types/models';

interface HFModel {
  _id?: string;
  id: string;
  modelId?: string;
  author?: string;
  downloads?: number;
  likes?: number;
  lastModified?: string;
  updatedAt?: string;
  tags?: string[];
  disabled?: boolean;
  gated?: boolean | string;
  pipeline_tag?: string;
  library_name?: string;
  siblings?: ModelFile[];
  hasVision?: boolean;
  capabilities?: string[];
  modelFormat?: ModelFormat;
}

interface HFFile {
  filename: string;
  size: number;
  downloadUrl: string;
  lastModified: string;
}

interface HFModelDetails extends HFModel {
  files: HFFile[];
  description?: string;
  cardData?: any;
  modelFormat?: ModelFormat;
  mlxFileGroup?: MLXFileGroup;
}

interface SearchParams {
  query?: string;
  filter?: string;
  sort?: 'downloads' | 'likes' | 'updatedAt';
  direction?: 'asc' | 'desc';
  limit?: number;
}

class HuggingFaceService {
  private baseUrl = 'https://huggingface.co';
  private apiUrl = `${this.baseUrl}/api`;
  private token = Constants.expoConfig?.extra?.HUGGINGFACE_TOKEN;

  constructor() {
    if (!this.token) {
    }
  }

  getAccessToken(): string | undefined {
    return this.token;
  }

  private getHeaders() {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    return headers;
  }

  private async fetchModelsIndex(
    searchParams: URLSearchParams,
    filter?: string,
    strict: boolean = false
  ): Promise<HFModel[]> {
    const requestParams = new URLSearchParams(searchParams.toString());

    if (filter) {
      requestParams.set('filter', filter);
    } else {
      requestParams.delete('filter');
    }

    const response = await fetch(`${this.apiUrl}/models?${requestParams.toString()}`, {
      method: 'GET',
      headers: this.getHeaders(),
    });

    if (!response.ok) {
      if (strict) {
        const errorText = await response.text();
        throw new Error(`HuggingFace API Error ${response.status}: ${errorText || response.statusText}`);
      }

      return [];
    }

    const models = await response.json();
    return Array.isArray(models) ? models : [];
  }

  private isLiteRtFile(filename: string): boolean {
    const lower = filename.toLowerCase();
    return lower.endsWith('.litertlm') || lower.endsWith('.task');
  }

  private isDownloadableModelFile(filename: string): boolean {
    const lower = filename.toLowerCase();
    return lower.endsWith('.gguf') || this.isLiteRtFile(lower);
  }

  async searchModels(params: SearchParams = {}): Promise<HFModel[]> {
    try {
      const searchParams = new URLSearchParams();
      
      if (params.query) {
        searchParams.append('search', params.query);
      }
      
      if (params.limit) {
        searchParams.append('limit', params.limit.toString());
      } else {
        searchParams.append('limit', '20');
      }
      
      searchParams.append('full', 'true');
      searchParams.append('config', 'true');
      searchParams.append('sort', 'downloads');
      searchParams.append('direction', '-1');

      const [ggufModels, mlxModels, generalModels] = await Promise.all([
        this.fetchModelsIndex(searchParams, 'gguf', true),
        this.fetchModelsIndex(searchParams, 'mlx'),
        this.fetchModelsIndex(searchParams),
      ]);
      
      const deduped = new Map<string, HFModel>();
      [...ggufModels, ...mlxModels, ...generalModels].forEach((model: HFModel) => {
        if (!model?.id) {
          return;
        }
        const existing = deduped.get(model.id);
        if (!existing || (model.downloads || 0) > (existing.downloads || 0)) {
          deduped.set(model.id, model);
        }
      });

      const combinedModels = Array.from(deduped.values());

      const filteredModels = combinedModels.filter((model: HFModel) => {
        const tags = model.tags?.map(tag => tag.toLowerCase()) || [];
        const hasGgufTag = model.tags?.some(tag => 
          tag.toLowerCase().includes('gguf') || 
          tag.toLowerCase().includes('quantized')
        );
        const hasGgufLibrary = model.library_name === 'gguf';
        const nameHasGguf = model.id?.toLowerCase().includes('gguf');
        
        const hasMlxTag = tags.some(tag => tag.includes('mlx'));
        const hasMlxLibrary = model.library_name?.toLowerCase() === 'mlx';
        const nameHasMlx = model.id?.toLowerCase().includes('mlx');

        const hasLiteRtTag = tags.some(tag => tag.includes('litert'));
        const hasLiteRtLibrary = model.library_name?.toLowerCase().includes('litert') || false;
        const nameHasLiteRt = model.id?.toLowerCase().includes('litert');
        const hasLiteRtFile = model.siblings?.some(file => this.isLiteRtFile(file.rfilename)) || false;
        
        const isMLXModel = hasMlxTag || hasMlxLibrary || nameHasMlx;
        const isLiteRtModel = hasLiteRtTag || hasLiteRtLibrary || nameHasLiteRt || hasLiteRtFile;
        
        if (Platform.OS === 'android' && isMLXModel) {
          return false;
        }
        
        return hasGgufTag || hasGgufLibrary || nameHasGguf || isMLXModel || isLiteRtModel;
      });
      
      const sortedModels = filteredModels.sort((a, b) => {
        const downloadsA = a.downloads || 0;
        const downloadsB = b.downloads || 0;
        return downloadsB - downloadsA;
      });
      
      const modelsWithVisionDetection = this.processSearchResults(sortedModels);
      
      return modelsWithVisionDetection;
    } catch (error) {
      if (error instanceof TypeError && error.message.includes('Network request failed')) {
        throw new Error('Network connection failed. Please check your internet connection.');
      }
      throw error;
    }
  }

  async getModelFiles(modelId: string): Promise<HFFile[]> {
    try {
      const url = `${this.apiUrl}/models/${modelId}/tree/main`;
      const response = await fetch(url, {
        method: 'GET',
        headers: this.getHeaders(),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const tree = await response.json();
      
      const modelFiles = tree
        .filter((item: any) => item.type === 'file')
        .map((file: any) => ({
          filename: file.path,
          size: file.size || 0,
          downloadUrl: `${this.baseUrl}/${modelId}/resolve/main/${file.path}`,
          lastModified: file.lastModified || new Date().toISOString(),
        }));

      const modelFormat = this.detectModelType(modelId, modelFiles);
      
      if (modelFormat === ModelFormat.MLX) {
        return modelFiles;
      }

      return modelFiles.filter((file: HFFile) => this.isDownloadableModelFile(file.filename));
    } catch (error) {
      throw error;
    }
  }

  async getModelDetails(modelId: string): Promise<HFModelDetails> {
    try {
      const [modelResponse, files] = await Promise.all([
        fetch(`${this.apiUrl}/models/${modelId}`, {
          method: 'GET',
          headers: this.getHeaders(),
        }),
        this.getModelFiles(modelId)
      ]);

      if (!modelResponse.ok) {
        throw new Error(`HTTP ${modelResponse.status}: ${modelResponse.statusText}`);
      }

      const model = await modelResponse.json();
      
      const modelFiles: ModelFile[] = files.map(f => ({
        rfilename: f.filename,
        size: f.size,
        url: f.downloadUrl
      }));
      
      const modelFormat = this.detectModelType(modelId, files, model.tags);
      const hasVision = isVisionRepo(modelFiles);
      const capabilities = hasVision ? ['vision', 'text'] : ['text'];
      
      const mlxFileGroup = modelFormat === ModelFormat.MLX 
        ? this.getRequiredMLXFiles(files)
        : undefined;
      
      return {
        ...model,
        files,
        hasVision,
        capabilities,
        modelFormat,
        mlxFileGroup,
      };
    } catch (error) {
      throw error;
    }
  }

  getDownloadUrl(modelId: string, filename: string): string {
    return `${this.baseUrl}/${modelId}/resolve/main/${filename}`;
  }

  formatModelSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  extractQuantization(filename: string): string {
    const quantMatches = filename.match(/[qQ](\d+)_[kK]?[mM]?(\d*)/);
    if (quantMatches) {
      return `Q${quantMatches[1]}${quantMatches[2] ? `_K_M` : ''}`;
    }
    
    const f16Match = filename.match(/f16/i);
    if (f16Match) return 'F16';
    
    const f32Match = filename.match(/f32/i);
    if (f32Match) return 'F32';
    
    return 'Unknown';
  }

  detectModelType(modelId: string, files: HFFile[], tags?: string[]): ModelFormat {
    const hasConfigJson = files.some(f => f.filename === 'config.json');
    const hasTokenizerJson = files.some(f => f.filename === 'tokenizer.json');
    const hasSafetensors = files.some(f => f.filename.endsWith('.safetensors'));
    const hasWeightsNpz = files.some(f => f.filename.endsWith('.npz'));
    const hasGguf = files.some(f => f.filename.endsWith('.gguf'));
    const hasLiteRt = files.some(f => this.isLiteRtFile(f.filename));
    
    const repoName = modelId.toLowerCase();
    const repoNameContainsMlx = repoName.includes('mlx') || repoName.includes('mlx-community');
    const tagsContainMlx = Boolean(tags?.some(tag => tag.toLowerCase().includes('mlx')));
    const hasMlxStructure = hasConfigJson && hasTokenizerJson && (hasSafetensors || hasWeightsNpz);
    const hasLikelyMlxSignals = (tagsContainMlx || repoNameContainsMlx) && (hasSafetensors || hasWeightsNpz || hasConfigJson);
    
    if ((hasMlxStructure || hasLikelyMlxSignals) && !hasGguf && !hasLiteRt) {
      return ModelFormat.MLX;
    }

    if (hasLiteRt) {
      return ModelFormat.LITERT;
    }
    
    if (hasGguf) {
      return ModelFormat.GGUF;
    }
    
    return ModelFormat.UNKNOWN;
  }

  getRequiredMLXFiles(files: HFFile[]): MLXFileGroup {
    const required: ModelFile[] = [];
    const optional: ModelFile[] = [];
    let totalSize = 0;
    let isSharded = false;

    const configFiles: HFFile[] = [];
    const tokenizerJsonFiles: HFFile[] = [];
    const tokenizerModelFiles: HFFile[] = [];
    const tokenizerConfigFiles: HFFile[] = [];

    const pushRequired = (file: HFFile) => {
      const fileData: ModelFile = {
        rfilename: file.filename,
        size: file.size,
        url: file.downloadUrl,
      };

      required.push(fileData);
      totalSize += file.size;
    };

    files.forEach(file => {
      const baseName = file.filename.split('/').pop()?.toLowerCase() || file.filename.toLowerCase();

      if (baseName === 'config.json') {
        configFiles.push(file);
        return;
      }

      if (baseName === 'tokenizer.json') {
        tokenizerJsonFiles.push(file);
        return;
      }

      if (baseName === 'tokenizer.model') {
        tokenizerModelFiles.push(file);
        return;
      }

      if (baseName === 'tokenizer_config.json') {
        tokenizerConfigFiles.push(file);
        return;
      }

      if (file.filename.endsWith('.safetensors') || file.filename.endsWith('.npz')) {
        pushRequired(file);
        if (file.filename.match(/model-\d+-of-\d+\.safetensors/)) {
          isSharded = true;
        }
      } else if (file.filename === 'generation_config.json' || 
                 file.filename === 'preprocessor_config.json' ||
                 file.filename === 'special_tokens_map.json') {
        const fileData: ModelFile = {
          rfilename: file.filename,
          size: file.size,
          url: file.downloadUrl,
        };
        optional.push(fileData);
      }
    });

    configFiles.forEach(pushRequired);

    if (tokenizerJsonFiles.length > 0) {
      tokenizerJsonFiles.forEach(pushRequired);
    } else {
      tokenizerModelFiles.forEach(pushRequired);
    }

    tokenizerConfigFiles.forEach(pushRequired);

    return {
      required,
      optional,
      totalSize,
      isSharded,
    };
  }

  private processSearchResults(models: HFModel[]): HFModel[] {
    return models.map(model => {
      const allSiblings = model.siblings || [];
      const siblingsWithUrl = this.addDownloadUrls(model.id, allSiblings);
      const hasVision = isVisionRepo(siblingsWithUrl);
      const filteredDownloadableSiblings = this.filterDownloadableFiles(allSiblings);
      const downloadableSiblingsWithUrl = this.addDownloadUrls(model.id, filteredDownloadableSiblings);
      const capabilities = hasVision ? ['vision', 'text'] : ['text'];
      
      const hfFiles = allSiblings.map(s => ({
        filename: s.rfilename,
        size: s.size || 0,
        downloadUrl: s.url || '',
        lastModified: new Date().toISOString(),
      }));
      const modelFormat = this.detectModelType(model.id, hfFiles, model.tags);
      
      return {
        ...model,
        siblings: downloadableSiblingsWithUrl,
        hasVision,
        capabilities,
        modelFormat,
      };
    });
  }

  private filterDownloadableFiles(siblings: ModelFile[]): ModelFile[] {
    const RE_GGUF_SHARD_FILE = /^(.*?)-(\d{5})-of-(\d{5})\.gguf$/;
    
    return siblings.filter(sibling => {
      const filename = sibling.rfilename.toLowerCase();
      if (this.isLiteRtFile(filename)) {
        return true;
      }

      return filename.endsWith('.gguf') && !RE_GGUF_SHARD_FILE.test(filename);
    });
  }

  private addDownloadUrls(modelId: string, siblings: ModelFile[]): ModelFile[] {
    return siblings.map(sibling => ({
      ...sibling,
      url: `${this.baseUrl}/${modelId}/resolve/main/${sibling.rfilename}`,
    }));
  }


  validateModelUrl(url: string): boolean {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname === 'huggingface.co' && 
             this.isDownloadableModelFile(urlObj.pathname);
    } catch {
      return false;
    }
  }
}

export const huggingFaceService = new HuggingFaceService();
export type { HFModel, HFFile, HFModelDetails, SearchParams };
