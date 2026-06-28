import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, useWindowDimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { theme } from '../constants/theme';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import MlxIcon from './icons/MlxIcon';
import { HFModelDetails, HFFile } from '../services/HuggingFaceService';
import { huggingFaceService } from '../services/HuggingFaceService';
import { ModelFormat } from '../types/models';
import { OverlayHost } from '../services/adapters/ModalOverlayAdapter';

interface ModelFilesDialogProps {
  visible: boolean;
  onClose: () => void;
  modelDetails: HFModelDetails | null;
  isLoading?: boolean;
  loadingModelId?: string | null;
  onDownloadFile: (filename: string, downloadUrl: string) => Promise<void>;
  onDownloadMLXModel?: (modelId: string, files: Array<{ filename: string; downloadUrl: string; size: number }>) => Promise<void>;
  isDownloading?: boolean;
}

export default function ModelFilesDialog({
  visible,
  onClose,
  modelDetails,
  isLoading = false,
  loadingModelId = null,
  onDownloadFile,
  onDownloadMLXModel,
  isDownloading = false,
}: ModelFilesDialogProps) {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const { width, height } = useWindowDimensions();
  const modalWidth = Math.min(width - 48, 560);
  const [downloadingFile, setDownloadingFile] = useState<string | null>(null);
  const [downloadingMLXPackage, setDownloadingMLXPackage] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<Set<string>>(new Set());
  const [downloadingSelected, setDownloadingSelected] = useState(false);

  useEffect(() => {
    if (visible && modelDetails && modelDetails.modelFormat === ModelFormat.MLX && modelDetails.mlxFileGroup) {
      const requiredFilenames = modelDetails.mlxFileGroup.required.map(f => f.rfilename);
      setSelectedFiles(new Set(requiredFilenames));
    } else if (!visible) {
      setSelectedFiles(new Set());
    }
  }, [visible, modelDetails]);

  const isMLXModel = modelDetails?.modelFormat === ModelFormat.MLX;
  const isGGUFModel = modelDetails?.modelFormat === ModelFormat.GGUF;
  const showLoading = isLoading && !modelDetails;

  const toggleFileSelection = (filename: string) => {
    setSelectedFiles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(filename)) {
        newSet.delete(filename);
      } else {
        newSet.add(filename);
      }
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selectedFiles.size === modelDetails?.files.length) {
      setSelectedFiles(new Set());
    } else {
      setSelectedFiles(new Set(modelDetails?.files.map(f => f.filename) || []));
    }
  };

  const handleDownloadSelected = async () => {
    if (selectedFiles.size === 0 || !modelDetails) return;

    if (isMLXModel && onDownloadMLXModel) {
      setDownloadingMLXPackage(true);
      try {
        const filesToDownload = modelDetails.files
          .filter(file => selectedFiles.has(file.filename))
          .map(file => ({
            filename: file.filename,
            downloadUrl: file.downloadUrl,
            size: file.size || 0,
          }));

        await onDownloadMLXModel(modelDetails.id, filesToDownload);
      } catch (error) {
      } finally {
        setDownloadingMLXPackage(false);
      }
      return;
    }

    setDownloadingSelected(true);
    try {
      const filesToDownload = modelDetails.files.filter(f => selectedFiles.has(f.filename));
      
      for (const file of filesToDownload) {
        await handleDownload(file.filename, file.downloadUrl);
      }
    } catch (error) {
    } finally {
      setDownloadingSelected(false);
      setSelectedFiles(new Set());
    }
  };

  const handleDownload = async (filename: string, downloadUrl: string) => {
    setDownloadingFile(filename);
    try {
      await onDownloadFile(filename, downloadUrl);
    } finally {
      setDownloadingFile(null);
    }
  };

  const handleMLXBatchDownload = async () => {
    if (!modelDetails?.mlxFileGroup || !onDownloadMLXModel) return;

    setDownloadingMLXPackage(true);
    try {
      const filesToDownload = modelDetails.mlxFileGroup.required.map(file => ({
        filename: file.rfilename,
        downloadUrl: file.url || '',
        size: file.size || 0,
      }));

      await onDownloadMLXModel(modelDetails.id, filesToDownload);
    } catch (error) {
    } finally {
      setDownloadingMLXPackage(false);
    }
  };

  if (!visible) return null;

  const isRequiredMLXFile = (filename: string): boolean => {
    if (!isMLXModel || !modelDetails.mlxFileGroup) return false;
    return modelDetails.mlxFileGroup.required.some(f => f.rfilename === filename);
  };

  const renderFileItem = (file: HFFile, index: number) => {
    if (!modelDetails) return null;

    const isCurrentlyDownloading = downloadingFile === file.filename;
    const isSelected = selectedFiles.has(file.filename);

    return (
      <View key={index} style={styles.fileItem}>
        <View style={styles.fileHeader}>
          <TouchableOpacity
            style={styles.checkboxContainer}
            onPress={() => toggleFileSelection(file.filename)}
          >
            <View style={[
              styles.checkbox,
              { borderColor: themeColors.text },
              isSelected && { backgroundColor: themeColors.primary }
            ]}>
              {isSelected && (
                <MaterialCommunityIcons name="check" size={16} color="#FFFFFF" />
              )}
            </View>
          </TouchableOpacity>
          <Text style={[styles.fileName, { color: themeColors.text }]} numberOfLines={2}>
            {file.filename}
          </Text>
        </View>

        <View style={styles.fileInfo}>
          <View style={styles.fileDetails}>
            <View style={[styles.fileChip, { backgroundColor: currentTheme === 'dark' ? 'rgba(156, 56, 192, 0.2)' : 'rgba(74, 6, 96, 0.1)' }]}>
              <MaterialCommunityIcons name="download" size={14} color={currentTheme === 'dark' ? '#C97EEA' : '#4a0660'} style={styles.chipIcon} />
              <Text style={[styles.chipText, { color: currentTheme === 'dark' ? '#C97EEA' : '#4a0660' }]}>{huggingFaceService.formatModelSize(file.size)}</Text>
            </View>
            {isGGUFModel && (
              <View style={[styles.fileChip, { backgroundColor: currentTheme === 'dark' ? 'rgba(25, 118, 210, 0.25)' : 'rgba(25, 118, 210, 0.1)' }]}>
                <MaterialCommunityIcons name="cog" size={14} color={currentTheme === 'dark' ? '#64B5F6' : '#1565C0'} style={styles.chipIcon} />
                <Text style={[styles.chipText, { color: currentTheme === 'dark' ? '#64B5F6' : '#1565C0' }]}>{huggingFaceService.extractQuantization(file.filename)}</Text>
              </View>
            )}
            {isMLXModel && isRequiredMLXFile(file.filename) && (
              <View style={[styles.fileChip, { backgroundColor: currentTheme === 'dark' ? 'rgba(0, 122, 255, 0.25)' : 'rgba(0, 122, 255, 0.1)' }]}>
                <View style={styles.chipIcon}>
                  <MlxIcon size={14} color={currentTheme === 'dark' ? '#5AC8FA' : '#007AFF'} />
                </View>
                <Text style={[styles.chipText, { color: currentTheme === 'dark' ? '#5AC8FA' : '#007AFF' }]}>Required</Text>
              </View>
            )}
            {modelDetails?.hasVision && file.filename.toLowerCase().includes('mmproj') && (
              <View style={[styles.fileChip, { backgroundColor: currentTheme === 'dark' ? 'rgba(123, 44, 191, 0.25)' : 'rgba(123, 44, 191, 0.1)' }]}>
                <MaterialCommunityIcons name="eye-settings" size={14} color={currentTheme === 'dark' ? '#C97EEA' : '#7B2CBF'} style={styles.chipIcon} />
                <Text style={[styles.chipText, { color: currentTheme === 'dark' ? '#C97EEA' : '#7B2CBF' }]}>Projection</Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            style={[
              styles.downloadButton,
              {
                backgroundColor: isCurrentlyDownloading ? themeColors.primary + '60' : themeColors.primary,
              },
            ]}
            onPress={() => handleDownload(file.filename, file.downloadUrl)}
            disabled={isCurrentlyDownloading}
          >
            {isCurrentlyDownloading ? (
              <ActivityIndicator size="small" color="#FFFFFF" style={styles.loadingIcon} />
            ) : (
              <MaterialCommunityIcons name="download" size={20} color="#FFFFFF" style={styles.buttonIcon} />
            )}
            <Text style={styles.downloadButtonText}>
              {isCurrentlyDownloading ? 'Downloading...' : 'Download'}
            </Text>
          </TouchableOpacity>
        </View>

        {index < modelDetails.files.length - 1 && (
          <View style={[styles.fileDivider, { backgroundColor: themeColors.borderColor }]} />
        )}
      </View>
    );
  };

  return (
    <OverlayHost visible={visible} onClose={onClose}>
      {showLoading ? (
        <View style={[styles.loadingCard, { backgroundColor: themeColors.background }]} pointerEvents="auto">
          <ActivityIndicator size="large" color={themeColors.primary} />
          <Text style={[styles.loadingText, { color: themeColors.text }]}>Loading model details...</Text>
          {loadingModelId ? (
            <Text style={[styles.loadingModelId, { color: themeColors.secondaryText }]} numberOfLines={2}>
              {loadingModelId}
            </Text>
          ) : null}
        </View>
      ) : modelDetails ? (
        <View style={[styles.modalContent, { backgroundColor: themeColors.background, width: modalWidth, maxHeight: height - 100 }]} pointerEvents="auto">
          <View style={styles.header}>
            <View style={styles.titleContainer}>
              <Text style={[styles.title, { color: themeColors.text }]}>{modelDetails.id}</Text>
              <View style={styles.badgeContainer}>
                {modelDetails.hasVision && (
                  <View style={styles.visionBadge}>
                    <Text style={styles.visionBadgeText}>Vision</Text>
                  </View>
                )}
                {isMLXModel && (
                  <View style={styles.mlxBadge}>
                    <Text style={styles.mlxBadgeText}>MLX</Text>
                  </View>
                )}
                {isGGUFModel && (
                  <View style={styles.ggufBadge}>
                    <Text style={styles.ggufBadgeText}>GGUF</Text>
                  </View>
                )}
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <MaterialCommunityIcons name="close" size={24} color={themeColors.text} />
            </TouchableOpacity>
          </View>

          {modelDetails.hasVision && (
            <View style={[styles.visionWarning, { backgroundColor: currentTheme === 'dark' ? 'rgba(123, 44, 191, 0.18)' : 'rgba(123, 44, 191, 0.08)', borderColor: currentTheme === 'dark' ? 'rgba(156, 56, 192, 0.45)' : 'rgba(123, 44, 191, 0.25)' }]}>
              <MaterialCommunityIcons name="eye" size={16} color="#7B2CBF" style={styles.visionWarningIcon} />
              <Text style={[styles.visionWarningText, { color: currentTheme === 'dark' ? '#C97EEA' : '#7B2CBF' }]}>
                Vision models require both a base model file and the mmproj projection file to process images.
              </Text>
            </View>
          )}

          <View style={styles.filesHeader}>
            <View style={styles.filesHeaderTop}>
              <View>
                <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Available Model Files</Text>
                <Text style={[styles.sectionSubtitle, { color: themeColors.secondaryText }]}>
                  {modelDetails.files.length} file{modelDetails.files.length !== 1 ? 's' : ''} available
                </Text>
              </View>
              <TouchableOpacity
                style={styles.selectAllButton}
                onPress={toggleSelectAll}
              >
                <Text style={[styles.selectAllText, { color: themeColors.primary }]}>
                  {selectedFiles.size === modelDetails.files.length ? 'Deselect All' : 'Select All'}
                </Text>
              </TouchableOpacity>
            </View>
            {isMLXModel && modelDetails.mlxFileGroup && onDownloadMLXModel && (
              <Text style={[styles.mlxNote, { color: themeColors.secondaryText }]}>
                Total package: {huggingFaceService.formatModelSize(modelDetails.mlxFileGroup.totalSize)} ({modelDetails.mlxFileGroup.required.length} required files)
              </Text>
            )}
          </View>

          {selectedFiles.size > 0 && (
            <TouchableOpacity
              style={[
                styles.downloadSelectedButton,
                {
                  backgroundColor: (isMLXModel ? downloadingMLXPackage : downloadingSelected)
                    ? themeColors.primary + '60'
                    : themeColors.primary,
                },
              ]}
              onPress={handleDownloadSelected}
              disabled={isMLXModel ? downloadingMLXPackage : downloadingSelected}
            >
                {(isMLXModel ? downloadingMLXPackage : downloadingSelected) ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={styles.loadingIcon} />
              ) : (
                <MaterialCommunityIcons name="download-multiple" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              )}
              <Text style={styles.downloadSelectedButtonText}>
                  {(isMLXModel ? downloadingMLXPackage : downloadingSelected)
                  ? `Downloading ${selectedFiles.size} file${selectedFiles.size > 1 ? 's' : ''}...` 
                  : isMLXModel 
                    ? `Download for MLX (${selectedFiles.size})` 
                    : `Download Selected (${selectedFiles.size})`
                }
              </Text>
            </TouchableOpacity>
          )}

          {isMLXModel && modelDetails.mlxFileGroup && onDownloadMLXModel && (
            <TouchableOpacity
              style={[
                styles.mlxBatchButton,
                {
                  backgroundColor: downloadingMLXPackage ? themeColors.primary + '60' : themeColors.primary,
                },
              ]}
              onPress={handleMLXBatchDownload}
              disabled={downloadingMLXPackage}
            >
              {downloadingMLXPackage ? (
                <ActivityIndicator size="small" color="#FFFFFF" style={styles.loadingIcon} />
              ) : (
                <MaterialCommunityIcons name="package-down" size={20} color="#FFFFFF" style={styles.buttonIcon} />
              )}
              <Text style={styles.mlxBatchButtonText}>
                {downloadingMLXPackage ? 'Downloading Complete Package...' : 'Download Complete MLX Package'}
              </Text>
            </TouchableOpacity>
          )}

          <ScrollView
            style={[styles.filesList, { maxHeight: height - 360 }]}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
          >
            {modelDetails.files.map((file, index) => renderFileItem(file, index))}
          </ScrollView>

          <View style={styles.footer}>
            <TouchableOpacity onPress={onClose} style={styles.closeActionButton}>
              <Text style={[styles.closeActionText, { color: themeColors.primary }]}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : null}
    </OverlayHost>
  );
}

const styles = StyleSheet.create({
  modalContent: {
    borderRadius: 16,
    padding: 24,
    overflow: 'hidden',
  },
  loadingCard: {
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    gap: 16,
    maxWidth: 320,
    marginHorizontal: 24,
    overflow: 'hidden',
  },
  loadingText: {
    fontSize: 16,
    fontWeight: '500',
    textAlign: 'center',
  },
  loadingModelId: {
    fontSize: 13,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  titleContainer: {
    flex: 1,
    marginRight: 12,
  },
  badgeContainer: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  visionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(123, 44, 191, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  visionBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#7B2CBF',
  },
  mlxBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(0, 122, 255, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  mlxBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#007AFF',
  },
  ggufBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: 'rgba(52, 199, 89, 0.1)',
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  ggufBadgeText: {
    fontSize: 12,
    fontWeight: '500',
    color: '#34C759',
  },
  closeButton: {
    padding: 4,
  },
  filesHeader: {
    marginBottom: 16,
  },
  filesHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  selectAllButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  selectAllText: {
    fontSize: 14,
    fontWeight: '600',
  },
  checkboxContainer: {
    marginRight: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  downloadSelectedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 12,
  },
  downloadSelectedButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    marginBottom: 4,
  },
  mlxNote: {
    fontSize: 13,
    marginTop: 8,
    fontWeight: '500',
  },
  mlxBatchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    marginBottom: 16,
  },
  mlxBatchButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  filesList: {
    marginBottom: 16,
  },
  fileItem: {
    paddingVertical: 16,
  },
  fileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  fileName: {
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  fileInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fileDetails: {
    flexDirection: 'row',
    gap: 8,
    flex: 1,
    marginRight: 12,
    flexWrap: 'wrap',
  },
  fileChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    gap: 4,
  },
  chipIcon: {
    marginRight: 2,
  },
  visionWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 16,
  },
  visionWarningIcon: {
    marginRight: 8,
    marginTop: 1,
  },
  visionWarningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontWeight: '500',
  },
  chipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  downloadButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    minWidth: 90,
  },
  buttonIcon: {
    marginRight: 4,
  },
  loadingIcon: {
    marginRight: 4,
  },
  downloadButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '600',
  },
  fileDivider: {
    height: 1,
    marginTop: 16,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(0, 0, 0, 0.08)',
  },
  closeActionButton: {
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  closeActionText: {
    fontSize: 14,
    fontWeight: '500',
  },
});
