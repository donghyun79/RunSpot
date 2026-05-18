import { User, onAuthStateChanged, signInAnonymously, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

import { getRunSpotFirebaseServices } from '@/services/firebase/app';
import { RunSpotUserProfile } from '@/types/runspot';

export type RunSpotAuthSession = {
  user: User;
  profile: RunSpotUserProfile;
};

export type AuthState = {
  session: RunSpotAuthSession | null;
  isConfigured: boolean;
  errorMessage?: string;
};

function createDefaultProfile(user: User): RunSpotUserProfile {
  return {
    uid: user.uid,
    nickname: user.isAnonymous ? '익명 러너' : user.displayName || '러너',
    email: user.email ?? undefined,
    role: 'user',
    createdAt: new Date().toISOString(),
  };
}

async function ensureUserProfile(user: User): Promise<RunSpotUserProfile> {
  const services = getRunSpotFirebaseServices();

  if (!services) {
    throw new Error('Firebase 환경 변수가 설정되지 않았습니다.');
  }

  const profileRef = doc(services.firestore, 'users', user.uid);
  const snapshot = await getDoc(profileRef);

  if (snapshot.exists()) {
    return snapshot.data() as RunSpotUserProfile;
  }

  const profile = createDefaultProfile(user);
  await setDoc(profileRef, profile);
  return profile;
}

export function observeRunSpotAuth(callback: (state: AuthState) => void) {
  const services = getRunSpotFirebaseServices();

  if (!services) {
    callback({ session: null, isConfigured: false });
    return () => {};
  }

  return onAuthStateChanged(services.auth, async (user) => {
    if (!user) {
      callback({ session: null, isConfigured: true });
      return;
    }

    try {
      const profile = await ensureUserProfile(user);
      callback({ session: { user, profile }, isConfigured: true });
    } catch (error) {
      callback({
        session: null,
        isConfigured: true,
        errorMessage:
          error instanceof Error ? error.message : '사용자 프로필을 불러오지 못했습니다.',
      });
    }
  });
}

export async function signInAsGuestRunner() {
  const services = getRunSpotFirebaseServices();

  if (!services) {
    throw new Error('Firebase 환경 변수가 설정되지 않았습니다.');
  }

  const credential = await signInAnonymously(services.auth);
  return ensureUserProfile(credential.user);
}

export async function signOutRunSpotUser() {
  const services = getRunSpotFirebaseServices();

  if (!services) {
    return;
  }

  await firebaseSignOut(services.auth);
}
