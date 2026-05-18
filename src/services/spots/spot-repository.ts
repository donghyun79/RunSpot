import { mockPublicSpots } from '@/data/mock-runspot';
import { readCache, writeCache } from '@/services/reliability/cache';
import { PublicSpot } from '@/types/runspot';

const PUBLIC_SPOTS_CACHE_KEY = 'runspot:public-spots';

export async function getPublicSpots(): Promise<PublicSpot[]> {
  try {
    await writeCache(PUBLIC_SPOTS_CACHE_KEY, mockPublicSpots);

    return mockPublicSpots;
  } catch {
    const cached = await readCache<PublicSpot[]>(PUBLIC_SPOTS_CACHE_KEY);

    return cached?.value ?? mockPublicSpots;
  }
}
