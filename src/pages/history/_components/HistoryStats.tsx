import type { OperationHistoryItem } from '@/types/image';
import { formatFileSize } from './formatters';

type StatCardProps = {
  label: string;
  value: React.ReactNode;
  emphasized?: boolean;
};

const StatCard = ({ label, value, emphasized }: StatCardProps) => (
  <div className="p-3 rounded-md bg-muted/30 border border-border/30">
    <p className="text-[10px] text-muted-foreground mb-0.5">{label}</p>
    <p className={`text-lg font-semibold ${emphasized ? 'text-primary' : 'text-foreground'}`}>
      {value}
    </p>
  </div>
);

type HistoryStatsProps = {
  history: OperationHistoryItem[];
};

const HistoryStats = ({ history }: HistoryStatsProps) => {
  const totalFiles = history.reduce((acc, item) => acc + item.fileCount, 0);
  const totalSaved = history.reduce((acc, item) => acc + (item.totalSaved || 0), 0);
  const conversions = history.filter((item) => item.type === 'convert').length;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
      <StatCard label="Operations" value={history.length} />
      <StatCard label="Files" value={totalFiles} />
      <StatCard label="Saved" value={formatFileSize(totalSaved)} emphasized />
      <StatCard label="Conversions" value={conversions} />
    </div>
  );
};

HistoryStats.displayName = 'HistoryStats';

export { HistoryStats };
