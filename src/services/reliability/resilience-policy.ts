export const resiliencePrinciples = [
  'Map rendering must not depend on remote data success.',
  'Location permission failure must fall back to Seoul default and visible spot lists.',
  'Firebase failure must fall back to cached data where available.',
  'Public data sources must fail independently.',
  'Notification failure must fall back to on-screen guidance.',
  'Report upload failure must queue locally and retry later.',
] as const;

export const independentPublicDataSources = [
  'bikeStations',
  'waterFountains',
  'restrooms',
  'showers',
  'convenienceStores',
] as const;
