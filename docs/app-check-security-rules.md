# App Check + Security Rules

RunSpot 7단계는 Firebase App Check와 Security Rules를 운영 전에 켜기 위한 준비 단계입니다.

## 현재 적용 상태

- Firestore rules는 `runspot-20260519`에 배포되어 있습니다.
- 앱 코드는 웹에서 `EXPO_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`가 있을 때 App Check reCAPTCHA v3를 초기화합니다.
- Expo Go/native 개발 중에는 웹 reCAPTCHA provider를 초기화하지 않습니다.
- 개발용 디버그 토큰은 `EXPO_PUBLIC_FIREBASE_APPCHECK_DEBUG_TOKEN`으로 받을 수 있지만, 실제 토큰은 커밋하지 않습니다.

## Firebase Console 설정 순서

1. Firebase Console > RunSpot 프로젝트 > App Check
2. Web App `RunSpot` 등록
3. provider로 reCAPTCHA v3 선택
4. 발급된 site key를 `.env`의 `EXPO_PUBLIC_FIREBASE_APPCHECK_SITE_KEY`에 입력
5. 앱에서 정상 동작 확인
6. Firestore, Storage, Functions의 App Check enforcement는 개발 빌드와 테스트 배포가 안정화된 뒤 켭니다.

## Native 운영 빌드 방향

Expo Go에서는 Android Play Integrity/iOS App Attest 기반 App Check를 완전히 검증하기 어렵습니다. 운영 빌드 단계에서 다음을 적용합니다.

- Android: Play Integrity provider
- iOS: App Attest, 필요 시 DeviceCheck fallback
- 개발 빌드: Debug token 등록

## Security Rules 요약

- `spots`: 공개 읽기, 관리자 쓰기
- `users/{uid}`: 본인 또는 관리자 접근, 일반 사용자는 `role: "user"`만 생성/수정 가능
- `favorites/{uid}/items/{spotId}`: 본인만 읽기/쓰기/삭제
- `reports/{reportId}`: 로그인 사용자 생성, 작성자 또는 관리자 읽기, 관리자 수정/삭제
- `savedPlaces`, `savedCourses`: 본인만 읽기/쓰기/삭제

## Enforcement 주의

App Check enforcement를 먼저 켜면 Expo Go와 개발 환경이 차단될 수 있습니다. 반드시 다음 순서로 진행합니다.

1. 개발 빌드 또는 웹에서 App Check 토큰 발급 확인
2. Firebase Console에서 Debug token 등록
3. Firestore enforcement를 테스트 프로젝트에서 먼저 확인
4. 운영 프로젝트 enforcement 활성화
