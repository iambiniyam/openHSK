import { Suspense, memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SectionLoader } from '@/components/SectionLoader';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';
import type { ViewMode } from '@/App';

const WordDetail = lazy(() => import('@/components/WordDetail'));

import { lazy } from 'react';

interface DetailViewProps {
  selectedEntry: UnifiedEntry | null;
  detailSequence: UnifiedEntry[];
  detailReturnView: ViewMode;
  isFavorite: boolean;
  onBack: () => void;
  onToggleFavorite: (id: string) => void;
  onSetSelectedEntry: (entry: UnifiedEntry) => void;
  onSetDetailSequence: (seq: UnifiedEntry[] | ((prev: UnifiedEntry[]) => UnifiedEntry[])) => void;
}

const MAX_DETAIL_NAV_SEQUENCE = 240;

const buildDetailSequenceWindow = (sequence: UnifiedEntry[], selectedId: string): UnifiedEntry[] => {
  if (sequence.length <= MAX_DETAIL_NAV_SEQUENCE) {
    return sequence;
  }

  const selectedIndex = sequence.findIndex((entry) => entry.id === selectedId);
  if (selectedIndex === -1) {
    return sequence.slice(0, MAX_DETAIL_NAV_SEQUENCE);
  }

  const halfWindow = Math.floor(MAX_DETAIL_NAV_SEQUENCE / 2);
  const start = Math.max(0, selectedIndex - halfWindow);
  const end = Math.min(sequence.length, start + MAX_DETAIL_NAV_SEQUENCE);
  const normalizedStart = Math.max(0, end - MAX_DETAIL_NAV_SEQUENCE);

  return sequence.slice(normalizedStart, end);
};

export const DetailView = memo(function DetailView({
  selectedEntry,
  detailSequence,
  detailReturnView,
  isFavorite,
  onBack,
  onToggleFavorite,
  onSetSelectedEntry,
  onSetDetailSequence,
}: DetailViewProps) {
  if (!selectedEntry) return null;

  const sequence = detailSequence.length > 0 ? detailSequence : [selectedEntry];
  const currentIndex = sequence.findIndex((item) => item.id === selectedEntry.id);
  const canGoPrevious = currentIndex > 0;
  const canGoNext = currentIndex >= 0 && currentIndex < sequence.length - 1;

  const backLabel =
    detailReturnView === 'dashboard'
      ? 'Dashboard'
      : detailReturnView === 'progress'
        ? 'Progress'
        : detailReturnView === 'study'
          ? 'Study'
          : detailReturnView === 'landing'
            ? 'Home'
            : 'Browse';

  const navigateDetailByOffset = (offset: -1 | 1) => {
    const next = sequence[currentIndex + offset];
    if (!next) return;
    onSetSelectedEntry(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      className="space-y-4"
    >
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-2"
      >
        ← Back to {backLabel}
      </Button>

      <Suspense fallback={<SectionLoader label="Loading word details..." />}>
        <WordDetail
          key={selectedEntry.id}
          entry={selectedEntry}
          isFavorite={isFavorite}
          onToggleFavorite={() => onToggleFavorite(selectedEntry.id)}
          onRelatedWordClick={(entry) => {
            onSetSelectedEntry(entry);
            onSetDetailSequence((previous) => {
              if (previous.some((item) => item.id === entry.id)) {
                return previous;
              }
              return buildDetailSequenceWindow([...previous, entry], entry.id);
            });
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          canGoPrevious={canGoPrevious}
          canGoNext={canGoNext}
          onGoPrevious={() => navigateDetailByOffset(-1)}
          onGoNext={() => navigateDetailByOffset(1)}
          navigationLabel={currentIndex >= 0 && sequence.length > 1 ? `${currentIndex + 1} / ${sequence.length}` : undefined}
        />
      </Suspense>
    </motion.div>
  );
});
