import { RoutePoint } from '@/types/runspot';

const DONG_LEVEL_DECIMAL_PLACES = 3;

export function toApproximateRoutePoint(point: RoutePoint): RoutePoint {
  return {
    latitude: Number(point.latitude.toFixed(DONG_LEVEL_DECIMAL_PLACES)),
    longitude: Number(point.longitude.toFixed(DONG_LEVEL_DECIMAL_PLACES)),
  };
}

export function buildApproximateLocationLabel(point: RoutePoint) {
  const approximatePoint = toApproximateRoutePoint(point);

  return `${approximatePoint.latitude.toFixed(DONG_LEVEL_DECIMAL_PLACES)}, ${approximatePoint.longitude.toFixed(
    DONG_LEVEL_DECIMAL_PLACES
  )} 근처`;
}
