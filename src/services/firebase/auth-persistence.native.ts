import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseApp } from 'firebase/app';
import * as FirebaseAuth from 'firebase/auth';
import { Auth, getAuth, initializeAuth, Persistence } from 'firebase/auth';

let runSpotAuth: Auth | null = null;
const getReactNativePersistence = (
  FirebaseAuth as unknown as {
    getReactNativePersistence: (storage: typeof AsyncStorage) => Persistence;
  }
).getReactNativePersistence;

export function getRunSpotFirebaseAuth(app: FirebaseApp): Auth {
  if (runSpotAuth) {
    return runSpotAuth;
  }

  try {
    runSpotAuth = initializeAuth(app, {
      persistence: getReactNativePersistence(AsyncStorage),
    });
  } catch {
    runSpotAuth = getAuth(app);
  }

  return runSpotAuth;
}
