import { useCallback, useEffect, useState } from 'react';

import {
  AuthState,
  observeRunSpotAuth,
  signInAsGuestRunner,
  signOutRunSpotUser,
} from '@/services/auth/auth-service';
import { getRunSpotCopy } from '@/services/i18n/runspot-copy';
import { setRunSpotAnalyticsUser } from '@/services/observability/analytics';
import { recordNonFatalError } from '@/services/observability/crash-reporting';

export function useRunSpotAuth() {
  const copy = getRunSpotCopy();
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
      void setRunSpotAnalyticsUser(nextState.session?.profile.uid ?? null);
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
      void recordNonFatalError(error, 'guest_sign_in');
      const message = error instanceof Error ? error.message : copy.auth.signInFailed;
      setErrorMessage(
        message.includes('auth/configuration-not-found') ? copy.auth.providerNotEnabled : message
      );
    } finally {
      setIsWorking(false);
    }
  }, [copy.auth.providerNotEnabled, copy.auth.signInFailed]);

  const signOut = useCallback(async () => {
    setIsWorking(true);
    setErrorMessage(null);

    try {
      await signOutRunSpotUser();
    } catch (error) {
      void recordNonFatalError(error, 'sign_out');
      setErrorMessage(error instanceof Error ? error.message : copy.auth.signOutFailed);
    } finally {
      setIsWorking(false);
    }
  }, [copy.auth.signOutFailed]);

  return {
    ...authState,
    isLoading,
    isWorking,
    errorMessage,
    signInAsGuest,
    signOut,
  };
}
