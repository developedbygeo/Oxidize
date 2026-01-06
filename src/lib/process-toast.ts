import { toast } from 'sonner';

type ProcessToastOptions = {
  action: string;
  itemCount: number;
  itemName?: string;
};

type ProcessResult = {
  successCount: number;
  failCount: number;
  extraInfo?: string;
};

export const createProcessToast = ({ action, itemCount, itemName = 'image' }: ProcessToastOptions) => {
  const plural = itemCount !== 1 ? 's' : '';
  const toastId = toast.loading(`${action} ${itemCount} ${itemName}${plural}...`);

  return {
    toastId,

    success: ({ successCount, extraInfo }: { successCount: number; extraInfo?: string }) => {
      const plural = successCount !== 1 ? 's' : '';
      const description = extraInfo
        ? `${successCount} ${itemName}${plural} processed • ${extraInfo}`
        : `${successCount} ${itemName}${plural} processed successfully`;

      toast.success(`${action} complete`, {
        id: toastId,
        description,
      });
    },

    warning: ({ successCount, failCount }: ProcessResult) => {
      toast.warning(`${action} partially complete`, {
        id: toastId,
        description: `${successCount} succeeded, ${failCount} failed`,
      });
    },

    error: (message?: string) => {
      toast.error(`${action} failed`, {
        id: toastId,
        description: message || `No ${itemName}s were processed successfully`,
      });
    },

    finish: ({ successCount, failCount, extraInfo }: ProcessResult) => {
      if (successCount > 0 && failCount === 0) {
        const plural = successCount !== 1 ? 's' : '';
        const description = extraInfo
          ? `${successCount} ${itemName}${plural} processed • ${extraInfo}`
          : `${successCount} ${itemName}${plural} processed successfully`;

        toast.success(`${action} complete`, {
          id: toastId,
          description,
        });
      } else if (successCount > 0 && failCount > 0) {
        toast.warning(`${action} partially complete`, {
          id: toastId,
          description: `${successCount} succeeded, ${failCount} failed`,
        });
      } else {
        toast.error(`${action} failed`, {
          id: toastId,
          description: `No ${itemName}s were processed successfully`,
        });
      }
    },
  };
};
