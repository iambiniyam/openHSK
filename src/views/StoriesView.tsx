import { Suspense, lazy, memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SectionLoader } from './SectionLoader';
import { unifiedDictionary } from '@/services/unifiedDictionaryService';
import type { StoryEntry, StoryDataset } from '@/types/stories';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';
import type { ViewMode } from '@/App';

const StoryBrowser = lazy(() => import('@/components/StoryBrowser'));
const StoryViewer = lazy(() => import('@/components/StoryViewer'));

interface StoriesViewProps {
  storyDataset: StoryDataset | null;
  storyView: 'browse' | 'reader';
  currentStoryIndex: number;
  onSetStoryView: (view: 'browse' | 'reader') => void;
  onSetCurrentStoryIndex: (index: number | ((prev: number) => number)) => void;
  onOpenDetailView: (entry: UnifiedEntry, options?: { sequence?: UnifiedEntry[]; returnView?: ViewMode }) => void;
}

export const StoriesView = memo(function StoriesView({
  storyDataset,
  storyView,
  currentStoryIndex,
  onSetStoryView,
  onSetCurrentStoryIndex,
  onOpenDetailView,
}: StoriesViewProps) {
  if (!storyDataset) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <SectionLoader label="Loading story dataset..." />
      </motion.div>
    );
  }

  if (storyView === 'reader') {
    const story = storyDataset.stories[currentStoryIndex];
    if (!story) return null;

    const handleWordClick = (hanzi: string) => {
      const entry = unifiedDictionary.getEntryByHanzi(hanzi);
      if (entry) {
        onOpenDetailView(entry, { sequence: [entry], returnView: 'stories' });
      }
    };

    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => onSetStoryView('browse')}>
            ← Back to Stories
          </Button>
        </div>
        <Suspense fallback={<SectionLoader label="Loading story..." />}>
          <StoryViewer
            story={story}
            hasPrevious={currentStoryIndex > 0}
            hasNext={currentStoryIndex < storyDataset.stories.length - 1}
            storyIndex={currentStoryIndex}
            totalStories={storyDataset.stories.length}
            onWordClick={handleWordClick}
            onPrevious={() => onSetCurrentStoryIndex((i: number) => Math.max(0, i - 1))}
            onNext={() =>
              onSetCurrentStoryIndex((i: number) =>
                Math.min(storyDataset.stories.length - 1, i + 1)
              )
            }
          />
        </Suspense>
      </motion.div>
    );
  }

  const handleStorySelect = (_story: StoryEntry, index: number) => {
    onSetCurrentStoryIndex(index);
    onSetStoryView('reader');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      <Suspense fallback={<SectionLoader label="Loading story browser..." />}>
        <StoryBrowser
          stories={storyDataset.stories}
          meta={storyDataset.meta}
          onStorySelect={handleStorySelect}
        />
      </Suspense>
    </motion.div>
  );
});
