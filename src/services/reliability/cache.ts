import AsyncStorage from '@react-native-async-storage/async-storage';

export type CacheEnvelope<T> = {
  value: T;
  updatedAt: string;
};

export async function readCache<T>(key: string): Promise<CacheEnvelope<T> | null> {
  try {
    const raw = await AsyncStorage.getItem(key);

    return raw ? (JSON.parse(raw) as CacheEnvelope<T>) : null;
  } catch {
    return null;
  }
}

export async function writeCache<T>(key: string, value: T) {
  try {
    const envelope: CacheEnvelope<T> = {
      value,
      updatedAt: new Date().toISOString(),
    };

    await AsyncStorage.setItem(key, JSON.stringify(envelope));
  } catch {
    // Cache failures must not block the main app flow.
  }
}
