import { motion } from 'motion/react';
import { History } from 'lucide-react';
import { fadeIn } from '@/lib/animations';

const EmptyState = () => (
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
);

EmptyState.displayName = 'EmptyState';

export { EmptyState };
