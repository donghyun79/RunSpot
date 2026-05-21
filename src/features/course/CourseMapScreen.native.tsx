import * as Location from 'expo-location';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import WebView, { WebViewMessageEvent } from 'react-native-webview';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { BottomTabInset, Spacing } from '@/constants/theme';
import { fetchSeoulRunnerSpots, hasSeoulOpenDataKey } from '@/features/spots/seoul-open-data';
import { useFavorites } from '@/hooks/use-favorites';
import { useReports } from '@/hooks/use-reports';
import { useRunSpotAuth } from '@/hooks/use-runspot-auth';
import { openKakaoMapRoute } from '@/services/maps/kakao-map-links';
import {
  fetchKakaoCategoryPlaces,
  fetchKakaoCoordinateAddress,
  fetchKakaoKeywordPlaces,
  hasKakaoLocalKey,
} from '@/services/maps/kakao-places';
import { returnRouteOptions } from '@/services/maps/map-provider';
import { KeywordPlaceSearchResult, ReturnRouteMode } from '@/services/maps/types';
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

type Region = LatLng & {
  latitudeDelta: number;
  longitudeDelta: number;
};

type DisplaySpot = RunnerSpot & {
  distanceFromFocusMeters: number;
  distanceFromRouteMeters?: number;
};

type PointMode = 'start' | 'finish';
type RoutePreference = 'bikeRoad' | 'shortest';

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
const KAKAO_JAVASCRIPT_KEY = process.env.EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY;
const spotLabels: Record<SpotType, string> = copy.spots.typeLabels;

const spotColors: Record<SpotType, string> = {
  water: '#208AEF',
  restroom: '#6D5BD0',
  shower: '#00A389',
  convenience: '#F36F45',
  bike: '#2D7A46',
  transit: '#17211B',
};

function formatRoutePointLabel(point: LatLng | null, label: string | null) {
  if (!point) {
    return copy.course.tapMapToSet;
  }

  return label ?? copy.course.selectedMapPoint;
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

function buildKakaoMapHtml({
  appKey,
  center,
  spots,
  route,
  start,
  finish,
}: {
  appKey: string;
  center: LatLng;
  spots: DisplaySpot[];
  route: LatLng[];
  start: LatLng | null;
  finish: LatLng | null;
}) {
  const payload = JSON.stringify({
    center,
    spots: spots.map((spot) => ({
      id: spot.id,
      name: spot.name,
      type: spot.type,
      latitude: spot.latitude,
      longitude: spot.longitude,
    })),
    route,
    start,
    finish,
    colors: spotColors,
    labels: {
      start: copy.course.start,
      finish: copy.course.finish,
    },
  }).replace(/</g, '\\u003c');

  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="initial-scale=1, maximum-scale=1, user-scalable=no, width=device-width" />
    <style>
      html, body, #map { width: 100%; height: 100%; margin: 0; padding: 0; background: #EAF2E9; }
      .marker {
        width: 18px;
        height: 18px;
        border: 3px solid #ffffff;
        border-radius: 999px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.25);
        transform: translate(-50%, -50%);
      }
      .point {
        min-width: 54px;
        min-height: 28px;
        padding: 5px 9px;
        border-radius: 999px;
        background: #17211B;
        color: #ffffff;
        font: 700 13px/1.2 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        box-shadow: 0 2px 10px rgba(0,0,0,0.24);
        transform: translate(-50%, -100%);
        text-align: center;
      }
      .finish { background: #F36F45; }
      .empty {
        display: grid;
        place-items: center;
        height: 100%;
        padding: 24px;
        box-sizing: border-box;
        color: #17211B;
        font: 700 15px/1.4 system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        text-align: center;
      }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script>
      const payload = ${payload};
      const post = (message) => window.ReactNativeWebView?.postMessage(JSON.stringify(message));
      window.onerror = (message, source, lineno, colno, error) => {
        post({
          type: 'error',
          message: String(error?.message || message || 'Kakao map script error'),
        });
      };

      function startKakaoMap() {
        if (!window.kakao?.maps) {
          post({ type: 'error', message: 'Kakao Maps SDK was not available after load.' });
          return;
        }

        kakao.maps.load(() => {
          const toLatLng = (point) => new kakao.maps.LatLng(point.latitude, point.longitude);

          function createDotOverlay(map, spot) {
            const element = document.createElement('button');
            element.className = 'marker';
            element.title = spot.name;
            element.style.background = payload.colors[spot.type] || '#208AEF';
            element.style.border = '3px solid #ffffff';
            element.style.padding = '0';
            element.style.appearance = 'none';
            element.addEventListener('click', (event) => {
              event.preventDefault();
              event.stopPropagation();
              post({ type: 'spotPress', spotId: spot.id });
            });

            const overlay = new kakao.maps.CustomOverlay({
              position: toLatLng(spot),
              content: element,
              yAnchor: 0.5,
              zIndex: 4,
            });
            overlay.setMap(map);
          }

          function createPointOverlay(map, point, label, className) {
            if (!point) return;
            const element = document.createElement('div');
            element.className = 'point ' + className;
            element.textContent = label;
            const overlay = new kakao.maps.CustomOverlay({
              position: toLatLng(point),
              content: element,
              yAnchor: 1,
              zIndex: 6,
            });
            overlay.setMap(map);
          }

          const map = new kakao.maps.Map(document.getElementById('map'), {
            center: toLatLng(payload.center),
            level: 5,
          });
          window.runspotMap = map;
          window.runspotFocus = (latitude, longitude, level) => {
            map.panTo(new kakao.maps.LatLng(latitude, longitude));
            if (level) map.setLevel(level);
          };
          window.runspotRelayout = () => {
            map.relayout();
            map.setCenter(toLatLng(payload.center));
          };
          window.runspotSearchPlace = (query, latitude, longitude) => {
            const places = new kakao.maps.services.Places();
            const geocoder = new kakao.maps.services.Geocoder();
            const center = new kakao.maps.LatLng(latitude, longitude);
            const options = {
              location: center,
              radius: 20000,
              size: 5,
              sort: kakao.maps.services.SortBy.DISTANCE,
            };

            const normalizePlace = (place) => ({
              id: 'js-keyword-' + (place.id || place.place_name || place.x + '-' + place.y),
              name: place.place_name,
              address: place.road_address_name || place.address_name || '',
              detail: place.category_group_name || place.category_name || '',
              source: 'keyword',
              latitude: Number(place.y),
              longitude: Number(place.x),
            });
            const normalizeAddress = (address) => ({
              id: 'js-address-' + address.x + '-' + address.y + '-' + address.address_name,
              name: address.road_address?.building_name || address.address_name,
              address: address.road_address?.address_name || address.address?.address_name || address.address_name,
              detail: address.address_type || '',
              source: 'address',
              latitude: Number(address.y),
              longitude: Number(address.x),
            });
            let keywordResults = [];
            let addressResults = [];
            let pending = 2;

            const finish = () => {
              pending -= 1;
              if (pending > 0) return;
              const merged = [...addressResults, ...keywordResults]
                .filter((place) => Number.isFinite(place.latitude) && Number.isFinite(place.longitude))
                .slice(0, 5);
              post({ type: 'placeSearchResults', results: merged });
            };

            places.keywordSearch(query, (data, status) => {
              if (status === kakao.maps.services.Status.OK) {
                keywordResults = data.map(normalizePlace);
              }
              finish();
            }, options);
            geocoder.addressSearch(query, (data, status) => {
              if (status === kakao.maps.services.Status.OK) {
                addressResults = data.map(normalizeAddress);
              }
              finish();
            });
          };

          kakao.maps.event.addListener(map, 'click', (mouseEvent) => {
            const latLng = mouseEvent.latLng;
            post({
              type: 'mapPress',
              latitude: latLng.getLat(),
              longitude: latLng.getLng(),
            });
          });

          if (payload.route.length > 1) {
            new kakao.maps.Polyline({
              map,
              path: payload.route.map(toLatLng),
              strokeWeight: 5,
              strokeColor: '#17211B',
              strokeOpacity: 0.88,
              strokeStyle: 'solid',
            });
          }

          payload.spots.forEach((spot) => createDotOverlay(map, spot));
          createPointOverlay(map, payload.start, payload.labels.start, 'start');
          createPointOverlay(map, payload.finish, payload.labels.finish, 'finish');

          setTimeout(() => {
            map.relayout();
            map.setCenter(toLatLng(payload.center));
            post({ type: 'ready' });
          }, 250);
          setTimeout(() => {
            map.relayout();
            map.setCenter(toLatLng(payload.center));
          }, 900);
        });
      }

      const script = document.createElement('script');
      script.src = 'https://dapi.kakao.com/v2/maps/sdk.js?appkey=${encodeURIComponent(appKey)}&libraries=services&autoload=false';
      script.onload = startKakaoMap;
      script.onerror = () => post({ type: 'error', message: 'Failed to load Kakao Maps SDK script.' });
      document.head.appendChild(script);
    </script>
  </body>
</html>`;
}

export default function CourseMapScreen() {
  const auth = useRunSpotAuth();
  const favorites = useFavorites(auth.session?.profile.uid);
  const reports = useReports(auth.session?.profile.uid);
  const mapRef = useRef<WebView | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [selectionMode, setSelectionMode] = useState<PointMode>('finish');
  const [routePreference, setRoutePreference] = useState<RoutePreference>('bikeRoad');
  const [startPoint, setStartPoint] = useState<LatLng | null>(null);
  const [finishPoint, setFinishPoint] = useState<LatLng | null>(null);
  const [startLabel, setStartLabel] = useState<string | null>(null);
  const [finishLabel, setFinishLabel] = useState<string | null>(null);
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
  const [placeSearchQuery, setPlaceSearchQuery] = useState('');
  const [placeSearchResults, setPlaceSearchResults] = useState<KeywordPlaceSearchResult[]>([]);
  const [isSearchingPlaces, setIsSearchingPlaces] = useState(false);
  const [placeSearchMessage, setPlaceSearchMessage] = useState<string | null>(null);

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
  const routePreferenceMode: Extract<ReturnRouteMode, 'bicycle' | 'foot'> =
    routePreference === 'bikeRoad' ? 'bicycle' : 'foot';
  const routePreferenceLabel = copy.course.routePreferences[routePreference].label;
  const routePreferenceDescription = copy.course.routePreferences[routePreference].description;
  const routeSpotSummary = routePreview
    ? copy.spots.routeSummary(routeSpots.length)
    : copy.spots.visibleSummary(spotSummary);
  const selectedFavorite = selectedSpot ? favorites.favoriteBySpotId.get(selectedSpot.id) : null;

  const kakaoMapHtml = useMemo(
    () =>
      KAKAO_JAVASCRIPT_KEY
        ? buildKakaoMapHtml({
            appKey: KAKAO_JAVASCRIPT_KEY,
            center: focusPoint,
            spots: distanceSortedSpots,
            route: routePreview?.coordinates ?? [],
            start: startPoint,
            finish: finishPoint,
          })
        : null,
    [distanceSortedSpots, finishPoint, focusPoint, routePreview?.coordinates, startPoint]
  );

  const focusMap = useCallback((point: LatLng, delta = CURRENT_LOCATION_DELTA) => {
    const level = delta <= 0.01 ? 4 : delta <= CURRENT_LOCATION_DELTA ? 5 : 7;
    mapRef.current?.injectJavaScript(
      `window.runspotFocus?.(${point.latitude}, ${point.longitude}, ${level}); true;`
    );
  }, []);

  const resolveRoutePointLabel = useCallback(async (point: LatLng, fallback: string) => {
    if (!hasKakaoLocalKey()) {
      return fallback;
    }

    try {
      const result = await fetchKakaoCoordinateAddress({ point });

      return result?.name ?? fallback;
    } catch (error) {
      void recordNonFatalError(error, 'kakao_coordinate_address_lookup');
      return fallback;
    }
  }, []);

  function formatSearchPlaceLabel(place: KeywordPlaceSearchResult) {
    return place.name || place.address || copy.course.selectedMapPoint;
  }

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
        setStartLabel(null);
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
      setStartLabel(await resolveRoutePointLabel(nextPoint, copy.course.currentLocationLabel));
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
  }, [focusMap, resolveRoutePointLabel]);

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
          route_preference: routePreference,
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
  }, [finishPoint, routePreference, startPoint]);

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
      setStartLabel(copy.course.selectedMapPoint);
      void resolveRoutePointLabel(coordinate, copy.course.selectedMapPoint).then(setStartLabel);
      setSelectionMode('finish');
      setIsMapPickMode(false);
      setMessage(copy.course.startSet);
      return;
    }

    setFinishPoint(coordinate);
    setFinishLabel(copy.course.selectedMapPoint);
    void resolveRoutePointLabel(coordinate, copy.course.selectedMapPoint).then(setFinishLabel);
    setIsMapPickMode(false);
    setMessage(copy.course.finishSet);
  }

  function applyPlaceSearchResult(place: KeywordPlaceSearchResult) {
    Keyboard.dismiss();

    const coordinate = {
      latitude: place.latitude,
      longitude: place.longitude,
    };

    if (!isPointInSeoul(coordinate)) {
      setMessage(copy.course.seoulOnly);
      setPlaceSearchMessage(copy.course.placeSearchSeoulOnly);
      focusMap(SEOUL_REGION, 0.06);
      return;
    }

    setSelectedSpot(null);
    setIsMapPickMode(false);
    setPlaceSearchResults([]);
    setPlaceSearchQuery('');
    setPlaceSearchMessage(null);
    focusMap(coordinate);

    if (selectionMode === 'start') {
      setStartPoint(coordinate);
      setStartLabel(formatSearchPlaceLabel(place));
      setSelectionMode('finish');
      setMessage(copy.course.placeSearchStartSet(place.name));
      return;
    }

    setFinishPoint(coordinate);
    setFinishLabel(formatSearchPlaceLabel(place));
    setMessage(copy.course.placeSearchFinishSet(place.name));
  }

  async function searchRoutePlace() {
    const query = placeSearchQuery.trim();

    if (!query) {
      setPlaceSearchResults([]);
      setPlaceSearchMessage(copy.course.placeSearchEmpty);
      return;
    }

    Keyboard.dismiss();
    setIsSearchingPlaces(true);
    setPlaceSearchMessage(copy.course.searchingPlace);

    if (!hasKakaoLocalKey()) {
      mapRef.current?.injectJavaScript(
        `window.runspotSearchPlace?.(${JSON.stringify(query)}, ${focusPoint.latitude}, ${focusPoint.longitude}); true;`
      );
      return;
    }

    try {
      const results = await fetchKakaoKeywordPlaces({
        query,
        center: focusPoint,
        radiusMeters: 20000,
      });
      const seoulResults = results.filter((result) =>
        isPointInSeoul({ latitude: result.latitude, longitude: result.longitude })
      );

      setPlaceSearchResults(seoulResults.slice(0, 5));
      setPlaceSearchMessage(
        seoulResults.length > 0 ? null : copy.course.placeSearchNoResults
      );
    } catch (error) {
      void recordNonFatalError(error, 'kakao_keyword_place_search');
      setPlaceSearchResults([]);
      setPlaceSearchMessage(copy.course.placeSearchFailed);
    } finally {
      setIsSearchingPlaces(false);
    }
  }

  function handleMapMessage(event: WebViewMessageEvent) {
    try {
      const data = JSON.parse(event.nativeEvent.data) as
        | { type: 'ready' }
        | { type: 'error'; message: string }
        | { type: 'mapPress'; latitude: number; longitude: number }
        | { type: 'spotPress'; spotId: string }
        | { type: 'placeSearchResults'; results: KeywordPlaceSearchResult[] };

      if (data.type === 'ready') {
        setIsMapReady(true);
        return;
      }

      if (data.type === 'error') {
        setIsMapReady(true);
        setMessage(`${copy.maps.kakaoFailed}: ${data.message}`);
        return;
      }

      if (data.type === 'mapPress') {
        handleMapPress({ latitude: data.latitude, longitude: data.longitude });
        return;
      }

      if (data.type === 'spotPress') {
        const spot = distanceSortedSpots.find((item) => item.id === data.spotId);

        if (spot) {
          selectSpot(spot);
        }
        return;
      }

      if (data.type === 'placeSearchResults') {
        const seoulResults = data.results.filter((result) =>
          isPointInSeoul({ latitude: result.latitude, longitude: result.longitude })
        );

        setPlaceSearchResults(seoulResults.slice(0, 5));
        setPlaceSearchMessage(
          seoulResults.length > 0 ? null : copy.course.placeSearchNoResults
        );
        setIsSearchingPlaces(false);
      }
    } catch (error) {
      void recordNonFatalError(error, 'kakao_map_message_parse');
    }
  }

  function resetRoute() {
    setStartPoint(null);
    setFinishPoint(null);
    setStartLabel(null);
    setFinishLabel(null);
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

  async function openSelectedRoute() {
    if (!startPoint || !finishPoint) {
      setMessage(copy.course.returnRouteUnavailable);
      return;
    }

    try {
      await openKakaoMapRoute({
        origin: startPoint,
        destination: finishPoint,
        mode: routePreferenceMode,
      });
      void trackRunSpotEvent({
        name: 'route_handoff_opened',
        params: {
          mode: routePreferenceMode,
          route_preference: routePreference,
        },
      });
    } catch (error) {
      void recordNonFatalError(error, 'kakao_route_handoff_open');
      setMessage(copy.course.kakaoRouteFailed);
    }
  }

  function renderPlaceSearchControls() {
    return (
      <View style={styles.placeSearchSection}>
        <View style={styles.placeSearchRow}>
          <TextInput
            value={placeSearchQuery}
            onChangeText={setPlaceSearchQuery}
            placeholder={copy.course.placeSearchPlaceholder(
              selectionMode === 'start' ? copy.course.start : copy.course.finish
            )}
            placeholderTextColor="#6C7C70"
            returnKeyType="search"
            blurOnSubmit
            onSubmitEditing={() => void searchRoutePlace()}
            style={styles.placeSearchInput}
          />
          <Pressable
            disabled={isSearchingPlaces}
            onPress={() => void searchRoutePlace()}
            style={({ pressed }) => [
              styles.placeSearchButton,
              pressed && styles.pressed,
              isSearchingPlaces && styles.disabled,
            ]}>
            <ThemedText type="smallBold" style={styles.locationButtonText}>
              {isSearchingPlaces ? copy.course.searchingPlaceShort : copy.course.searchPlace}
            </ThemedText>
          </Pressable>
        </View>
        {placeSearchMessage ? (
          <ThemedText type="small" themeColor="textSecondary">
            {placeSearchMessage}
          </ThemedText>
        ) : null}
        {placeSearchResults.length > 0 ? (
          <View style={styles.placeResultList}>
            {placeSearchResults.map((place) => (
              <Pressable
                key={place.id}
                onPress={() => applyPlaceSearchResult(place)}
                style={({ pressed }) => [styles.placeResultRow, pressed && styles.pressed]}>
                <View style={styles.placeResultText}>
                  <ThemedText type="smallBold" numberOfLines={1}>
                    {place.name}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {place.address || place.detail || copy.spots.emptyAddress}
                  </ThemedText>
                  <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                    {place.source === 'address'
                      ? copy.course.addressSearchResult
                      : place.detail || copy.course.placeSearchResult}
                    {' / '}
                    {formatDistance(
                      calculateStraightDistanceMeters(
                        { latitude: place.latitude, longitude: place.longitude },
                        focusPoint
                      )
                    )}
                  </ThemedText>
                </View>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.mapLayer}>
        {kakaoMapHtml ? (
          <WebView
            ref={mapRef}
            source={{ html: kakaoMapHtml, baseUrl: 'https://runspot.local/' }}
            style={styles.map}
            containerStyle={styles.map}
            originWhitelist={['*']}
            javaScriptEnabled
            domStorageEnabled
            mixedContentMode="always"
            thirdPartyCookiesEnabled
            setSupportMultipleWindows={false}
            onMessage={handleMapMessage}
            onLoadStart={() => setIsMapReady(false)}
            onLayout={() => {
              mapRef.current?.injectJavaScript('window.runspotRelayout?.(); true;');
            }}
            onError={(event) => {
              setIsMapReady(true);
              setMessage(`${copy.maps.kakaoFailed}: ${event.nativeEvent.description}`);
            }}
          />
        ) : (
          <View style={[styles.map, styles.mapFallback]}>
            <ThemedView type="backgroundElement" style={styles.mapFallbackPanel}>
              <ThemedText type="smallBold">{copy.maps.kakaoKeyMissingTitle}</ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {copy.maps.kakaoKeyMissingDescription}
              </ThemedText>
            </ThemedView>
          </View>
        )}
      </View>

      {!isMapReady && (
        <View pointerEvents="none" style={styles.mapStatus}>
          <ThemedText type="smallBold" style={styles.mapStatusText}>
            {copy.maps.loading}
          </ThemedText>
        </View>
      )}

      <SafeAreaView pointerEvents="box-none" style={styles.overlay}>
        {isMapPickMode ? (
          <View style={styles.pickSheetWrapper}>
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
              {renderPlaceSearchControls()}
            </ThemedView>
          </View>
        ) : (
        <View style={styles.sheetWrapper}>
          <ScrollView
            style={styles.sheetScroller}
            contentContainerStyle={styles.sheetContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}>
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

          {renderPlaceSearchControls()}

          <View style={styles.routeRow}>
            <View style={styles.startDot} />
            <View style={styles.routeText}>
              <ThemedText type="smallBold" style={styles.routeLabel}>
                {copy.course.start}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {formatRoutePointLabel(startPoint, startLabel)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.routeRow}>
            <View style={styles.finishDot} />
            <View style={styles.routeText}>
              <ThemedText type="smallBold" style={styles.routeLabel}>
                {copy.course.finish}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary" numberOfLines={1}>
                {formatRoutePointLabel(finishPoint, finishLabel)}
              </ThemedText>
            </View>
          </View>
          <View style={styles.metricRow}>
            <ThemedText type="smallBold">{copy.course.estimatedRoute}</ThemedText>
            <View style={styles.routePreferenceRow}>
              {(Object.keys(copy.course.routePreferences) as RoutePreference[]).map(
                (preference) => (
                  <Pressable
                    key={preference}
                    onPress={() => setRoutePreference(preference)}
                    style={({ pressed }) => [
                      styles.preferenceButton,
                      routePreference === preference && styles.preferenceButtonActive,
                      pressed && styles.pressed,
                    ]}>
                    <ThemedText
                      type="smallBold"
                      style={
                        routePreference === preference && styles.preferenceButtonTextActive
                      }>
                      {copy.course.routePreferences[preference].label}
                    </ThemedText>
                  </Pressable>
                )
              )}
            </View>
            <ThemedText type="small" themeColor="textSecondary">
              {routePreferenceDescription}
            </ThemedText>
            <ThemedText type="small" themeColor="textSecondary">
              {routePreview
                ? `${formatDistance(routePreview.distanceMeters)} / ${formatDuration(
                    routePreview.durationSeconds
                  )} ${routeSourceLabel} / ${routePreferenceLabel}`
                : isRouting
                  ? copy.course.calculating
                  : copy.course.previewPrompt}
            </ThemedText>
            {startPoint && finishPoint ? (
              <Pressable
                onPress={openSelectedRoute}
                style={({ pressed }) => [styles.primaryRouteButton, pressed && styles.pressed]}>
                <ThemedText type="smallBold" style={styles.locationButtonText}>
                  {copy.course.openRouteInKakao(routePreferenceLabel)}
                </ThemedText>
              </Pressable>
            ) : null}
          </View>
        </ThemedView>

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
          </ScrollView>
        </View>
        )}
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#EAF2E9',
  },
  mapLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#EAF2E9',
  },
  map: {
    flex: 1,
    backgroundColor: '#EAF2E9',
  },
  mapFallback: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.four,
    backgroundColor: '#EAF2E9',
  },
  mapFallbackPanel: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.three,
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
    justifyContent: 'flex-end',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.three,
    paddingBottom: BottomTabInset + Spacing.two,
  },
  sheetWrapper: {
    width: '100%',
    maxHeight: '58%',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(247, 250, 246, 0.96)',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#17211B',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  pickSheetWrapper: {
    width: '100%',
    maxHeight: '42%',
    borderRadius: Spacing.three,
    backgroundColor: 'rgba(247, 250, 246, 0.97)',
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#17211B',
    shadowOpacity: 0.16,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
  },
  sheetScroller: {
    flexGrow: 0,
  },
  sheetContent: {
    gap: Spacing.one,
    padding: Spacing.two,
    paddingBottom: Spacing.three,
  },
  searchPanel: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
  },
  pickPanel: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
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
    minHeight: 44,
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
  placeSearchSection: {
    gap: Spacing.one,
  },
  placeSearchRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  placeSearchInput: {
    flex: 1,
    minHeight: 44,
    borderRadius: Spacing.two,
    backgroundColor: '#F4FAF5',
    color: '#17211B',
    paddingHorizontal: Spacing.three,
    fontSize: 14,
    fontWeight: '600',
  },
  placeSearchButton: {
    minWidth: 64,
    minHeight: 44,
    borderRadius: Spacing.two,
    backgroundColor: '#17211B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  placeResultList: {
    gap: Spacing.one,
  },
  placeResultRow: {
    minHeight: 46,
    borderRadius: Spacing.two,
    backgroundColor: '#EEF4EF',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  placeResultText: {
    gap: 2,
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
  routeLabel: {
    lineHeight: 18,
  },
  metricRow: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#9EB8A7',
    paddingTop: Spacing.two,
    gap: Spacing.one,
  },
  routePreferenceRow: {
    flexDirection: 'row',
    gap: Spacing.two,
  },
  preferenceButton: {
    flex: 1,
    minHeight: 36,
    borderRadius: Spacing.two,
    backgroundColor: '#DCE7DF',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.two,
  },
  preferenceButtonActive: {
    backgroundColor: '#17211B',
  },
  preferenceButtonTextActive: {
    color: '#FFFFFF',
  },
  primaryRouteButton: {
    minHeight: 42,
    borderRadius: Spacing.two,
    backgroundColor: '#17211B',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.three,
  },
  flexSpacer: {
    flex: 1,
  },
  bottomPanel: {
    gap: Spacing.two,
    padding: Spacing.three,
    borderRadius: Spacing.two,
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
