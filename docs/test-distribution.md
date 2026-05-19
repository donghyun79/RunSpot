# Android/iOS 테스트 배포

## 목적

Expo Go 검수에서 development build 검수로 넘어가기 위한 설정이다. development build를 사용하면 Expo Go에 포함되지 않은 네이티브 설정, 지도 API key, 이후 Crashlytics 같은 네이티브 SDK를 실제 기기에서 확인할 수 있다.

## 현재 설정

- Android package: `com.runspot.mobile`
- iOS bundle identifier: `com.runspot.mobile`
- development build: 내부 배포, Android는 APK
- preview build: 내부 배포, Android는 APK
- production build: Android는 AAB

## 사전 준비

1. Expo 계정으로 로그인한다.
2. EAS 프로젝트를 연결한다.
3. Android 지도 확인을 위해 `GOOGLE_MAPS_ANDROID_API_KEY`를 EAS secret 또는 로컬 환경 변수로 등록한다.
4. Firebase Web 설정 값도 EAS secret으로 등록한다.
5. iOS 기기 내부 배포는 Apple Developer 계정과 기기 등록이 필요하다.

## 현재 진행 상태

- `npx eas-cli whoami` 확인 결과: 아직 Expo/EAS에 로그인되어 있지 않다.
- 로그인 전에는 `eas build:configure`와 서버 빌드를 진행할 수 없다.
- 다음 사용자가 직접 해야 하는 명령은 `npx eas-cli login`이다.
- 로그인 후에는 이 문서의 명령 순서대로 Android development build부터 진행한다.

## 명령

```powershell
npx eas-cli login
npx eas-cli build:configure
npm.cmd run build:android:dev
npm.cmd run build:ios:dev
```

iOS 시뮬레이터용 빌드는 아래 명령을 사용한다.

```powershell
npm.cmd run build:ios:sim
```

## 검수 순서

1. Android development build를 먼저 만든다.
2. 설치 후 현재 위치 권한, 지도 표시, Firestore spots, 즐겨찾기, 제보, 카카오맵 귀가 경로를 확인한다.
3. Android preview build로 Expo 개발 메뉴 없이 설치되는지 확인한다.
4. Apple Developer 계정 준비 후 iOS development build를 진행한다.

## 주의

- `.env` 파일은 Git에 올리지 않는다.
- EAS 서버 빌드는 로컬 `.env`를 자동으로 가져가지 않으므로 필요한 값은 EAS environment variables 또는 secrets로 등록한다.
- Android 지도 타일이 비어 있으면 Google Maps API key와 Maps SDK for Android 활성화 상태를 먼저 확인한다.
