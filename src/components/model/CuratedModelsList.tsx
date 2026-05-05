import React from 'react';
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useTheme } from '../../context/ThemeContext';
import { theme } from '../../constants/theme';
import { getThemeAwareColor } from '../../utils/ColorUtils';
import ModelFilter, { FilterOptions } from '../ModelFilter';
import DownloadableModelList from './DownloadableModelList';
import { DownloadableModel } from './DownloadableModelItem';

interface CuratedModelsListProps {
  models: DownloadableModel[];
  litertModels: DownloadableModel[];
  storedModels: any[];
  downloadProgress: any;
  setDownloadProgress: React.Dispatch<React.SetStateAction<any>>;
  filters: FilterOptions;
  onFiltersChange: (filters: FilterOptions) => void;
  getAvailableFilterOptions: () => { tags: string[], modelFamilies: string[], quantizations: string[] };
  onGuidancePress: () => void;
  onDownload: (model: DownloadableModel) => void;
  forceRender: number;
  onFilterExpandChange: (isExpanded: boolean) => void;
}

export const CuratedModelsList: React.FC<CuratedModelsListProps> = ({
  models,
  litertModels,
  storedModels,
  downloadProgress,
  setDownloadProgress,
  filters,
  onFiltersChange,
  getAvailableFilterOptions,
  onGuidancePress,
  onDownload,
  forceRender,
  onFilterExpandChange
}) => {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];

  return (
    <>
      <ModelFilter
        onFiltersChange={onFiltersChange}
        availableTags={getAvailableFilterOptions().tags}
        availableModelFamilies={getAvailableFilterOptions().modelFamilies}
        availableQuantizations={getAvailableFilterOptions().quantizations}
        initialFilters={filters}
        onExpandChange={onFilterExpandChange}
      />
      
      <TouchableOpacity
        style={[styles.guidanceButton, { backgroundColor: themeColors.borderColor }]}
        onPress={onGuidancePress}
      >
        <View style={styles.guidanceButtonContent}>
          <MaterialCommunityIcons name="help-circle-outline" size={24} color={getThemeAwareColor('#4a0660', currentTheme)} />
          <Text style={[styles.guidanceButtonText, { color: themeColors.text }]}>
            I don't know what to download
          </Text>
        </View>
      </TouchableOpacity>

      {litertModels.length > 0 && (
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="chip" size={18} color={getThemeAwareColor('#4a0660', currentTheme)} />
            <Text style={[styles.sectionHeaderTitle, { color: themeColors.text }]}>
              LiteRT-LM Models ({litertModels.length})
            </Text>
          </View>
          <Text style={[styles.sectionSubtitle, { color: themeColors.secondaryText }]}>
            Optimized for on-device inference with LiteRT-LM
          </Text>
          <DownloadableModelList
            key={`litert-${forceRender}`}
            models={litertModels}
            storedModels={storedModels}
            downloadProgress={downloadProgress}
            setDownloadProgress={setDownloadProgress}
            onDownload={onDownload}
          />
        </View>
      )}
      
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionHeaderTitle, { color: themeColors.text }]}>
            Curated GGUF Models ({models.length})
          </Text>
        </View>
        
        <DownloadableModelList 
          key={`gguf-${forceRender}`}
          models={models}
          storedModels={storedModels}
          downloadProgress={downloadProgress}
          setDownloadProgress={setDownloadProgress}
          onDownload={onDownload}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  guidanceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  guidanceButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  guidanceButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  section: {
    marginTop: 8,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
    gap: 8,
  },
  sectionHeaderTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  sectionSubtitle: {
    fontSize: 13,
    marginBottom: 12,
    marginLeft: 2,
  },
});
