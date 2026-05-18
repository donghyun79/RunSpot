import { Favorite, PublicSpot, RunSpotUserProfile, UserReport } from '@/types/runspot';

export const mockPublicSpots: PublicSpot[] = [
  {
    id: 'spot-water-yeouido-001',
    type: 'water',
    name: 'Yeouido Hangang Drinking Fountain',
    address: 'Yeouido Hangang Park, Seoul',
    latitude: 37.526,
    longitude: 126.932,
    openingHours: 'Always open',
    isPublic: true,
    source: 'publicData',
    verifiedStatus: 'verified',
    updatedAt: '2026-05-17T00:00:00.000Z',
  },
  {
    id: 'spot-restroom-yeouido-001',
    type: 'restroom',
    name: 'Yeouido Public Restroom',
    address: 'Near Yeouido Hangang Park, Seoul',
    latitude: 37.527,
    longitude: 126.934,
    openingHours: 'Always open',
    isPublic: true,
    source: 'publicData',
    verifiedStatus: 'verified',
    updatedAt: '2026-05-17T00:00:00.000Z',
  },
  {
    id: 'spot-convenience-yeouido-001',
    type: 'convenience',
    name: 'Convenience Store Near Course',
    address: 'Yeouido-dong, Seoul',
    latitude: 37.525,
    longitude: 126.936,
    isPublic: false,
    source: 'admin',
    verifiedStatus: 'verified',
    updatedAt: '2026-05-17T00:00:00.000Z',
  },
];

export const mockUserProfile: RunSpotUserProfile = {
  uid: 'mock-user-001',
  nickname: 'Seoul Runner',
  email: 'runner@example.com',
  role: 'user',
  createdAt: '2026-05-17T00:00:00.000Z',
};

export const mockFavorites: Favorite[] = [
  {
    userId: mockUserProfile.uid,
    spotId: mockPublicSpots[0].id,
    label: 'courseStart',
    createdAt: '2026-05-17T00:00:00.000Z',
  },
];

export const mockReports: UserReport[] = [
  {
    id: 'report-mock-001',
    userId: mockUserProfile.uid,
    spotId: mockPublicSpots[1].id,
    reportType: 'spotWrongInfo',
    content: 'Opening hours need review.',
    status: 'pending',
    createdAt: '2026-05-17T00:00:00.000Z',
  },
];
