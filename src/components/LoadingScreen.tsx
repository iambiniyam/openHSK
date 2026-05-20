import { useEffect, useState } from 'react';
import { BookOpen, PenLine, Sparkles, Zap, Globe, Brain } from 'lucide-react';
import type { ProgressUpdate } from '@/lib/progressiveLoader';

interface LoadingScreenProps {
  progress: ProgressUpdate | null;
  onEnterApp: () => void;
  canEnterEarly: boolean;
}

const tips = [
  { icon: BookOpen, text: 'HSK has 9 levels covering over 11,000 vocabulary items.' },
  { icon: PenLine, text: 'Chinese characters evolved from pictographs over 3,000 years ago.' },
  { icon: Sparkles, text: 'The most complex common character is 龘 (dá), meaning "the appearance of a dragon flying".' },
  { icon: Zap, text: 'You only need about 500 characters to understand 75% of written Chinese.' },
  { icon: Globe, text: 'Mandarin is spoken by over 1.1 billion people worldwide.' },
  { icon: Brain, text: 'Spaced repetition — reviewing words at increasing intervals — is scientifically proven to boost retention.' },
];

export function LoadingScreen({ progress, onEnterApp, canEnterEarly }: LoadingScreenProps) {
  const [tipIndex, setTipIndex] = useState(0);
  const [showTip, setShowTip] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShowTip(true), 1200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!showTip) return;
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % tips.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [showTip]);

  const overall = progress?.overallProgress ?? 0;
  const phaseLabel = progress?.phaseLabel ?? 'Preparing...';
  const fileName = progress?.filePath?.split('/').pop() ?? '';
  const status = progress?.status ?? 'downloading';

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background relative overflow-hidden preload">
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.015]"
          style={{
            backgroundImage:
              'linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)',
            backgroundSize: '40px 40px',
          }}
        />
      </div>

      <div className="relative z-10 w-full max-w-md px-6 space-y-8">
        <div className="text-center space-y-3 animate-fade-in">
          <div className="mx-auto h-16 w-16 rounded-2xl border border-primary/20 bg-card/80 p-3 shadow-lg">
            <img src="/brand/logo-mark.svg" alt="" className="h-full w-full" loading="eager" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight font-brand">OpenHSK</h1>
            <p className="text-sm text-muted-foreground">Loading your Chinese learning space</p>
          </div>
        </div>

        <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-sm p-5 space-y-4 animate-slide-up">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium text-foreground">{phaseLabel}</span>
              <span className="text-muted-foreground tabular-nums">{Math.round(overall)}%</span>
            </div>
            <div className="relative h-2.5 bg-muted rounded-full overflow-hidden">
              <div
                className="absolute inset-y-0 left-0 rounded-full bg-gradient-to-r from-primary to-primary/80 transition-all duration-500 ease-out"
                style={{ width: `${overall}%` }}
              />
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="relative">
              {status === 'downloading' && (
                <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
              {status === 'parsing' && (
                <Zap className="w-4 h-4 text-amber-500 animate-pulse" />
              )}
              {status === 'complete' && (
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-muted-foreground truncate">
                {status === 'downloading' && 'Downloading'}
                {status === 'parsing' && 'Processing'}
                {status === 'complete' && 'Ready'}
                {fileName && ` • ${fileName}`}
              </p>
            </div>
            <span className="text-muted-foreground tabular-nums shrink-0">
              {progress?.phaseIndex != null && (
                <>{progress.phaseIndex + 1}/{progress.totalPhases}</>
              )}
            </span>
          </div>
        </div>

        {showTip && (
          <div className="text-center space-y-2 animate-fade-in">
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              Did you know?
            </p>
            <div key={tipIndex} className="flex items-start gap-2 justify-center text-sm text-muted-foreground max-w-xs mx-auto">
              {(() => {
                const TipIcon = tips[tipIndex].icon;
                return <TipIcon className="w-4 h-4 mt-0.5 shrink-0 text-primary/60" />;
              })()}
              <span className="text-left">{tips[tipIndex].text}</span>
            </div>
          </div>
        )}

        {canEnterEarly && (
          <div className="text-center">
            <button
              onClick={onEnterApp}
              className="text-sm text-primary hover:text-primary/80 font-medium transition-colors"
            >
              Enter app while loading →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default LoadingScreen;
