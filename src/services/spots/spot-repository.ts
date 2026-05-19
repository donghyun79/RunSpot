import { collection, getDocs, limit, query, Timestamp, where } from 'firebase/firestore';

import { mockPublicSpots } from '@/data/mock-runspot';
import { getRunSpotFirebaseServices } from '@/services/firebase/app';
import { readCache, writeCache } from '@/services/reliability/cache';
import { PublicSpot, PublicSpotType, SpotSource, VerifiedStatus } from '@/types/runspot';

const PUBLIC_SPOTS_CACHE_KEY = 'runspot:public-spots';
const PUBLIC_SPOTS_LIMIT = 200;

export type PublicSpotSource = 'firestore' | 'cache' | 'mock';

export type PublicSpotResult = {
  spots: PublicSpot[];
  source: PublicSpotSource;
  updatedAt?: string;
};

type FirestoreSpotDocument = {
  id?: unknown;
  type?: unknown;
  name?: unknown;
  address?: unknown;
  latitude?: unknown;
  longitude?: unknown;
  openingHours?: unknown;
  isPublic?: unknown;
  source?: unknown;
  verifiedStatus?: unknown;
  updatedAt?: unknown;
};

const publicSpotTypes = ['water', 'restroom', 'shower', 'convenience'] as const;
const spotSources = ['publicData', 'userReport', 'admin'] as const;
const verifiedStatuses = ['pending', 'verified', 'rejected'] as const;

function isPublicSpotType(value: unknown): value is PublicSpotType {
  return typeof value === 'string' && publicSpotTypes.includes(value as PublicSpotType);
}

function isSpotSource(value: unknown): value is SpotSource {
  return typeof value === 'string' && spotSources.includes(value as SpotSource);
}

function isVerifiedStatus(value: unknown): value is VerifiedStatus {
  return typeof value === 'string' && verifiedStatuses.includes(value as VerifiedStatus);
}

function toNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);

    return Number.isFinite(parsed) ? parsed : null;
  }

  return null;
}

function toIsoString(value: unknown): string | null {
  if (typeof value === 'string' && value.trim()) {
    const date = new Date(value);

    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (value instanceof Timestamp) {
    return value.toDate().toISOString();
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  return null;
}

function normalizePublicSpot(documentId: string, value: FirestoreSpotDocument): PublicSpot | null {
  const latitude = toNumber(value.latitude);
  const longitude = toNumber(value.longitude);
  const updatedAt = toIsoString(value.updatedAt);

  if (
    !isPublicSpotType(value.type) ||
    !isSpotSource(value.source) ||
    !isVerifiedStatus(value.verifiedStatus) ||
    typeof value.name !== 'string' ||
    typeof value.address !== 'string' ||
    value.isPublic !== true ||
    latitude === null ||
    longitude === null ||
    !updatedAt
  ) {
    return null;
  }

  return {
    id: typeof value.id === 'string' && value.id.trim() ? value.id : documentId,
    type: value.type,
    name: value.name,
    address: value.address,
    latitude,
    longitude,
    openingHours: typeof value.openingHours === 'string' ? value.openingHours : undefined,
    isPublic: true,
    source: value.source,
    verifiedStatus: value.verifiedStatus,
    updatedAt,
  };
}

function normalizeCachedPublicSpots(spots: PublicSpot[]) {
  return spots
    .map((spot) => normalizePublicSpot(spot.id, spot))
    .filter((spot): spot is PublicSpot => spot !== null)
    .filter((spot) => spot.verifiedStatus === 'verified');
}

async function readFirestorePublicSpots(): Promise<PublicSpot[]> {
  const services = getRunSpotFirebaseServices();

  if (!services) {
    return [];
  }

  const spotsQuery = query(
    collection(services.firestore, 'spots'),
    where('isPublic', '==', true),
    where('verifiedStatus', '==', 'verified'),
    limit(PUBLIC_SPOTS_LIMIT)
  );
  const snapshot = await getDocs(spotsQuery);

  return snapshot.docs
    .map((document) => normalizePublicSpot(document.id, document.data()))
    .filter((spot): spot is PublicSpot => spot !== null)
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

  const cachedSpots = cached?.value ? normalizeCachedPublicSpots(cached.value) : [];

  if (cachedSpots.length) {
    return {
      spots: cachedSpots,
      source: 'cache',
      updatedAt: cached?.updatedAt,
    };
  }

  await writeCache(PUBLIC_SPOTS_CACHE_KEY, mockPublicSpots);

  return {
    spots: mockPublicSpots,
    source: 'mock',
  };
}
