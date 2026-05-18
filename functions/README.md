# RunSpot Cloud Functions

Trusted operations must run here, not in the mobile client.

Planned callable functions:
- `moderateReport`: approve, reject, or delete user reports. Admin only.
- `submitModerationSignal`: collect abuse or quality signals from signed-in users.
- `refreshPublicData`: refresh Seoul Open Data and Kakao Local datasets. Admin or scheduler only.
- `recalculateStats`: calculate rankings and aggregate statistics. Admin or scheduler only.

Every function must verify:
- Firebase Authentication
- Firebase App Check
- Admin role claims when required
- Request shape and allowed fields

Do not store realtime user location or movement streams.
