import { doc, setDoc } from 'firebase/firestore';

import { getRunSpotFirebaseServices } from '@/services/firebase/app';
import { trackRunSpotEvent } from '@/services/observability/analytics';
import { queueReportForRetry } from '@/services/reliability/report-outbox';
import { UserReport, UserReportType } from '@/types/runspot';

export type CreateReportRequest = {
  userId: string;
  reportType: UserReportType;
  spotId?: string;
  content?: string;
};

export type CreateReportResult = {
  report: UserReport;
  queued: boolean;
};

export async function createUserReport(request: CreateReportRequest): Promise<CreateReportResult> {
  const report: UserReport = {
    id: `report-${request.userId}-${Date.now()}`,
    userId: request.userId,
    reportType: request.reportType,
    status: 'pending',
    spotId: request.spotId,
    content: request.content?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  const services = getRunSpotFirebaseServices();

  if (!services) {
    await queueReportForRetry(report);
    await trackRunSpotEvent({
      name: 'report_submitted',
      params: {
        report_type: report.reportType,
        queued: true,
      },
    });
    return { report, queued: true };
  }

  try {
    await setDoc(doc(services.firestore, 'reports', report.id), report);
    await trackRunSpotEvent({
      name: 'report_submitted',
      params: {
        report_type: report.reportType,
        queued: false,
      },
    });
    return { report, queued: false };
  } catch {
    await queueReportForRetry(report);
    await trackRunSpotEvent({
      name: 'report_submitted',
      params: {
        report_type: report.reportType,
        queued: true,
      },
    });
    return { report, queued: true };
  }
}
