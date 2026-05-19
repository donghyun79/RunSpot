import { deleteDoc, doc, getDocs, collection, setDoc } from 'firebase/firestore';

import { getRunSpotFirebaseServices } from '@/services/firebase/app';
import { trackRunSpotEvent } from '@/services/observability/analytics';
import { Favorite, FavoriteLabel } from '@/types/runspot';

export async function getUserFavorites(userId: string): Promise<Favorite[]> {
  const services = getRunSpotFirebaseServices();

  if (!services) {
    return [];
  }

  const snapshot = await getDocs(collection(services.firestore, 'favorites', userId, 'items'));

  return snapshot.docs.map((favoriteDocument) => favoriteDocument.data() as Favorite);
}

export async function saveUserFavorite(userId: string, spotId: string, label: FavoriteLabel) {
  const services = getRunSpotFirebaseServices();

  if (!services) {
    throw new Error('Firebase is not configured.');
  }

  const favorite: Favorite = {
    userId,
    spotId,
    label,
    createdAt: new Date().toISOString(),
  };

  await setDoc(doc(services.firestore, 'favorites', userId, 'items', spotId), favorite);
  await trackRunSpotEvent({
    name: 'favorite_saved',
    params: {
      label,
    },
  });

  return favorite;
}

export async function removeUserFavorite(userId: string, spotId: string) {
  const services = getRunSpotFirebaseServices();

  if (!services) {
    return;
  }

  await deleteDoc(doc(services.firestore, 'favorites', userId, 'items', spotId));
  await trackRunSpotEvent({
    name: 'favorite_removed',
    params: {},
  });
}
