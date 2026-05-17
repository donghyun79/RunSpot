import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, MaxContentWidth, Spacing } from '@/constants/theme';
import { sampleRunnerSpots } from '@/data/runspot-plan';

export default function CourseMapScreen() {
  return (
    <ThemedView style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ThemedView style={styles.header}>
          <ThemedText type="code" style={styles.eyebrow}>
            MAP FOUNDATION
          </ThemedText>
          <ThemedText type="title" style={styles.title}>
            RunSpot
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.description}>
            Native Android and iOS builds now have a map-ready course screen with current location
            support, point selection, route previews, and runner spot filtering. Web keeps this
            planning shell until a web map provider is selected.
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedText type="smallBold">Course setup</ThemedText>
          <View style={styles.modeRow}>
            <View style={[styles.modeButton, styles.modeButtonActive]}>
              <ThemedText type="smallBold" style={styles.modeButtonTextActive}>
                Set Start
              </ThemedText>
            </View>
            <View style={styles.modeButton}>
              <ThemedText type="smallBold">Set Finish</ThemedText>
            </View>
          </View>
          <View style={styles.routeRow}>
            <View style={styles.startDot} />
            <ThemedText type="small" themeColor="textSecondary">
              Start from current location or a selected map point.
            </ThemedText>
          </View>
          <View style={styles.routeRow}>
            <View style={styles.finishDot} />
            <ThemedText type="small" themeColor="textSecondary">
              Finish at a destination, loop route, or return point.
            </ThemedText>
          </View>
          <View style={styles.metricRow}>
            <ThemedText type="smallBold">Route spot filtering</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              Native builds show only sample runner spots within 500 m of the selected route.
            </ThemedText>
          </View>
          <Pressable style={styles.primaryButton}>
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              Native map ready
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.spotSection}>
          <ThemedText type="smallBold">Sample runner spots</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            Add EXPO_PUBLIC_SEOUL_OPEN_DATA_KEY to load Seoul Bike station data in native builds.
          </ThemedText>
          <View style={styles.spotGrid}>
            {sampleRunnerSpots.map((spot) => (
              <ThemedView key={spot.id} type="backgroundElement" style={styles.spotCard}>
                <ThemedText type="code" style={styles.spotType}>
                  {spot.type}
                </ThemedText>
                <ThemedText type="smallBold">{spot.name}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {spot.address}
                </ThemedText>
              </ThemedView>
            ))}
          </View>
        </ThemedView>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    flexDirection: 'row',
  },
  safeArea: {
    flex: 1,
    paddingHorizontal: Spacing.four,
    gap: Spacing.four,
    paddingBottom: BottomTabInset + Spacing.three,
    maxWidth: MaxContentWidth,
  },
  header: {
    paddingTop: Spacing.six,
    gap: Spacing.two,
  },
  title: {
    fontSize: 52,
  },
  eyebrow: {
    textTransform: 'uppercase',
    color: '#2D7A46',
  },
  description: {
    maxWidth: 560,
  },
  panel: {
    gap: Spacing.three,
    padding: Spacing.four,
    borderRadius: Spacing.three,
  },
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  modeRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  modeButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: Spacing.two,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#DCE7DF',
  },
  modeButtonActive: {
    backgroundColor: '#17211B',
  },
  modeButtonTextActive: {
    color: '#FFFFFF',
  },
  startDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#2D7A46',
  },
  finishDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F36F45',
  },
  primaryButton: {
    minHeight: 48,
    borderRadius: Spacing.two,
    backgroundColor: '#17211B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#9EB8A7',
    paddingTop: Spacing.two,
    gap: Spacing.one,
  },
  primaryButtonText: {
    color: '#FFFFFF',
  },
  spotSection: {
    gap: Spacing.two,
  },
  spotGrid: {
    gap: Spacing.two,
  },
  spotCard: {
    gap: Spacing.one,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  spotType: {
    color: '#2D7A46',
    textTransform: 'uppercase',
  },
});
