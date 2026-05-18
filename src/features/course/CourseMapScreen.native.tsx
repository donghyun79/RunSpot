import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { fetchSeoulRunnerSpots, hasSeoulOpenDataKey } from '@/features/spots/seoul-open-data';
import { useFavorites } from '@/hooks/use-favorites';
import { useRunSpotAuth } from '@/hooks/use-runspot-auth';
import { openKakaoMapRoute } from '@/services/maps/kakao-map-links';
import { fetchKakaoCategoryPlaces, hasKakaoLocalKey } from '@/services/maps/kakao-places';
import { returnRouteOptions } from '@/services/maps/map-provider';
import { ReturnRouteMode } from '@/services/maps/types';
import { getPublicSpotsWithSource } from '@/services/spots/spot-repository';
import { FavoriteLabel, RoutePreview, RunnerSpot, SpotType } from '@/types/runspot';

import {
  calculateStraightDistanceMeters,
  fetchRoutePreview,
  filterSpotsNearRoute,
} from './route-service';

type LatLng = {
  latitude: number;
  longitude: number;
};

type DisplaySpot = RunnerSpot & {
  distanceFromFocusMeters: number;
  distanceFromRouteMeters?: number;
};

type PointMode = 'start' | 'finish';

const SEOUL_REGION: Region = {
  latitude: 37.5665,
  longitude: 126.978,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};
const SEOUL_CENTER: LatLng = {
  latitude: SEOUL_REGION.latitude,
  longitude: SEOUL_REGION.longitude,
};
const CURRENT_LOCATION_DELTA = 0.018;
const MAX_SPOTS_WITHOUT_ROUTE = 80;
const SEOUL_BOUNDS = {
  minLatitude: 37.38,
  maxLatitude: 37.72,
  minLongitude: 126.76,
  maxLongitude: 127.2,
};

const spotLabels: Record<SpotType, string> = {
  water: 'Water',
  restroom: 'Restroom',
  shower: 'Shower',
  convenience: 'Convenience',
  bike: 'Ddareungi',
  transit: 'Transit',
};

const spotColors: Record<SpotType, string> = {
  water: '#208AEF',
  restroom: '#6D5BD0',
  shower: '#00A389',
  convenience: '#F36F45',
  bike: '#2D7A46',
  transit: '#17211B',
};

function formatCoordinate(point: LatLng | null) {
  if (!point) {
    return 'Tap the map to set';
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
    return `${minutes} min`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours} hr ${remainingMinutes} min`;
}

function isPointInSeoul(point: LatLng) {
  return (
    point.latitude >= SEOUL_BOUNDS.minLatitude &&
    point.latitude <= SEOUL_BOUNDS.maxLatitude &&
    point.longitude >= SEOUL_BOUNDS.minLongitude &&
    point.longitude <= SEOUL_BOUNDS.maxLongitude
  );
}

function toRegion(point: LatLng, delta = CURRENT_LOCATION_DELTA): Region {
  return {
    ...point,
    latitudeDelta: delta,
    longitudeDelta: delta,
  };
}

export default function CourseMapScreen() {
  const auth = useRunSpotAuth();
  const favorites = useFavorites(auth.session?.profile.uid);
  const mapRef = useRef<MapView | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [selectionMode, setSelectionMode] = useState<PointMode>('finish');
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);
  const [finishPoint, setFinishPoint] = useState<LatLng | null>(null);
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
  const [runnerSpots, setRunnerSpots] = useState<RunnerSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<DisplaySpot | null>(null);
  const [isLoadingSpots, setIsLoadingSpots] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [spotDataMessage, setSpotDataMessage] = useState('Loading public runner spots.');
  const [message, setMessage] = useState('Location permission helps set your start point.');

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
  const focusPoint = finishPoint ?? startPoint ?? SEOUL_CENTER;
  const distanceSortedSpots = useMemo<DisplaySpot[]>(
    () =>
      visibleRunnerSpots
        .map((spot) => ({
          ...spot,
          distanceFromFocusMeters: calculateStraightDistanceMeters(
            { latitude: spot.latitude, longitude: spot.longitude },
            focusPoint
          ),
        }))
        .sort((a, b) => a.distanceFromFocusMeters - b.distanceFromFocusMeters),
    [focusPoint, visibleRunnerSpots]
  );
  const routeSourceLabel = routePreview?.source === 'osrm' ? 'route estimate' : 'straight-line';
  const routeSpotSummary = routePreview
    ? `${routeSpots.length} spots within 500m of route`
    : `${spotSummary || 'spots'} visible`;
  const selectedFavorite = selectedSpot ? favorites.favoriteBySpotId.get(selectedSpot.id) : null;

  const focusMap = useCallback((point: LatLng, delta = CURRENT_LOCATION_DELTA) => {
    mapRef.current?.animateToRegion(toRegion(point, delta), 450);
  }, []);

  function selectSpot(spot: DisplaySpot) {
    setSelectedSpot(spot);
    focusMap({ latitude: spot.latitude, longitude: spot.longitude }, 0.01);
  }

  async function saveSelectedSpot(label: FavoriteLabel) {
    if (!selectedSpot) {
      return;
    }

    await favorites.saveFavorite(selectedSpot.id, label);
  }

  async function removeSelectedSpotFavorite() {
    if (!selectedSpot) {
      return;
    }

    await favorites.removeFavorite(selectedSpot.id);
  }

  const locateRunner = useCallback(async () => {
    setIsLocating(true);
    setMessage('Finding your current location...');

    const currentPermission = await Location.getForegroundPermissionsAsync();
    const permission =
      currentPermission.status === Location.PermissionStatus.GRANTED
        ? currentPermission
        : await Location.requestForegroundPermissionsAsync();

    if (permission.status !== Location.PermissionStatus.GRANTED) {
      setIsLocating(false);
      setMessage('Location permission denied. Showing the default Seoul map and spot list.');
      focusMap(SEOUL_REGION, 0.06);
      setSelectionMode('start');
      return;
    }

    try {
      const lastKnown = await Location.getLastKnownPositionAsync({
        maxAge: 60_000,
        requiredAccuracy: 200,
      });
      const current =
        lastKnown ??
        (await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        }));
      const nextPoint = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      if (!isPointInSeoul(nextPoint)) {
        focusMap(SEOUL_REGION, 0.06);
        setStartPoint(null);
        setSelectionMode('start');
        setMessage(
          'Your location appears outside Seoul. Showing Seoul City Hall; tap the map to set a start point.'
        );
        return;
      }

      focusMap(nextPoint);
      setStartPoint(nextPoint);
      setSelectionMode('finish');
      setMessage('Current location set as start. Tap the map to set a finish point.');
    } catch {
      focusMap(SEOUL_REGION, 0.06);
      setSelectionMode('start');
      setMessage('Could not read current location. Showing the default Seoul map.');
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
      setIsLoadingSpots(true);
      setSpotDataMessage('Loading public runner spots...');
      try {
        const publicSpotResult = await getPublicSpotsWithSource();

        if (!isCurrent) {
          return;
        }

        let nextSpots: RunnerSpot[] = publicSpotResult.spots;
        let nextMessage =
          publicSpotResult.source === 'firestore'
            ? `Loaded ${publicSpotResult.spots.length} verified Firestore spots.`
            : publicSpotResult.source === 'cache'
              ? `Firestore unavailable. Showing ${publicSpotResult.spots.length} cached spots.`
              : 'Showing bundled mock spots until Firestore has verified data.';

        if (hasSeoulOpenDataKey()) {
          const seoulData = await fetchSeoulRunnerSpots();

          if (!isCurrent) {
            return;
          }

          if (seoulData.spots.length > 0) {
            nextSpots = [...nextSpots, ...seoulData.spots];
            nextMessage = `${nextMessage} Added ${seoulData.spots.length} Seoul bike stations.`;
          }
        } else {
          nextMessage = `${nextMessage} Add a Seoul Open Data key for live bike stations.`;
        }

        setRunnerSpots(nextSpots);
        setSpotDataMessage(nextMessage);
      } catch {
        if (isCurrent) {
          setSpotDataMessage('Spot data failed. Showing cached or bundled fallback spots.');
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
      setMessage('Calculating route preview...');

      const nextRoute = await fetchRoutePreview(startPoint, finishPoint);

      if (!isCurrent) {
        return;
      }

      setRoutePreview(nextRoute);
      setIsRouting(false);
      setMessage(
        nextRoute.source === 'osrm'
          ? 'Route preview is ready. Check nearby spots below.'
          : 'Route service unavailable. Showing nearby spots by straight-line fallback.'
      );
    }

    loadRoute();

    return () => {
      isCurrent = false;
    };
  }, [finishPoint, startPoint]);

  useEffect(() => {
    let isCurrent = true;

    async function loadKakaoPlacesNearFinish() {
      if (!finishPoint || !hasKakaoLocalKey()) {
        return;
      }

      setIsLoadingSpots(true);
      try {
        const [convenienceSpots, transitSpots] = await Promise.all([
          fetchKakaoCategoryPlaces({
            center: finishPoint,
            radiusMeters: 1200,
            category: 'convenience',
          }),
          fetchKakaoCategoryPlaces({
            center: finishPoint,
            radiusMeters: 1200,
            category: 'transit',
          }),
        ]);

        if (!isCurrent) {
          return;
        }

        const kakaoSpots = [...convenienceSpots, ...transitSpots];

        setRunnerSpots((currentSpots) => {
          const baseSpots = currentSpots.filter((spot) => !spot.source.startsWith('kakao-local:'));
          const seenIds = new Set(baseSpots.map((spot) => spot.id));
          const nextKakaoSpots = kakaoSpots.filter((spot) => {
            if (seenIds.has(spot.id)) {
              return false;
            }

            seenIds.add(spot.id);
            return true;
          });

          return [...baseSpots, ...nextKakaoSpots];
        });

        if (kakaoSpots.length > 0) {
          setSpotDataMessage(`Loaded ${kakaoSpots.length} Kakao places near the finish.`);
        }
      } catch {
        if (isCurrent) {
          setSpotDataMessage('Kakao place search failed. Showing existing spots.');
        }
      } finally {
        if (isCurrent) {
          setIsLoadingSpots(false);
        }
      }
    }

    loadKakaoPlacesNearFinish();

    return () => {
      isCurrent = false;
    };
  }, [finishPoint]);

  function handleMapPress(coordinate: LatLng) {
    if (!isPointInSeoul(coordinate)) {
      setMessage('RunSpot currently supports Seoul routes only. Select a point inside Seoul.');
      focusMap(SEOUL_REGION, 0.06);
      return;
    }

    if (selectionMode === 'start') {
      setStartPoint(coordinate);
      setSelectionMode('finish');
      setMessage('Start point set. Tap the map to set a finish point.');
      return;
    }

    setFinishPoint(coordinate);
    setMessage('Finish point set. Distance and nearby spots are shown below.');
  }

  function resetRoute() {
    setStartPoint(null);
    setFinishPoint(null);
    setRoutePreview(null);
    setSelectedSpot(null);
    setSelectionMode('start');
    focusMap(SEOUL_REGION, 0.06);
    setMessage('Route cleared. Tap the map to set a new start point.');
  }

  async function openReturnRoute(mode: ReturnRouteMode) {
    if (!startPoint || !finishPoint) {
      setMessage('Return route is available after both start and finish are set.');
      return;
    }

    try {
      await openKakaoMapRoute({
        origin: finishPoint,
        destination: startPoint,
        mode,
      });
    } catch {
      setMessage('Could not open Kakao Map route. Try again later.');
    }
  }

  return (
    <View style={styles.screen}>
      <MapView
        ref={mapRef}
        style={styles.map}
        initialRegion={SEOUL_REGION}
        showsUserLocation
        showsMyLocationButton={false}
        onPress={(event) => handleMapPress(event.nativeEvent.coordinate)}>
        {routePreview && routePreview.coordinates.length > 1 && (
          <Polyline coordinates={routePreview.coordinates} strokeColor="#17211B" strokeWidth={5} />
        )}

        {distanceSortedSpots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            title={spot.name}
            description={spot.detail || spot.address}
            pinColor={spotColors[spot.type]}
            onPress={() => selectSpot(spot)}
          />
        ))}

        {startPoint && <Marker coordinate={startPoint} title="Start" pinColor="#2D7A46" />}
        {finishPoint && <Marker coordinate={finishPoint} title="Finish" pinColor="#F36F45" />}
      </MapView>

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
                Set start
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
                Set finish
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.routeRow}>
            <View style={styles.startDot} />
            <View style={styles.routeText}>
              <ThemedText type="smallBold">Start</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatCoordinate(startPoint)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.routeRow}>
            <View style={styles.finishDot} />
            <View style={styles.routeText}>
              <ThemedText type="smallBold">Finish</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatCoordinate(finishPoint)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.metricRow}>
            <ThemedText type="smallBold">Estimated route</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {routePreview
                ? `${formatDistance(routePreview.distanceMeters)} / ${formatDuration(
                    routePreview.durationSeconds
                  )} ${routeSourceLabel}`
                : isRouting
                  ? 'Calculating...'
                  : 'Set start and finish to preview distance'}
            </ThemedText>
          </View>
        </ThemedView>

        <View style={styles.flexSpacer} />

        <ThemedView type="backgroundElement" style={styles.bottomPanel}>
          <View style={styles.bottomHeader}>
            <View style={styles.bottomTitle}>
              <ThemedText type="smallBold">Nearby spots</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isLoadingSpots ? 'Loading spot data...' : routeSpotSummary}
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
                {isLocating ? '...' : 'Locate'}
              </ThemedText>
            </Pressable>
          </View>

          <ThemedText type="small" themeColor="textSecondary">
            {message}
          </ThemedText>

          <View style={styles.spotList}>
            {distanceSortedSpots.slice(0, 5).map((spot) => (
              <Pressable
                key={spot.id}
                onPress={() => selectSpot(spot)}
                style={({ pressed }) => [
                  styles.spotRow,
                  selectedSpot?.id === spot.id && styles.spotRowSelected,
                  pressed && styles.pressed,
                ]}>
                <View style={[styles.spotDot, { backgroundColor: spotColors[spot.type] }]} />
                <View style={styles.spotName}>
                  <ThemedText type="smallBold">{spot.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {spotLabels[spot.type]} / {formatDistance(spot.distanceFromFocusMeters)}
                    {favorites.favoriteBySpotId.has(spot.id) ? ' / saved' : ''}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>

          {selectedSpot && (
            <ThemedView type="backgroundSelected" style={styles.detailPanel}>
              <View style={styles.detailHeader}>
                <View style={[styles.spotDot, { backgroundColor: spotColors[selectedSpot.type] }]} />
                <View style={styles.spotName}>
                  <ThemedText type="smallBold">{selectedSpot.name}</ThemedText>
                  <ThemedText type="small" themeColor="textSecondary">
                    {spotLabels[selectedSpot.type]} / {formatDistance(selectedSpot.distanceFromFocusMeters)}
                  </ThemedText>
                </View>
              </View>
              <ThemedText type="small" themeColor="textSecondary">
                {selectedSpot.address || selectedSpot.detail || 'No address available yet.'}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                Source: {selectedSpot.source}
              </ThemedText>
              <View style={styles.favoriteStatus}>
                <ThemedText type="smallBold">
                  {selectedFavorite ? `Saved as ${selectedFavorite.label}` : 'Not saved yet'}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {auth.session
                    ? 'Save this public spot as a favorite, course start, or privacy-safe home landmark.'
                    : 'Sign in as a guest from the plan tab to save favorites.'}
                </ThemedText>
                {favorites.favoriteError ? (
                  <ThemedText type="small" style={styles.favoriteError}>
                    {favorites.favoriteError}
                  </ThemedText>
                ) : null}
              </View>
              <View style={styles.favoriteActionGrid}>
                <Pressable
                  disabled={!auth.session || favorites.isSavingFavorite}
                  onPress={() => saveSelectedSpot('custom')}
                  style={({ pressed }) => [
                    styles.favoriteButton,
                    selectedFavorite?.label === 'custom' && styles.favoriteButtonActive,
                    pressed && styles.pressed,
                    (!auth.session || favorites.isSavingFavorite) && styles.disabled,
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={selectedFavorite?.label === 'custom' && styles.favoriteButtonTextActive}>
                    Favorite
                  </ThemedText>
                </Pressable>
                <Pressable
                  disabled={!auth.session || favorites.isSavingFavorite}
                  onPress={() => saveSelectedSpot('courseStart')}
                  style={({ pressed }) => [
                    styles.favoriteButton,
                    selectedFavorite?.label === 'courseStart' && styles.favoriteButtonActive,
                    pressed && styles.pressed,
                    (!auth.session || favorites.isSavingFavorite) && styles.disabled,
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={
                      selectedFavorite?.label === 'courseStart' && styles.favoriteButtonTextActive
                    }>
                    Course start
                  </ThemedText>
                </Pressable>
                <Pressable
                  disabled={!auth.session || favorites.isSavingFavorite}
                  onPress={() => saveSelectedSpot('home')}
                  style={({ pressed }) => [
                    styles.favoriteButton,
                    selectedFavorite?.label === 'home' && styles.favoriteButtonActive,
                    pressed && styles.pressed,
                    (!auth.session || favorites.isSavingFavorite) && styles.disabled,
                  ]}>
                  <ThemedText
                    type="smallBold"
                    style={selectedFavorite?.label === 'home' && styles.favoriteButtonTextActive}>
                    Home nearby
                  </ThemedText>
                </Pressable>
                <Pressable
                  disabled={!selectedFavorite || favorites.isSavingFavorite}
                  onPress={removeSelectedSpotFavorite}
                  style={({ pressed }) => [
                    styles.favoriteButton,
                    pressed && styles.pressed,
                    (!selectedFavorite || favorites.isSavingFavorite) && styles.disabled,
                  ]}>
                  <ThemedText type="smallBold">Remove</ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          )}

          {routePreview && startPoint && finishPoint && (
            <View style={styles.returnRouteSection}>
              <ThemedText type="smallBold">Return route</ThemedText>
              <View style={styles.returnRouteRow}>
                {returnRouteOptions.map((option) => (
                  <Pressable
                    key={option.id}
                    onPress={() => openReturnRoute(option.id)}
                    style={({ pressed }) => [
                      styles.returnRouteButton,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText type="smallBold">{option.label}</ThemedText>
                  </Pressable>
                ))}
              </View>
            </View>
          )}
          <View style={styles.actionRow}>
            <Pressable
              onPress={resetRoute}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold">Clear route</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setSelectionMode(selectionMode === 'start' ? 'finish' : 'start')}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold">
                Next: {selectionMode === 'start' ? 'finish' : 'start'}
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
  spotList: {
    gap: Spacing.one,
  },
  spotRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    minHeight: 48,
    paddingVertical: Spacing.one,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
  },
  spotRowSelected: {
    backgroundColor: '#DCE7DF',
  },
  spotDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  spotName: {
    flex: 1,
  },
  detailPanel: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  detailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  favoriteStatus: {
    gap: Spacing.one,
  },
  favoriteError: {
    color: '#C43D2B',
  },
  favoriteActionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  favoriteButton: {
    minHeight: 40,
    minWidth: 116,
    borderRadius: Spacing.two,
    backgroundColor: '#EEF4EF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  favoriteButtonActive: {
    backgroundColor: '#17211B',
  },
  favoriteButtonTextActive: {
    color: '#FFFFFF',
  },
  actionRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  returnRouteSection: {
    gap: Spacing.two,
  },
  returnRouteRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  returnRouteButton: {
    flex: 1,
    minHeight: 40,
    borderRadius: Spacing.two,
    backgroundColor: '#EEF4EF',
    alignItems: 'center',
    justifyContent: 'center',
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
