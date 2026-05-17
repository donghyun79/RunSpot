import { RunnerSpot } from '@/types/runspot';

const SEOUL_OPEN_DATA_BASE_URL = 'http://openapi.seoul.go.kr:8088';
const SEOUL_OPEN_DATA_KEY = process.env.EXPO_PUBLIC_SEOUL_OPEN_DATA_KEY;

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
    detail: `${row.parkingBikeTotCnt ?? '0'} bikes available`,
    source: 'seoul-open-data:bikeList',
    updatedAt: new Date().toISOString(),
  };
}

async function fetchSeoulBikeStations(start = 1, end = 1000): Promise<RunnerSpot[]> {
  if (!SEOUL_OPEN_DATA_KEY) {
    return [];
  }

  const url = `${SEOUL_OPEN_DATA_BASE_URL}/${SEOUL_OPEN_DATA_KEY}/json/bikeList/${start}/${end}`;
  const response = await fetch(url);

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as BikeListResponse;
  const rows = data.rentBikeStatus?.row ?? [];

  return rows.map(normalizeBikeStation).filter((spot): spot is RunnerSpot => spot !== null);
}

export async function fetchSeoulRunnerSpots(): Promise<RunnerSpot[]> {
  const bikeStations = await fetchSeoulBikeStations();

  return bikeStations;
}

export function hasSeoulOpenDataKey() {
  return Boolean(SEOUL_OPEN_DATA_KEY);
}
