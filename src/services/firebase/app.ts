import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { AppCheck, initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import {
  firebaseAppCheckDebugToken,
  firebaseAppCheckSiteKey,
  firebaseConfig,
  hasFirebaseConfig,
} from './config';

declare global {
  var FIREBASE_APPCHECK_DEBUG_TOKEN: string | boolean | undefined;
}

let runSpotAppCheck: AppCheck | null = null;

export function getRunSpotFirebaseApp() {
  if (!hasFirebaseConfig()) {
    return null;
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function initializeRunSpotAppCheck() {
  const app = getRunSpotFirebaseApp();

  if (!app || Platform.OS !== 'web' || !firebaseAppCheckSiteKey) {
    return null;
  }

  if (runSpotAppCheck) {
    return runSpotAppCheck;
  }

  try {
    if (__DEV__ && firebaseAppCheckDebugToken) {
      globalThis.FIREBASE_APPCHECK_DEBUG_TOKEN = firebaseAppCheckDebugToken;
    }

    runSpotAppCheck = initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(firebaseAppCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    });
  } catch {
    runSpotAppCheck = null;
  }

  return runSpotAppCheck;
}

export function getRunSpotFirebaseServices() {
  const app = getRunSpotFirebaseApp();

  if (!app) {
    return null;
  }

  initializeRunSpotAppCheck();

  return {
    app,
    auth: getAuth(app),
    firestore: getFirestore(app),
    functions: getFunctions(app),
    storage: getStorage(app),
  };
}
