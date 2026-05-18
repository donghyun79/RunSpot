export const requiredUserProfileFields = [
  'uid',
  'nickname',
  'email',
  'role',
  'createdAt',
] as const;

export const optionalSensitivePlaceKinds = ['home', 'work', 'frequentStart'] as const;

export const firestoreCollections = {
  users: 'users',
  spots: 'spots',
  reports: 'reports',
  favorites: 'favorites',
  savedPlaces: 'savedPlaces',
  savedCourses: 'savedCourses',
} as const;

export const firestoreAccessModel = {
  users: 'owner-only-personal-data-admin-support',
  spots: 'public-read-admin-write',
  reports: 'signed-in-create-owner-read-admin-approve-delete',
  favorites: 'owner-only-subcollection',
  savedPlaces: 'owner-only-subcollection',
  savedCourses: 'owner-only-subcollection',
} as const;

export const dataModelFields = {
  spots: [
    'id',
    'type',
    'name',
    'address',
    'latitude',
    'longitude',
    'openingHours',
    'isPublic',
    'source',
    'verifiedStatus',
    'updatedAt',
  ],
  users: ['uid', 'nickname', 'email', 'role', 'createdAt'],
  favorites: ['userId', 'spotId', 'label'],
  reports: ['userId', 'spotId', 'reportType', 'content', 'photoUrl', 'status', 'createdAt'],
} as const;

export const accessPrinciples = [
  'Personal data is readable and editable only by the owner.',
  'Public spot data is readable by everyone.',
  'Reports can be created only by signed-in users.',
  'Only admins can approve, reject, or delete reports.',
] as const;

export const sensitiveLocationStorageDefault = 'approximateDong';

export const realtimeLocationServerStorage = {
  enabledByDefault: false,
  allowed: false,
  reason: 'Current location and movement paths are processed on-device by default.',
} as const;

export const serverStoredLocationData = [
  'favoritePlaces',
  'userReports',
  'savedCourses',
  'optionalApproximatePlaces',
] as const;

export const nonStoredLocationData = [
  'liveCurrentLocation',
  'liveMovementPath',
  'backgroundLocationStream',
] as const;

export const appCheckPolicy = {
  required: true,
  protectedServices: ['firestore', 'storage', 'cloudFunctions'],
  enforcement: 'enable-before-production',
} as const;

export const cloudFunctionOnlyOperations = [
  'reportApproval',
  'reportSignalAggregation',
  'adminActions',
  'externalApiCalls',
  'scheduledPublicDataUpdates',
  'rankingAndStatistics',
] as const;

export const clientAllowedOperations = [
  'createPendingReport',
  'manageOwnFavorites',
  'manageOwnApproximateSavedPlaces',
  'readPublicSpots',
] as const;
