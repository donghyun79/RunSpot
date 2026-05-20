import { FavoriteLabel, SpotType, UserReportType } from '@/types/runspot';

export type RunSpotLocale = 'ko' | 'en';

export const defaultRunSpotLocale: RunSpotLocale = 'ko';

const favoriteLabelKo: Record<FavoriteLabel, string> = {
  custom: '즐겨찾기',
  courseStart: '코스 시작점',
  home: '집 근처 기준점',
  work: '회사 근처 기준점',
};

const reportTypeKo: Record<UserReportType, string> = {
  spotMissing: '없는 시설',
  spotClosed: '운영 안 함',
  spotWrongInfo: '정보 오류',
  routeIssue: '코스 문제',
};

const favoriteLabelEn: Record<FavoriteLabel, string> = {
  custom: 'Favorite',
  courseStart: 'Course start',
  home: 'Home nearby',
  work: 'Work nearby',
};

const reportTypeEn: Record<UserReportType, string> = {
  spotMissing: 'Missing spot',
  spotClosed: 'Closed',
  spotWrongInfo: 'Wrong info',
  routeIssue: 'Route issue',
};

export const runSpotCopy = {
  ko: {
    auth: {
      guestNickname: '익명 러너',
      fallbackNickname: '러너',
      firebaseMissing: 'Firebase 환경 변수가 설정되지 않았습니다.',
      profileLoadFailed: '사용자 프로필을 불러오지 못했습니다.',
      signInFailed: '로그인에 실패했습니다.',
      signOutFailed: '로그아웃에 실패했습니다.',
      statusTitle: '계정 상태',
      checking: '로그인 상태를 확인하는 중입니다.',
      signedIn: (nickname: string) => `${nickname}로 로그인됨`,
      configured: 'Firebase Authentication 설정이 준비되었습니다.',
      unconfigured: 'Firebase 환경 변수를 설정하면 로그인 테스트를 시작할 수 있습니다.',
      signIn: '게스트 로그인',
      signOut: '로그아웃',
      providerNotEnabled:
        'Firebase Console에서 Authentication > Sign-in method > Anonymous를 먼저 활성화해야 합니다.',
    },
    plan: {
      title: '개발 계획',
      description:
        'RunSpot은 서울 러너가 코스를 빠르게 정하고 주변 편의시설과 귀가 방법까지 확인할 수 있도록 단계별로 완성해 갑니다.',
      statusLabels: {
        ready: '준비됨',
        next: '다음 작업',
        later: '예정',
      },
    },
    favorites: {
      labels: favoriteLabelKo,
      notSaved: '아직 저장되지 않았습니다.',
      savedAs: (label: FavoriteLabel) => `${favoriteLabelKo[label]}으로 저장됨`,
      signedInHelp:
        '공개 편의시설을 즐겨찾기, 코스 시작점, 또는 개인정보를 줄인 집 근처 기준점으로 저장할 수 있습니다.',
      signedOutHelp: '계획 탭에서 게스트 로그인 후 즐겨찾기를 저장할 수 있습니다.',
      signInToSave: '저장하려면 먼저 로그인해 주세요.',
      signInToRemove: '삭제하려면 먼저 로그인해 주세요.',
      loadFailed: '즐겨찾기를 불러오지 못했습니다.',
      saveFailed: '즐겨찾기를 저장하지 못했습니다.',
      removeFailed: '즐겨찾기를 삭제하지 못했습니다.',
      saveFavorite: '즐겨찾기',
      saveCourseStart: '시작점',
      saveHome: '집 근처',
      remove: '삭제',
    },
    reports: {
      title: '제보',
      help: '선택한 편의시설 정보가 맞지 않으면 제보해 주세요. 관리자가 확인한 뒤 반영합니다.',
      notePlaceholder: '간단한 메모를 입력하세요',
      types: reportTypeKo,
      submit: '제보하기',
      submitting: '제보 중...',
      submitted: '제보가 접수되었습니다.',
      queued: '네트워크 문제로 제보를 임시 저장했습니다. 나중에 다시 전송할 수 있습니다.',
      failed: '제보를 접수하지 못했습니다.',
      signInRequired: '제보하려면 먼저 로그인해 주세요.',
    },
    course: {
      setStart: '출발지 설정',
      setFinish: '도착지 설정',
      start: '출발지',
      finish: '도착지',
      tapMapToSet: '지도를 눌러 설정',
      selectedMapPoint: '지도에서 선택한 위치',
      currentLocationLabel: '현재 위치',
      placeSearchPlaceholder: (mode: string) => `${mode} 장소/주소 검색`,
      searchPlace: '검색',
      searchingPlace: '장소 검색 중...',
      searchingPlaceShort: '검색 중',
      placeSearchEmpty: '검색어를 입력해 주세요.',
      placeSearchNoResults: '서울 안에서 찾은 장소가 없습니다.',
      placeSearchKeyMissing: '카카오 REST API 키가 없어 장소 검색을 사용할 수 없습니다.',
      placeSearchFailed: '장소 검색에 실패했습니다. 잠시 후 다시 시도해 주세요.',
      placeSearchSeoulOnly: '서울 안의 장소만 출발지와 도착지로 설정할 수 있습니다.',
      placeSearchResult: '장소',
      addressSearchResult: '주소 결과',
      placeSearchStartSet: (name: string) => `${name}을 출발지로 설정했습니다. 도착지를 선택하세요.`,
      placeSearchFinishSet: (name: string) => `${name}을 도착지로 설정했습니다.`,
      estimatedRoute: '예상 코스',
      previewPrompt: '출발지와 도착지를 설정하면 거리를 미리 볼 수 있습니다.',
      calculating: '계산 중...',
      routeEstimate: '경로 예상',
      straightLine: '직선거리 기준',
      minute: '분',
      hour: '시간',
      locate: '현재 위치',
      locating: '...',
      initialHelp: '위치 권한을 허용하면 현재 위치를 출발지로 설정할 수 있습니다.',
      findingLocation: '현재 위치를 찾는 중입니다...',
      permissionDenied: '위치 권한이 거부되어 기본 서울 지도와 편의시설 목록을 보여줍니다.',
      outsideSeoul:
        '현재 위치가 서울 밖으로 보입니다. 서울시청을 보여드릴게요. 지도를 눌러 출발지를 설정하세요.',
      currentLocationSet: '현재 위치를 출발지로 설정했습니다. 지도를 눌러 도착지를 설정하세요.',
      locationReadFailed: '현재 위치를 읽지 못해 기본 서울 지도를 보여줍니다.',
      routeReady: '코스 미리보기가 준비되었습니다. 아래에서 주변 편의시설을 확인하세요.',
      routeFallback: '경로 서비스를 사용할 수 없어 직선거리 기준으로 주변 편의시설을 보여줍니다.',
      seoulOnly: 'RunSpot은 현재 서울 코스만 지원합니다. 서울 안의 지점을 선택해 주세요.',
      startSet: '출발지를 설정했습니다. 지도를 눌러 도착지를 설정하세요.',
      finishSet: '도착지를 설정했습니다. 예상 거리와 주변 편의시설을 확인하세요.',
      routeCleared: '코스를 초기화했습니다. 지도를 눌러 새 출발지를 설정하세요.',
      returnRouteUnavailable: '출발지와 도착지를 모두 설정하면 귀가 경로를 열 수 있습니다.',
      kakaoRouteFailed: '카카오맵 경로를 열지 못했습니다. 잠시 후 다시 시도해 주세요.',
      kakaoPlacesLoaded: (count: number) => `도착지 주변 카카오 장소 ${count}개를 불러왔습니다.`,
      kakaoPlacesFailed: '카카오 장소 검색에 실패했습니다. 기존 편의시설을 보여줍니다.',
      returnRoute: '귀가 경로',
      clearRoute: '초기화',
      showPanel: '패널 보기',
      routePreferences: {
        bikeRoad: {
          label: '자전거 도로 우선',
          description: '러닝 기본 추천입니다. 카카오맵에서는 자전거 경로로 열어 자전거도로와 천변길을 우선 확인합니다.',
        },
        shortest: {
          label: '최단거리',
          description: '짧은 이동 거리 확인용입니다. 카카오맵에서는 도보 경로로 열어 가장 짧은 길을 확인합니다.',
        },
      },
      openRouteInKakao: (mode: string) => `카카오맵에서 ${mode} 보기`,
      nextMode: (mode: 'start' | 'finish') => `다음: ${mode === 'start' ? '출발지' : '도착지'}`,
    },
    maps: {
      loading: '지도 불러오는 중',
      kakaoFailed: '카카오 지도를 불러오지 못했습니다',
      kakaoKeyMissingTitle: '카카오 지도 키가 필요합니다',
      kakaoKeyMissingDescription:
        'EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY를 설정하고 개발 서버를 다시 시작하면 카카오 지도를 사용할 수 있습니다.',
    },
    spots: {
      loading: '공개 러닝 편의시설을 불러오는 중입니다.',
      loadingShort: '공개 러닝 편의시설을 불러오는 중...',
      firestoreLoaded: (count: number) =>
        `Firestore에서 검증된 공개 편의시설 ${count}개를 불러왔습니다.`,
      cacheLoaded: (count: number, updatedAt?: string) =>
        updatedAt
          ? `Firestore를 사용할 수 없어 ${formatKoreanDateTime(updatedAt)}에 저장된 편의시설 ${count}개를 보여줍니다.`
          : `Firestore를 사용할 수 없어 캐시된 편의시설 ${count}개를 보여줍니다.`,
      mockLoaded: 'Firestore에 검증된 공개 편의시설이 없어 기본 샘플 데이터를 보여줍니다.',
      failed: '편의시설 데이터를 불러오지 못했습니다. 캐시 또는 기본 샘플 데이터를 보여줍니다.',
      seoulBikeAdded: (count: number) => `서울시 따릉이 대여소 ${count}개를 추가했습니다.`,
      seoulOpenDataKeyMissing: '서울 열린데이터 키를 추가하면 실시간 따릉이 대여소도 함께 표시됩니다.',
      emptyAddress: '주소 정보가 아직 없습니다.',
      sourceLabel: '출처',
      sectionTitle: '공개 러닝 편의시설',
      nearbyTitle: '주변 편의시설',
      loadingList: '편의시설 데이터 불러오는 중...',
      visibleSummary: (summary: string) => `${summary || '편의시설'} 표시 중`,
      routeSummary: (count: number) => `코스 500m 안의 편의시설 ${count}개`,
      savedSuffix: '저장됨',
      typeLabels: {
        water: '급수',
        restroom: '화장실',
        shower: '샤워',
        convenience: '편의점',
        bike: '따릉이',
        transit: '대중교통',
      } satisfies Record<SpotType, string>,
    },
  },
  en: {
    auth: {
      guestNickname: 'Guest runner',
      fallbackNickname: 'Runner',
      firebaseMissing: 'Firebase environment variables are not configured.',
      profileLoadFailed: 'Could not load the user profile.',
      signInFailed: 'Sign-in failed.',
      signOutFailed: 'Sign-out failed.',
      statusTitle: 'Account status',
      checking: 'Checking sign-in status.',
      signedIn: (nickname: string) => `Signed in as ${nickname}`,
      configured: 'Firebase Authentication is ready.',
      unconfigured: 'Set Firebase environment variables to start sign-in testing.',
      signIn: 'Guest sign in',
      signOut: 'Sign out',
      providerNotEnabled:
        'Enable Authentication > Sign-in method > Anonymous in Firebase Console first.',
    },
    plan: {
      title: 'Development Plan',
      description:
        'RunSpot is being completed step by step so Seoul runners can choose a course, nearby facilities, and a way home.',
      statusLabels: {
        ready: 'Ready',
        next: 'Next',
        later: 'Later',
      },
    },
    favorites: {
      labels: favoriteLabelEn,
      notSaved: 'Not saved yet',
      savedAs: (label: FavoriteLabel) => `Saved as ${favoriteLabelEn[label]}`,
      signedInHelp:
        'Save this public spot as a favorite, course start, or privacy-safe home landmark.',
      signedOutHelp: 'Sign in as a guest from the plan tab to save favorites.',
      signInToSave: 'Sign in to save favorites.',
      signInToRemove: 'Sign in to remove favorites.',
      loadFailed: 'Could not load favorites.',
      saveFailed: 'Could not save favorite.',
      removeFailed: 'Could not remove favorite.',
      saveFavorite: 'Favorite',
      saveCourseStart: 'Course start',
      saveHome: 'Home nearby',
      remove: 'Remove',
    },
    reports: {
      title: 'Report',
      help: 'If this spot information is wrong, send a report. An admin will review it.',
      notePlaceholder: 'Add a short note',
      types: reportTypeEn,
      submit: 'Submit report',
      submitting: 'Submitting...',
      submitted: 'Report submitted.',
      queued: 'Network issue. The report was saved locally for retry.',
      failed: 'Could not submit report.',
      signInRequired: 'Sign in to submit a report.',
    },
    course: {
      setStart: 'Set start',
      setFinish: 'Set finish',
      start: 'Start',
      finish: 'Finish',
      tapMapToSet: 'Tap the map to set',
      selectedMapPoint: 'Selected map location',
      currentLocationLabel: 'Current location',
      placeSearchPlaceholder: (mode: string) => `Search ${mode} place or address`,
      searchPlace: 'Search',
      searchingPlace: 'Searching places...',
      searchingPlaceShort: 'Searching',
      placeSearchEmpty: 'Enter a search term.',
      placeSearchNoResults: 'No Seoul places found.',
      placeSearchKeyMissing: 'Kakao REST API key is required for place search.',
      placeSearchFailed: 'Place search failed. Try again later.',
      placeSearchSeoulOnly: 'Only Seoul places can be used for start and finish points.',
      placeSearchResult: 'Place',
      addressSearchResult: 'Address result',
      placeSearchStartSet: (name: string) => `${name} set as start. Choose a finish point.`,
      placeSearchFinishSet: (name: string) => `${name} set as finish.`,
      estimatedRoute: 'Estimated route',
      previewPrompt: 'Set start and finish to preview distance',
      calculating: 'Calculating...',
      routeEstimate: 'route estimate',
      straightLine: 'straight-line',
      minute: 'min',
      hour: 'hr',
      locate: 'Locate',
      locating: '...',
      initialHelp: 'Location permission helps set your start point.',
      findingLocation: 'Finding your current location...',
      permissionDenied: 'Location permission denied. Showing the default Seoul map and spot list.',
      outsideSeoul:
        'Your location appears outside Seoul. Showing Seoul City Hall; tap the map to set a start point.',
      currentLocationSet: 'Current location set as start. Tap the map to set a finish point.',
      locationReadFailed: 'Could not read current location. Showing the default Seoul map.',
      routeReady: 'Route preview is ready. Check nearby spots below.',
      routeFallback: 'Route service unavailable. Showing nearby spots by straight-line fallback.',
      seoulOnly: 'RunSpot currently supports Seoul routes only. Select a point inside Seoul.',
      startSet: 'Start point set. Tap the map to set a finish point.',
      finishSet: 'Finish point set. Distance and nearby spots are shown below.',
      routeCleared: 'Route cleared. Tap the map to set a new start point.',
      returnRouteUnavailable: 'Return route is available after both start and finish are set.',
      kakaoRouteFailed: 'Could not open Kakao Map route. Try again later.',
      kakaoPlacesLoaded: (count: number) => `Loaded ${count} Kakao places near the finish.`,
      kakaoPlacesFailed: 'Kakao place search failed. Showing existing spots.',
      returnRoute: 'Return route',
      clearRoute: 'Clear route',
      showPanel: 'Show panel',
      routePreferences: {
        bikeRoad: {
          label: 'Bike-road first',
          description:
            'Default for running. Opens Kakao Map bicycle routing to favor bike roads and riverside paths.',
        },
        shortest: {
          label: 'Shortest',
          description: 'Use for quick distance checks. Opens Kakao Map walking routing.',
        },
      },
      openRouteInKakao: (mode: string) => `Open ${mode} in Kakao Map`,
      nextMode: (mode: 'start' | 'finish') => `Next: ${mode === 'start' ? 'finish' : 'start'}`,
    },
    maps: {
      loading: 'Loading map',
      kakaoFailed: 'Could not load Kakao map',
      kakaoKeyMissingTitle: 'Kakao map key required',
      kakaoKeyMissingDescription:
        'Set EXPO_PUBLIC_KAKAO_JAVASCRIPT_KEY and restart the development server to use Kakao Maps.',
    },
    spots: {
      loading: 'Loading public runner spots.',
      loadingShort: 'Loading public runner spots...',
      firestoreLoaded: (count: number) => `Loaded ${count} verified Firestore spots.`,
      cacheLoaded: (count: number) => `Firestore unavailable. Showing ${count} cached spots.`,
      mockLoaded: 'Showing bundled mock spots until Firestore has verified data.',
      failed: 'Spot data failed. Showing cached or bundled fallback spots.',
      seoulBikeAdded: (count: number) => `Added ${count} Seoul bike stations.`,
      seoulOpenDataKeyMissing: 'Add a Seoul Open Data key for live bike stations.',
      emptyAddress: 'No address available yet.',
      sourceLabel: 'Source',
      sectionTitle: 'Public runner spots',
      nearbyTitle: 'Nearby spots',
      loadingList: 'Loading spot data...',
      visibleSummary: (summary: string) => `${summary || 'spots'} visible`,
      routeSummary: (count: number) => `${count} spots within 500m of route`,
      savedSuffix: 'saved',
      typeLabels: {
        water: 'Water',
        restroom: 'Restroom',
        shower: 'Shower',
        convenience: 'Convenience',
        bike: 'Ddareungi',
        transit: 'Transit',
      } satisfies Record<SpotType, string>,
    },
  },
} as const;

export function getRunSpotCopy(locale = defaultRunSpotLocale) {
  return runSpotCopy[locale];
}

function formatKoreanDateTime(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '최근';
  }

  return new Intl.DateTimeFormat('ko-KR', {
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(date);
}
