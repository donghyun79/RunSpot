import { useCallback, useEffect, useState } from 'react';

import {
  AuthState,
  observeRunSpotAuth,
  signInAsGuestRunner,
  signOutRunSpotUser,
} from '@/services/auth/auth-service';

export function useRunSpotAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    session: null,
    isConfigured: true,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isWorking, setIsWorking] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const unsubscribe = observeRunSpotAuth((nextState) => {
      setAuthState(nextState);
      setErrorMessage(nextState.errorMessage ?? null);
      setIsLoading(false);
    });

    return unsubscribe;
  }, []);

  const signInAsGuest = useCallback(async () => {
    setIsWorking(true);
    setErrorMessage(null);

    try {
      await signInAsGuestRunner();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '로그인에 실패했습니다.');
    } finally {
      setIsWorking(false);
    }
  }, []);

  const signOut = useCallback(async () => {
    setIsWorking(true);
    setErrorMessage(null);

    try {
      await signOutRunSpotUser();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '로그아웃에 실패했습니다.');
    } finally {
      setIsWorking(false);
    }
  }, []);

  return {
    ...authState,
    isLoading,
    isWorking,
    errorMessage,
    signInAsGuest,
    signOut,
  };
}
