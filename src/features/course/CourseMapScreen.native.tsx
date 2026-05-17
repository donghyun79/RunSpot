import * as Location from 'expo-location';
import { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import MapView, { LatLng, Marker, Polyline, Region } from 'react-native-maps';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { sampleRunnerSpots } from '@/data/runspot-plan';
import { RoutePreview, RunnerSpot, SpotType } from '@/types/runspot';
import { fetchSeoulRunnerSpots, hasSeoulOpenDataKey } from '@/features/spots/seoul-open-data';

import { fetchRoutePreview, filterSpotsNearRoute } from './route-service';

const SEOUL_REGION: Region = {
  latitude: 37.5665,
  longitude: 126.978,
  latitudeDelta: 0.045,
  longitudeDelta: 0.045,
};

const spotLabels: Record<SpotType, string> = {
  water: 'Water',
  toilet: 'Toilet',
  shower: 'Shower',
  convenience: 'Store',
  bike: 'Bike',
  transit: 'Transit',
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

  return `${hours}h ${remainingMinutes}m`;
}

export default function CourseMapScreen() {
  const [permissionStatus, setPermissionStatus] =
    useState<Location.PermissionStatus | 'unknown'>('unknown');
  const [isLocating, setIsLocating] = useState(false);
  const [region, setRegion] = useState<Region>(SEOUL_REGION);
  const [selectionMode, setSelectionMode] = useState<PointMode>('finish');
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);
  const [finishPoint, setFinishPoint] = useState<LatLng | null>(null);
  const [routePreview, setRoutePreview] = useState<RoutePreview | null>(null);
  const [runnerSpots, setRunnerSpots] = useState<RunnerSpot[]>(sampleRunnerSpots);
  const [isLoadingSpots, setIsLoadingSpots] = useState(false);
  const [isRouting, setIsRouting] = useState(false);
  const [message, setMessage] = useState('Location permission is needed to set your start point.');

  const spotSummary = useMemo(
    () => Array.from(new Set(runnerSpots.map((spot) => spotLabels[spot.type]))).join(' / '),
    [runnerSpots]
  );
  const routeSpots = useMemo(() => {
    if (!routePreview) {
      return runnerSpots.map((spot) => ({
        ...spot,
        distanceFromRouteMeters: 0,
      }));
    }

    return filterSpotsNearRoute(runnerSpots, routePreview.coordinates, 500);
  }, [routePreview, runnerSpots]);
  const routeSourceLabel = routePreview?.source === 'osrm' ? 'route estimate' : 'straight fallback';
  const routeSpotSummary = routePreview
    ? `${routeSpots.length} spots within 500 m of route`
    : spotSummary;

  async function locateRunner() {
    setIsLocating(true);
    setMessage('Finding your current location...');

    const permission = await Location.requestForegroundPermissionsAsync();
    setPermissionStatus(permission.status);

    if (permission.status !== Location.PermissionStatus.GRANTED) {
      setIsLocating(false);
      setMessage('Location permission was not granted. Seoul center is shown as a fallback.');
      return;
    }

    try {
      const current = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const nextPoint = {
        latitude: current.coords.latitude,
        longitude: current.coords.longitude,
      };

      setRegion({
        ...nextPoint,
        latitudeDelta: 0.025,
        longitudeDelta: 0.025,
      });
      setStartPoint(nextPoint);
      setSelectionMode('finish');
      setMessage('Current location is set as the start point. Tap the map to set a finish.');
    } catch {
      setMessage('Could not read current location. Seoul center is shown as a fallback.');
    } finally {
      setIsLocating(false);
    }
  }

  useEffect(() => {
    locateRunner();
  }, []);

  useEffect(() => {
    let isCurrent = true;

    async function loadRunnerSpots() {
      if (!hasSeoulOpenDataKey()) {
        return;
      }

      setIsLoadingSpots(true);
      try {
        const seoulSpots = await fetchSeoulRunnerSpots();

        if (!isCurrent) {
          return;
        }

        if (seoulSpots.length > 0) {
          setRunnerSpots([...sampleRunnerSpots, ...seoulSpots]);
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
      setMessage('Calculating a route preview...');

      const nextRoute = await fetchRoutePreview(startPoint, finishPoint);

      if (!isCurrent) {
        return;
      }

      setRoutePreview(nextRoute);
      setIsRouting(false);
      setMessage(
        nextRoute.source === 'osrm'
          ? 'Route preview is ready. Runner spot filtering comes next.'
          : 'Route service was unavailable, so spots are filtered against a straight fallback.'
      );
    }

    loadRoute();

    return () => {
      isCurrent = false;
    };
  }, [finishPoint, startPoint]);

  function handleMapPress(coordinate: LatLng) {
    if (selectionMode === 'start') {
      setStartPoint(coordinate);
      setSelectionMode('finish');
      setMessage('Start point set. Tap the map to set a finish point.');
      return;
    }

    setFinishPoint(coordinate);
    setMessage('Finish point set. Review the distance preview below.');
  }

  function resetRoute() {
    setStartPoint(null);
    setFinishPoint(null);
    setRoutePreview(null);
    setSelectionMode('start');
    setMessage('Route cleared. Tap the map to set a start point.');
  }

  return (
    <View style={styles.screen}>
      <MapView
        style={styles.map}
        initialRegion={SEOUL_REGION}
        region={region}
        onPress={(event) => handleMapPress(event.nativeEvent.coordinate)}
        showsUserLocation={permissionStatus === Location.PermissionStatus.GRANTED}
        showsMyLocationButton={false}>
        {startPoint && (
          <Marker
            coordinate={startPoint}
            title="Start"
            description="Running start point"
            pinColor="#2D7A46"
          />
        )}
        {finishPoint && (
          <Marker
            coordinate={finishPoint}
            title="Finish"
            description="Running finish point"
            pinColor="#F36F45"
          />
        )}
        {routePreview && (
          <Polyline
            coordinates={routePreview.coordinates}
            strokeColor="#17211B"
            strokeWidth={4}
          />
        )}
        {routeSpots.map((spot) => (
          <Marker
            key={spot.id}
            coordinate={{ latitude: spot.latitude, longitude: spot.longitude }}
            title={spot.name}
            description={
              routePreview
                ? `${Math.round(spot.distanceFromRouteMeters)} m from route`
                : spot.address
            }
            pinColor={spotColors[spot.type]}
          />
        ))}
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
                Set Start
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
                Set Finish
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
            <ThemedText type="smallBold">Preview distance</ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {routePreview
                ? `${formatDistance(routePreview.distanceMeters)} / ${formatDuration(
                    routePreview.durationSeconds
                  )} ${routeSourceLabel}`
                : isRouting
                  ? 'Calculating...'
                  : 'Set both points'}
            </ThemedText>
          </View>
        </ThemedView>

        <View style={styles.flexSpacer} />

        <ThemedView type="backgroundElement" style={styles.bottomPanel}>
          <View style={styles.bottomHeader}>
            <View style={styles.bottomTitle}>
              <ThemedText type="smallBold">Runner spots on route</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {isLoadingSpots ? 'Loading Seoul open data...' : routeSpotSummary}
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
              No sample spots are within 500 m of this preview route.
            </ThemedText>
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
                Next: {selectionMode === 'start' ? 'Finish' : 'Start'}
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
