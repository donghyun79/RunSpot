import { useCallback, useEffect, useMemo, useState } from 'react';

import {
  getUserFavorites,
  removeUserFavorite,
  saveUserFavorite,
} from '@/services/favorites/favorite-repository';
import { Favorite, FavoriteLabel } from '@/types/runspot';

export function useFavorites(userId?: string) {
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [isSavingFavorite, setIsSavingFavorite] = useState(false);
  const [favoriteError, setFavoriteError] = useState<string | null>(null);

  useEffect(() => {
    let isCurrent = true;

    async function loadFavorites() {
      if (!userId) {
        setFavorites([]);
        setIsLoadingFavorites(false);
        return;
      }

      setIsLoadingFavorites(true);
      setFavoriteError(null);

      try {
        const nextFavorites = await getUserFavorites(userId);

        if (isCurrent) {
          setFavorites(nextFavorites);
        }
      } catch (error) {
        if (isCurrent) {
          setFavoriteError(error instanceof Error ? error.message : 'Could not load favorites.');
        }
      } finally {
        if (isCurrent) {
          setIsLoadingFavorites(false);
        }
      }
    }

    loadFavorites();

    return () => {
      isCurrent = false;
    };
  }, [userId]);

  const favoriteBySpotId = useMemo(
    () => new Map(favorites.map((favorite) => [favorite.spotId, favorite])),
    [favorites]
  );

  const saveFavorite = useCallback(
    async (spotId: string, label: FavoriteLabel) => {
      if (!userId) {
        setFavoriteError('Sign in to save favorites.');
        return;
      }

      setIsSavingFavorite(true);
      setFavoriteError(null);

      try {
        const favorite = await saveUserFavorite(userId, spotId, label);

        setFavorites((currentFavorites) => [
          ...currentFavorites.filter((current) => current.spotId !== spotId),
          favorite,
        ]);
      } catch (error) {
        setFavoriteError(error instanceof Error ? error.message : 'Could not save favorite.');
      } finally {
        setIsSavingFavorite(false);
      }
    },
    [userId]
  );

  const removeFavorite = useCallback(
    async (spotId: string) => {
      if (!userId) {
        setFavoriteError('Sign in to remove favorites.');
        return;
      }

      setIsSavingFavorite(true);
      setFavoriteError(null);

      try {
        await removeUserFavorite(userId, spotId);
        setFavorites((currentFavorites) =>
          currentFavorites.filter((favorite) => favorite.spotId !== spotId)
        );
      } catch (error) {
        setFavoriteError(error instanceof Error ? error.message : 'Could not remove favorite.');
      } finally {
        setIsSavingFavorite(false);
      }
    },
    [userId]
  );

  return {
    favorites,
    favoriteBySpotId,
    isLoadingFavorites,
    isSavingFavorite,
    favoriteError,
    saveFavorite,
    removeFavorite,
  };
}
