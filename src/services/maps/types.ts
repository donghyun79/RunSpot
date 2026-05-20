import { RoutePoint, SpotType } from '@/types/runspot';

export type MapProviderId = 'react-native-maps' | 'kakao';

export type PlaceDataProviderId = 'firestore' | 'seoul-open-data' | 'kakao-local';

export type RouteHandoffProviderId = 'kakao-map';

export type RoutePreviewProviderId = 'osrm' | 'straight-line';

export type MapProviderPlan = {
  renderer: {
    current: MapProviderId;
    target: MapProviderId;
  };
  placeData: {
    primary: PlaceDataProviderId[];
  };
  routePreview: {
    current: RoutePreviewProviderId[];
  };
  routeHandoff: {
    primary: RouteHandoffProviderId;
  };
};

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

export type KeywordPlaceSearchRequest = {
  query: string;
  center?: RoutePoint;
  radiusMeters?: number;
};

export type KeywordPlaceSearchResult = {
  id: string;
  name: string;
  address: string;
  detail?: string;
  source: 'address' | 'keyword';
  latitude: number;
  longitude: number;
};

export type ExternalRouteRequest = {
  origin: RoutePoint;
  destination: RoutePoint;
  mode: ReturnRouteMode;
};
