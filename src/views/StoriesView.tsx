import { Suspense, lazy, memo } from 'react';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { SectionLoader } from '@/components/SectionLoader';
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
      <div>
        <SectionLoader label="Loading story dataset..." />
      </div>
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
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => onSetStoryView('browse')}>
            <ChevronLeft className="w-4 h-4 mr-1" />Back to Stories
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
      </div>
    );
  }

  const handleStorySelect = (_story: StoryEntry, index: number) => {
    onSetCurrentStoryIndex(index);
    onSetStoryView('reader');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div>
      <Suspense fallback={<SectionLoader label="Loading story browser..." />}>
        <StoryBrowser
          stories={storyDataset.stories}
          meta={storyDataset.meta}
          onStorySelect={handleStorySelect}
        />
      </Suspense>
    </div>
  );
});
