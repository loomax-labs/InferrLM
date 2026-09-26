import React, { useCallback, useEffect, useMemo, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';

import { ModelWarningDialog } from '../components/model/ModelWarningDialog';
import { DownloadableModel } from '../components/model/DownloadableModelItem';
import { onboardingStore } from '../onboarding/OnboardingStore';
import {
  whatHappensNextLesson,
  type OnboardingProfile as LessonProfile,
} from '../onboarding/lessons';
import {
  recommendModels,
  getModelDownloadSizeBytes,
  type RecommendDeviceContext,
  type RecommendedModel,
} from '../onboarding/recommendModels';
import { startCuratedDownloads } from '../onboarding/startCuratedDownloads';
import type { ExpertiseLevel, OnboardingIntentId } from '../onboarding/types';
import { checkBeforeDownload } from '../utils/storageUtils';
import { useT } from '../i18n';
import { OnboardingShell } from './onboarding/OnboardingShell';
import { ProfileStep, type ProfilePhase } from './onboarding/ProfileStep';
import { ModelStep } from './onboarding/ModelStep';
import { ConfirmStep } from './onboarding/ConfirmStep';
import { NextStepView } from './onboarding/NextStep';
import TuneStep from './onboarding/TuneStep';

/** Experienced users: optional inference tuning after model pick, before confirm. */
export const ONBOARDING_INCLUDE_TUNE_STEP = true;

export type OnboardingStepId =
  | 'welcome'
  | 'expertise'
  | 'intents'
  | 'models'
  | 'tune'
  | 'confirm'
  | 'next';

export const ONBOARDING_TUNE_STEP_ID: OnboardingStepId = 'tune';
export const ONBOARDING_TUNE_INSERT_AFTER: OnboardingStepId = 'models';

export type TuneStepIntegration = {
  stepId: typeof ONBOARDING_TUNE_STEP_ID;
  insertAfter: typeof ONBOARDING_TUNE_INSERT_AFTER;
  enabledFlag: 'ONBOARDING_INCLUDE_TUNE_STEP';
  expertise: ExpertiseLevel;
  propsHint: 'TuneStep onContinue/onSkip; selected model names from onboarding state';
};

export const TUNE_STEP_INTEGRATION: TuneStepIntegration = {
  stepId: ONBOARDING_TUNE_STEP_ID,
  insertAfter: ONBOARDING_TUNE_INSERT_AFTER,
  enabledFlag: 'ONBOARDING_INCLUDE_TUNE_STEP',
  expertise: 'experienced',
  propsHint: 'TuneStep onContinue/onSkip; selected model names from onboarding state',
};

function toLessonProfile(
  expertise: ExpertiseLevel,
  intents: OnboardingIntentId[],
): LessonProfile {
  return { expertise, intents };
}

function buildStepIds(expertise: ExpertiseLevel): OnboardingStepId[] {
  const steps: OnboardingStepId[] = ['welcome', 'expertise', 'intents', 'models'];
  if (ONBOARDING_INCLUDE_TUNE_STEP && expertise === 'experienced') {
    steps.push('tune');
  }
  steps.push('confirm', 'next');
  return steps;
}

function stepTitle(stepId: OnboardingStepId): string {
  if (stepId === 'welcome') return 'Welcome';
  if (stepId === 'expertise') return 'Experience with local models';
  if (stepId === 'intents') return 'What you intend to use it for';
  if (stepId === 'models') return 'Suggested models';
  if (stepId === 'tune') return 'Generation settings';
  if (stepId === 'confirm') return 'Confirm download';
  if (stepId === 'next') return 'What happens next';
  return 'Setup';
}

function profilePhase(stepId: OnboardingStepId): ProfilePhase | null {
  if (stepId === 'welcome' || stepId === 'expertise' || stepId === 'intents') {
    return stepId;
  }
  return null;
}

export default function OnboardingScreen() {
  const t = useT();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [stepIndex, setStepIndex] = useState(0);
  const [expertise, setExpertise] = useState<ExpertiseLevel>('new');
  const [intents, setIntents] = useState<OnboardingIntentId[]>(['chat']);
  const [selectedNames, setSelectedNames] = useState<string[]>([]);
  const [recommendations, setRecommendations] = useState<RecommendedModel[]>([]);
  const [downloadStarted, setDownloadStarted] = useState(false);
  const [storageOk, setStorageOk] = useState(true);
  const [storageMessage, setStorageMessage] = useState<string | undefined>();
  const [showWarning, setShowWarning] = useState(false);
  const [freeDiskBytes, setFreeDiskBytes] = useState(8 * 1024 ** 3);

  const stepIds = useMemo(() => buildStepIds(expertise), [expertise]);

  const currentStepId = stepIds[stepIndex] ?? 'welcome';

  const deviceContext = useMemo((): RecommendDeviceContext => {
    return {
      totalMemoryBytes: Device.totalMemory ?? 4 * 1024 ** 3,
      platform: Platform.OS === 'ios' ? 'ios' : 'android',
      freeDiskBytes,
    };
  }, [freeDiskBytes]);

  useEffect(() => {
    import('../utils/storageUtils').then(({ getStorageInfo }) => {
      getStorageInfo().then((info) => {
        if (info.freeSpace > 0) {
          setFreeDiskBytes(info.freeSpace);
        }
      });
    });
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const profile = await onboardingStore.load();
      if (cancelled) return;
      if (profile.expertise) {
        setExpertise(profile.expertise);
      }
      if (profile.intents.length) {
        setIntents(profile.intents);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (currentStepId !== 'models') return;
    const recs = recommendModels({ expertise, intents }, deviceContext);
    setRecommendations(recs);
    const pre = recs.filter((r) => r.preselected).map((r) => r.model.name);
    setSelectedNames(pre.length ? pre : recs.slice(0, 1).map((r) => r.model.name));
  }, [currentStepId, expertise, intents, deviceContext]);

  const selectedModels = useMemo(() => {
    const byName = new Map(recommendations.map((r) => [r.model.name, r.model]));
    return selectedNames.map((name) => byName.get(name)).filter(Boolean) as DownloadableModel[];
  }, [recommendations, selectedNames]);

  const refreshStorageCheck = useCallback(async () => {
    const total = selectedModels.reduce((sum, m) => sum + getModelDownloadSizeBytes(m), 0);
    if (total === 0) {
      setStorageOk(true);
      setStorageMessage(undefined);
      return;
    }
    const result = await checkBeforeDownload(total);
    setStorageOk(result.ok);
    setStorageMessage(result.msg);
  }, [selectedModels]);

  useEffect(() => {
    if (currentStepId === 'confirm') {
      refreshStorageCheck();
    }
  }, [currentStepId, refreshStorageCheck]);

  const finishToTabs = useCallback(async () => {
    await onboardingStore.markComplete({
      completed: true,
      skipped: false,
      expertise,
      intents,
      selectedModelNames: selectedNames,
      lessonIds: [],
      completedAt: new Date().toISOString(),
    });
    router.replace('/(tabs)');
  }, [expertise, intents, router, selectedNames]);

  const handleSkip = useCallback(async () => {
    await onboardingStore.markSkipped();
    router.replace('/(tabs)');
  }, [router]);

  const handleBack = () => {
    if (stepIndex > 0) {
      setStepIndex(stepIndex - 1);
    }
  };

  const toggleIntent = (intent: OnboardingIntentId) => {
    setIntents((prev) =>
      prev.includes(intent) ? prev.filter((i) => i !== intent) : [...prev, intent],
    );
  };

  const toggleModel = (name: string) => {
    if (expertise === 'new') {
      setSelectedNames([name]);
      return;
    }
    setSelectedNames((prev) =>
      prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name],
    );
  };

  const runDownloadsAfterWarning = async () => {
    const started = await startCuratedDownloads(selectedModels);
    setDownloadStarted(started > 0);
    setStepIndex((idx) => Math.min(idx + 1, stepIds.length - 1));
  };

  const handleConfirmContinue = async () => {
    if (selectedModels.length === 0) {
      setDownloadStarted(false);
      setStepIndex((idx) => Math.min(idx + 1, stepIds.length - 1));
      return;
    }
    if (!storageOk) {
      return;
    }
    try {
      const hideWarning = await AsyncStorage.getItem('hideModelWarning');
      if (hideWarning !== 'true') {
        setShowWarning(true);
        return;
      }
    } catch {
      setShowWarning(true);
      return;
    }
    await runDownloadsAfterWarning();
  };

  const handleContinue = async () => {
    const phase = profilePhase(currentStepId);
    if (phase === 'expertise' && !expertise) {
      return;
    }
    if (phase === 'intents' && intents.length === 0) {
      return;
    }
    if (currentStepId === 'confirm') {
      await handleConfirmContinue();
      return;
    }
    if (currentStepId === 'next') {
      await finishToTabs();
      return;
    }
    setStepIndex((idx) => Math.min(idx + 1, stepIds.length - 1));
  };

  const continueDisabled = (() => {
    const phase = profilePhase(currentStepId);
    if (phase === 'expertise' && !expertise) return true;
    if (phase === 'intents' && intents.length === 0) return true;
    if (currentStepId === 'confirm' && selectedModels.length > 0 && !storageOk) return true;
    return false;
  })();

  const lessonProfile = toLessonProfile(expertise, intents);

  const nextBody =
    currentStepId === 'next'
      ? whatHappensNextLesson(lessonProfile, downloadStarted).body
      : '';

  const licenseLink = selectedModels[0]?.licenseLink;

  if (loading) {
    return null;
  }

  if (currentStepId === 'tune' && ONBOARDING_INCLUDE_TUNE_STEP) {
    return (
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom']}>
        <TuneStep
          selectedModels={selectedModels}
          onContinue={() => setStepIndex((idx) => Math.min(idx + 1, stepIds.length - 1))}
          onSkip={() => setStepIndex((idx) => Math.min(idx + 1, stepIds.length - 1))}
        />
      </SafeAreaView>
    );
  }

  return (
    <>
      <OnboardingShell
        title={
          currentStepId === 'expertise'
            ? t('onboarding.expertiseTitle')
            : currentStepId === 'intents'
              ? t('onboarding.intentsTitle')
              : stepTitle(currentStepId)
        }
        stepIndex={stepIndex}
        stepCount={stepIds.length}
        onBack={stepIndex > 0 ? handleBack : undefined}
        onSkip={handleSkip}
        onContinue={handleContinue}
        continueDisabled={continueDisabled}
        continueLabel={
          currentStepId === 'confirm'
            ? selectedModels.length
              ? 'Start download'
              : 'Continue'
            : currentStepId === 'next'
              ? 'Open Chat'
              : 'Continue'
        }
      >
        {profilePhase(currentStepId) ? (
          <ProfileStep
            phase={profilePhase(currentStepId)!}
            expertise={expertise}
            intents={intents}
            onSelectExpertise={setExpertise}
            onToggleIntent={toggleIntent}
          />
        ) : null}
        {currentStepId === 'models' ? (
          <ModelStep
            expertise={expertise}
            recommendations={recommendations}
            selectedNames={selectedNames}
            onToggle={toggleModel}
          />
        ) : null}
        {currentStepId === 'confirm' ? (
          <ConfirmStep
            expertise={expertise}
            models={selectedModels}
            storageOk={storageOk}
            storageMessage={storageMessage}
          />
        ) : null}
        {currentStepId === 'next' ? <NextStepView body={nextBody} /> : null}
      </OnboardingShell>

      <ModelWarningDialog
        visible={showWarning}
        licenseLink={licenseLink}
        onAccept={async (dontShowAgain) => {
          if (dontShowAgain) {
            await AsyncStorage.setItem('hideModelWarning', 'true');
          }
          setShowWarning(false);
          await runDownloadsAfterWarning();
        }}
        onCancel={() => {
          setShowWarning(false);
        }}
      />
    </>
  );
}

export const ONBOARDING_STEP_IDS: OnboardingStepId[] = [
  'welcome',
  'expertise',
  'intents',
  'models',
  ONBOARDING_TUNE_STEP_ID,
  'confirm',
  'next',
];
