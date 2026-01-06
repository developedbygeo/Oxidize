import { useState, useMemo } from 'react';
import { motion } from 'motion/react';
import {
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  type ColumnDef,
  type SortingState,
} from '@tanstack/react-table';
import {
  History,
  FolderOpen,
  Trash2,
  ArrowRightLeft,
  Minimize2,
  Sparkles,
  Wand2,
  Clock,
  FileImage,
  TrendingDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from 'lucide-react';
import { invoke } from '@tauri-apps/api/core';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from '@/components/ui/tooltip';
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
import type { OperationHistoryItem, OperationType } from '@/types/image';

interface HistoryPageProps {
  history: OperationHistoryItem[];
  onRemoveHistory: (id: string) => void;
  onClearHistory: () => void;
}

const operationIcons: Record<OperationType, typeof ArrowRightLeft> = {
  convert: ArrowRightLeft,
  compress: Minimize2,
  beautify: Sparkles,
  effects: Wand2,
};

const operationColors: Record<OperationType, string> = {
  convert: 'text-primary bg-primary/10',
  compress: 'text-emerald-500 bg-emerald-500/10',
  beautify: 'text-amber-500 bg-amber-500/10',
  effects: 'text-violet-500 bg-violet-500/10',
};

const operationLabels: Record<OperationType, string> = {
  convert: 'Convert',
  compress: 'Compress',
  beautify: 'Beautify',
  effects: 'Effects',
};

const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
};

const formatTimeAgo = (timestamp: number): string => {
  const now = Date.now();
  const diff = now - timestamp;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days}d ago`;
  if (hours > 0) return `${hours}h ago`;
  if (minutes > 0) return `${minutes}m ago`;
  return 'Just now';
};

const formatDateTime = (timestamp: number): string => {
  return new Date(timestamp).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
};

const HistoryPage = ({ history, onRemoveHistory, onClearHistory }: HistoryPageProps) => {
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; type: 'single' | 'all' } | null>(null);
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

  const columns = useMemo<ColumnDef<OperationHistoryItem>[]>(
    () => [
      {
        accessorKey: 'type',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Operation
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const type = row.getValue('type') as OperationType;
          const Icon = operationIcons[type];
          return (
            <div className="flex items-center gap-3">
              <div className={cn('p-2 rounded-lg', operationColors[type])}>
                <Icon className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm text-foreground">
                {operationLabels[type]}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'details',
        header: 'Details',
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-sm text-foreground">{row.original.details}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-xs text-muted-foreground truncate max-w-50 cursor-help">
                  {row.original.outputDir}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                <p className="break-all">{row.original.outputDir}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ),
      },
      {
        accessorKey: 'fileCount',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Files
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const count = row.getValue('fileCount') as number;
          return (
            <div className="flex items-center gap-2">
              <FileImage className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">
                {count} {count === 1 ? 'file' : 'files'}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'totalSaved',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Savings
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const saved = row.original.totalSaved;
          const percent = row.original.savingsPercent;
          if (saved && saved > 0) {
            return (
              <div className="flex items-center gap-2">
                <TrendingDown className="w-4 h-4 text-emerald-500" />
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-emerald-500">
                    {formatFileSize(saved)}
                  </span>
                  {percent && (
                    <span className="text-xs text-muted-foreground">
                      {percent.toFixed(1)}% smaller
                    </span>
                  )}
                </div>
              </div>
            );
          }
          return <span className="text-sm text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'timestamp',
        header: ({ column }) => (
          <Button
            variant="ghost"
            size="sm"
            className="-ml-3 h-8 data-[state=open]:bg-accent"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Time
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="ml-2 h-4 w-4" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="ml-2 h-4 w-4" />
            ) : (
              <ArrowUpDown className="ml-2 h-4 w-4" />
            )}
          </Button>
        ),
        cell: ({ row }) => {
          const timestamp = row.getValue('timestamp') as number;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-2 cursor-help">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {formatTimeAgo(timestamp)}
                  </span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>{formatDateTime(timestamp)}</p>
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        id: 'actions',
        header: () => <div className="text-right">Actions</div>,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleOpenFolder(row.original.outputDir)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <FolderOpen className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Open folder</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setConfirmDelete({ id: row.original.id, type: 'single' })}
                  className="text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p>Delete entry</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ),
      },
    ],
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
    state: {
      sorting,
    },
    initialState: {
      pagination: {
        pageSize: 10,
      },
    },
  });

  return (
    <TooltipProvider>
      <div className="h-full overflow-auto">
        <div className="max-w-5xl mx-auto p-6 space-y-6">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-2xl bg-muted">
                <History className="w-6 h-6 text-foreground" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-foreground">Operation History</h1>
                <p className="text-sm text-muted-foreground">
                  View and manage your recent image operations
                </p>
              </div>
            </div>
            {history.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setConfirmDelete({ id: '', type: 'all' })}
                className="text-muted-foreground hover:text-destructive hover:border-destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear All
              </Button>
            )}
          </motion.div>

          {/* Empty State */}
          {history.length === 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col items-center justify-center py-20 text-center"
            >
              <div className="p-4 rounded-full bg-muted/50 mb-4">
                <History className="w-10 h-10 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold text-foreground mb-2">No history yet</h2>
              <p className="text-sm text-muted-foreground max-w-sm">
                Your image operations will appear here. Start by converting or compressing some images!
              </p>
            </motion.div>
          )}

          {/* History Table */}
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-border/50 overflow-hidden">
                <table className="w-full">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="bg-muted/50 border-b border-border/50">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-4 py-3"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-border/50">
                    {table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/30 transition-colors">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-4 py-3">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  Showing {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1} to{' '}
                  {Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )}{' '}
                  of {table.getFilteredRowModel().rows.length} entries
                </p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronsLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground px-2">
                    Page {table.getState().pagination.pageIndex + 1} of {table.getPageCount()}
                  </span>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon-sm"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                  >
                    <ChevronsRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </motion.div>
          )}

          {/* Summary Stats */}
          {history.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-4"
            >
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Total Operations</p>
                <p className="text-2xl font-bold text-foreground">{history.length}</p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Files Processed</p>
                <p className="text-2xl font-bold text-foreground">
                  {history.reduce((acc, item) => acc + item.fileCount, 0)}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Total Saved</p>
                <p className="text-2xl font-bold text-emerald-500">
                  {formatFileSize(history.reduce((acc, item) => acc + (item.totalSaved || 0), 0))}
                </p>
              </div>
              <div className="p-4 rounded-xl bg-muted/50 border border-border/50">
                <p className="text-xs text-muted-foreground mb-1">Conversions</p>
                <p className="text-2xl font-bold text-primary">
                  {history.filter((item) => item.type === 'convert').length}
                </p>
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(open) => !open && setConfirmDelete(null)}>
        <AlertDialogContent onOverlayClick={() => setConfirmDelete(null)}>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmDelete?.type === 'all' ? 'Delete all history?' : 'Delete entry?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.type === 'all'
                ? 'This will permanently delete all operation history. This action cannot be undone.'
                : 'This will permanently delete this entry from history. This action cannot be undone.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {confirmDelete?.type === 'all' ? 'Delete All' : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </TooltipProvider>
  );
};

HistoryPage.displayName = 'HistoryPage';

export { HistoryPage };
