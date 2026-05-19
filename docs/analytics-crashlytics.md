# Analytics와 Crashlytics

## 현재 적용 범위

RunSpot은 현재 Expo Go에서 계속 검수할 수 있는 Firebase JS SDK 기반이다. Expo 공식 문서 기준으로 Firebase JS SDK는 Auth, Firestore, Storage 같은 서비스에는 적합하지만, 모바일 앱의 Analytics와 Crashlytics는 React Native Firebase 같은 네이티브 SDK가 필요하다.

그래서 8단계는 두 층으로 나눠 적용한다.

- 지금 적용: 개인정보를 줄인 이벤트 추적 계층과 비치명 오류 기록 API
- development build 이후 적용: React Native Firebase Analytics, Crashlytics 네이티브 SDK 연결

## 이벤트 원칙

- 정확한 좌표, 주소, 사용자 입력 메모는 이벤트에 기록하지 않는다.
- 화면명, 버튼 흐름, 장소 타입, 데이터 소스, 거리 구간처럼 제품 개선에 필요한 값만 기록한다.
- Analytics 실패는 사용자 흐름을 막지 않는다.

## 현재 이벤트

- `screen_view`: 주요 화면 진입
- `location_permission_result`: 위치 권한 및 위치 확인 결과
- `route_preview_ready`: 경로 미리보기 생성
- `spot_selected`: 주변 편의시설 선택
- `favorite_saved`, `favorite_removed`: 즐겨찾기 저장/삭제
- `report_submitted`: 제보 제출
- `return_route_opened`: 카카오맵 귀가 경로 열기
- `app_exception`: 비치명 오류 기록

## Firebase Console에서 필요한 일

1. Firebase 프로젝트에서 Google Analytics를 활성화한다.
2. Web app 설정의 `measurementId`를 확인한다.
3. `.env`에 `EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID`를 추가한다.

## development build 이후

React Native Firebase를 붙이는 시점에는 아래 작업을 진행한다.

1. `expo-dev-client` 설치
2. `@react-native-firebase/app`, `@react-native-firebase/analytics`, `@react-native-firebase/crashlytics` 설치
3. Android `google-services.json`, iOS `GoogleService-Info.plist` 설정
4. `src/services/observability/*` 내부 구현을 React Native Firebase로 교체
5. Android/iOS development build에서 Crashlytics 테스트 크래시와 Analytics DebugView 확인
