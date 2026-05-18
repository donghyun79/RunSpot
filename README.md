# RunSpot

React Native + Expo app for Seoul runners. RunSpot helps runners plan a route, find nearby runner-friendly places, and choose a return option after the run.

## Architecture Baseline

RunSpot is designed for the first 1,000 users with security, privacy, and fault tolerance as default constraints.

Operating conclusion:
- Location processing stays on device by default.
- Personal data storage is minimized.
- Public facility data is stored in Firebase.
- User reports become public only after approval.
- Failures fall back to cache or default data.

This architecture is suitable for a stable initial launch at roughly 1,000 users.

Folder boundaries:
- `src/app`: Expo Router entry points only
- `src/components`: reusable UI and error boundaries
- `src/features`: feature screens and feature-local logic
- `src/hooks`: reusable React hooks
- `src/services`: Firebase, map, privacy, reliability, and repository boundaries
- `src/types`: shared TypeScript models
- `src/data`: mock and seed data

Development starts with mock data before real Firebase reads and writes. Firebase-backed repositories should preserve the same service contracts and fall back to local mock or cached data on failure.

## Development Roadmap

1. Map, current location, and mock spot data
2. Distance-sorted list and detail view
3. Firebase Authentication
4. Firestore spots connection
5. Favorites and home saving
6. User reports
7. App Check and Security Rules
8. Crashlytics and Analytics
9. Android and iOS test distribution

## Privacy Principle 1: Minimal Personal Data

RunSpot collects only the data needed for the product.

Required:
- User ID
- Nickname
- Email or social login ID
- Favorite places
- User reports

Optional:
- Home location
- Work location
- Frequent start locations

Home and work locations are treated as sensitive location data. The default storage mode is approximate location, such as dong-level or nearby landmark-level data. Exact coordinates should only be stored after explicit consent and encryption.

## Privacy Principle 2: No Realtime Location Storage

RunSpot does not store realtime movement paths on the server by default.

Recommended behavior:
- Current location calculation: on device
- Route preview and nearby filtering: on device whenever possible
- Server storage: favorites, reports, saved courses, and optional approximate places only

Do not store:
- Live current location stream
- Realtime running path
- Background movement history

If a future feature needs route history, it must be opt-in, clearly explained, and stored separately from the default profile data.

## Privacy Principle 3: Firebase Security Rules Required

Firestore and Storage must ship with Security Rules before production use.

Initial Firestore structure:
- `users/{userId}`: owner or admin access
- `spots/{spotId}`: public read, admin write
- `reports/{reportId}`: signed-in author can create, owner/admin can read, admin can moderate
- `favorites/{userId}/items/{spotId}`: owner-only subcollection
- `savedPlaces/{userId}/items/{placeId}`: owner-only optional places
- `savedCourses/{userId}/items/{courseId}`: owner-only saved courses

Default rule: deny every path that is not explicitly allowed.

Access principles:
- Personal data is readable and editable only by the owner.
- Public spot data is readable by everyone.
- Reports can be created only by signed-in users.
- Only admins can approve, reject, or delete reports.

## Data Model

`spots`
- `id`
- `type`: `water | restroom | shower | convenience`
- `name`
- `address`
- `latitude`
- `longitude`
- `openingHours`
- `isPublic`
- `source`: `publicData | userReport | admin`
- `verifiedStatus`: `pending | verified | rejected`
- `updatedAt`

`users`
- `uid`
- `nickname`
- `email`
- `role`: `user | admin`
- `createdAt`

`favorites`
- `userId`
- `spotId`
- `label`: `home | work | courseStart | custom`

`reports`
- `userId`
- `spotId`
- `reportType`
- `content`
- `photoUrl`
- `status`: `pending | approved | rejected`
- `createdAt`

## Privacy Principle 4: App Check Required

Firebase App Check must be enabled before production.

Protected services:
- Firestore
- Firebase Storage
- Cloud Functions

App Check enforcement should be enabled in the Firebase console after verified development builds are working. Debug tokens may be used only for local development and must not be committed.

For native Android/iOS builds, configure platform providers in Firebase Console:
- Android: Play Integrity
- iOS: App Attest with DeviceCheck fallback if needed
- Web/development: reCAPTCHA site key or debug token

## Privacy Principle 5: Critical Work Runs In Cloud Functions

The app must not directly perform trusted or admin-level decisions.

Cloud Functions only:
- Report approval, rejection, and deletion
- Abuse signal aggregation
- Admin actions
- External API calls that require protected keys
- Scheduled public data updates
- Ranking and statistics calculation

The client may call callable HTTPS functions, but the function must verify Authentication, App Check, and role claims before changing trusted data.

## Reliability Principle 1: Partial Failure Should Not Stop The App

RunSpot should keep the core experience usable even when one dependency fails.

Required behavior:
- The map should render even when remote data fails.
- If location permission is denied, show the default Seoul map and available spot lists.
- If Firebase fails, show cached data where possible.
- If one public data source fails, other sources should still render.
- If notifications fail, fall back to on-screen guidance.
- If report upload fails, save it to a local outbox and retry later.

## Development

```bash
npm install
npm run lint
npx tsc --noEmit
```

PowerShell may block `npm.ps1`. Use `npm.cmd` if needed.

```powershell
npm.cmd install
npm.cmd run lint
npx.cmd tsc --noEmit
```
