import { warmDatasetCaches } from '@/lib/datasetLoader';

type NetworkConnection = {
  saveData?: boolean;
  effectiveType?: string;
};

type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (callback: () => void, options?: { timeout: number }) => number;
  cancelIdleCallback?: (handle: number) => void;
};

const preloadFeatureChunks = (): void => {
  const preloaders = [
    () => import('@/components/VirtualizedWordList'),
    () => import('@/components/PaginatedWordList'),
    () => import('@/components/WordDetail'),
    () => import('@/components/QuizMode'),
    () => import('@/components/PomodoroTimer'),
  ];

  for (const preload of preloaders) {
    void preload();
  }
};

const shouldUseAggressiveWarmup = (): boolean => {
  if (typeof navigator === 'undefined') return false;

  const nav = navigator as Navigator & { connection?: NetworkConnection };
  const connection = nav.connection;
  if (!connection) return true;
  if (connection.saveData) return false;
  return connection.effectiveType !== 'slow-2g' && connection.effectiveType !== '2g';
};

export function scheduleRuntimeWarmup(): () => void {
  if (typeof window === 'undefined') return () => {};

  const runWarmup = () => {
    if (shouldUseAggressiveWarmup()) {
      preloadFeatureChunks();
    }
    void warmDatasetCaches();
  };

  const idleWindow = window as WindowWithIdleCallback;
  if (typeof idleWindow.requestIdleCallback === 'function') {
    const handle = idleWindow.requestIdleCallback(runWarmup, { timeout: 2500 });
    return () => {
      if (typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(handle);
      }
    };
  }

  const timerId = window.setTimeout(runWarmup, 1200);
  return () => window.clearTimeout(timerId);
}