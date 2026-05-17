import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { sampleRunnerSpots } from '@/data/runspot-plan';
import { RoutePreview, RunnerSpot, SpotType } from '@/types/runspot';
import { fetchSeoulRunnerSpots, hasSeoulOpenDataKey } from '@/features/spots/seoul-open-data';

import { fetchRoutePreview, filterSpotsNearRoute } from './route-service';

type LatLng = {
  latitude: number;
  longitude: number;
};

type Region = LatLng & {
  latitudeDelta: number;
  longitudeDelta: number;
};

const SEOUL_REGION: Region = {
  latitude: 37.5665,
  longitude: 126.978,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};
const CURRENT_LOCATION_DELTA = 0.018;
const MAX_SPOTS_WITHOUT_ROUTE = 80;
const SEOUL_BOUNDS = {
  minLatitude: 37.38,
  maxLatitude: 37.72,
  minLongitude: 126.76,
  maxLongitude: 127.2,
};

const MAP_HTML = `
<!doctype html>
<html>
  <head>
    <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
    <style>
      html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #EAE6D8; }
      .leaflet-control-attribution { font-size: 10px; }
      .spot-marker {
        width: 14px;
        height: 14px;
        border-radius: 7px;
        border: 2px solid #fff;
        box-shadow: 0 1px 4px rgba(0,0,0,0.28);
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
    <script>
      const map = L.map('map', { zoomControl: false }).setView([37.5665, 126.978], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; OpenStreetMap'
      }).addTo(map);

      const layers = L.layerGroup().addTo(map);

      const makeSpotIcon = (color) => L.divIcon({
        className: '',
        html: '<div class="spot-marker" style="background:' + color + '"></div>',
        iconSize: [18, 18],
        iconAnchor: [9, 9],
      });

      const pinIcon = (label, color) => L.divIcon({
        className: '',
        html: '<div style="background:' + color + '; color:#fff; border-radius:14px; padding:4px 8px; font:700 12px system-ui; box-shadow:0 1px 5px rgba(0,0,0,.3);">' + label + '</div>',
        iconSize: [52, 28],
        iconAnchor: [26, 28],
      });

      window.setRunSpotState = function (state) {
        layers.clearLayers();

        if (state.route && state.route.length > 1) {
          L.polyline(state.route.map((point) => [point.latitude, point.longitude]), {
            color: '#17211B',
            weight: 5,
            opacity: 0.86
          }).addTo(layers);
        }

        state.spots.forEach((spot) => {
          L.marker([spot.latitude, spot.longitude], { icon: makeSpotIcon(spot.color) })
            .bindPopup('<strong>' + spot.name + '</strong><br />' + (spot.detail || spot.address || ''))
            .addTo(layers);
        });

        if (state.start) {
          L.marker([state.start.latitude, state.start.longitude], { icon: pinIcon('출발', '#2D7A46') }).addTo(layers);
        }

        if (state.finish) {
          L.marker([state.finish.latitude, state.finish.longitude], { icon: pinIcon('도착', '#F36F45') }).addTo(layers);
        }

        if (state.center) {
          map.setView([state.center.latitude, state.center.longitude], state.zoom || map.getZoom(), { animate: true });
        }
      };

      window.focusRunSpotMap = function (center, zoom) {
        map.setView([center.latitude, center.longitude], zoom || map.getZoom(), { animate: true });
      };

      map.on('click', (event) => {
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'mapPress',
          latitude: event.latlng.lat,
          longitude: event.latlng.lng
        }));
      });

      window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'mapReady' }));
    </script>
  </body>
</html>
`;

const spotLabels: Record<SpotType, string> = {
  water: '급수',
  toilet: '화장실',
  shower: '샤워',
  convenience: '편의점',
  bike: '따릉이',
  transit: '대중교통',
};

const spotColors: Record<SpotType, string> = {
  water: '#208AEF',
  toilet: '#6D5BD0',
  shower: '#00A389',
  convenience: '#F36F45',
  bike: '#2D7A46',
  transit: '#17211B',
};

type PointMode = 'start' | 'finish';

function formatCoordinate(point: LatLng | null) {
  if (!point) {
    return '지도를 눌러 설정';
  }

  return `${point.latitude.toFixed(5)}, ${point.longitude.toFixed(5)}`;
}

function formatDistance(meters: number) {
  if (meters < 1000) {
    return `${Math.round(meters)} m`;
  }

  return `${(meters / 1000).toFixed(2)} km`;
}

function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));

  if (minutes < 60) {
    return `${minutes}분`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}시간 ${remainingMinutes}분`;
}

function isPointInSeoul(point: LatLng) {
  return (
    point.latitude >= SEOUL_BOUNDS.minLatitude &&
    point.latitude <= SEOUL_BOUNDS.maxLatitude &&
    point.longitude >= SEOUL_BOUNDS.minLongitude &&
    point.longitude <= SEOUL_BOUNDS.maxLongitude
  );
}

export default function CourseMapScreen() {
  const mapRef = useRef<WebView | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [selectionMode, setSelectionMode] = useState<PointMode>('finish');
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);
  const [finishPoint, setFinishPoint] = useState<LatLng | null>(null);
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
  const [runnerSpots, setRunnerSpots] = useState<RunnerSpot[]>(sampleRunnerSpots);
  const [isLoadingSpots, setIsLoadingSpots] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [spotDataMessage, setSpotDataMessage] = useState(
    hasSeoulOpenDataKey()
      ? '서울 열린데이터에서 따릉이 대여소를 불러옵니다.'
      : '서울 열린데이터 API 키가 없어 샘플 편의시설을 보여줍니다.'
  );
  const [message, setMessage] = useState('출발지를 잡으려면 위치 권한이 필요합니다.');

  const spotSummary = useMemo(
    () => Array.from(new Set(runnerSpots.map((spot) => spotLabels[spot.type]))).join(' / '),
    [runnerSpots]
  );
  const visibleRunnerSpots = useMemo(() => {
    if (routePreview) {
      return filterSpotsNearRoute(runnerSpots, routePreview.coordinates, 500);
    }

    return runnerSpots.slice(0, MAX_SPOTS_WITHOUT_ROUTE).map((spot) => ({
      ...spot,
      distanceFromRouteMeters: 0,
    }));
  }, [routePreview, runnerSpots]);
  const routeSpots = useMemo(() => {
    if (!routePreview) {
      return runnerSpots.slice(0, MAX_SPOTS_WITHOUT_ROUTE).map((spot) => ({
        ...spot,
        distanceFromRouteMeters: 0,
      }));
    }

    return filterSpotsNearRoute(runnerSpots, routePreview.coordinates, 500);
  }, [routePreview, runnerSpots]);
  const routeSourceLabel = routePreview?.source === 'osrm' ? '경로 예상' : '직선 기준';
  const routeSpotSummary = routePreview
    ? `코스 500m 안 편의시설 ${routeSpots.length}곳`
    : `${spotSummary || '편의시설'} 표시 중`;

  const focusMap = useCallback((point: LatLng, delta = CURRENT_LOCATION_DELTA) => {
    mapRef.current?.injectJavaScript(
      `window.focusRunSpotMap && window.focusRunSpotMap(${JSON.stringify(point)}, ${
        delta <= CURRENT_LOCATION_DELTA ? 15 : 12
      }); true;`
    );
  }, []);

  const syncMapState = useCallback(() => {
    const payload = {
      start: startPoint,
      finish: finishPoint,
      route: routePreview?.coordinates ?? [],
      spots: visibleRunnerSpots.map((spot) => ({
        latitude: spot.latitude,
        longitude: spot.longitude,
        name: spot.name,
        address: spot.address,
        detail: spot.detail,
        color: spotColors[spot.type],
      })),
    };

    mapRef.current?.injectJavaScript(
      `window.setRunSpotState && window.setRunSpotState(${JSON.stringify(payload)}); true;`
    );
  }, [finishPoint, routePreview, startPoint, visibleRunnerSpots]);

  useEffect(() => {
    if (isMapReady) {
      syncMapState();
    }
  }, [isMapReady, syncMapState]);

  function handleMapMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        latitude?: number;
        longitude?: number;
      };

      if (data.type === 'mapReady') {
        setIsMapReady(true);
        return;
      }

      if (
        data.type === 'mapPress' &&
        typeof data.latitude === 'number' &&
        typeof data.longitude === 'number'
      ) {
        handleMapPress({ latitude: data.latitude, longitude: data.longitude });
      }
    } catch {
      setMessage('지도 이벤트를 읽지 못했습니다. 다시 지도를 눌러주세요.');
    }
  }

  const locateRunner = useCallback(async () => {
    setIsLocating(true);
    setMessage('현재 위치를 찾는 중입니다...');

    const currentPermission = await Location.getForegroundPermissionsAsync();
    const permission =
      currentPermission.status === Location.PermissionStatus.GRANTED
        ? currentPermission
        : await Location.requestForegroundPermissionsAsync();

    if (permission.status !== Location.PermissionStatus.GRANTED) {
      setIsLocating(false);
      setMessage('위치 권한이 없어 서울시청 주변 지도를 먼저 보여드립니다.');
      return;
    }

    try {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 60_000,
        requiredAccuracy: 200,
      });
      const current = lastKnown ?? await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextPoint = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      if (!isPointInSeoul(nextPoint)) {
        focusMap(SEOUL_REGION);
        setStartPoint(null);
        setSelectionMode('start');
        setMessage(
          '현재 위치가 서울 밖으로 감지되어 서울시청 주변 지도를 보여드립니다. 지도에서 출발지를 직접 눌러주세요.'
        );
        return;
      }

      focusMap(nextPoint);
      setStartPoint(nextPoint);
      setSelectionMode('finish');
      setMessage('현재 위치를 출발지로 설정했습니다. 지도에서 도착지를 눌러주세요.');
    } catch {
      setMessage('현재 위치를 읽지 못해 서울시청 주변 지도를 먼저 보여드립니다.');
    } finally {
      setIsLocating(false);
    }
  }, [focusMap]);

  useEffect(() => {
    locateRunner();
  }, [locateRunner]);

  useEffect(() => {
    let isCurrent = true;

    async function loadRunnerSpots() {
      if (!hasSeoulOpenDataKey()) {
        setSpotDataMessage('서울 열린데이터 API 키가 없어 샘플 편의시설을 보여줍니다.');
        return;
      }

      setIsLoadingSpots(true);
      setSpotDataMessage('서울 열린데이터에서 따릉이 대여소를 불러오는 중입니다...');
      try {
        const seoulData = await fetchSeoulRunnerSpots();

        if (!isCurrent) {
          return;
        }

        if (seoulData.spots.length > 0) {
          setRunnerSpots([...sampleRunnerSpots, ...seoulData.spots]);
          setSpotDataMessage(
            `서울시 따릉이 대여소 ${seoulData.spots.length}곳을 불러왔습니다.`
          );
          return;
        }

        setSpotDataMessage('서울 데이터를 불러오지 못해 샘플 편의시설을 보여줍니다.');
      } catch {
        if (isCurrent) {
          setSpotDataMessage('서울 데이터 연결에 실패해 샘플 편의시설을 보여줍니다.');
        }
      } finally {
        if (isCurrent) {
          setIsLoadingSpots(false);
        }
      }
    }

    loadRunnerSpots();

    return () => {
      isCurrent = false;
    };
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadRoute() {
      if (!startPoint || !finishPoint) {
        setRoutePreview(null);
        setIsRouting(false);
        return;
      }

      setIsRouting(true);
      setMessage('코스 미리보기를 계산하는 중입니다...');

      const nextRoute = await fetchRoutePreview(startPoint, finishPoint);

      if (!isCurrent) {
        return;
      }

      setRoutePreview(nextRoute);
      setIsRouting(false);
      setMessage(
        nextRoute.source === 'osrm'
          ? '코스 미리보기가 준비되었습니다. 주변 편의시설을 함께 확인해보세요.'
          : '경로 서비스를 사용할 수 없어 직선 기준으로 주변 편의시설을 보여드립니다.'
      );
    }

    loadRoute();

    return () => {
      isCurrent = false;
    };
  }, [finishPoint, startPoint]);

  function handleMapPress(coordinate: LatLng) {
    if (!isPointInSeoul(coordinate)) {
      setMessage('RunSpot은 서울 안의 코스만 지원합니다. 서울 지역 안에서 지점을 선택해주세요.');
      focusMap(SEOUL_REGION, 0.06);
      return;
    }

    if (selectionMode === 'start') {
      setStartPoint(coordinate);
      setSelectionMode('finish');
      setMessage('출발지를 설정했습니다. 지도에서 도착지를 눌러주세요.');
      return;
    }

    setFinishPoint(coordinate);
    setMessage('도착지를 설정했습니다. 아래에서 거리와 예상 시간을 확인하세요.');
  }

  function resetRoute() {
    setStartPoint(null);
    setFinishPoint(null);
    setRoutePreview(null);
    setSelectionMode('start');
    focusMap(SEOUL_REGION, 0.06);
    setMessage('코스를 지웠습니다. 지도에서 출발지를 다시 눌러주세요.');
  }

  return (
    <View style={styles.screen}>
      <WebView
        ref={mapRef}
        style={styles.map}
        source={{ html: MAP_HTML }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        onMessage={handleMapMessage}
      />

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        <ThemedView type="backgroundElement" style={styles.searchPanel}>
          <View style={styles.modeRow}>
            <Pressable
              onPress={() => setSelectionMode('start')}
              style={({ pressed }) => [
                styles.modeButton,
                selectionMode === 'start' && styles.modeButtonActive,
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="smallBold"
                style={selectionMode === 'start' && styles.modeButtonTextActive}>
                출발지 설정
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setSelectionMode('finish')}
              style={({ pressed }) => [
                styles.modeButton,
                selectionMode === 'finish' && styles.modeButtonActive,
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="smallBold"
                style={selectionMode === 'finish' && styles.modeButtonTextActive}>
                도착지 설정
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.routeRow}>
            <View style={styles.startDot} />
            <View style={styles.routeText}>
              <ThemedText type="smallBold">출발</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatCoordinate(startPoint)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.routeRow}>
            <View style={styles.finishDot} />
            <View style={styles.routeText}>
              <ThemedText type="smallBold">도착</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatCoordinate(finishPoint)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.metricRow}>
            <ThemedText type="smallBold">예상 거리</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {routePreview
                ? `${formatDistance(routePreview.distanceMeters)} / ${formatDuration(
                    routePreview.durationSeconds
                  )} ${routeSourceLabel}`
                : isRouting
                  ? '계산 중...'
                  : '출발지와 도착지를 설정하세요'}
            </ThemedText>
          </View>
        </ThemedView>

        <View style={styles.flexSpacer} />

        <ThemedView type="backgroundElement" style={styles.bottomPanel}>
          <View style={styles.bottomHeader}>
            <View style={styles.bottomTitle}>
              <ThemedText type="smallBold">코스 주변 편의시설</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isLoadingSpots ? '서울 열린데이터를 불러오는 중...' : routeSpotSummary}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {spotDataMessage}
              </ThemedText>
            </View>
            <Pressable
              onPress={locateRunner}
              disabled={isLocating}
              style={({ pressed }) => [
                styles.locationButton,
                pressed && styles.pressed,
                isLocating && styles.disabled,
              ]}>
              <ThemedText type="smallBold" style={styles.locationButtonText}>
                {isLocating ? '...' : isMapReady ? '현재 위치' : '지도 준비'}
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            {message}
          </ThemedText>
          {routePreview && routeSpots.length > 0 && (
            <View style={styles.spotList}>
              {routeSpots.slice(0, 3).map((spot) => (
                <View key={spot.id} style={styles.spotRow}>
                  <View style={[styles.spotDot, { backgroundColor: spotColors[spot.type] }]} />
                  <ThemedText type="small" style={styles.spotName}>
                    {spot.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {spot.detail
                      ? `${spot.detail} / ${Math.round(spot.distanceFromRouteMeters)} m`
                      : `${Math.round(spot.distanceFromRouteMeters)} m`}
                  </ThemedText>
                </View>
              ))}
            </View>
          )}
          {routePreview && routeSpots.length === 0 && (
            <ThemedText type="small" themeColor="textSecondary">
              이 코스 500m 안에는 표시할 샘플 편의시설이 없습니다.
            </ThemedText>
          )}
          <View style={styles.actionRow}>
            <Pressable
              onPress={resetRoute}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold">코스 지우기</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setSelectionMode(selectionMode === 'start' ? 'finish' : 'start')}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold">
                다음: {selectionMode === 'start' ? '도착지' : '출발지'}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  map: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    flex: 1,
    padding: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.three,
  },
  searchPanel: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
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
  routeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
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
  routeText: {
    flex: 1,
  },
  metricRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#9EB8A7',
    paddingTop: Spacing.two,
    gap: Spacing.one,
  },
  flexSpacer: {
    flex: 1,
  },
  bottomPanel: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  bottomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: Spacing.three,
  },
  bottomTitle: {
    flex: 1,
  },
  locationButton: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#17211B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationButtonText: {
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  spotList: {
    gap: Spacing.one,
  },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  spotDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  spotName: {
    flex: 1,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: Spacing.two,
    backgroundColor: '#DCE7DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.78,
  },
  disabled: {
    opacity: 0.5,
  },
});
