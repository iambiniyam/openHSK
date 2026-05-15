import { Suspense, lazy, memo, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import { SectionLoader } from './SectionLoader';
import { buildDetailSequenceWindow } from '@/lib/detailSequence';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';
import type { ViewMode } from '@/App';

const WordDetail = lazy(() => import('@/components/WordDetail'));


interface DetailViewProps {
  selectedEntry: UnifiedEntry;
  detailSequence: UnifiedEntry[];
  detailReturnView: ViewMode;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSetSelectedEntry: (entry: UnifiedEntry) => void;
  onSetDetailSequence: (sequence: UnifiedEntry[] | ((prev: UnifiedEntry[]) => UnifiedEntry[])) => void;
  onSetCurrentView: (view: ViewMode) => void;
}

export const DetailView = memo(function DetailView({
  selectedEntry,
  detailSequence,
  detailReturnView,
  favorites,
  onToggleFavorite,
  onSetSelectedEntry,
  onSetDetailSequence,
  onSetCurrentView,
}: DetailViewProps) {
  const { sequence, currentIndex, canGoPrevious, canGoNext } = useMemo(() => {
    const seq = detailSequence.length > 0 ? detailSequence : [selectedEntry];
    const idx = seq.findIndex((item) => item.id === selectedEntry.id);
    return {
      sequence: seq,
      currentIndex: idx,
      canGoPrevious: idx > 0,
      canGoNext: idx >= 0 && idx < seq.length - 1,
    };
  }, [detailSequence, selectedEntry]);

  const backLabel =
    detailReturnView === 'dashboard' ? 'Dashboard'
    : detailReturnView === 'progress' ? 'Progress'
    : detailReturnView === 'study' ? 'Study'
    : detailReturnView === 'landing' ? 'Home'
    : 'Browse';

  const navigateDetailByOffset = useCallback((offset: -1 | 1) => {
    const next = sequence[currentIndex + offset];
    if (!next) return;
    onSetSelectedEntry(next);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [sequence, currentIndex, onSetSelectedEntry]);

  const handleRelatedWordClick = useCallback((entry: UnifiedEntry) => {
    onSetSelectedEntry(entry);
    onSetDetailSequence((previous) => {
      if (previous.some((item) => item.id === entry.id)) return previous;
      return buildDetailSequenceWindow([...previous, entry], entry.id);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [onSetSelectedEntry, onSetDetailSequence]);

  return (
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="space-y-4">
      <Button variant="ghost" onClick={() => onSetCurrentView(detailReturnView)} className="mb-2"><ChevronLeft className="w-4 h-4 mr-1" />Back to {backLabel}</Button>
      <Suspense fallback={<SectionLoader label="Loading word details..." />}>
        <WordDetail
          key={selectedEntry.id}
          entry={selectedEntry}
          isFavorite={favorites.includes(selectedEntry.id)}
          onToggleFavorite={() => onToggleFavorite(selectedEntry.id)}
          onRelatedWordClick={handleRelatedWordClick}
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
