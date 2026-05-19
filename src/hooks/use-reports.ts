import { useCallback, useState } from 'react';

import { getRunSpotCopy } from '@/services/i18n/runspot-copy';
import { createUserReport } from '@/services/reports/report-repository';
import { UserReportType } from '@/types/runspot';

export function useReports(userId?: string) {
  const copy = getRunSpotCopy();
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);
  const [reportMessage, setReportMessage] = useState<string | null>(null);
  const [reportError, setReportError] = useState<string | null>(null);

  const submitReport = useCallback(
    async (spotId: string | undefined, reportType: UserReportType, content?: string) => {
      if (!userId) {
        setReportError(copy.reports.signInRequired);
        return;
      }

      setIsSubmittingReport(true);
      setReportMessage(null);
      setReportError(null);

      try {
        const result = await createUserReport({
          userId,
          spotId,
          reportType,
          content,
        });

        setReportMessage(result.queued ? copy.reports.queued : copy.reports.submitted);
      } catch (error) {
        setReportError(error instanceof Error ? error.message : copy.reports.failed);
      } finally {
        setIsSubmittingReport(false);
      }
    },
    [copy.reports.failed, copy.reports.queued, copy.reports.signInRequired, copy.reports.submitted, userId]
  );

  const clearReportStatus = useCallback(() => {
    setReportMessage(null);
    setReportError(null);
  }, []);

  return {
    isSubmittingReport,
    reportMessage,
    reportError,
    submitReport,
    clearReportStatus,
  };
}
