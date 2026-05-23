import React, { useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { fs as FileSystem } from '../../services/fs';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import MlxIcon from '../icons/MlxIcon';
import { getThemeAwareColor, getDocumentIconColor } from '../../utils/ColorUtils';
import StoredModelItem from './StoredModelItem';
import { StoredModel } from '../../services/ModelDownloaderTypes';

const formatBytes = (bytes?: number) => {
  if (bytes === undefined || bytes === null || isNaN(bytes) || bytes === 0) return '0 B';
  try {
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    if (i < 0 || i >= sizes.length || !isFinite(bytes)) return '0 B';
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  } catch (error) {
    return '0 B';
  }
};

const getDir = (path: string) => {
  const normalized = path.replace(/\/+$|\/+$/g, '');
  const idx = normalized.lastIndexOf('/');
  return idx > 0 ? normalized.slice(0, idx) : '';
};

const getFile = (path: string) => {
  const idx = path.lastIndexOf('/');
  return idx >= 0 ? path.slice(idx + 1) : path;
};

const hasCompleteMlxPackage = (files: StoredModel[]) => {
  if (files.some(file => file.isDirectory && file.modelFormat === 'mlx')) {
    return true;
  }

  const names = new Set(files.map(file => getFile(file.path).toLowerCase()));
  const hasRequiredConfig =
    names.has('config.json') &&
    names.has('tokenizer.json') &&
    names.has('tokenizer_config.json');
  const hasWeights = files.some(file => {
    const name = getFile(file.path).toLowerCase();
    return name.endsWith('.safetensors') || name.endsWith('.npz');
  });
  return hasRequiredConfig && hasWeights;
};

interface StoredModelsTabProps {
  storedModels: StoredModel[];
  isLoading: boolean;
  isRefreshing: boolean;
  onRefresh: () => void;
  onImportModel: () => void;
  onDelete: (model: StoredModel) => void;
  onExport: (modelPath: string, modelName: string) => Promise<void>;
  onSettings: (modelPath: string, modelName: string) => void;
}

export const StoredModelsTab: React.FC<StoredModelsTabProps> = ({
  storedModels,
  isLoading,
  isRefreshing,
  onRefresh,
  onImportModel,
  onDelete,
  onExport,
  onSettings
}) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme as 'light' | 'dark'];
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());
  const [mlxGroupFiles, setMlxGroupFiles] = useState<Record<string, Array<{ path: string; name: string; size: number }>>>({});
  const [loadingGroups, setLoadingGroups] = useState<Set<string>>(new Set());

  const loadGroupFiles = async (groupPath: string) => {
    if (mlxGroupFiles[groupPath] || loadingGroups.has(groupPath)) {
      return;
    }

    setLoadingGroups(prev => new Set(prev).add(groupPath));
    try {
      const collectFiles = async (rootPath: string, currentPath: string): Promise<Array<{ path: string; name: string; size: number }>> => {
        const entries = await FileSystem.readDirectoryAsync(currentPath);
        const out: Array<{ path: string; name: string; size: number }> = [];

        for (const entry of entries) {
          const fullPath = `${currentPath}/${entry}`;
          const info = await FileSystem.getInfoAsync(fullPath, { size: true });
          if (!info.exists) {
            continue;
          }
          if ((info as any).isDirectory) {
            const nested = await collectFiles(rootPath, fullPath);
            out.push(...nested);
          } else {
            const relativePath = fullPath.startsWith(`${rootPath}/`)
              ? fullPath.slice(rootPath.length + 1)
              : entry;
            out.push({
              path: fullPath,
              name: relativePath,
              size: (info as any).size || 0,
            });
          }
        }

        return out;
      };

      const files = await collectFiles(groupPath, groupPath);
      files.sort((a, b) => a.name.localeCompare(b.name));
      setMlxGroupFiles(prev => ({ ...prev, [groupPath]: files }));
    } catch {
      setMlxGroupFiles(prev => ({ ...prev, [groupPath]: [] }));
    } finally {
      setLoadingGroups(prev => {
        const next = new Set(prev);
        next.delete(groupPath);
        return next;
      });
    }
  };

  const visibleModels = React.useMemo(() => {
    const withoutTemp = storedModels.filter(model => {
      const lowerName = model.name.toLowerCase();
      const lowerPath = model.path.toLowerCase();
      return !lowerName.startsWith('temp_mlx_') && !lowerPath.includes('/temp_mlx_');
    });

    const mlxFiles = withoutTemp.filter(model => {
      const lowerPath = model.path.toLowerCase();
      return lowerPath.includes('/models/mlx/') || model.modelFormat === 'mlx';
    });

    const mlxByDir = mlxFiles.reduce<Record<string, StoredModel[]>>((acc, model) => {
      const dir = model.isDirectory ? model.path : getDir(model.path);
      if (!dir) {
        return acc;
      }
      if (!acc[dir]) {
        acc[dir] = [];
      }
      acc[dir].push(model);
      return acc;
    }, {});

    const incompleteDirs = new Set(
      Object.entries(mlxByDir)
        .filter(([, files]) => !hasCompleteMlxPackage(files))
        .map(([dir]) => dir)
    );

    return withoutTemp.filter(model => {
      const lowerPath = model.path.toLowerCase();
      if (!lowerPath.includes('/models/mlx/')) {
        return true;
      }
      const dirKey = model.isDirectory ? model.path : getDir(model.path);
      return !incompleteDirs.has(dirKey);
    });
  }, [storedModels]);

  const isMLXModel = (model: StoredModel): boolean => {
    if (model.modelFormat === 'mlx') return true;
    if (model.modelFormat === 'gguf') return false;
    if (model.modelFormat === 'litert') return false;

    const path = model.path.toLowerCase();
    const name = model.name.toLowerCase();

    if (model.isDirectory) return true;
    if (path.includes('/huggingface/models/') || path.includes('mlx-community')) return true;
    if (name.endsWith('.safetensors') || path.endsWith('.safetensors')) return true;

    if ((name.includes('mlx') || path.includes('mlx')) &&
        (name.endsWith('.json') || path.endsWith('.json'))) {
      return true;
    }

    return false;
  };

  const toggleGroup = (groupName: string) => {
    setExpandedGroups(prev => {
      const newSet = new Set(prev);
      if (newSet.has(groupName)) {
        newSet.delete(groupName);
      } else {
        newSet.add(groupName);
      }
      return newSet;
    });
  };

  const groupMLXModels = (models: StoredModel[]): StoredModel[] => {
    const groups: { [key: string]: StoredModel[] } = {};
    const others: StoredModel[] = [];

    models.forEach(model => {
      const dirPath = model.isDirectory ? model.path : model.path.substring(0, model.path.lastIndexOf('/'));
      const dirName = dirPath.split('/').pop() || '';

      if (dirName) {
        if (!groups[dirPath]) {
          groups[dirPath] = [];
        }
        groups[dirPath].push(model);
      } else {
        others.push(model);
      }
    });

    const grouped: any[] = [];

    Object.entries(groups).forEach(([dirPath, files]) => {
      if (files.length === 1) {
        grouped.push(files[0]);
        return;
      }

      const size = files.reduce((sum, file) => sum + (file.size || 0), 0);
      const first = files[0];
      const dirName = dirPath.split('/').pop() || '';

      grouped.push({
        ...first,
        name: dirName,
        size,
        path: dirPath,
        isMLXGroup: true,
        mlxFiles: files,
        groupKey: dirPath,
      });
    });

    return [...grouped, ...others];
  };

  const mlxModels = visibleModels.filter(isMLXModel);
  const nonMlxModels = visibleModels.filter(model => !isMLXModel(model));
  const displayModels = [...nonMlxModels, ...groupMLXModels(mlxModels)];

  const StoredModelsHeader = () => (
    <View style={styles.storedModelsHeader}>
      <View style={styles.storedHeaderActions}>
        <Text style={[styles.storedHeaderTitle, { color: themeColors.text }]}>Stored Models</Text>
        <TouchableOpacity
          style={[styles.refreshButton, { backgroundColor: themeColors.borderColor }]}
          onPress={onRefresh}
          disabled={isRefreshing}
        >
          {isRefreshing ? (
            <ActivityIndicator size="small" color={getThemeAwareColor('#4a0660', currentTheme)} />
          ) : (
            <MaterialCommunityIcons name="refresh" size={20} color={themeColors.text} />
          )}
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={[styles.customUrlButton, { backgroundColor: themeColors.borderColor }]}
        onPress={onImportModel}
      >
        <View style={styles.customUrlButtonContent}>
          <View style={styles.customUrlIconContainer}>
            <MaterialCommunityIcons name="link" size={24} color={getThemeAwareColor('#4a0660', currentTheme)} />
          </View>
          <View style={styles.customUrlTextContainer}>
            <Text style={[styles.customUrlButtonTitle, { color: themeColors.text }]}>
              Import Model
            </Text>
            <Text style={[styles.customUrlButtonSubtitle, { color: themeColors.secondaryText }]}>
              Import a GGUF model from the storage
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    </View>
  );

  const renderItem = ({ item }: { item: any }) => {
    const isProjectorModel = item.name.toLowerCase().includes('mmproj') ||
                            item.name.toLowerCase().includes('.proj');
    const lowerName = item.name.toLowerCase();
    const lowerPath = item.path.toLowerCase();
    const isGGUFModel =
      item.modelFormat === 'gguf' ||
      lowerName.endsWith('.gguf') ||
      lowerPath.endsWith('.gguf');
    const rowName =
      isGGUFModel && !lowerName.endsWith('.gguf')
        ? `${item.name}.gguf`
        : item.name;
    
    const isDirectoryMlx = item.modelFormat === 'mlx' && item.isDirectory;
    const isExpandableMlx = item.isMLXGroup || isDirectoryMlx;

    if (isExpandableMlx) {
      const groupKey = item.groupKey || item.path;
      const isExpanded = expandedGroups.has(groupKey);
      const files = item.mlxFiles || mlxGroupFiles[groupKey] || [];
      const isLoadingGroup = loadingGroups.has(groupKey);
      return (
        <View style={[styles.groupContainer, { backgroundColor: themeColors.borderColor }]}>
          <TouchableOpacity
            style={styles.groupHeader}
            onPress={() => {
              if (!isExpanded) {
                void loadGroupFiles(groupKey);
              }
              toggleGroup(groupKey);
            }}
            activeOpacity={0.7}
          >
            <View style={styles.modelIconContainer}>
              <MaterialCommunityIcons
                name="file-document-outline"
                size={24}
                color={getDocumentIconColor(currentTheme)}
              />
            </View>
            <View style={styles.groupInfo}>
              <View style={styles.groupTitleRow}>
                <Text style={[styles.groupName, { color: themeColors.text }]} numberOfLines={1}>
                  {item.name}
                </Text>
              </View>
              <View style={styles.groupMetadata}>
                <MaterialCommunityIcons name="download" size={14} color={themeColors.secondaryText} />
                <Text style={[styles.metaText, { color: themeColors.secondaryText }]}>
                  {formatBytes(item.size)}
                </Text>
                <View style={[styles.mlxBadge, { backgroundColor: getThemeAwareColor('#4a0660', currentTheme) }]}>
                  <View style={styles.mlxIconWrap}>
                    <MlxIcon size={12} color="#FFFFFF" />
                  </View>
                  <Text style={styles.mlxBadgeText}>MLX</Text>
                </View>
              </View>
            </View>
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  onDelete(item);
                }}
              >
                <MaterialCommunityIcons name="delete-outline" size={20} color={getThemeAwareColor('#ff4444', currentTheme)} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  if (!isExpanded) {
                    void loadGroupFiles(groupKey);
                  }
                  toggleGroup(groupKey);
                }}
              >
                <MaterialCommunityIcons
                  name={isExpanded ? 'chevron-up' : 'chevron-down'}
                  size={20}
                  color={themeColors.text}
                />
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
          {isExpanded && (
            <View style={[styles.expandedContent, { borderTopColor: themeColors.background }]}>
              {isLoadingGroup ? (
                <View style={styles.loadingRow}>
                  <ActivityIndicator size="small" color={getThemeAwareColor('#4a0660', currentTheme)} />
                </View>
              ) : files.length === 0 ? (
                <View style={styles.loadingRow}>
                  <Text style={[styles.fileSize, { color: themeColors.secondaryText }]}>No files found</Text>
                </View>
              ) : (
                files.map((file: any) => (
                  <View key={file.path} style={styles.fileRow}>
                    <View style={styles.fileRowContent}>
                      <MaterialCommunityIcons
                        name="file-document-outline"
                        size={16}
                        color={themeColors.secondaryText}
                        style={styles.fileIcon}
                      />
                      <Text style={[styles.fileName, { color: themeColors.text }]} numberOfLines={1}>
                        {file.name}
                      </Text>
                    </View>
                    <Text style={[styles.fileSize, { color: themeColors.secondaryText }]}> 
                      {formatBytes(file.size)}
                    </Text>
                  </View>
                ))
              )}
            </View>
          )}
        </View>
      );
    }
    
    return (
      <StoredModelItem
        id={item.path}
        name={rowName}
        path={item.path}
        size={item.size}
        isProjector={isProjectorModel}
        isMLXGroup={false}
        onDelete={() => onDelete(item)}
        onExport={onExport}
        onSettings={onSettings}
      />
    );
  };

  return (
    <FlatList
      data={displayModels}
      renderItem={renderItem}
      keyExtractor={(item: any) => item.isMLXGroup ? `group-${item.groupKey}` : item.path}
      contentContainerStyle={styles.list}
      ListHeaderComponent={StoredModelsHeader}
      ListEmptyComponent={
        isLoading ? (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={getThemeAwareColor('#4a0660', currentTheme)} />
            <Text style={[styles.emptyText, { color: themeColors.secondaryText, marginTop: 16 }]}>
              Loading models...
            </Text>
          </View>
        ) : (
          <View style={styles.emptyContainer}>
            <MaterialCommunityIcons 
              name="folder-open" 
              size={48} 
              color={themeColors.secondaryText}
            />
            <Text style={[styles.emptyText, { color: themeColors.secondaryText }]}>
              No models downloaded yet. Go to the "Download Models" tab to get started.
            </Text>
          </View>
        )
      }
    />
  );
};

const styles = StyleSheet.create({
  list: {
    padding: 16,
    paddingTop: 8,
  },
  storedModelsHeader: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  storedHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  storedHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  refreshButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  customUrlButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
  },
  customUrlButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customUrlIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 6, 96, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  customUrlTextContainer: {
    flex: 1,
  },
  customUrlButtonTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  customUrlButtonSubtitle: {
    fontSize: 14,
    marginTop: 2,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 60,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 16,
    marginTop: 8,
  },
  groupContainer: {
    borderRadius: 12,
    marginBottom: 8,
    overflow: 'hidden',
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 16,
  },
  modelIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(74, 6, 96, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  groupInfo: {
    flex: 1,
    gap: 4,
  },
  groupTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  groupName: {
    fontSize: 16,
    fontWeight: '500',
    marginRight: 8,
  },
  mlxBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  mlxBadgeText: {
    color: '#FFFFFF',
    fontSize: 11,
    fontWeight: '600',
  },
  mlxIconWrap: {
    marginRight: 4,
  },
  groupMetadata: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  metaText: {
    fontSize: 13,
    marginLeft: 4,
  },
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    marginLeft: 8,
  },
  expandedContent: {
    borderTopWidth: 1,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  fileRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  fileRowContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  fileIcon: {
    marginRight: 10,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  fileSize: {
    fontSize: 13,
    fontWeight: '500',
  },
  loadingRow: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
