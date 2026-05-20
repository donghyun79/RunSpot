import { RunnerSpot } from '@/types/runspot';

import { kakaoCategoryCodes } from './map-provider';
import {
  KeywordPlaceSearchRequest,
  KeywordPlaceSearchResult,
  PlaceSearchRequest,
} from './types';

const KAKAO_LOCAL_CATEGORY_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/category.json';
const KAKAO_LOCAL_KEYWORD_SEARCH_URL = 'https://dapi.kakao.com/v2/local/search/keyword.json';
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

function buildKakaoHeaders() {
  return {
    Authorization: `KakaoAK ${KAKAO_REST_API_KEY}`,
  };
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

  const params = new URLSearchParams({
    query: normalizedQuery,
    size: '10',
    sort: center ? 'distance' : 'accuracy',
  });

  if (center) {
    params.set('x', String(center.longitude));
    params.set('y', String(center.latitude));
    params.set('radius', String(Math.min(radiusMeters ?? 20000, 20000)));
  }

  const response = await fetch(`${KAKAO_LOCAL_KEYWORD_SEARCH_URL}?${params.toString()}`, {
    headers: buildKakaoHeaders(),
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as KakaoPlaceResponse;

  return (data.documents ?? [])
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
        latitude,
        longitude,
      };
    })
    .filter((place): place is KeywordPlaceSearchResult => place !== null);
}
