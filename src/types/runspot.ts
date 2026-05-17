export type SpotType = 'water' | 'toilet' | 'shower' | 'convenience' | 'bike' | 'transit';

export type RunnerSpot = {
  id: string;
  type: SpotType;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  detail?: string;
  source: string;
  updatedAt: string;
};

export type NearbyRunnerSpot = RunnerSpot & {
  distanceFromRouteMeters: number;
};

export type RouteMode = 'pointToPoint' | 'roundTrip';

export type RoutePoint = {
  latitude: number;
  longitude: number;
};

export type RoutePreview = {
  coordinates: RoutePoint[];
  distanceMeters: number;
  durationSeconds: number;
  source: 'osrm' | 'fallback';
};

export type RunPlanStep = {
  id: string;
  title: string;
  description: string;
  status: 'ready' | 'next' | 'later';
};
