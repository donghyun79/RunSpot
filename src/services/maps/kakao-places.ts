import { RunnerSpot } from '@/types/runspot';

import { kakaoCategoryCodes } from './map-provider';
import {
  KeywordPlaceSearchRequest,
  KeywordPlaceSearchResult,
  PlaceSearchRequest,
} from './types';

const KAKAO_LOCAL_CATEGORY_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/category.json';
const KAKAO_LOCAL_KEYWORD_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';
const KAKAO_LOCAL_ADDRESS_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/address.json';
const KAKAO_REST_API_KEY = process.env.EXPO_PUBLIC_KAKAO_REST_API_KEY;

type KakaoPlaceDocument = {
  id: string;
  place_name: string;
  category_group_code: string;
  category_group_name: string;
  phone: string;
  address_name: string;
  road_address_name: string;
  x: string;
  y: string;
};

type KakaoPlaceResponse = {
  documents?: KakaoPlaceDocument[];
};

type KakaoAddressDocument = {
  address_name: string;
  address_type: string;
  x: string;
  y: string;
  address?: {
    address_name: string;
  } | null;
  road_address?: {
    address_name: string;
    building_name?: string;
  } | null;
};

type KakaoAddressResponse = {
  documents?: KakaoAddressDocument[];
};

function buildKakaoHeaders() {
  return {
    Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
  };
}

function normalizeSearchText(value: string) {
  return value.toLocaleLowerCase().replace(/[\s.,()[\]{}_\-]/g, '');
}

function scorePlaceSearchResult(result: KeywordPlaceSearchResult, normalizedQuery: string) {
  const normalizedName = normalizeSearchText(result.name);
  const normalizedAddress = normalizeSearchText(result.address);
  const normalizedDetail = normalizeSearchText(result.detail ?? '');
  let score = result.source === 'address' ? 30 : 0;

  if (normalizedName === normalizedQuery) {
    score += 140;
  } else if (normalizedName.includes(normalizedQuery)) {
    score += 110;
  } else if (normalizedQuery.includes(normalizedName) && normalizedName.length >= 3) {
    score += 70;
  }

  if (normalizedAddress.includes(normalizedQuery)) {
    score += 45;
  }

  if (normalizedDetail.includes(normalizedQuery)) {
    score += 20;
  }

  if (!normalizedName.includes(normalizedQuery) && !normalizedAddress.includes(normalizedQuery)) {
    score -= 35;
  }

  return score;
}

function dedupePlaceSearchResults(results: KeywordPlaceSearchResult[]) {
  const seen = new Set<string>();

  return results.filter((result) => {
    const coordinateKey = `${result.latitude.toFixed(6)},${result.longitude.toFixed(6)}`;
    const nameKey = normalizeSearchText(result.name);
    const addressKey = normalizeSearchText(result.address);
    const key = `${nameKey}:${addressKey}:${coordinateKey}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

function toRunnerSpot(document: KakaoPlaceDocument, source: string): RunnerSpot | null {
  const latitude = Number(document.y);
  const longitude = Number(document.x);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    id: `kakao-${document.id}`,
    type: document.category_group_code === 'CS2' ? 'convenience' : 'transit',
    name: document.place_name,
    latitude,
    longitude,
    address: document.road_address_name || document.address_name,
    detail: document.category_group_name,
    source,
    updatedAt: new Date().toISOString(),
  };
}

export function hasKakaoLocalKey() {
  return Boolean(KAKAO_REST_API_KEY);
}

export async function fetchKakaoCategoryPlaces({
  center,
  radiusMeters,
  category,
}: PlaceSearchRequest): Promise<RunnerSpot[]> {
  if (!KAKAO_REST_API_KEY) {
    return [];
  }

  const params = new URLSearchParams({
    category_group_code: kakaoCategoryCodes[category],
    x: String(center.longitude),
    y: String(center.latitude),
    radius: String(Math.min(radiusMeters, 20000)),
    size: '15',
    sort: 'distance',
  });
  const response = await fetch(`${KAKAO_LOCAL_CATEGORY_SEARCH_URL}?${params.toString()}`, {
    headers: buildKakaoHeaders(),
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as KakaoPlaceResponse;
  const source = `kakao-local:${category}`;

  return (data.documents ?? [])
    .map((document) => toRunnerSpot(document, source))
    .filter((spot): spot is RunnerSpot => spot !== null);
}

export async function fetchKakaoKeywordPlaces({
  query,
  center,
  radiusMeters,
}: KeywordPlaceSearchRequest): Promise<KeywordPlaceSearchResult[]> {
  const normalizedQuery = query.trim();

  if (!KAKAO_REST_API_KEY || normalizedQuery.length === 0) {
    return [];
  }

  const keywordParams = new URLSearchParams({
    query: normalizedQuery,
    size: '10',
    sort: center ? 'distance' : 'accuracy',
  });
  const addressParams = new URLSearchParams({
    query: normalizedQuery,
    size: '5',
  });

  if (center) {
    keywordParams.set('x', String(center.longitude));
    keywordParams.set('y', String(center.latitude));
    keywordParams.set('radius', String(Math.min(radiusMeters ?? 20000, 20000)));
  }

  const [keywordResponse, addressResponse] = await Promise.all([
    fetch(`${KAKAO_LOCAL_KEYWORD_SEARCH_URL}?${keywordParams.toString()}`, {
      headers: buildKakaoHeaders(),
    }),
    fetch(`${KAKAO_LOCAL_ADDRESS_SEARCH_URL}?${addressParams.toString()}`, {
      headers: buildKakaoHeaders(),
    }),
  ]);
  const keywordData = keywordResponse.ok
    ? ((await keywordResponse.json()) as KakaoPlaceResponse)
    : { documents: [] };
  const addressData = addressResponse.ok
    ? ((await addressResponse.json()) as KakaoAddressResponse)
    : { documents: [] };
  const keywordResults = (keywordData.documents ?? [])
    .map((document): KeywordPlaceSearchResult | null => {
      const latitude = Number(document.y);
      const longitude = Number(document.x);

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      return {
        id: `kakao-place-${document.id}`,
        name: document.place_name,
        address: document.road_address_name || document.address_name,
        detail: document.category_group_name,
        source: 'keyword',
        latitude,
        longitude,
      };
    })
    .filter((place): place is KeywordPlaceSearchResult => place !== null);
  const addressResults = (addressData.documents ?? [])
    .map((document): KeywordPlaceSearchResult | null => {
      const latitude = Number(document.y);
      const longitude = Number(document.x);
      const buildingName = document.road_address?.building_name?.trim();
      const address = document.road_address?.address_name || document.address?.address_name || document.address_name;

      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
        return null;
      }

      return {
        id: `kakao-address-${document.x}-${document.y}-${document.address_name}`,
        name: buildingName || document.address_name,
        address,
        detail: '주소',
        source: 'address',
        latitude,
        longitude,
      };
    })
    .filter((place): place is KeywordPlaceSearchResult => place !== null);
  const normalizedSearchQuery = normalizeSearchText(normalizedQuery);
  const mergedResults = dedupePlaceSearchResults([...addressResults, ...keywordResults]);

  return mergedResults.sort(
    (a, b) =>
      scorePlaceSearchResult(b, normalizedSearchQuery) -
      scorePlaceSearchResult(a, normalizedSearchQuery)
  );
}
