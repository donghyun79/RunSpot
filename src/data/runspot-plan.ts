import { RunPlanStep, RunnerSpot } from '@/types/runspot';

export const launchPlanSteps: RunPlanStep[] = [
  {
    id: 'stage-1-map-location-mock-spots',
    title: '1. Map, current location, and mock spots',
    description: 'Render the native map, handle current location, and show mock runner-friendly spots.',
    status: 'ready',
  },
  {
    id: 'stage-2-distance-list-detail',
    title: '2. Distance-sorted list and detail view',
    description: 'Sort nearby spots by distance and show a focused detail view for each spot.',
    status: 'ready',
  },
  {
    id: 'stage-3-firebase-authentication',
    title: '3. Firebase Authentication',
    description: 'Add user sign-in while preserving minimal personal data collection.',
    status: 'next',
  },
  {
    id: 'stage-4-firestore-spots',
    title: '4. Firestore spots connection',
    description: 'Read public spot data from Firestore with local mock and cache fallback.',
    status: 'later',
  },
  {
    id: 'stage-5-favorites-home',
    title: '5. Favorites and home saving',
    description: 'Let users save favorites, home, work, and course starts with privacy-safe defaults.',
    status: 'later',
  },
  {
    id: 'stage-6-reports',
    title: '6. User reports',
    description: 'Allow signed-in users to submit reports and queue failed uploads for retry.',
    status: 'later',
  },
  {
    id: 'stage-7-app-check-rules',
    title: '7. App Check and Security Rules',
    description: 'Enable App Check enforcement and deploy Firestore and Storage security rules.',
    status: 'later',
  },
  {
    id: 'stage-8-crashlytics-analytics',
    title: '8. Crashlytics and Analytics',
    description: 'Add crash reporting and privacy-conscious analytics for production readiness.',
    status: 'later',
  },
  {
    id: 'stage-9-test-distribution',
    title: '9. Android and iOS test distribution',
    description: 'Build EAS test releases for Android and iOS devices.',
    status: 'later',
  },
];

export const sampleRunnerSpots: RunnerSpot[] = [
  {
    id: 'water-arisu-sample',
    type: 'water',
    name: 'Arisu drinking fountain',
    latitude: 37.526,
    longitude: 126.932,
    address: 'Near Yeouido Hangang Park, Seoul',
    source: 'sample',
    updatedAt: '2026-05-17',
  },
  {
    id: 'restroom-public-sample',
    type: 'restroom',
    name: 'Public restroom',
    latitude: 37.527,
    longitude: 126.934,
    address: 'Near a public facility in Seoul',
    source: 'sample',
    updatedAt: '2026-05-17',
  },
  {
    id: 'bike-ddareungi-sample',
    type: 'bike',
    name: 'Ddareungi station',
    latitude: 37.525,
    longitude: 126.936,
    address: 'Near the run finish area',
    source: 'sample',
    updatedAt: '2026-05-17',
  },
];
