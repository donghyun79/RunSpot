# NaviHeal Runners

나빌러닝 회원들이 훈련 기록, 월 마일리지 목표, 주간 통계, 개인 기록, 클럽 랭킹을 함께 확인하는 정적 웹앱입니다.

## 운영 준비 순서

1. Firebase Console에서 Authentication의 이메일/비밀번호 로그인을 활성화합니다.
2. Firestore Database를 만들고 `firestore.rules`를 배포합니다.
3. Firebase Hosting을 배포합니다.
4. 클럽 회원에게 사이트 주소와 가입코드를 공유합니다.

## 배포 명령

Firebase CLI가 없다면 먼저 설치하고 로그인합니다.

```powershell
npm install -g firebase-tools
firebase login
```

Firebase CLI 로그인이 되어 있다면 아래 순서로 배포합니다.

```powershell
firebase deploy --only firestore:rules
firebase deploy --only hosting
```

## 가입코드

초기 가입코드는 `NAVIHEAL`입니다. 운영 전에 `app.js`의 `CLUB_INVITE_CODE` 값을 바꿔주세요.
이 코드는 운영 초기의 간단한 가입 장치입니다. 더 강한 승인제가 필요하면 Cloud Functions나 관리자 승인 컬렉션을 추가하는 방식으로 강화하는 것이 좋습니다.

## 모바일 사용

`manifest.webmanifest`와 `service-worker.js`가 포함되어 있어 모바일 브라우저에서 홈 화면에 추가해 앱처럼 사용할 수 있습니다. iPhone과 Android에서 첫 로그인, 기록 저장, 그래프 표시를 한 번씩 확인한 뒤 회원에게 공유하는 것을 권장합니다.
