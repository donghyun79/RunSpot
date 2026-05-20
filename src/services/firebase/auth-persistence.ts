import { FirebaseApp } from 'firebase/app';
import { Auth, getAuth } from 'firebase/auth';

export function getRunSpotFirebaseAuth(app: FirebaseApp): Auth {
  return getAuth(app);
}
