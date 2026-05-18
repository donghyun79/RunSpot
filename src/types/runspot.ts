export type PublicSpotType = 'water' | 'restroom' | 'shower' | 'convenience';
export type SpotType = PublicSpotType | 'bike' | 'transit';
export type SpotSource = 'publicData' | 'userReport' | 'admin';
export type VerifiedStatus = 'pending' | 'verified' | 'rejected';

export type RunnerSpot = {
  id: string;
  type: SpotType;
  name: string;
  latitude: number;
  longitude: number;
  address?: string;
  openingHours?: string;
  isPublic?: boolean;
  detail?: string;
  source: string;
  verifiedStatus?: VerifiedStatus;
  updatedAt: string;
};

export type PublicSpot = {
  id: string;
  type: PublicSpotType;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
  openingHours?: string;
  isPublic: boolean;
  source: SpotSource;
  verifiedStatus: VerifiedStatus;
  updatedAt: string;
};

export type Spot = PublicSpot;

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

export type LoginProvider = 'email' | 'google' | 'apple' | 'kakao';
export type UserRole = 'user' | 'admin';

export type FavoriteLabel = 'home' | 'work' | 'courseStart' | 'custom';
export type SavedPlaceKind = FavoriteLabel | 'frequentStart';

export type LocationPrivacyLevel = 'exactEncrypted' | 'approximateDong' | 'nearbyLandmark';

export type SavedPlace = {
  id: string;
  kind: SavedPlaceKind;
  label: string;
  privacyLevel: LocationPrivacyLevel;
  approximateLabel?: string;
  encryptedCoordinates?: string;
  nearbyRoutePoint?: RoutePoint;
  createdAt: string;
  updatedAt: string;
};

export type UserReportType = 'spotMissing' | 'spotClosed' | 'spotWrongInfo' | 'routeIssue';
export type UserReportStatus = 'pending' | 'approved' | 'rejected';

export type UserReport = {
  id: string;
  userId: string;
  reportType: UserReportType;
  status: UserReportStatus;
  spotId?: string;
  content?: string;
  photoUrl?: string;
  createdAt: string;
};

export type RunSpotUserProfile = {
  uid: string;
  nickname: string;
  email?: string;
  role: UserRole;
  createdAt: string;
};

export type UserProfile = RunSpotUserProfile;

export type Favorite = {
  userId: string;
  spotId: string;
  label: FavoriteLabel;
  createdAt: string;
};

export type Report = UserReport;
