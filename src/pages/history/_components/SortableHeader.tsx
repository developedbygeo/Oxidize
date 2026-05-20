import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import type { Column } from '@tanstack/react-table';
import type { OperationHistoryItem } from '@/types/image';

type SortableHeaderProps = {
  column: Column<OperationHistoryItem, unknown>;
  label: string;
};

const SortableHeader = ({ column, label }: SortableHeaderProps) => {
  const sorted = column.getIsSorted();
  return (
    <button
      onClick={() => column.toggleSorting(sorted === 'asc')}
      className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground transition-colors"
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="h-3 w-3" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3 w-3" />
      ) : (
        <ArrowUpDown className="h-3 w-3 opacity-50" />
      )}
    </button>
  );
};

SortableHeader.displayName = 'SortableHeader';

export { SortableHeader };
