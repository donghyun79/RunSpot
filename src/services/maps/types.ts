import { RoutePoint, SpotType } from '@/types/runspot';

export type MapProviderId = 'react-native-maps' | 'kakao';

export type ReturnRouteMode = 'publictransit' | 'bicycle' | 'foot';

export type ReturnRouteOption = {
  id: ReturnRouteMode;
  label: string;
  description: string;
};

export type PlaceCategory = Extract<SpotType, 'convenience' | 'transit'>;

export type PlaceSearchRequest = {
  center: RoutePoint;
  radiusMeters: number;
  category: PlaceCategory;
};

export type ExternalRouteRequest = {
  origin: RoutePoint;
  destination: RoutePoint;
  mode: ReturnRouteMode;
};
