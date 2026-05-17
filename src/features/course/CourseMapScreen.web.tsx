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
            서울 러닝 코스
          </ThemedText>
          <ThemedText type="title" style={styles.title}>
            RunSpot
          </ThemedText>
          <ThemedText themeColor="textSecondary" style={styles.description}>
            모바일 앱에서는 현재 위치, 출발지와 도착지 선택, 코스 미리보기, 주변 러너
            편의시설 필터링을 확인할 수 있습니다. 웹 화면은 지도 제공자를 정하기 전까지
            계획용 화면으로 유지합니다.
          </ThemedText>
        </ThemedView>

        <ThemedView type="backgroundElement" style={styles.panel}>
          <ThemedText type="smallBold">코스 설정</ThemedText>
          <View style={styles.modeRow}>
            <View style={[styles.modeButton, styles.modeButtonActive]}>
              <ThemedText type="smallBold" style={styles.modeButtonTextActive}>
                출발지 설정
              </ThemedText>
            </View>
            <View style={styles.modeButton}>
              <ThemedText type="smallBold">도착지 설정</ThemedText>
            </View>
          </View>
          <View style={styles.routeRow}>
            <View style={styles.startDot} />
            <ThemedText type="small" themeColor="textSecondary">
              현재 위치나 지도에서 선택한 지점을 출발지로 사용합니다.
            </ThemedText>
          </View>
          <View style={styles.routeRow}>
            <View style={styles.finishDot} />
            <ThemedText type="small" themeColor="textSecondary">
              목적지, 순환 코스 반환 지점, 귀가 시작 지점을 도착지로 설정합니다.
            </ThemedText>
          </View>
          <View style={styles.metricRow}>
            <ThemedText type="smallBold">코스 주변 편의시설</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              모바일 앱에서는 선택한 코스 500m 안의 러너 편의시설만 보여줍니다.
            </ThemedText>
          </View>
          <Pressable style={styles.primaryButton}>
            <ThemedText type="smallBold" style={styles.primaryButtonText}>
              모바일 지도 준비됨
            </ThemedText>
          </Pressable>
        </ThemedView>

        <ThemedView style={styles.spotSection}>
          <ThemedText type="smallBold">샘플 러너 편의시설</ThemedText>
          <ThemedText type="small" themeColor="textSecondary">
            EXPO_PUBLIC_SEOUL_OPEN_DATA_KEY를 추가하면 모바일 앱에서 서울시 따릉이
            대여소 데이터를 불러와 선택한 코스 주변만 보여줍니다.
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
