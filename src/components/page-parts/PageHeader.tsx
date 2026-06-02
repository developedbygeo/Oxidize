import { motion } from 'motion/react';
import type { LucideIcon } from 'lucide-react';
import { fadeIn } from '@/lib/animations';

type PageHeaderProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  children?: React.ReactNode;
};

const PageHeader = ({ icon: Icon, title, description, children }: PageHeaderProps) => (
  <motion.div
    variants={fadeIn}
    initial="hidden"
    animate="visible"
    className="flex items-center justify-between gap-3"
  >
    <div className="flex items-center gap-3">
      <div className="p-2 rounded-lg bg-primary/10">
        <Icon className="w-4 h-4 text-primary" strokeWidth={1.75} />
      </div>
      <div>
        <h1 className="text-lg font-semibold text-foreground">{title}</h1>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
    </div>
    {children}
  </motion.div>
);

PageHeader.displayName = 'PageHeader';

export { PageHeader };
