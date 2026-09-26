import React, { useState, useCallback, useEffect } from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { Text as PaperText } from 'react-native-paper';
import Dialog from '../Dialog';
import UnifiedModelList from './UnifiedModelList';
import CustomUrlDialog from '../CustomUrlDialog';
import { DownloadableModel } from './DownloadableModelItem';
import { StoredModel } from '../../services/ModelDownloaderTypes';
import { DOWNLOADABLE_MODELS } from '../../constants/DownloadableModels';
import { FilterOptions } from '../ModelFilter';
import { useT } from '../../i18n';

interface DownloadableModelsTabProps {
  storedModels: StoredModel[];
  downloadProgress: Record<string, any>;
  setDownloadProgress: (progress: any) => void;
  onCustomDownload: (downloadId: number, modelName: string) => void;
}

export const DownloadableModelsTab: React.FC<DownloadableModelsTabProps> = ({
  storedModels,
  downloadProgress,
  setDownloadProgress,
  onCustomDownload
}) => {
  const t = useT();
  const [customUrlDialogVisible, setCustomUrlDialogVisible] = useState(false);
  const [guidanceDialogVisible, setGuidanceDialogVisible] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    tags: [],
    modelFamilies: [],
    quantizations: [],
    runtimes: [],
  });
  const [filteredModels, setFilteredModels] = useState<DownloadableModel[]>([]);

  useEffect(() => {
    setFilteredModels(DOWNLOADABLE_MODELS);
  }, []);

  const applyFilters = useCallback((newFilters: FilterOptions) => {
    setFilters(newFilters);
    
    let filtered = [...DOWNLOADABLE_MODELS];
    
    if (newFilters.tags.length > 0) {
      const inferenceTags = ['litert', 'llama.cpp'];
      filtered = filtered.filter(model =>
        model.tags && model.tags.some(tag => newFilters.tags.includes(tag) && !inferenceTags.includes(tag))
      );
    }
    
    if (newFilters.modelFamilies.length > 0) {
      filtered = filtered.filter(model => 
        newFilters.modelFamilies.includes(model.modelFamily)
      );
    }
    
    if (newFilters.quantizations.length > 0) {
      filtered = filtered.filter(model => 
        newFilters.quantizations.includes(model.quantization)
      );
    }

    if (newFilters.runtimes.length > 0) {
      filtered = filtered.filter(model =>
        model.tags && model.tags.some(tag => newFilters.runtimes.includes(tag))
      );
    }

    setFilteredModels(filtered);
  }, []);

  const getAvailableFilterOptions = () => {
    const inferenceTags = ['litert', 'llama.cpp'];
    const allTags = [...new Set(DOWNLOADABLE_MODELS.flatMap(model => model.tags || []))].filter(t => !inferenceTags.includes(t));
    const allModelFamilies = [...new Set(DOWNLOADABLE_MODELS.map(model => model.modelFamily))];
    const allQuantizations = [...new Set(DOWNLOADABLE_MODELS.map(model => model.quantization))];
    const allRuntimes = inferenceTags.filter(t =>
      DOWNLOADABLE_MODELS.some(m => m.tags?.includes(t))
    );

    return {
      tags: allTags,
      modelFamilies: allModelFamilies,
      quantizations: allQuantizations,
      runtimes: allRuntimes,
    };
  };

  return (
    <View style={styles.container}>
      <UnifiedModelList
        curatedModels={filteredModels}
        storedModels={storedModels}
        downloadProgress={downloadProgress}
        setDownloadProgress={setDownloadProgress}
        filters={filters}
        onFiltersChange={applyFilters}
        getAvailableFilterOptions={getAvailableFilterOptions}
        onCustomUrlPress={() => setCustomUrlDialogVisible(true)}
        onGuidancePress={() => setGuidanceDialogVisible(true)}
      />

      <CustomUrlDialog
        visible={customUrlDialogVisible}
        onClose={() => setCustomUrlDialogVisible(false)}
        onDownloadStart={onCustomDownload}
      />

      <Dialog visible={guidanceDialogVisible} onDismiss={() => setGuidanceDialogVisible(false)}
        buttonText={t('models.guidanceGotIt')}
        onClose={() => setGuidanceDialogVisible(false)}
      >
          <Dialog.Title>{t('models.guidanceTitle')}</Dialog.Title>
          <Dialog.Content>
            <ScrollView style={{ maxHeight: 400 }} showsVerticalScrollIndicator={false}>
              <PaperText style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                {t('models.guidanceUnsureTitle')}
              </PaperText>
              <PaperText style={{ marginBottom: 16, lineHeight: 20 }}>
                {t('models.guidanceUnsureBody')}
              </PaperText>

              <PaperText style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                {t('models.guidanceSizeTitle')}
              </PaperText>
              <PaperText style={{ marginBottom: 16, lineHeight: 20 }}>
                {t('models.guidanceSizeBody')}
              </PaperText>

              <PaperText style={{ fontSize: 16, fontWeight: '600', marginBottom: 8 }}>
                {t('models.guidanceSmallerTitle')}
              </PaperText>
              <PaperText style={{ marginBottom: 12, lineHeight: 20 }}>
                {t('models.guidanceSmallerBody')}
              </PaperText>

              <PaperText style={{ fontWeight: '600', marginBottom: 4 }}>{t('models.guidanceQualityTitle')}</PaperText>
              <PaperText style={{ marginBottom: 12, lineHeight: 18 }}>
                {t('models.guidanceQualityBody')}
              </PaperText>

              <PaperText style={{ fontWeight: '600', marginBottom: 4 }}>{t('models.guidanceAdvancedTitle')}</PaperText>
              <PaperText style={{ marginBottom: 12, lineHeight: 18 }}>
                {t('models.guidanceAdvancedBody')}
              </PaperText>
            </ScrollView>
          </Dialog.Content>
        </Dialog>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
