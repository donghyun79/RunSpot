import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { launchPlanSteps } from '@/data/runspot-plan';
import { useRunSpotAuth } from '@/hooks/use-runspot-auth';
import { useTheme } from '@/hooks/use-theme';
import { getRunSpotCopy } from '@/services/i18n/runspot-copy';
import { getPublicSpotsWithSource, PublicSpotResult } from '@/services/spots/spot-repository';
import { PublicSpotType, RunPlanStep } from '@/types/runspot';

const copy = getRunSpotCopy();
const stageOneStepId = 'stage-1-map-location-mock-spots';
const requiredBaseSpotTypes: PublicSpotType[] = ['water', 'restroom', 'shower'];

export default function PlanScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();
  const auth = useRunSpotAuth();
  const [spotDataResult, setSpotDataResult] = useState<PublicSpotResult | null>(null);
  const [isLoadingSpotData, setIsLoadingSpotData] = useState(true);

  useEffect(() => {
    let isCurrent = true;

    async function loadSpotDataStatus() {
      setIsLoadingSpotData(true);

      try {
        const result = await getPublicSpotsWithSource();

        if (isCurrent) {
          setSpotDataResult(result);
        }
      } finally {
        if (isCurrent) {
          setIsLoadingSpotData(false);
        }
      }
    }

    loadSpotDataStatus();

    return () => {
      isCurrent = false;
    };
  }, []);

  const baseSpotCounts = useMemo(() => {
    const counts: Record<PublicSpotType, number> = {
      water: 0,
      restroom: 0,
      shower: 0,
      convenience: 0,
    };

    for (const spot of spotDataResult?.spots ?? []) {
      counts[spot.type] += 1;
    }

    return counts;
  }, [spotDataResult]);
  const hasPublishedBaseSpotData =
    spotDataResult?.source !== 'mock' &&
    requiredBaseSpotTypes.every((type) => baseSpotCounts[type] > 0);

  const contentPlatformStyle = Platform.select({
    android: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    ios: {
      paddingTop: insets.top,
      paddingLeft: insets.left,
      paddingRight: insets.right,
      paddingBottom: insets.bottom,
    },
    web: {
      paddingTop: Spacing.six,
      paddingBottom: Spacing.four,
    },
  });

  function getPlanStatusLabel(step: RunPlanStep) {
    if (step.id !== stageOneStepId) {
      return copy.plan.statusLabels[step.status];
    }

    if (isLoadingSpotData) {
      return copy.plan.spotDataStatus.checkingLabel;
    }

    return hasPublishedBaseSpotData
      ? copy.plan.statusLabels.ready
      : copy.plan.spotDataStatus.missingLabel;
  }

  function renderStageOneSpotDataStatus() {
    if (isLoadingSpotData) {
      return (
        <View style={styles.dataStatusBox}>
          <ActivityIndicator color={theme.textSecondary} />
          <ThemedText type="small" themeColor="textSecondary">
            {copy.plan.spotDataStatus.checkingDescription}
          </ThemedText>
        </View>
      );
    }

    return (
      <View style={styles.dataStatusBox}>
        <ThemedText type="smallBold">
          {hasPublishedBaseSpotData
            ? copy.plan.spotDataStatus.readyTitle
            : copy.plan.spotDataStatus.missingTitle}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {copy.plan.spotDataStatus.summary(
            copy.plan.spotDataStatus.sourceLabels[spotDataResult?.source ?? 'mock'],
            baseSpotCounts.water,
            baseSpotCounts.restroom,
            baseSpotCounts.shower
          )}
        </ThemedText>
        {!hasPublishedBaseSpotData ? (
          <ThemedText type="small" style={styles.warningText}>
            {copy.plan.spotDataStatus.missingHelp}
          </ThemedText>
        ) : null}
      </View>
    );
  }

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">{copy.plan.title}</ThemedText>
          <ThemedText themeColor="textSecondary">{copy.plan.description}</ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.authCard}>
          <View style={styles.authTextGroup}>
            <ThemedText type="smallBold">{copy.auth.statusTitle}</ThemedText>
            {auth.isLoading ? (
              <ThemedText type="small" themeColor="textSecondary">
                {copy.auth.checking}
              </ThemedText>
            ) : auth.session ? (
              <ThemedText type="small" themeColor="textSecondary">
                {copy.auth.signedIn(auth.session.profile.nickname)}
              </ThemedText>
            ) : auth.isConfigured ? (
              <ThemedText type="small" themeColor="textSecondary">
                {copy.auth.configured}
              </ThemedText>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                {copy.auth.unconfigured}
              </ThemedText>
            )}
            {auth.errorMessage ? (
              <ThemedText type="small" style={styles.errorText}>
                {auth.errorMessage}
              </ThemedText>
            ) : null}
          </View>

          <Pressable
            disabled={auth.isLoading || auth.isWorking || !auth.isConfigured}
            onPress={auth.session ? auth.signOut : auth.signInAsGuest}
            style={({ pressed }) => [
              styles.authButton,
              { backgroundColor: theme.text },
              (pressed || auth.isWorking) && styles.pressed,
              (auth.isLoading || !auth.isConfigured) && styles.disabled,
            ]}>
            {auth.isWorking ? (
              <ActivityIndicator color={theme.background} />
            ) : (
              <ThemedText type="smallBold" style={[styles.authButtonText, { color: theme.background }]}>
                {auth.session ? copy.auth.signOut : copy.auth.signIn}
              </ThemedText>
            )}
          </Pressable>
        </ThemedView>

        <View style={styles.planList}>
          {launchPlanSteps.map((step, index) => (
            <ThemedView key={step.id} type="backgroundElement" style={styles.planCard}>
              <View style={styles.planTopRow}>
                <ThemedText type="code" style={styles.planNumber}>
                  {String(index + 1).padStart(2, '0')}
                </ThemedText>
                <ThemedText
                  type="code"
                  style={[
                    styles.status,
                    step.id === stageOneStepId &&
                      !isLoadingSpotData &&
                      !hasPublishedBaseSpotData &&
                      styles.statusWarning,
                  ]}>
                  {getPlanStatusLabel(step)}
                </ThemedText>
              </View>
              <ThemedText type="smallBold">{step.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {step.description}
              </ThemedText>
              {step.id === stageOneStepId ? renderStageOneSpotDataStatus() : null}
            </ThemedView>
          ))}
        </View>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
  },
  contentContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  container: {
    maxWidth: MaxContentWidth,
    flexGrow: 1,
  },
  header: {
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.six,
  },
  authCard: {
    marginHorizontal: Spacing.four,
    marginBottom: Spacing.three,
    padding: Spacing.three,
    borderRadius: Spacing.two,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  authTextGroup: {
    flex: 1,
    gap: Spacing.one,
  },
  authButton: {
    minWidth: 116,
    minHeight: 44,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  authButtonText: {
    textAlign: 'center',
  },
  errorText: {
    color: '#C43D2B',
  },
  pressed: {
    opacity: 0.72,
  },
  disabled: {
    opacity: 0.42,
  },
  planList: {
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
  },
  planCard: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  planTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: Spacing.two,
  },
  planNumber: {
    color: '#2D7A46',
  },
  status: {
    color: '#F36F45',
  },
  statusWarning: {
    color: '#C43D2B',
  },
  dataStatusBox: {
    gap: Spacing.one,
    padding: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#F4FAF5',
  },
  warningText: {
    color: '#C43D2B',
  },
});
