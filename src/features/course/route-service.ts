import { NearbyRunnerSpot, RoutePoint, RoutePreview, RunnerSpot } from '@/types/runspot';

type OsrmRouteResponse = {
  code: string;
  routes?: {
    distance: number;
    duration: number;
    geometry: {
      coordinates: [number, number][];
    };
  }[];
};

export function calculateStraightDistanceMeters(start: RoutePoint, finish: RoutePoint) {
  const earthRadiusMeters = 6371000;
  const latDelta = ((finish.latitude - start.latitude) * Math.PI) / 180;
  const lngDelta = ((finish.longitude - start.longitude) * Math.PI) / 180;
  const startLat = (start.latitude * Math.PI) / 180;
  const finishLat = (finish.latitude * Math.PI) / 180;

  const a =
    Math.sin(latDelta / 2) * Math.sin(latDelta / 2) +
    Math.cos(startLat) *
      Math.cos(finishLat) *
      Math.sin(lngDelta / 2) *
      Math.sin(lngDelta / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return earthRadiusMeters * c;
}

function distanceToSegmentMeters(point: RoutePoint, segmentStart: RoutePoint, segmentEnd: RoutePoint) {
  const metersPerDegreeLat = 111320;
  const metersPerDegreeLng = 111320 * Math.cos((point.latitude * Math.PI) / 180);
  const pointX = point.longitude * metersPerDegreeLng;
  const pointY = point.latitude * metersPerDegreeLat;
  const startX = segmentStart.longitude * metersPerDegreeLng;
  const startY = segmentStart.latitude * metersPerDegreeLat;
  const endX = segmentEnd.longitude * metersPerDegreeLng;
  const endY = segmentEnd.latitude * metersPerDegreeLat;
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY;

  if (segmentLengthSquared === 0) {
    return calculateStraightDistanceMeters(point, segmentStart);
  }

  const projection = Math.max(
    0,
    Math.min(1, ((pointX - startX) * segmentX + (pointY - startY) * segmentY) / segmentLengthSquared)
  );
  const closestX = startX + projection * segmentX;
  const closestY = startY + projection * segmentY;
  const dx = pointX - closestX;
  const dy = pointY - closestY;

  return Math.sqrt(dx * dx + dy * dy);
}

export function distanceFromRouteMeters(point: RoutePoint, routeCoordinates: RoutePoint[]) {
  if (routeCoordinates.length === 0) {
    return Number.POSITIVE_INFINITY;
  }

  if (routeCoordinates.length === 1) {
    return calculateStraightDistanceMeters(point, routeCoordinates[0]);
  }

  let shortestDistance = Number.POSITIVE_INFINITY;

  for (let index = 1; index < routeCoordinates.length; index += 1) {
    const distance = distanceToSegmentMeters(
      point,
      routeCoordinates[index - 1],
      routeCoordinates[index]
    );
    shortestDistance = Math.min(shortestDistance, distance);
  }

  return shortestDistance;
}

export function filterSpotsNearRoute(
  spots: RunnerSpot[],
  routeCoordinates: RoutePoint[],
  radiusMeters = 500
): NearbyRunnerSpot[] {
  return spots
    .map((spot) => ({
      ...spot,
      distanceFromRouteMeters: distanceFromRouteMeters(
        { latitude: spot.latitude, longitude: spot.longitude },
        routeCoordinates
      ),
    }))
    .filter((spot) => spot.distanceFromRouteMeters <= radiusMeters)
    .sort((a, b) => a.distanceFromRouteMeters - b.distanceFromRouteMeters);
}

export function buildFallbackRoute(start: RoutePoint, finish: RoutePoint): RoutePreview {
  const distanceMeters = calculateStraightDistanceMeters(start, finish);

  return {
    coordinates: [start, finish],
    distanceMeters,
    durationSeconds: (distanceMeters / 1000 / 7) * 3600,
    source: 'fallback',
  };
}

export async function fetchRoutePreview(
  start: RoutePoint,
  finish: RoutePoint
): Promise<RoutePreview> {
  const path = `${start.longitude},${start.latitude};${finish.longitude},${finish.latitude}`;
  const url = `https://router.project-osrm.org/route/v1/foot/${path}?overview=full&geometries=geojson`;

  try {
    const response = await fetch(url);

    if (!response.ok) {
      return buildFallbackRoute(start, finish);
    }

    const data = (await response.json()) as OsrmRouteResponse;
    const route = data.routes?.[0];

    if (data.code !== 'Ok' || !route) {
      return buildFallbackRoute(start, finish);
    }

    return {
      coordinates: route.geometry.coordinates.map(([longitude, latitude]) => ({
        latitude,
        longitude,
      })),
      distanceMeters: route.distance,
      durationSeconds: route.duration,
      source: 'osrm',
    };
  } catch {
    return buildFallbackRoute(start, finish);
  }
}
