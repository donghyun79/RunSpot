import { httpsCallable } from 'firebase/functions';

import { getRunSpotFirebaseServices } from './app';

export type ApproveReportRequest = {
  reportId: string;
  action: 'approve' | 'reject' | 'delete';
  adminNote?: string;
};

export type SubmitModerationSignalRequest = {
  targetType: 'spot' | 'report' | 'user';
  targetId: string;
  reason: string;
};

export type RefreshPublicDataRequest = {
  source: 'seoul-open-data' | 'kakao-local';
  dataset: 'bikeStations' | 'restrooms' | 'showers' | 'convenienceStores';
};

export type RecalculateStatsRequest = {
  scope: 'spots' | 'reports' | 'routes';
};

export const callableFunctionNames = {
  moderateReport: 'moderateReport',
  submitModerationSignal: 'submitModerationSignal',
  refreshPublicData: 'refreshPublicData',
  recalculateStats: 'recalculateStats',
} as const;

function getFunctionsOrThrow() {
  const services = getRunSpotFirebaseServices();

  if (!services) {
    throw new Error('Firebase is not configured.');
  }

  return services.functions;
}

export function moderateReport(request: ApproveReportRequest) {
  return httpsCallable<ApproveReportRequest, { ok: true }>(
    getFunctionsOrThrow(),
    callableFunctionNames.moderateReport
  )(request);
}

export function submitModerationSignal(request: SubmitModerationSignalRequest) {
  return httpsCallable<SubmitModerationSignalRequest, { ok: true }>(
    getFunctionsOrThrow(),
    callableFunctionNames.submitModerationSignal
  )(request);
}

export function refreshPublicData(request: RefreshPublicDataRequest) {
  return httpsCallable<RefreshPublicDataRequest, { ok: true }>(
    getFunctionsOrThrow(),
    callableFunctionNames.refreshPublicData
  )(request);
}

export function recalculateStats(request: RecalculateStatsRequest) {
  return httpsCallable<RecalculateStatsRequest, { ok: true }>(
    getFunctionsOrThrow(),
    callableFunctionNames.recalculateStats
  )(request);
}
