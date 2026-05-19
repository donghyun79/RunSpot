# Firestore spots 연결

RunSpot 4단계는 `spots` 컬렉션에서 검증된 공개 편의시설을 읽습니다.

앱이 읽는 조건:

- 컬렉션: `spots`
- `isPublic == true`
- `verifiedStatus == "verified"`
- 최대 200개
- Firestore를 사용할 수 없거나 결과가 비어 있으면 캐시, 그다음 기본 샘플 데이터로 전환

문서 예시:

```json
{
  "id": "spot-water-yeouido-001",
  "type": "water",
  "name": "여의도 한강공원 음수대",
  "address": "서울 영등포구 여의도동 여의도한강공원",
  "latitude": 37.526,
  "longitude": 126.932,
  "openingHours": "상시 이용",
  "isPublic": true,
  "source": "publicData",
  "verifiedStatus": "verified",
  "updatedAt": "2026-05-17T00:00:00.000Z"
}
```

허용 값:

- `type`: `water`, `restroom`, `shower`, `convenience`
- `source`: `publicData`, `userReport`, `admin`
- `verifiedStatus`: `pending`, `verified`, `rejected`

`updatedAt`은 ISO 문자열, Firestore Timestamp, Date, 밀리초 숫자 모두 앱에서 ISO 문자열로 정규화합니다. 운영 데이터는 Firestore Timestamp 또는 ISO 문자열 중 하나로 통일하는 편이 좋습니다.

필요한 환경 변수는 `.env.example`을 기준으로 `.env`에 설정합니다. Firebase 값이 없으면 앱은 Firestore에 연결하지 않고 기본 샘플 데이터를 보여줍니다.
