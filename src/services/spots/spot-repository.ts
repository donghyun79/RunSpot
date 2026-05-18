import { collection, getDocs, limit, query, where } from 'firebase/firestore';

import { mockPublicSpots } from '@/data/mock-runspot';
import { getRunSpotFirebaseServices } from '@/services/firebase/app';
import { readCache, writeCache } from '@/services/reliability/cache';
import { PublicSpot } from '@/types/runspot';

const PUBLIC_SPOTS_CACHE_KEY = 'runspot:public-spots';
const PUBLIC_SPOTS_LIMIT = 200;

export type PublicSpotSource = 'firestore' | 'cache' | 'mock';

export type PublicSpotResult = {
  spots: PublicSpot[];
  source: PublicSpotSource;
  updatedAt?: string;
};

function isPublicSpot(value: unknown): value is PublicSpot {
  const spot = value as PublicSpot;

  return Boolean(
    spot &&
      typeof spot.id === 'string' &&
      ['water', 'restroom', 'shower', 'convenience'].includes(spot.type) &&
      typeof spot.name === 'string' &&
      typeof spot.address === 'string' &&
      typeof spot.latitude === 'number' &&
      typeof spot.longitude === 'number' &&
      typeof spot.isPublic === 'boolean' &&
      ['publicData', 'userReport', 'admin'].includes(spot.source) &&
      ['pending', 'verified', 'rejected'].includes(spot.verifiedStatus) &&
      typeof spot.updatedAt === 'string'
  );
}

async function readFirestorePublicSpots(): Promise<PublicSpot[]> {
  const services = getRunSpotFirebaseServices();

  if (!services) {
    return [];
  }

  const spotsQuery = query(
    collection(services.firestore, 'spots'),
    where('verifiedStatus', '==', 'verified'),
    limit(PUBLIC_SPOTS_LIMIT)
  );
  const snapshot = await getDocs(spotsQuery);

  return snapshot.docs
    .map((document) => ({ id: document.id, ...document.data() }))
    .filter(isPublicSpot)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getPublicSpots(): Promise<PublicSpot[]> {
  const result = await getPublicSpotsWithSource();

  return result.spots;
}

export async function getPublicSpotsWithSource(): Promise<PublicSpotResult> {
  try {
    const firestoreSpots = await readFirestorePublicSpots();

    if (firestoreSpots.length > 0) {
      await writeCache(PUBLIC_SPOTS_CACHE_KEY, firestoreSpots);

      return {
        spots: firestoreSpots,
        source: 'firestore',
      };
    }
  } catch {
    // Firestore failures fall through to cached or bundled data.
  }

  const cached = await readCache<PublicSpot[]>(PUBLIC_SPOTS_CACHE_KEY);

  if (cached?.value.length) {
    return {
      spots: cached.value,
      source: 'cache',
      updatedAt: cached.updatedAt,
    };
  }

  await writeCache(PUBLIC_SPOTS_CACHE_KEY, mockPublicSpots);

  return {
    spots: mockPublicSpots,
    source: 'mock',
  };
}
