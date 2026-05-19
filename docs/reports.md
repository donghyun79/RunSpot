# 제보 기능

RunSpot 6단계는 로그인한 사용자가 편의시설 또는 코스 문제를 제보하는 흐름입니다.

저장 경로:

```text
reports/{reportId}
```

문서 예시:

```json
{
  "id": "report-userid-1779160000000",
  "userId": "firebase-auth-uid",
  "spotId": "spot-water-yeouido-001",
  "reportType": "spotWrongInfo",
  "content": "음수대 위치가 조금 다릅니다.",
  "status": "pending",
  "createdAt": "2026-05-19T00:00:00.000Z"
}
```

제보 유형:

- `spotMissing`: 없는 시설
- `spotClosed`: 운영 안 함
- `spotWrongInfo`: 정보 오류
- `routeIssue`: 코스 문제

동작 원칙:

- 로그인한 사용자만 제보할 수 있습니다.
- 제보는 항상 `pending` 상태로 생성됩니다.
- 사용자는 자기 제보만 읽을 수 있습니다.
- 승인, 반려, 삭제는 관리자만 할 수 있습니다.
- 네트워크 또는 Firestore 오류가 발생하면 `runspot:report-outbox` 로컬 큐에 임시 저장합니다.
