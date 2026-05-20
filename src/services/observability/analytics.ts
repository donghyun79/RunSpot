import { Platform } from 'react-native';
import {
  Analytics,
  getAnalytics,
  isSupported,
  logEvent,
  setUserId,
} from 'firebase/analytics';

import { getRunSpotFirebaseApp } from '@/services/firebase/app';
import { FavoriteLabel, SpotType, UserReportType } from '@/types/runspot';

export type RunSpotAnalyticsEvent =
  | {
      name: 'screen_view';
      params: {
        screen_name: 'course_map' | 'plan';
      };
    }
  | {
      name: 'location_permission_result';
      params: {
        result: 'granted' | 'denied' | 'failed' | 'outside_seoul';
      };
    }
  | {
      name: 'route_preview_ready';
      params: {
        source: 'osrm' | 'fallback';
        route_preference?: 'bikeRoad' | 'shortest';
        distance_bucket_km: number;
      };
    }
  | {
      name: 'spot_selected';
      params: {
        spot_type: SpotType;
        source: string;
      };
    }
  | {
      name: 'favorite_saved';
      params: {
        label: FavoriteLabel;
      };
    }
  | {
      name: 'favorite_removed';
      params: Record<string, never>;
    }
  | {
      name: 'report_submitted';
      params: {
        report_type: UserReportType;
        queued: boolean;
      };
    }
  | {
      name: 'return_route_opened';
      params: {
        mode: 'publictransit' | 'bicycle' | 'foot';
      };
    }
  | {
      name: 'route_handoff_opened';
      params: {
        mode: 'bicycle' | 'foot';
        route_preference: 'bikeRoad' | 'shortest';
      };
    }
  | {
      name: 'app_exception';
      params: {
        context: string;
        fatal: boolean;
        message: string;
      };
    };

let analyticsPromise: Promise<Analytics | null> | null = null;

async function getRunSpotAnalytics() {
  if (Platform.OS !== 'web') {
    return null;
  }

  if (!analyticsPromise) {
    analyticsPromise = (async () => {
      const app = getRunSpotFirebaseApp();

      if (!app || !(await isSupported())) {
        return null;
      }

      return getAnalytics(app);
    })();
  }

  return analyticsPromise;
}

export async function trackRunSpotEvent(event: RunSpotAnalyticsEvent) {
  try {
    const analytics = await getRunSpotAnalytics();

    if (!analytics) {
      return;
    }

    logEvent(analytics, event.name as string, event.params);
  } catch {
    // Analytics must never block the user flow.
  }
}

export async function setRunSpotAnalyticsUser(userId: string | null) {
  try {
    const analytics = await getRunSpotAnalytics();

    if (!analytics) {
      return;
    }

    setUserId(analytics, userId);
  } catch {
    // Analytics must never block the user flow.
  }
}
