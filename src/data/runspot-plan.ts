import { RunPlanStep, RunnerSpot } from '@/types/runspot';

export const launchPlanSteps: RunPlanStep[] = [
  {
    id: 'map',
    title: 'Map and current location',
    description: 'The first screen should help runners confirm where they are and begin planning.',
    status: 'next',
  },
  {
    id: 'route',
    title: 'Start and finish route planning',
    description: 'Show distance, estimated time, and useful spots around the selected route.',
    status: 'later',
  },
  {
    id: 'return',
    title: 'Return route options',
    description: 'Combine Seoul Bike and public transit options for the trip back after the run.',
    status: 'later',
  },
  {
    id: 'hydration',
    title: 'Hydration guidance',
    description: 'Use temperature, humidity, air quality, and run duration to suggest water stops.',
    status: 'later',
  },
];

export const sampleRunnerSpots: RunnerSpot[] = [
  {
    id: 'water-arisu-sample',
    type: 'water',
    name: 'Arisu water fountain',
    latitude: 37.526,
    longitude: 126.932,
    address: 'Near Seoul Hangang Park',
    source: 'sample',
    updatedAt: '2026-05-17',
  },
  {
    id: 'toilet-public-sample',
    type: 'toilet',
    name: 'Public toilet',
    latitude: 37.527,
    longitude: 126.934,
    address: 'Near Seoul public facility',
    source: 'sample',
    updatedAt: '2026-05-17',
  },
  {
    id: 'bike-ddareungi-sample',
    type: 'bike',
    name: 'Seoul Bike station',
    latitude: 37.525,
    longitude: 126.936,
    address: 'Around the run finish point',
    source: 'sample',
    updatedAt: '2026-05-17',
  },
];
