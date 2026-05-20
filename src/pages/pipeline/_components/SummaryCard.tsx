import type { LucideIcon } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

type SummaryCardProps = {
  icon: LucideIcon;
  title: string;
  className?: string;
  children: React.ReactNode;
};

const SummaryCard = ({ icon: Icon, title, className, children }: SummaryCardProps) => (
  <Card className={cn('border-2 border-primary/30', className)}>
    <CardHeader className="p-4 pb-2">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-primary" />
        <CardTitle className="text-sm">{title}</CardTitle>
      </div>
    </CardHeader>
    <CardContent className="p-4 pt-0">{children}</CardContent>
  </Card>
);

SummaryCard.displayName = 'SummaryCard';

export { SummaryCard };
