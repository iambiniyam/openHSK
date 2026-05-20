interface TopProgressBarProps {
  progress: number;
  visible: boolean;
  indeterminate?: boolean;
}

export function TopProgressBar({ progress, visible, indeterminate }: TopProgressBarProps) {
  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] h-[2px]">
      <div className="relative w-full h-full overflow-hidden bg-transparent">
        {indeterminate ? (
          <div className="absolute inset-y-0 bg-gradient-to-r from-transparent via-primary to-transparent w-1/3 animate-progress-shimmer" />
        ) : (
          <div
            className="absolute inset-y-0 left-0 bg-primary rounded-r-full transition-all duration-300"
            style={{ width: `${Math.min(100, progress)}%` }}
          >
            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-2 rounded-full bg-primary shadow-[0_0_8px_hsl(var(--primary)/0.6)]" />
          </div>
        )}
      </div>
    </div>
  );
}

export default TopProgressBar;
