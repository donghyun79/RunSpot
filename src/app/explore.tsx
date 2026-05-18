import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { launchPlanSteps } from '@/data/runspot-plan';
import { useRunSpotAuth } from '@/hooks/use-runspot-auth';
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
  const auth = useRunSpotAuth();

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

        <ThemedView type="backgroundElement" style={styles.authCard}>
          <View style={styles.authTextGroup}>
            <ThemedText type="smallBold">계정 상태</ThemedText>
            {auth.isLoading ? (
              <ThemedText type="small" themeColor="textSecondary">
                로그인 상태를 확인하는 중입니다.
              </ThemedText>
            ) : auth.session ? (
              <ThemedText type="small" themeColor="textSecondary">
                {auth.session.profile.nickname}로 로그인됨
              </ThemedText>
            ) : auth.isConfigured ? (
              <ThemedText type="small" themeColor="textSecondary">
                3단계 Firebase Authentication 준비가 완료되었습니다.
              </ThemedText>
            ) : (
              <ThemedText type="small" themeColor="textSecondary">
                Firebase 환경 변수를 설정하면 로그인 테스트를 시작할 수 있습니다.
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
                {auth.session ? '로그아웃' : '게스트 로그인'}
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
});
