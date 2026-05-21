import { RunPlanStep, RunnerSpot } from '@/types/runspot';

export const launchPlanSteps: RunPlanStep[] = [
  {
    id: 'stage-1-map-location-mock-spots',
    title: '1. 지도, 현재 위치, 기본 편의시설',
    description: '모바일 지도에서 현재 위치를 확인하고 러너 친화 편의시설을 표시합니다.',
    status: 'ready',
  },
  {
    id: 'stage-2-distance-list-detail',
    title: '2. 거리순 목록과 상세 보기',
    description: '주변 편의시설을 거리순으로 정렬하고 선택한 장소의 상세 정보를 보여줍니다.',
    status: 'ready',
  },
  {
    id: 'stage-3-firebase-authentication',
    title: '3. Firebase Authentication',
    description: '최소 개인정보 수집 원칙을 지키며 게스트 로그인을 연결합니다.',
    status: 'ready',
  },
  {
    id: 'stage-4-firestore-spots',
    title: '4. Firestore spots 데이터 연결',
    description: '검증된 공개 편의시설을 Firestore에서 읽고 캐시와 기본 데이터로 보완합니다.',
    status: 'ready',
  },
  {
    id: 'stage-5-favorites-home',
    title: '5. 즐겨찾기와 집 근처 저장',
    description: '편의시설을 즐겨찾기, 출발지, 집 근처 기준점으로 저장합니다.',
    status: 'ready',
  },
  {
    id: 'stage-6-reports',
    title: '6. 제보 기능',
    description: '로그인한 사용자가 장소 오류와 코스 문제를 제보하고 실패 시 재시도 큐에 보관합니다.',
    status: 'ready',
  },
  {
    id: 'stage-7-app-check-rules',
    title: '7. App Check와 Security Rules',
    description: 'Firestore 보안 규칙과 App Check 적용 준비를 마칩니다.',
    status: 'ready',
  },
  {
    id: 'stage-8-crashlytics-analytics',
    title: '8. Crashlytics와 Analytics',
    description: '개인정보를 줄인 이벤트 추적과 비치명 오류 기록 경로를 준비합니다.',
    status: 'ready',
  },
  {
    id: 'stage-9-test-distribution',
    title: '9. Android/iOS 테스트 배포',
    description: 'development build와 테스트 배포로 실제 기기 검증을 진행합니다.',
    status: 'next',
  },
];

export const sampleRunnerSpots: RunnerSpot[] = [
  {
    id: 'water-arisu-sample',
    type: 'water',
    name: '아리수 음수대',
    latitude: 37.526,
    longitude: 126.932,
    address: '서울 여의도 한강공원 인근',
    source: 'sample',
    updatedAt: '2026-05-17',
  },
  {
    id: 'restroom-public-sample',
    type: 'restroom',
    name: '공공화장실',
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
    address: '러닝 종료지 인근',
    source: 'sample',
    updatedAt: '2026-05-17',
  },
];
