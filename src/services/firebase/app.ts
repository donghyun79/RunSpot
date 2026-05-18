import { getApp, getApps, initializeApp } from 'firebase/app';
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check';
import { getAuth } from 'firebase/auth';
import { getFunctions } from 'firebase/functions';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

import { firebaseAppCheckSiteKey, firebaseConfig, hasFirebaseConfig } from './config';

export function getRunSpotFirebaseApp() {
  if (!hasFirebaseConfig()) {
    return null;
  }

  return getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
}

export function initializeRunSpotAppCheck() {
  const app = getRunSpotFirebaseApp();

  if (!app || !firebaseAppCheckSiteKey) {
    return null;
  }

  return initializeAppCheck(app, {
    provider: new ReCaptchaV3Provider(firebaseAppCheckSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
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
