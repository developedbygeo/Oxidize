import { motion } from 'motion/react';
import { Wand2, Upload } from 'lucide-react';

const effects = [
  { name: 'Grayscale', gradient: 'from-slate-400 to-slate-600' },
  { name: 'Sepia', gradient: 'from-amber-600 to-yellow-700' },
  { name: 'Vintage', gradient: 'from-rose-400 to-amber-500' },
  { name: 'Blur', gradient: 'from-blue-400 to-indigo-500' },
  { name: 'Sharpen', gradient: 'from-emerald-400 to-teal-500' },
  { name: 'Invert', gradient: 'from-purple-400 to-pink-500' },
];

const EffectsPage = () => {
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
        <div className="absolute inset-0 bg-gradient-to-br from-pink-500/20 to-rose-500/20 rounded-full blur-3xl" />
        <div className="relative p-6 rounded-2xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 border border-pink-500/20">
          <Wand2 className="w-16 h-16 text-pink-500" strokeWidth={1.5} />
        </div>
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.4 }}
        className="text-3xl font-bold bg-gradient-to-r from-pink-500 to-rose-500 bg-clip-text text-transparent mb-3"
      >
        Apply Effects
      </motion.h1>

      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3, duration: 0.4 }}
        className="text-muted-foreground text-center max-w-md mb-8"
      >
        Transform your images with stunning effects. From classic filters to creative transformations.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.4 }}
        className="w-full max-w-lg"
      >
        <div className="group relative border-2 border-dashed border-pink-500/30 hover:border-pink-500/60 rounded-2xl p-12 transition-all duration-300 cursor-pointer bg-gradient-to-br from-pink-500/5 to-rose-500/5 hover:from-pink-500/10 hover:to-rose-500/10">
          <div className="flex flex-col items-center gap-4">
            <div className="p-4 rounded-xl bg-pink-500/10 group-hover:bg-pink-500/20 transition-colors">
              <Upload className="w-8 h-8 text-pink-500" />
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
        className="grid grid-cols-3 gap-3 mt-8"
      >
        {effects.map((effect, i) => (
          <motion.button
            key={effect.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.05, duration: 0.3 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className={`px-4 py-2.5 text-xs font-medium rounded-xl bg-gradient-to-r ${effect.gradient} text-white shadow-lg shadow-pink-500/10 hover:shadow-pink-500/20 transition-shadow`}
          >
            {effect.name}
          </motion.button>
        ))}
      </motion.div>
    </motion.div>
  );
};

EffectsPage.displayName = 'EffectsPage';

export { EffectsPage };
