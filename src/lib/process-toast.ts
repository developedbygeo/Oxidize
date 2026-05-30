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

    error: (input?: string | { title?: string; description?: string }) => {
      const { title, description } =
        typeof input === 'string' ? { title: undefined, description: input } : input ?? {};
      toast.error(title ?? failTitle, {
        id: toastId,
        description: description || `No ${itemName}s were processed successfully`,
      });
    },

    cancelled: (successCount = 0) => {
      const description =
        successCount > 0
          ? `${successCount} ${itemName}${successCount !== 1 ? 's' : ''} finished before cancel`
          : `No ${itemName}s were processed before cancel`;
      toast.warning(`${doneLabel} cancelled`, { id: toastId, description });
    },

    skipped: ({ successCount, skipCount }: { successCount: number; skipCount: number }) => {
      const skipPlural = skipCount !== 1 ? 's' : '';
      if (successCount === 0) {
        toast.warning(`${doneLabel} skipped`, {
          id: toastId,
          description: `${skipCount} ${itemName}${skipPlural} skipped — output already exists`,
        });
      } else {
        const successPlural = successCount !== 1 ? 's' : '';
        toast.warning(`${doneLabel} partially complete`, {
          id: toastId,
          description: `${successCount} ${itemName}${successPlural} processed, ${skipCount} skipped`,
        });
      }
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
