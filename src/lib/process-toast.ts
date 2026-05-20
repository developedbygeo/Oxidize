import { toast } from 'sonner';

type ProcessToastOptions = {
  /** Present-progressive title shown during processing — e.g. "Converting", "Compressing". */
  progressLabel: string;
  /** Noun shown on completion / failure — e.g. "Conversion", "Compression". */
  doneLabel: string;
  itemCount: number;
  itemName?: string;
};

type ProcessResult = {
  successCount: number;
  failCount: number;
  extraInfo?: string;
};

export const createProcessToast = ({
  progressLabel,
  doneLabel,
  itemCount,
  itemName = 'image',
}: ProcessToastOptions) => {
  const plural = itemCount !== 1 ? 's' : '';
  const toastId = toast.loading(`${progressLabel} ${itemCount} ${itemName}${plural}...`);

  const successTitle = `${doneLabel} complete`;
  const failTitle = `${doneLabel} failed`;
  const partialTitle = `${doneLabel} partially complete`;

  return {
    toastId,

    success: ({ successCount, extraInfo }: { successCount: number; extraInfo?: string }) => {
      const plural = successCount !== 1 ? 's' : '';
      const description = extraInfo
        ? `${successCount} ${itemName}${plural} processed · ${extraInfo}`
        : `${successCount} ${itemName}${plural} processed successfully`;

      toast.success(successTitle, { id: toastId, description });
    },

    warning: ({ successCount, failCount }: ProcessResult) => {
      toast.warning(partialTitle, {
        id: toastId,
        description: `${successCount} succeeded, ${failCount} failed`,
      });
    },

    error: (message?: string) => {
      toast.error(failTitle, {
        id: toastId,
        description: message || `No ${itemName}s were processed successfully`,
      });
    },

    finish: ({ successCount, failCount, extraInfo }: ProcessResult) => {
      if (successCount > 0 && failCount === 0) {
        const plural = successCount !== 1 ? 's' : '';
        const description = extraInfo
          ? `${successCount} ${itemName}${plural} processed · ${extraInfo}`
          : `${successCount} ${itemName}${plural} processed successfully`;

        toast.success(successTitle, { id: toastId, description });
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(partialTitle, {
          id: toastId,
          description: `${successCount} succeeded, ${failCount} failed`,
        });
      } else {
        toast.error(failTitle, {
          id: toastId,
          description: `No ${itemName}s were processed successfully`,
        });
      }
    },
  };
};
