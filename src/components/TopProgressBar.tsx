import { motion, AnimatePresence } from 'framer-motion';

interface TopProgressBarProps {
  progress: number; // 0-100
  visible: boolean;
  indeterminate?: boolean;
}

export function TopProgressBar({ progress, visible, indeterminate }: TopProgressBarProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0, transition: { delay: 0.3 } }}
          className="fixed top-0 left-0 right-0 z-[100] h-[2px]"
        >
          <div className="relative w-full h-full overflow-hidden bg-transparent">
            {indeterminate ? (
              // Indeterminate shimmer for unknown progress
              <motion.div
                className="absolute inset-y-0 bg-gradient-to-r from-transparent via-primary to-transparent w-1/3"
                animate={{
                  left: ['-33%', '100%'],
                }}
                transition={{
                  duration: 1.2,
                  repeat: Infinity,
                  ease: 'linear',
                }}
              />
            ) : (
              // Determinate progress
              <motion.div
                className="absolute inset-y-0 left-0 bg-primary rounded-r-full"
                initial={{ width: 0 }}
                animate={{ width: `${Math.min(100, progress)}%` }}
                transition={{
                  type: 'spring',
                  stiffness: 200,
                  damping: 25,
                }}
              >
                {/* Glow effect at the tip */}
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
              </motion.div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default TopProgressBar;
