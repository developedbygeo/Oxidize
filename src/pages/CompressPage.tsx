import { motion } from 'motion/react';
import { Minimize2, Upload, Gauge } from 'lucide-react';

const CompressPage = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: 'easeOut' }}
      className="flex flex-col items-center justify-center h-full p-8"
    >
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, duration: 0.5, ease: 'easeOut' }}
        className="relative mb-8"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-full blur-3xl" />
        <div className="relative p-6 rounded-2xl bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-500/20">
          <Minimize2 className="w-16 h-16 text-emerald-500" strokeWidth={1.5} />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-3xl font-bold bg-gradient-to-r from-emerald-500 to-teal-500 bg-clip-text text-transparent mb-3"
      >
        Compress Images
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-muted-foreground text-center max-w-md mb-8"
      >
        Reduce file sizes without sacrificing quality. Smart compression algorithms preserve what matters.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="group relative border-2 border-dashed border-emerald-500/30 hover:border-emerald-500/60 rounded-2xl p-12 transition-all duration-300 cursor-pointer bg-gradient-to-br from-emerald-500/5 to-teal-500/5 hover:from-emerald-500/10 hover:to-teal-500/10">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-xl bg-emerald-500/10 group-hover:bg-emerald-500/20 transition-colors">
              <Upload className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="text-center">
              <p className="font-medium text-foreground">Drop images here</p>
              <p className="text-sm text-muted-foreground mt-1">or click to browse</p>
            </div>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5, duration: 0.4 }}
        className="flex items-center gap-6 mt-8"
      >
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-emerald-500" />
          <span className="text-sm text-muted-foreground">Lossless</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-teal-500" />
          <span className="text-sm text-muted-foreground">Lossy</span>
        </div>
        <div className="w-px h-4 bg-border" />
        <div className="flex items-center gap-2">
          <Gauge className="w-4 h-4 text-cyan-500" />
          <span className="text-sm text-muted-foreground">Custom</span>
        </div>
      </motion.div>
    </motion.div>
  );
};

CompressPage.displayName = 'CompressPage';

export { CompressPage };
