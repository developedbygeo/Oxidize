import { type ColumnDef } from '@tanstack/react-table';
import { Clock, FileImage, FolderOpen, Trash2, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { OperationHistoryItem, OperationType } from '@/types/image';
import { SortableHeader } from './SortableHeader';
import { operationIcons, operationLabels } from './operations';
import { formatDateTime, formatFileSize, formatTimeAgo } from './formatters';

type BuildColumnsArgs = {
  onOpenFolder: (path: string) => void;
  onRequestDelete: (id: string) => void;
};

export const buildColumns = ({
  onOpenFolder,
  onRequestDelete,
}: BuildColumnsArgs): ColumnDef<OperationHistoryItem>[] => [
  {
    accessorKey: 'type',
    header: ({ column }) => <SortableHeader column={column} label="Type" />,
    cell: ({ row }) => {
      const type = row.getValue('type') as OperationType;
      const Icon = operationIcons[type];
      return (
        <div className="flex items-center gap-2">
          <div className={cn('p-1.5 rounded', 'text-primary bg-primary/10')}>
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
    header: ({ column }) => <SortableHeader column={column} label="Files" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-1.5">
        <FileImage className="w-3 h-3 text-muted-foreground" />
        <span className="text-xs text-foreground">{row.getValue('fileCount') as number}</span>
      </div>
    ),
  },
  {
    accessorKey: 'totalSaved',
    header: ({ column }) => <SortableHeader column={column} label="Saved" />,
    cell: ({ row }) => {
      const saved = row.original.totalSaved;
      const percent = row.original.savingsPercent;
      if (!saved || saved <= 0) return <span className="text-xs text-muted-foreground">—</span>;
      return (
        <div className="flex items-center gap-1.5">
          <TrendingDown className="w-3 h-3 text-primary" />
          <span className="text-xs font-medium text-primary">{formatFileSize(saved)}</span>
          {percent && (
            <span className="text-[10px] text-muted-foreground">({percent.toFixed(0)}%)</span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: 'timestamp',
    header: ({ column }) => <SortableHeader column={column} label="Time" />,
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
              onClick={() => onOpenFolder(row.original.outputDir)}
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
              onClick={() => onRequestDelete(row.original.id)}
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
];
