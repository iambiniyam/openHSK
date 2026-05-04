import { Suspense, memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { SectionLoader } from '@/components/SectionLoader';
import type { StoryDataset, StoryEntry } from '@/types/stories';

const StoryBrowser = lazy(() => import('@/components/StoryBrowser'));
const StoryViewer = lazy(() => import('@/components/StoryViewer'));

import { lazy } from 'react';

interface StoriesViewProps {
  storyDataset: StoryDataset | null;
  storyView: 'browse' | 'reader';
  currentStoryIndex: number;
  onSetStoryView: (view: 'browse' | 'reader') => void;
  onSetCurrentStoryIndex: (index: number | ((prev: number) => number)) => void;
  onWordClick: (hanzi: string) => void;
}

export const StoriesView = memo(function StoriesView({
  storyDataset,
  storyView,
  currentStoryIndex,
  onSetStoryView,
  onSetCurrentStoryIndex,
  onWordClick,
}: StoriesViewProps) {
  if (!storyDataset) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <SectionLoader label="Loading story dataset..." />
      </motion.div>
    );
  }

  if (storyView === 'reader' && storyDataset) {
    const story = storyDataset.stories[currentStoryIndex];
    if (!story) return null;

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
            onWordClick={onWordClick}
            onPrevious={() => onSetCurrentStoryIndex((i) => Math.max(0, i - 1))}
            onNext={() =>
              onSetCurrentStoryIndex((i) =>
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
