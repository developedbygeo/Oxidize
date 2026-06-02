import { useState, useMemo } from 'react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  type SortingState,
} from '@tanstack/react-table';
import { History, Trash2 } from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PageHeader } from '@/components/page-parts/PageHeader';
import type { OperationHistoryItem } from '@/types/image';
import { buildColumns } from './_components/columns';
import { HistoryTable } from './_components/HistoryTable';
import { HistoryPagination } from './_components/HistoryPagination';
import { HistoryStats } from './_components/HistoryStats';
import { ConfirmDeleteDialog, type DeleteScope } from './_components/ConfirmDeleteDialog';
import { EmptyState } from './_components/EmptyState';

type HistoryPageProps = {
  history: OperationHistoryItem[];
  onRemoveHistory: (id: string) => void;
  onClearHistory: () => void;
};

const HistoryPage = ({ history, onRemoveHistory, onClearHistory }: HistoryPageProps) => {
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: DeleteScope } | null>(null);
  const [sorting, setSorting] = useState<SortingState>([]);

  const handleOpenFolder = async (path: string) => {
    try {
      await invoke('open_folder', { path });
    } catch (error) {
      console.error('Failed to open folder:', error);
      toast.error('Folder no longer exists', {
        description: 'The output directory may have been moved or deleted.',
      });
    }
  };

  const handleConfirmDelete = () => {
    if (!confirmDelete) return;
    if (confirmDelete.type === 'all') {
      onClearHistory();
      toast.success('History deleted');
    } else {
      onRemoveHistory(confirmDelete.id);
      toast.success('Entry deleted');
    }
    setConfirmDelete(null);
  };

  const columns = useMemo(
    () =>
      buildColumns({
        onOpenFolder: handleOpenFolder,
        onRequestDelete: (id) => setConfirmDelete({ id, type: 'single' }),
      }),
    []
  );

  const table = useReactTable({
    data: history,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onSortingChange: setSorting,
    state: { sorting },
    initialState: { pagination: { pageSize: 10 } },
  });

  return (
    <TooltipProvider>
      <div className="h-full overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-5">
          <PageHeader
            icon={History}
            title="History"
            description="View and manage recent operations"
          >
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete({ id: '', type: 'all' })}
                className="text-xs text-muted-foreground hover:text-destructive hover:border-destructive h-8"
              >
                <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                Clear
              </Button>
            )}
          </PageHeader>

          {history.length === 0 && <EmptyState />}

          {history.length > 0 && (
            <div className="space-y-3">
              <HistoryTable table={table} />
              <HistoryPagination table={table} />
            </div>
          )}

          {history.length > 0 && <HistoryStats history={history} />}
        </div>
      </div>

      <ConfirmDeleteDialog
        scope={confirmDelete?.type ?? null}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={handleConfirmDelete}
      />
    </TooltipProvider>
  );
};

HistoryPage.displayName = 'HistoryPage';

export { HistoryPage };
