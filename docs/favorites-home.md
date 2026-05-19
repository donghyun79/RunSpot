# 즐겨찾기/집 저장 기능

RunSpot 5단계는 공개 `spots` 문서를 사용자의 개인 즐겨찾기로 저장합니다.

저장 경로:

```text
favorites/{userId}/items/{spotId}
```

문서 예시:

```json
{
  "userId": "firebase-auth-uid",
  "spotId": "spot-water-yeouido-001",
  "label": "home",
  "createdAt": "2026-05-19T00:00:00.000Z"
}
```

`label` 값:

- `custom`: 일반 즐겨찾기
- `courseStart`: 코스 시작점
- `home`: 집 근처 기준점
- `work`: 회사 근처 기준점

개인정보 원칙:

- 5단계의 `home` 저장은 집의 정확한 좌표를 저장하지 않습니다.
- 사용자가 선택한 공개 편의시설 `spotId`를 집 근처 기준점으로 저장합니다.
- 정확한 집 좌표 저장이 필요해지는 경우에는 별도 동의, 근사 위치, 암호화 저장 정책을 먼저 추가합니다.

현재 확인 필요:

Firebase Console에서 Authentication > Sign-in method > Anonymous를 활성화해야 게스트 로그인과 즐겨찾기 저장을 앱에서 테스트할 수 있습니다. 이 설정은 일반 Firebase Auth 콘솔 설정이며, 공개 Identity Platform 초기화 API는 결제 계정이 필요해 자동화하지 않았습니다.
