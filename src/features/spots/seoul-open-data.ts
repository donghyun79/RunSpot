import { RunnerSpot } from '@/types/runspot';

const SEOUL_OPEN_DATA_BASE_URL = 'http://openapi.seoul.go.kr:8088';
const SEOUL_OPEN_DATA_KEY = process.env.EXPO_PUBLIC_SEOUL_OPEN_DATA_KEY;
const BIKE_PAGE_SIZE = 1000;
const MAX_BIKE_STATIONS = 3000;

type SeoulOpenDataResult = {
  CODE?: string;
  MESSAGE?: string;
};

type BikeStationRow = {
  rackTotCnt?: string;
  stationName?: string;
  parkingBikeTotCnt?: string;
  shared?: string;
  stationLatitude?: string;
  stationLongitude?: string;
  stationId?: string;
};

type BikeListResponse = {
  rentBikeStatus?: {
    list_total_count?: number;
    RESULT?: SeoulOpenDataResult;
    row?: BikeStationRow[];
  };
};

export type SeoulRunnerSpotData = {
  spots: RunnerSpot[];
  totalCount: number;
};

function parseCoordinate(value?: string) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeBikeStation(row: BikeStationRow): RunnerSpot | null {
  const latitude = parseCoordinate(row.stationLatitude);
  const longitude = parseCoordinate(row.stationLongitude);

  if (latitude === null || longitude === null || !row.stationName) {
    return null;
  }

  return {
    id: row.stationId ? `bike-${row.stationId}` : `bike-${row.stationName}`,
    type: 'bike',
    name: row.stationName.replace(/^\d+\.\s*/, ''),
    latitude,
    longitude,
    detail: `대여 가능 ${row.parkingBikeTotCnt ?? '0'}대`,
    source: 'seoul-open-data:bikeList',
    updatedAt: new Date().toISOString(),
  };
}

async function fetchSeoulBikeStationsPage(start = 1, end = BIKE_PAGE_SIZE): Promise<SeoulRunnerSpotData> {
  if (!SEOUL_OPEN_DATA_KEY) {
    return { spots: [], totalCount: 0 };
  }

  const url = `${SEOUL_OPEN_DATA_BASE_URL}/${SEOUL_OPEN_DATA_KEY}/json/bikeList/${start}/${end}`;
  const response = await fetch(url);

  if (!response.ok) {
    return { spots: [], totalCount: 0 };
  }

  const data = (await response.json()) as BikeListResponse;
  const rows = data.rentBikeStatus?.row ?? [];
  const totalCount = data.rentBikeStatus?.list_total_count ?? rows.length;

  return {
    spots: rows.map(normalizeBikeStation).filter((spot): spot is RunnerSpot => spot !== null),
    totalCount,
  };
}

export async function fetchSeoulRunnerSpots(): Promise<SeoulRunnerSpotData> {
  const firstPage = await fetchSeoulBikeStationsPage(1, BIKE_PAGE_SIZE);
  const allSpots = [...firstPage.spots];
  const totalToFetch = Math.min(firstPage.totalCount, MAX_BIKE_STATIONS);

  for (let start = BIKE_PAGE_SIZE + 1; start <= totalToFetch; start += BIKE_PAGE_SIZE) {
    const end = Math.min(start + BIKE_PAGE_SIZE - 1, totalToFetch);
    const page = await fetchSeoulBikeStationsPage(start, end);

    allSpots.push(...page.spots);
  }

  return {
    spots: allSpots,
    totalCount: firstPage.totalCount,
  };
}

export function hasSeoulOpenDataKey() {
  return Boolean(SEOUL_OPEN_DATA_KEY);
}
