import { motion } from 'motion/react';
import { Sparkles, Upload, Sun, Contrast, Palette } from 'lucide-react';

const BeautifyPage = () => {
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
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/20 to-orange-500/20 rounded-full blur-3xl" />
        <div className="relative p-6 rounded-2xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-500/20">
          <Sparkles className="w-16 h-16 text-amber-500" strokeWidth={1.5} />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-3xl font-bold bg-gradient-to-r from-amber-500 to-orange-500 bg-clip-text text-transparent mb-3"
      >
        Beautify Images
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-muted-foreground text-center max-w-md mb-8"
      >
        Enhance your images with intelligent adjustments. Auto-enhance brightness, contrast, and colors.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="group relative border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-12 transition-all duration-300 cursor-pointer bg-gradient-to-br from-amber-500/5 to-orange-500/5 hover:from-amber-500/10 hover:to-orange-500/10">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-xl bg-amber-500/10 group-hover:bg-amber-500/20 transition-colors">
              <Upload className="w-8 h-8 text-amber-500" />
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
        className="grid grid-cols-3 gap-4 mt-8"
      >
        {[
          { icon: Sun, label: 'Brightness', color: 'amber' },
          { icon: Contrast, label: 'Contrast', color: 'orange' },
          { icon: Palette, label: 'Colors', color: 'yellow' },
        ].map((item, i) => (
          <motion.div
            key={item.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 + i * 0.1, duration: 0.3 }}
            className="flex flex-col items-center gap-2 p-4 rounded-xl bg-amber-500/5 border border-amber-500/10 hover:bg-amber-500/10 transition-colors cursor-pointer"
          >
            <item.icon className={`w-5 h-5 text-${item.color}-500`} />
            <span className="text-xs font-medium text-muted-foreground">{item.label}</span>
          </motion.div>
        ))}
      </motion.div>
    </motion.div>
  );
};

BeautifyPage.displayName = 'BeautifyPage';

export { BeautifyPage };
