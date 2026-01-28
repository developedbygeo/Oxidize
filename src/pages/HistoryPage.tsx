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
  Workflow,
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
import { fadeIn } from '@/lib/animations';
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

type HistoryPageProps = {
  history: OperationHistoryItem[];
  onRemoveHistory: (id: string) => void;
  onClearHistory: () => void;
};

const operationIcons: Record<OperationType, typeof ArrowRightLeft> = {
  convert: ArrowRightLeft,
  compress: Minimize2,
  beautify: Sparkles,
  effects: Wand2,
  pipeline: Workflow,
};

const operationColors: Record<OperationType, string> = {
  convert: 'text-primary bg-primary/10',
  compress: 'text-primary bg-primary/10',
  beautify: 'text-primary bg-primary/10',
  effects: 'text-primary bg-primary/10',
  pipeline: 'text-primary bg-primary/10',
};

const operationLabels: Record<OperationType, string> = {
  convert: 'Convert',
  compress: 'Compress',
  beautify: 'Beautify',
  effects: 'Effects',
  pipeline: 'Pipeline',
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
          <button
            className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Type
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const type = row.getValue('type') as OperationType;
          const Icon = operationIcons[type];
          return (
            <div className="flex items-center gap-2">
              <div className={cn('p-1.5 rounded', operationColors[type])}>
                <Icon className="w-3 h-3" />
              </div>
              <span className="text-xs font-medium text-foreground">{operationLabels[type]}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'details',
        header: () => <span className="text-[10px]">Details</span>,
        cell: ({ row }) => (
          <div className="flex flex-col">
            <span className="text-xs text-foreground">{row.original.details}</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="text-[10px] text-muted-foreground truncate max-w-40 cursor-help">
                  {row.original.outputDir}
                </span>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="max-w-sm">
                <p className="break-all text-xs">{row.original.outputDir}</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ),
      },
      {
        accessorKey: 'fileCount',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Files
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const count = row.getValue('fileCount') as number;
          return (
            <div className="flex items-center gap-1.5">
              <FileImage className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-foreground">{count}</span>
            </div>
          );
        },
      },
      {
        accessorKey: 'totalSaved',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Saved
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const saved = row.original.totalSaved;
          const percent = row.original.savingsPercent;
          if (saved && saved > 0) {
            return (
              <div className="flex items-center gap-1.5">
                <TrendingDown className="w-3 h-3 text-primary" />
                <span className="text-xs font-medium text-primary">{formatFileSize(saved)}</span>
                {percent && (
                  <span className="text-[10px] text-muted-foreground">({percent.toFixed(0)}%)</span>
                )}
              </div>
            );
          }
          return <span className="text-xs text-muted-foreground">—</span>;
        },
      },
      {
        accessorKey: 'timestamp',
        header: ({ column }) => (
          <button
            className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          >
            Time
            {column.getIsSorted() === 'asc' ? (
              <ArrowUp className="h-3 w-3" />
            ) : column.getIsSorted() === 'desc' ? (
              <ArrowDown className="h-3 w-3" />
            ) : (
              <ArrowUpDown className="h-3 w-3 opacity-50" />
            )}
          </button>
        ),
        cell: ({ row }) => {
          const timestamp = row.getValue('timestamp') as number;
          return (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1.5 cursor-help">
                  <Clock className="w-3 h-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">{formatTimeAgo(timestamp)}</span>
                </div>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">{formatDateTime(timestamp)}</p>
              </TooltipContent>
            </Tooltip>
          );
        },
      },
      {
        id: 'actions',
        header: () => null,
        cell: ({ row }) => (
          <div className="flex items-center justify-end gap-0.5">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => handleOpenFolder(row.original.outputDir)}
                  className="h-6 w-6 text-muted-foreground hover:text-foreground"
                >
                  <FolderOpen className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Open folder</p>
              </TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setConfirmDelete({ id: row.original.id, type: 'single' })}
                  className="h-6 w-6 text-muted-foreground hover:text-destructive"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom">
                <p className="text-xs">Delete</p>
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
        <div className="max-w-5xl mx-auto p-6 space-y-5">
          <motion.div
            variants={fadeIn}
            initial="hidden"
            animate="visible"
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-primary/10">
                <History className="w-4 h-4 text-primary" strokeWidth={1.75} />
              </div>
              <div>
                <h1 className="text-lg font-semibold text-foreground">History</h1>
                <p className="text-xs text-muted-foreground">
                  View and manage recent operations
                </p>
              </div>
            </div>
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
          </motion.div>

          {history.length === 0 && (
            <motion.div
              variants={fadeIn}
              initial="hidden"
              animate="visible"
              className="flex flex-col items-center justify-center py-16 text-center"
            >
              <div className="p-3 rounded-lg bg-muted/30 mb-3">
                <History className="w-6 h-6 text-muted-foreground" />
              </div>
              <h2 className="text-sm font-medium text-foreground mb-1">No history yet</h2>
              <p className="text-xs text-muted-foreground max-w-xs">
                Your image operations will appear here
              </p>
            </motion.div>
          )}

          {history.length > 0 && (
            <div className="space-y-3">
              <div className="rounded-md border border-border/30 overflow-hidden">
                <table className="w-full">
                  <thead>
                    {table.getHeaderGroups().map((headerGroup) => (
                      <tr key={headerGroup.id} className="bg-muted/20 border-b border-border/30">
                        {headerGroup.headers.map((header) => (
                          <th
                            key={header.id}
                            className="text-left text-[10px] font-medium text-muted-foreground uppercase tracking-wide px-3 py-2"
                          >
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {table.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="hover:bg-muted/20 transition-colors">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="px-3 py-2">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">
                  {table.getState().pagination.pageIndex * table.getState().pagination.pageSize + 1}–{Math.min(
                    (table.getState().pagination.pageIndex + 1) * table.getState().pagination.pageSize,
                    table.getFilteredRowModel().rows.length
                  )} of {table.getFilteredRowModel().rows.length}
                </p>
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => table.setPageIndex(0)}
                    disabled={!table.getCanPreviousPage()}
                    className="h-7 w-7"
                  >
                    <ChevronsLeft className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => table.previousPage()}
                    disabled={!table.getCanPreviousPage()}
                    className="h-7 w-7"
                  >
                    <ChevronLeft className="h-3.5 w-3.5" />
                  </Button>
                  <span className="text-[10px] text-muted-foreground px-2">
                    {table.getState().pagination.pageIndex + 1}/{table.getPageCount()}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => table.nextPage()}
                    disabled={!table.getCanNextPage()}
                    className="h-7 w-7"
                  >
                    <ChevronRight className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                    disabled={!table.getCanNextPage()}
                    className="h-7 w-7"
                  >
                    <ChevronsRight className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          )}

          {history.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <div className="p-3 rounded-md bg-muted/30 border border-border/30">
                <p className="text-[10px] text-muted-foreground mb-0.5">Operations</p>
                <p className="text-lg font-semibold text-foreground">{history.length}</p>
              </div>
              <div className="p-3 rounded-md bg-muted/30 border border-border/30">
                <p className="text-[10px] text-muted-foreground mb-0.5">Files</p>
                <p className="text-lg font-semibold text-foreground">
                  {history.reduce((acc, item) => acc + item.fileCount, 0)}
                </p>
              </div>
              <div className="p-3 rounded-md bg-muted/30 border border-border/30">
                <p className="text-[10px] text-muted-foreground mb-0.5">Saved</p>
                <p className="text-lg font-semibold text-primary">
                  {formatFileSize(history.reduce((acc, item) => acc + (item.totalSaved || 0), 0))}
                </p>
              </div>
              <div className="p-3 rounded-md bg-muted/30 border border-border/30">
                <p className="text-[10px] text-muted-foreground mb-0.5">Conversions</p>
                <p className="text-lg font-semibold text-foreground">
                  {history.filter((item) => item.type === 'convert').length}
                </p>
              </div>
            </div>
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
