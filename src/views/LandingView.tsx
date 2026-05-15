import { Suspense, lazy, memo } from 'react';
import { SectionLoader } from './SectionLoader';

const LandingPage = lazy(() => import('@/components/LandingPage'));

interface LandingViewProps {
  totalWords: number;
  onStartLearning: () => void;
  onBrowseDictionary: () => void;
}

export const LandingView = memo(function LandingView({
  totalWords,
  onStartLearning,
  onBrowseDictionary,
}: LandingViewProps) {
  return (
    <Suspense fallback={<SectionLoader label="Preparing your learning space..." />}>
      <LandingPage
        totalWords={totalWords}
        onStartLearning={onStartLearning}
        onBrowseDictionary={onBrowseDictionary}
      />
    </Suspense>
  );
});
