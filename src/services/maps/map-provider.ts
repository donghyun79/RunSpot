import { MapProviderPlan, PlaceCategory, ReturnRouteOption } from './types';

export const activeMapProvider = 'react-native-maps';
export const targetMapProvider = 'kakao';

export const mapProviderPlan: MapProviderPlan = {
  renderer: {
    current: activeMapProvider,
    target: targetMapProvider,
  },
  placeData: {
    primary: ['firestore', 'seoul-open-data', 'kakao-local'],
  },
  routePreview: {
    current: ['osrm', 'straight-line'],
  },
  routeHandoff: {
    primary: 'kakao-map',
  },
};

export const returnRouteOptions: ReturnRouteOption[] = [
  {
    id: 'bicycle',
    label: '따릉이',
    description: '도착지 주변 따릉이 대여소와 자전거 길찾기를 연결합니다.',
  },
  {
    id: 'publictransit',
    label: '대중교통',
    description: '버스와 지하철을 포함한 카카오맵 대중교통 길찾기를 엽니다.',
  },
  {
    id: 'foot',
    label: '도보',
    description: '가까운 목적지는 도보 길찾기로 바로 확인합니다.',
  },
];

export const kakaoCategoryCodes: Record<PlaceCategory, string> = {
  convenience: 'CS2',
  transit: 'SW8',
};
