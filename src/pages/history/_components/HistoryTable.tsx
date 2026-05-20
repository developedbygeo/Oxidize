import { flexRender, type Table } from '@tanstack/react-table';
import type { OperationHistoryItem } from '@/types/image';

type HistoryTableProps = {
  table: Table<OperationHistoryItem>;
};

const HistoryTable = ({ table }: HistoryTableProps) => (
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
);

HistoryTable.displayName = 'HistoryTable';

export { HistoryTable };
