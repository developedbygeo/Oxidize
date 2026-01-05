import { motion } from 'motion/react';
import { ArrowRightLeft, FileImage, Upload } from 'lucide-react';

const ConvertPage = () => {
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
        <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 rounded-full blur-3xl" />
        <div className="relative p-6 rounded-2xl bg-gradient-to-br from-violet-500/10 to-fuchsia-500/10 border border-violet-500/20">
          <ArrowRightLeft className="w-16 h-16 text-violet-500" strokeWidth={1.5} />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-3xl font-bold bg-gradient-to-r from-violet-500 to-fuchsia-500 bg-clip-text text-transparent mb-3"
      >
        Convert Images
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-muted-foreground text-center max-w-md mb-8"
      >
        Transform your images between formats. Support for PNG, JPEG, WebP, AVIF, and more.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="group relative border-2 border-dashed border-violet-500/30 hover:border-violet-500/60 rounded-2xl p-12 transition-all duration-300 cursor-pointer bg-gradient-to-br from-violet-500/5 to-fuchsia-500/5 hover:from-violet-500/10 hover:to-fuchsia-500/10">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-xl bg-violet-500/10 group-hover:bg-violet-500/20 transition-colors">
              <Upload className="w-8 h-8 text-violet-500" />
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
        className="flex gap-3 mt-8"
      >
        {['PNG', 'JPEG', 'WebP', 'AVIF'].map((format, i) => (
          <motion.span
            key={format}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.1, duration: 0.3 }}
            className="px-3 py-1.5 text-xs font-medium rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400 border border-violet-500/20"
          >
            {format}
          </motion.span>
        ))}
      </motion.div>
    </motion.div>
  );
};

ConvertPage.displayName = 'ConvertPage';

export { ConvertPage };
