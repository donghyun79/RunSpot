# 지도 전략

RunSpot의 최종 지도 UX는 카카오맵 중심으로 가져간다. 다만 현재 앱 내부 지도 렌더링은 Expo Go 검수 속도와 Expo SDK 55 호환성을 위해 `react-native-maps` 1.27.2를 사용한다.

## 역할 분리

- 지도 렌더러: 앱 안에서 지도, 마커, 폴리라인, 출발지/도착지 선택을 표시한다.
- 장소 데이터: 공공화장실, 따릉이, 아리수 음수대, 편의점, 대중교통 지점 정보를 가져온다.
- 경로 미리보기: 앱 안에서 예상 거리와 주변 편의시설 필터링에 필요한 좌표를 계산한다.
- 귀가 길찾기: 사용자가 실제 이동을 시작할 때 카카오맵으로 넘긴다.

## 현재 Provider 계획

| 역할 | 현재 | 목표 |
| --- | --- | --- |
| 앱 내부 지도 렌더러 | `react-native-maps` | 카카오맵 네이티브 SDK 검토 |
| 검증된 장소 저장소 | Firestore `spots` | Firestore 유지 |
| 서울 공공 장소 데이터 | 서울 열린데이터, 수동 검증 데이터 | 공공화장실, 따릉이, 아리수 음수대 확장 |
| 주변 장소 검색 | Kakao Local API | Kakao Local API 유지 |
| 경로 미리보기 | OSRM, 직선거리 fallback | 필요 시 국내 경로 API 검토 |
| 외부 길찾기 | 카카오맵 딥링크 | 카카오맵 유지 |

이렇게 나누면 카카오맵 중심의 한국형 UX를 유지하면서도, Expo Go에서 현재 기능을 계속 눌러보고 Firestore, 즐겨찾기, 제보 흐름을 검수할 수 있다.

## `react-native-maps`를 현재 렌더러로 두는 이유

- Expo Go에서 바로 검수할 수 있다.
- Firestore, 즐겨찾기, 제보, 장소 필터링을 지도 SDK 전환과 독립적으로 완성할 수 있다.
- 카카오 네이티브 SDK 전환 시에도 데이터 저장 구조와 UX 흐름을 크게 흔들지 않는다.

## 카카오맵을 목표로 두는 이유

- 국내 사용자에게 길찾기와 대중교통 UX가 익숙하다.
- 카카오 Local API와 카카오맵 딥링크를 이미 같은 방향으로 사용할 수 있다.
- 공공화장실, 따릉이, 아리수 음수대 같은 서울 생활형 데이터를 앱 UX에 맞게 얹기 좋다.

## 빌드 기준

Expo Go에서는 별도 Google Maps API key 없이 `react-native-maps` 지도를 테스트할 수 있다. Android 개발/배포 빌드에서 현재 렌더러를 계속 쓰려면 Google Maps API key가 필요하다.

`.env`에 아래 값을 추가하면 `app.config.js`가 `react-native-maps` config plugin에 주입한다.

```env
GOOGLE_MAPS_ANDROID_API_KEY=...
GOOGLE_MAPS_IOS_API_KEY=...
```

키가 없으면 Expo Go 확인은 계속 가능하지만, Android standalone/development build에서는 지도 타일이 회색 또는 빈 화면으로 보일 수 있다. 이 키는 현재 렌더러 안정화용이며, 최종 지도 전략을 Google Maps로 확정한다는 뜻은 아니다.

## Android 키 준비

1. Google Cloud Console에서 Maps SDK for Android를 활성화한다.
2. API key를 만든다.
3. 앱 패키지명과 SHA-1 fingerprint로 Android 앱 제한을 건다.
4. `.env`의 `GOOGLE_MAPS_ANDROID_API_KEY`에 넣는다.
5. development build 또는 store build를 다시 만든다.

## 확인 포인트

- Expo Go에서 빈 화면이면 Expo Go 버전, 기기 네트워크, Google Play services 상태를 먼저 확인한다.
- 웹 화면은 보조 확인 화면이라 실제 지도 대신 데이터 연결 상태를 보여준다.
- 실제 지도 UX 검수는 Android/iOS 앱 화면에서 진행한다.
- 카카오 네이티브 SDK 전환은 development build 단계에서 별도 작업으로 진행한다.
