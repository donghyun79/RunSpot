import React from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { launchPlanSteps } from '@/data/runspot-plan';
import { useRunSpotAuth } from '@/hooks/use-runspot-auth';
import { useTheme } from '@/hooks/use-theme';
import { getRunSpotCopy } from '@/services/i18n/runspot-copy';

const copy = getRunSpotCopy();

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
                <ThemedText type="code" style={styles.status}>
                  {copy.plan.statusLabels[step.status]}
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
