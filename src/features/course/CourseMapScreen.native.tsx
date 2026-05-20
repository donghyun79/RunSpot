import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import MapView, { Marker, Polyline, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { fetchSeoulRunnerSpots, hasSeoulOpenDataKey } from '@/features/spots/seoul-open-data';
import { useFavorites } from '@/hooks/use-favorites';
import { useReports } from '@/hooks/use-reports';
import { useRunSpotAuth } from '@/hooks/use-runspot-auth';
import { openKakaoMapRoute } from '@/services/maps/kakao-map-links';
import { fetchKakaoCategoryPlaces, hasKakaoLocalKey } from '@/services/maps/kakao-places';
import { returnRouteOptions } from '@/services/maps/map-provider';
import { ReturnRouteMode } from '@/services/maps/types';
import { getRunSpotCopy } from '@/services/i18n/runspot-copy';
import { getPublicSpotsWithSource } from '@/services/spots/spot-repository';
import { trackRunSpotEvent } from '@/services/observability/analytics';
import { recordNonFatalError } from '@/services/observability/crash-reporting';
import { FavoriteLabel, RoutePreview, RunnerSpot, SpotType, UserReportType } from '@/types/runspot';

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

const copy = getRunSpotCopy();
const spotLabels: Record<SpotType, string> = copy.spots.typeLabels;

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
    return copy.course.tapMapToSet;
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
    return `${minutes}${copy.course.minute}`;
  }

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;

  return `${hours}${copy.course.hour} ${remainingMinutes}${copy.course.minute}`;
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
  const reports = useReports(auth.session?.profile.uid);
  const mapRef = useRef<MapView | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [selectionMode, setSelectionMode] = useState<PointMode>('finish');
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);
  const [finishPoint, setFinishPoint] = useState<LatLng | null>(null);
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
  const [runnerSpots, setRunnerSpots] = useState<RunnerSpot[]>([]);
  const [selectedSpot, setSelectedSpot] = useState<DisplaySpot | null>(null);
  const [isMapPickMode, setIsMapPickMode] = useState(false);
  const [isLoadingSpots, setIsLoadingSpots] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [isMapReady, setIsMapReady] = useState(false);
  const [reportType, setReportType] = useState<UserReportType>('spotWrongInfo');
  const [reportContent, setReportContent] = useState('');
  const [spotDataMessage, setSpotDataMessage] = useState<string>(copy.spots.loading);
  const [message, setMessage] = useState<string>(copy.course.initialHelp);

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
  const routeSourceLabel =
    routePreview?.source === 'osrm' ? copy.course.routeEstimate : copy.course.straightLine;
  const routeSpotSummary = routePreview
    ? copy.spots.routeSummary(routeSpots.length)
    : copy.spots.visibleSummary(spotSummary);
  const selectedFavorite = selectedSpot ? favorites.favoriteBySpotId.get(selectedSpot.id) : null;

  const focusMap = useCallback((point: LatLng, delta = CURRENT_LOCATION_DELTA) => {
    mapRef.current?.animateToRegion(toRegion(point, delta), 450);
  }, []);

  function selectSpot(spot: DisplaySpot) {
    setSelectedSpot(spot);
    reports.clearReportStatus();
    void trackRunSpotEvent({
      name: 'spot_selected',
      params: {
        spot_type: spot.type,
        source: spot.source,
      },
    });
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

  async function submitSelectedSpotReport() {
    if (!selectedSpot) {
      return;
    }

    await reports.submitReport(selectedSpot.id, reportType, reportContent);
    setReportContent('');
  }

  const locateRunner = useCallback(async () => {
    setIsLocating(true);
    setMessage(copy.course.findingLocation);

    const currentPermission = await Location.getForegroundPermissionsAsync();
    const permission =
      currentPermission.status === Location.PermissionStatus.GRANTED
        ? currentPermission
        : await Location.requestForegroundPermissionsAsync();

    if (permission.status !== Location.PermissionStatus.GRANTED) {
      setIsLocating(false);
      setMessage(copy.course.permissionDenied);
      void trackRunSpotEvent({
        name: 'location_permission_result',
        params: {
          result: 'denied',
        },
      });
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
        setMessage(copy.course.outsideSeoul);
        void trackRunSpotEvent({
          name: 'location_permission_result',
          params: {
            result: 'outside_seoul',
          },
        });
        return;
      }

      focusMap(nextPoint);
      setStartPoint(nextPoint);
      setSelectionMode('finish');
      setMessage(copy.course.currentLocationSet);
      void trackRunSpotEvent({
        name: 'location_permission_result',
        params: {
          result: 'granted',
        },
      });
    } catch (error) {
      void recordNonFatalError(error, 'current_location_read');
      void trackRunSpotEvent({
        name: 'location_permission_result',
        params: {
          result: 'failed',
        },
      });
      focusMap(SEOUL_REGION, 0.06);
      setSelectionMode('start');
      setMessage(copy.course.locationReadFailed);
    } finally {
      setIsLocating(false);
    }
  }, [focusMap]);

  useEffect(() => {
    locateRunner();
  }, [locateRunner]);

  useEffect(() => {
    void trackRunSpotEvent({
      name: 'screen_view',
      params: {
        screen_name: 'course_map',
      },
    });
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadRunnerSpots() {
      setIsLoadingSpots(true);
      setSpotDataMessage(copy.spots.loadingShort);
      try {
        const publicSpotResult = await getPublicSpotsWithSource();

        if (!isCurrent) {
          return;
        }

        let nextSpots: RunnerSpot[] = publicSpotResult.spots;
        let nextMessage =
          publicSpotResult.source === 'firestore'
            ? copy.spots.firestoreLoaded(publicSpotResult.spots.length)
            : publicSpotResult.source === 'cache'
              ? copy.spots.cacheLoaded(publicSpotResult.spots.length, publicSpotResult.updatedAt)
              : copy.spots.mockLoaded;

        if (hasSeoulOpenDataKey()) {
          const seoulData = await fetchSeoulRunnerSpots();

          if (!isCurrent) {
            return;
          }

          if (seoulData.spots.length > 0) {
            nextSpots = [...nextSpots, ...seoulData.spots];
            nextMessage = `${nextMessage} ${copy.spots.seoulBikeAdded(seoulData.spots.length)}`;
          }
        } else {
          nextMessage = `${nextMessage} ${copy.spots.seoulOpenDataKeyMissing}`;
        }

        setRunnerSpots(nextSpots);
        setSpotDataMessage(nextMessage);
      } catch (error) {
        if (isCurrent) {
          void recordNonFatalError(error, 'runner_spots_load');
          setSpotDataMessage(copy.spots.failed);
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
      setMessage(copy.course.calculating);

      const nextRoute = await fetchRoutePreview(startPoint, finishPoint);

      if (!isCurrent) {
        return;
      }

      setRoutePreview(nextRoute);
      setIsRouting(false);
      void trackRunSpotEvent({
        name: 'route_preview_ready',
        params: {
          source: nextRoute.source,
          distance_bucket_km: Math.round(nextRoute.distanceMeters / 1000),
        },
      });
      setMessage(
        nextRoute.source === 'osrm'
          ? copy.course.routeReady
          : copy.course.routeFallback
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
          setSpotDataMessage(copy.course.kakaoPlacesLoaded(kakaoSpots.length));
        }
      } catch (error) {
        if (isCurrent) {
          void recordNonFatalError(error, 'kakao_places_load');
          setSpotDataMessage(copy.course.kakaoPlacesFailed);
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
      setMessage(copy.course.seoulOnly);
      focusMap(SEOUL_REGION, 0.06);
      return;
    }

    if (selectionMode === 'start') {
      setStartPoint(coordinate);
      setSelectionMode('finish');
      setIsMapPickMode(false);
      setMessage(copy.course.startSet);
      return;
    }

    setFinishPoint(coordinate);
    setIsMapPickMode(false);
    setMessage(copy.course.finishSet);
  }

  function resetRoute() {
    setStartPoint(null);
    setFinishPoint(null);
    setRoutePreview(null);
    setSelectedSpot(null);
    setSelectionMode('start');
    setIsMapPickMode(false);
    focusMap(SEOUL_REGION, 0.06);
    setMessage(copy.course.routeCleared);
  }

  function beginMapPickMode(mode: PointMode) {
    setSelectionMode(mode);
    setSelectedSpot(null);
    setIsMapPickMode(true);
    setMessage(
      `${copy.course.tapMapToSet}: ${mode === 'start' ? copy.course.start : copy.course.finish}`
    );
  }

  async function openReturnRoute(mode: ReturnRouteMode) {
    if (!startPoint || !finishPoint) {
      setMessage(copy.course.returnRouteUnavailable);
      return;
    }

    try {
      await openKakaoMapRoute({
        origin: finishPoint,
        destination: startPoint,
        mode,
      });
      void trackRunSpotEvent({
        name: 'return_route_opened',
        params: {
          mode,
        },
      });
    } catch (error) {
      void recordNonFatalError(error, 'kakao_return_route_open');
      setMessage(copy.course.kakaoRouteFailed);
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
        onMapReady={() => setIsMapReady(true)}
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

        {startPoint && (
          <Marker coordinate={startPoint} title={copy.course.start} pinColor="#2D7A46" />
        )}
        {finishPoint && (
          <Marker coordinate={finishPoint} title={copy.course.finish} pinColor="#F36F45" />
        )}
      </MapView>

      {!isMapReady && (
        <View pointerEvents="none" style={styles.mapStatus}>
          <ThemedText type="smallBold" style={styles.mapStatusText}>
            {copy.maps.loading}
          </ThemedText>
        </View>
      )}

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        {isMapPickMode ? (
          <ThemedView type="backgroundElement" style={styles.pickPanel}>
            <View style={styles.pickPanelHeader}>
              <View style={styles.routeText}>
                <ThemedText type="smallBold">
                  {selectionMode === 'start' ? copy.course.setStart : copy.course.setFinish}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {copy.course.tapMapToSet}
                </ThemedText>
              </View>
              <Pressable
                onPress={() => setIsMapPickMode(false)}
                style={({ pressed }) => [styles.compactButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold">{copy.course.showPanel}</ThemedText>
              </Pressable>
            </View>
          </ThemedView>
        ) : (
        <ThemedView type="backgroundElement" style={styles.searchPanel}>
          <View style={styles.modeRow}>
            <Pressable
              onPress={() => beginMapPickMode('start')}
              style={({ pressed }) => [
                styles.modeButton,
                selectionMode === 'start' && styles.modeButtonActive,
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="smallBold"
                style={selectionMode === 'start' && styles.modeButtonTextActive}>
                {copy.course.setStart}
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => beginMapPickMode('finish')}
              style={({ pressed }) => [
                styles.modeButton,
                selectionMode === 'finish' && styles.modeButtonActive,
                pressed && styles.pressed,
              ]}>
              <ThemedText
                type="smallBold"
                style={selectionMode === 'finish' && styles.modeButtonTextActive}>
                {copy.course.setFinish}
              </ThemedText>
            </Pressable>
          </View>

          <View style={styles.routeRow}>
            <View style={styles.startDot} />
            <View style={styles.routeText}>
              <ThemedText type="smallBold">{copy.course.start}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatCoordinate(startPoint)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.routeRow}>
            <View style={styles.finishDot} />
            <View style={styles.routeText}>
              <ThemedText type="smallBold">{copy.course.finish}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatCoordinate(finishPoint)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.metricRow}>
            <ThemedText type="smallBold">{copy.course.estimatedRoute}</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {routePreview
                ? `${formatDistance(routePreview.distanceMeters)} / ${formatDuration(
                    routePreview.durationSeconds
                  )} ${routeSourceLabel}`
                : isRouting
                  ? copy.course.calculating
                  : copy.course.previewPrompt}
            </ThemedText>
          </View>
        </ThemedView>
        )}

        <View pointerEvents="none" style={styles.flexSpacer} />

        {!isMapPickMode && (
        <ThemedView type="backgroundElement" style={styles.bottomPanel}>
          <View style={styles.bottomHeader}>
            <View style={styles.bottomTitle}>
              <ThemedText type="smallBold">{copy.spots.nearbyTitle}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isLoadingSpots ? copy.spots.loadingList : routeSpotSummary}
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
                {isLocating ? copy.course.locating : copy.course.locate}
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
                    {favorites.favoriteBySpotId.has(spot.id) ? ` / ${copy.spots.savedSuffix}` : ''}
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
                {selectedSpot.address || selectedSpot.detail || copy.spots.emptyAddress}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {copy.spots.sourceLabel}: {selectedSpot.source}
              </ThemedText>
              <View style={styles.favoriteStatus}>
                <ThemedText type="smallBold">
                  {selectedFavorite
                    ? copy.favorites.savedAs(selectedFavorite.label)
                    : copy.favorites.notSaved}
                </ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {auth.session ? copy.favorites.signedInHelp : copy.favorites.signedOutHelp}
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
                    {copy.favorites.saveFavorite}
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
                    {copy.favorites.saveCourseStart}
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
                    {copy.favorites.saveHome}
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
                  <ThemedText type="smallBold">{copy.favorites.remove}</ThemedText>
                </Pressable>
              </View>
              <View style={styles.reportSection}>
                <ThemedText type="smallBold">{copy.reports.title}</ThemedText>
                <ThemedText type="small" themeColor="textSecondary">
                  {copy.reports.help}
                </ThemedText>
                <View style={styles.reportTypeGrid}>
                  {(Object.keys(copy.reports.types) as UserReportType[]).map((type) => (
                    <Pressable
                      key={type}
                      onPress={() => setReportType(type)}
                      style={({ pressed }) => [
                        styles.reportTypeButton,
                        reportType === type && styles.favoriteButtonActive,
                        pressed && styles.pressed,
                      ]}>
                      <ThemedText
                        type="smallBold"
                        style={reportType === type && styles.favoriteButtonTextActive}>
                        {copy.reports.types[type]}
                      </ThemedText>
                    </Pressable>
                  ))}
                </View>
                <TextInput
                  value={reportContent}
                  onChangeText={setReportContent}
                  placeholder={copy.reports.notePlaceholder}
                  placeholderTextColor="#6C7C70"
                  multiline
                  style={styles.reportInput}
                />
                {reports.reportMessage ? (
                  <ThemedText type="small" style={styles.reportSuccess}>
                    {reports.reportMessage}
                  </ThemedText>
                ) : null}
                {reports.reportError ? (
                  <ThemedText type="small" style={styles.favoriteError}>
                    {reports.reportError}
                  </ThemedText>
                ) : null}
                <Pressable
                  disabled={!auth.session || reports.isSubmittingReport}
                  onPress={submitSelectedSpotReport}
                  style={({ pressed }) => [
                    styles.reportSubmitButton,
                    pressed && styles.pressed,
                    (!auth.session || reports.isSubmittingReport) && styles.disabled,
                  ]}>
                  <ThemedText type="smallBold" style={styles.locationButtonText}>
                    {reports.isSubmittingReport ? copy.reports.submitting : copy.reports.submit}
                  </ThemedText>
                </Pressable>
              </View>
            </ThemedView>
          )}

          {routePreview && startPoint && finishPoint && (
            <View style={styles.returnRouteSection}>
              <ThemedText type="smallBold">{copy.course.returnRoute}</ThemedText>
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
              <ThemedText type="smallBold">{copy.course.clearRoute}</ThemedText>
            </Pressable>
            <Pressable
              onPress={() => setSelectionMode(selectionMode === 'start' ? 'finish' : 'start')}
              style={({ pressed }) => [styles.secondaryButton, pressed && styles.pressed]}>
              <ThemedText type="smallBold">
                {copy.course.nextMode(selectionMode)}
              </ThemedText>
            </Pressable>
          </View>
        </ThemedView>
        )}
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
  mapStatus: {
    position: 'absolute',
    top: Spacing.four,
    alignSelf: 'center',
    minHeight: 36,
    borderRadius: Spacing.two,
    backgroundColor: 'rgba(23, 33, 27, 0.88)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  mapStatusText: {
    color: '#FFFFFF',
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
  pickPanel: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
  },
  pickPanelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
  },
  compactButton: {
    minHeight: 40,
    paddingHorizontal: Spacing.three,
    borderRadius: Spacing.two,
    backgroundColor: '#DCE7DF',
    alignItems: 'center',
    justifyContent: 'center',
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
  reportSection: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#9EB8A7',
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  reportTypeGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.two,
  },
  reportTypeButton: {
    minHeight: 36,
    paddingHorizontal: Spacing.two,
    borderRadius: Spacing.two,
    backgroundColor: '#DCE7DF',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportInput: {
    minHeight: 72,
    borderRadius: Spacing.two,
    backgroundColor: '#F4FAF5',
    color: '#17211B',
    paddingHorizontal: Spacing.three,
    paddingVertical: Spacing.two,
    textAlignVertical: 'top',
  },
  reportSubmitButton: {
    minHeight: 40,
    borderRadius: Spacing.two,
    backgroundColor: '#17211B',
    alignItems: 'center',
    justifyContent: 'center',
  },
  reportSuccess: {
    color: '#2D7A46',
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
