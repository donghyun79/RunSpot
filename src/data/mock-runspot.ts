import { Favorite, PublicSpot, RunSpotUserProfile, UserReport } from '@/types/runspot';

export const mockPublicSpots: PublicSpot[] = [
  {
    id: 'spot-water-yeouido-001',
    type: 'water',
    name: '여의도 한강공원 음수대',
    address: '서울 영등포구 여의도동 여의도한강공원',
    latitude: 37.526,
    longitude: 126.932,
    openingHours: '상시 이용',
    isPublic: true,
    source: 'publicData',
    verifiedStatus: 'verified',
    updatedAt: '2026-05-17T00:00:00.000Z',
  },
  {
    id: 'spot-restroom-yeouido-001',
    type: 'restroom',
    name: '여의도 한강공원 공중화장실',
    address: '서울 영등포구 여의도동 여의도한강공원 인근',
    latitude: 37.527,
    longitude: 126.934,
    openingHours: '상시 이용',
    isPublic: true,
    source: 'publicData',
    verifiedStatus: 'verified',
    updatedAt: '2026-05-17T00:00:00.000Z',
  },
  {
    id: 'spot-convenience-yeouido-001',
    type: 'convenience',
    name: '여의도 코스 인근 편의점',
    address: '서울 영등포구 여의도동',
    latitude: 37.525,
    longitude: 126.936,
    isPublic: true,
    source: 'admin',
    verifiedStatus: 'verified',
    updatedAt: '2026-05-17T00:00:00.000Z',
  },
];

export const mockUserProfile: RunSpotUserProfile = {
  uid: 'mock-user-001',
  nickname: '서울 러너',
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
    content: '운영시간 확인이 필요합니다.',
    status: 'pending',
    createdAt: '2026-05-17T00:00:00.000Z',
  },
];
