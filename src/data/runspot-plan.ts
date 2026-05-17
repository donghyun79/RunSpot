import { RunPlanStep, RunnerSpot } from '@/types/runspot';

export const launchPlanSteps: RunPlanStep[] = [
  {
    id: 'map',
    title: '지도와 현재 위치',
    description: '서울 안에서 내가 어디에 있는지 확인하고 러닝 코스를 바로 계획합니다.',
    status: 'next',
  },
  {
    id: 'route',
    title: '출발지와 도착지 코스 계획',
    description: '선택한 코스의 거리, 예상 시간, 주변 러너 편의시설을 함께 보여줍니다.',
    status: 'later',
  },
  {
    id: 'return',
    title: '러닝 후 귀가 옵션',
    description: '러닝 종료 지점에서 따릉이와 대중교통으로 돌아가는 방법을 제안합니다.',
    status: 'later',
  },
  {
    id: 'hydration',
    title: '급수와 컨디션 안내',
    description: '기온, 습도, 대기질, 예상 러닝 시간을 바탕으로 물 보급 지점을 안내합니다.',
    status: 'later',
  },
];

export const sampleRunnerSpots: RunnerSpot[] = [
  {
    id: 'water-arisu-sample',
    type: 'water',
    name: '아리수 음수대',
    latitude: 37.526,
    longitude: 126.932,
    address: '서울 한강공원 인근',
    source: 'sample',
    updatedAt: '2026-05-17',
  },
  {
    id: 'toilet-public-sample',
    type: 'toilet',
    name: '공중화장실',
    latitude: 37.527,
    longitude: 126.934,
    address: '서울 공공시설 인근',
    source: 'sample',
    updatedAt: '2026-05-17',
  },
  {
    id: 'bike-ddareungi-sample',
    type: 'bike',
    name: '따릉이 대여소',
    latitude: 37.525,
    longitude: 126.936,
    address: '러닝 도착지 주변',
    source: 'sample',
    updatedAt: '2026-05-17',
  },
];
