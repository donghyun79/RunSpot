import { mockFavorites, mockReports, mockUserProfile } from '@/data/mock-runspot';
import { Favorite, RunSpotUserProfile, UserReport } from '@/types/runspot';

export async function getCurrentMockUserProfile(): Promise<RunSpotUserProfile> {
  return mockUserProfile;
}

export async function getMockFavorites(): Promise<Favorite[]> {
  return mockFavorites;
}

export async function getMockReports(): Promise<UserReport[]> {
  return mockReports;
}
