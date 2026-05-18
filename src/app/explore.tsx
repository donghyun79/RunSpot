import React from 'react';
import { Platform, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { launchPlanSteps } from '@/data/runspot-plan';
import { useTheme } from '@/hooks/use-theme';

const statusLabels = {
  ready: '준비됨',
  next: '다음 작업',
  later: '예정',
};

export default function PlanScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const insets = {
    ...safeAreaInsets,
    bottom: safeAreaInsets.bottom + BottomTabInset + Spacing.three,
  };
  const theme = useTheme();

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

  return (
    <ScrollView
      style={[styles.scrollView, { backgroundColor: theme.background }]}
      contentInset={insets}
      contentContainerStyle={[styles.contentContainer, contentPlatformStyle]}>
      <ThemedView style={styles.container}>
        <ThemedView style={styles.header}>
          <ThemedText type="subtitle">개발 계획</ThemedText>
          <ThemedText themeColor="textSecondary">
            RunSpot은 서울 러너가 코스를 빠르게 정하고 주변 편의시설과 귀가 방법까지 확인할 수
            있도록 단계별로 완성해 갑니다.
          </ThemedText>
        </ThemedView>

        <View style={styles.planList}>
          {launchPlanSteps.map((step, index) => (
            <ThemedView key={step.id} type="backgroundElement" style={styles.planCard}>
              <View style={styles.planTopRow}>
                <ThemedText type="code" style={styles.planNumber}>
                  {String(index + 1).padStart(2, '0')}
                </ThemedText>
                <ThemedText type="code" style={styles.status}>
                  {statusLabels[step.status]}
                </ThemedText>
              </View>
              <ThemedText type="smallBold">{step.title}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {step.description}
              </ThemedText>
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
});
