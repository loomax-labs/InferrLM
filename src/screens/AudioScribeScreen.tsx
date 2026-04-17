import * as DocumentPicker from 'expo-document-picker';
import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Clipboard,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import AppHeader from '../components/AppHeader';
import { theme } from '../constants/theme';
import { useTheme } from '../context/ThemeContext';
import { useModel } from '../context/ModelContext';
import { modelDownloader } from '../services/ModelDownloader';
import { engineService } from '../services/inference-engine-service';

const buildPrompt = (mode: 'transcribe' | 'translate') => {
  if (mode === 'translate') {
    return 'Translate this audio into clear English and return only the translated text.';
  }
  return 'Transcribe this audio faithfully and return only the transcript.';
};

export default function AudioScribeScreen() {
  const { theme: currentTheme } = useTheme();
  const themeColors = theme[currentTheme];
  const { selectedModelPath } = useModel();

  const [mode, setMode] = useState<'transcribe' | 'translate'>('transcribe');
  const [selectedAudio, setSelectedAudio] = useState<{ uri: string; name: string } | null>(null);
  const [output, setOutput] = useState('');
  const [isRunning, setIsRunning] = useState(false);

  const modelPath = engineService.getActiveModelPath() || selectedModelPath;
  const engine = useMemo(
    () => (modelPath ? engineService.getEngineForModel(modelPath) : null),
    [modelPath],
  );
  const audioSupported = engine === 'llama' || (engine === 'litert' && Platform.OS !== 'ios');

  const handlePickAudio = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['audio/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (!result.canceled && result.assets[0]) {
      setSelectedAudio({
        uri: result.assets[0].uri,
        name: result.assets[0].name || 'Audio file',
      });
    }
  };

  const handleCopy = () => {
    if (!output) {
      return;
    }
    Clipboard.setString(output);
    Alert.alert('Copied', 'Transcript copied to clipboard.');
  };

  const handleRun = async () => {
    if (!selectedAudio) {
      Alert.alert('Audio required', 'Select an audio file before running Audio Scribe.');
      return;
    }
    if (!modelPath || !engine) {
      Alert.alert('No model', 'Load a local model before using Audio Scribe.');
      return;
    }
    if (!audioSupported) {
      Alert.alert('Unsupported', 'The active engine does not support audio input on this platform.');
      return;
    }

    try {
      setIsRunning(true);
      setOutput('');

      const storedModels = await modelDownloader.getStoredModels();
      const storedEntry = storedModels.find(model => model.path === modelPath);
      if (!engineService.ready() || engineService.getActiveModelPath() !== modelPath) {
        await engineService.initModel(modelPath, undefined, storedEntry?.modelFormat);
      }

      const response = await engineService.mgr().gen(
        [
          {
            role: 'user',
            content: JSON.stringify({
              type: 'audio_upload',
              internalInstruction: `Audio URI: ${selectedAudio.uri}`,
              userContent: buildPrompt(mode),
            }),
          },
        ],
        {
          onToken: token => {
            if (token) {
              setOutput(current => current + token);
            }
          },
        },
      );

      setOutput(current => current || response);
    } catch (error) {
      Alert.alert('Audio Scribe failed', error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: themeColors.background }}>
      <AppHeader title="Audio Scribe" showBackButton showLogo={false} rightButtons={[]} />
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}> 
          <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Mode</Text>
          <View style={styles.segmentRow}>
            {(['transcribe', 'translate'] as const).map(value => {
              const active = mode === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    styles.segment,
                    {
                      backgroundColor: active ? themeColors.primary : 'transparent',
                      borderColor: active ? themeColors.primary : themeColors.secondaryText + '30',
                    },
                  ]}
                  onPress={() => setMode(value)}
                >
                  <Text style={[styles.segmentText, { color: active ? '#FFFFFF' : themeColors.text }]}>
                    {value === 'transcribe' ? 'Transcribe' : 'Translate'}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <TouchableOpacity style={[styles.uploadButton, { borderColor: themeColors.secondaryText + '30' }]} onPress={handlePickAudio}>
            <MaterialCommunityIcons name="file-music-outline" size={20} color={themeColors.text} />
            <Text style={[styles.uploadText, { color: themeColors.text }]}>
              {selectedAudio ? selectedAudio.name : 'Choose audio file'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.primaryButton, { backgroundColor: themeColors.primary }]} onPress={handleRun} disabled={isRunning}>
            {isRunning ? <ActivityIndicator color="#FFFFFF" /> : <MaterialCommunityIcons name="waveform" size={18} color="#FFFFFF" />}
            <Text style={styles.primaryButtonText}>{isRunning ? 'Processing...' : 'Run Audio Scribe'}</Text>
          </TouchableOpacity>

          <Text style={[styles.caption, { color: themeColors.secondaryText }]}>Upload-based workflow is available in this build. Recording is not wired yet.</Text>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.borderColor }]}> 
          <View style={styles.outputHeader}>
            <Text style={[styles.sectionTitle, { color: themeColors.text }]}>Output</Text>
            <TouchableOpacity style={[styles.secondaryButton, { borderColor: themeColors.secondaryText + '30' }]} onPress={handleCopy}>
              <MaterialCommunityIcons name="content-copy" size={16} color={themeColors.text} />
              <Text style={[styles.secondaryButtonText, { color: themeColors.text }]}>Copy</Text>
            </TouchableOpacity>
          </View>
          <Text style={[styles.outputText, { color: themeColors.text }]}>{output || 'Transcription or translation output will appear here.'}</Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    gap: 16,
  },
  card: {
    borderRadius: 18,
    padding: 16,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 12,
  },
  segmentRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 14,
  },
  segment: {
    flex: 1,
    minHeight: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentText: {
    fontSize: 14,
    fontWeight: '700',
  },
  uploadButton: {
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  uploadText: {
    fontSize: 15,
    fontWeight: '600',
    flex: 1,
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: 14,
    marginTop: 14,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  caption: {
    marginTop: 10,
    fontSize: 13,
  },
  outputHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    borderWidth: 1,
    borderRadius: 12,
    minHeight: 38,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  outputText: {
    fontSize: 15,
    lineHeight: 22,
    minHeight: 120,
  },
});
