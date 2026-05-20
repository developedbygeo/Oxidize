import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type DeleteScope = 'single' | 'all';

type ConfirmDeleteDialogProps = {
  scope: DeleteScope | null;
  onCancel: () => void;
  onConfirm: () => void;
};

const ConfirmDeleteDialog = ({ scope, onCancel, onConfirm }: ConfirmDeleteDialogProps) => (
  <AlertDialog open={!!scope} onOpenChange={(open) => !open && onCancel()}>
    <AlertDialogContent onOverlayClick={onCancel}>
      <AlertDialogHeader>
        <AlertDialogTitle>
          {scope === 'all' ? 'Delete all history?' : 'Delete entry?'}
        </AlertDialogTitle>
        <AlertDialogDescription>
          {scope === 'all'
            ? 'This will permanently delete all operation history. This action cannot be undone.'
            : 'This will permanently delete this entry from history. This action cannot be undone.'}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>Cancel</AlertDialogCancel>
        <AlertDialogAction
          onClick={onConfirm}
          className="bg-red-600 text-white hover:bg-red-700"
        >
          {scope === 'all' ? 'Delete All' : 'Delete'}
        </AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
);

ConfirmDeleteDialog.displayName = 'ConfirmDeleteDialog';

export { ConfirmDeleteDialog };
