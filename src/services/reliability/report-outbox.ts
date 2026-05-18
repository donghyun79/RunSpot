import AsyncStorage from '@react-native-async-storage/async-storage';

import { UserReport } from '@/types/runspot';

const REPORT_OUTBOX_KEY = 'runspot:report-outbox';

export type QueuedReport = {
  localId: string;
  report: UserReport;
  retryCount: number;
  queuedAt: string;
};

async function readOutbox() {
  try {
    const raw = await AsyncStorage.getItem(REPORT_OUTBOX_KEY);

    return raw ? (JSON.parse(raw) as QueuedReport[]) : [];
  } catch {
    return [];
  }
}

async function writeOutbox(items: QueuedReport[]) {
  await AsyncStorage.setItem(REPORT_OUTBOX_KEY, JSON.stringify(items));
}

export async function queueReportForRetry(report: UserReport) {
  const outbox = await readOutbox();
  const queuedReport: QueuedReport = {
    localId: `local-${Date.now()}`,
    report,
    retryCount: 0,
    queuedAt: new Date().toISOString(),
  };

  await writeOutbox([...outbox, queuedReport]);
  return queuedReport;
}

export async function getQueuedReports() {
  return readOutbox();
}

export async function removeQueuedReport(localId: string) {
  const outbox = await readOutbox();

  await writeOutbox(outbox.filter((item) => item.localId !== localId));
}

export async function markQueuedReportRetry(localId: string) {
  const outbox = await readOutbox();

  await writeOutbox(
    outbox.map((item) =>
      item.localId === localId
        ? { ...item, retryCount: item.retryCount + 1 }
        : item
    )
  );
}
