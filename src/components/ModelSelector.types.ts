import type { ProviderType } from '../services/ModelManagementService';

export interface StoredModel {
  name: string;
  path: string;
  size: number;
  modified: string;
  isExternal?: boolean;
  originalPath?: string;
  modelFormat?: string;
  isDirectory?: boolean;
}

export interface OnlineModel {
  id: string;
  name: string;
  provider: string;
  isOnline: true;
}

export interface AppleFoundationModel {
  id: string;
  name: string;
  provider: string;
  isAppleFoundation: true;
}

export interface MLXGroup extends StoredModel {
  isMLXGroup: true;
  mlxFiles: StoredModel[];
  groupKey: string;
}

export type Model = StoredModel | MLXGroup | OnlineModel | AppleFoundationModel;

export interface ModelSelectorRef {
  refreshModels: () => void;
}

export interface ModelSelectorProps {
  isOpen?: boolean;
  onClose?: () => void;
  preselectedModelPath?: string | null;
  isGenerating?: boolean;
  onModelSelect?: (provider: ProviderType, modelPath?: string, projectorPath?: string) => void | Promise<void>;
}

export interface SectionData {
  title: string;
  data: Model[];
}
