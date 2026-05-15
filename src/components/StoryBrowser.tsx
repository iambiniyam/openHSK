import { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  BookOpen,
  Search,
  Filter,
  Hash,
  ArrowRight,
  X,
  Feather,
} from 'lucide-react';
import { Empty, EmptyContent, EmptyMedia, EmptyTitle, EmptyDescription } from '@/components/ui/empty';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import type { StoryEntry, StoryDatasetMeta } from '@/types/stories';

interface StoryBrowserProps {
  stories: StoryEntry[];
  meta?: StoryDatasetMeta;
  onStorySelect: (story: StoryEntry, index: number) => void;
}

const levelLabels: Record<number, string> = {
  1: 'HSK 1', 2: 'HSK 2', 3: 'HSK 3', 4: 'HSK 4', 5: 'HSK 5', 6: 'HSK 6',
  7: 'HSK 7-9', 8: 'HSK 7-9', 9: 'HSK 7-9',
};

const hskLevelColors: Record<number, string> = {
  1: 'bg-green-100 dark:bg-green-900 text-green-700 dark:text-green-300',
  2: 'bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-300',
  3: 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300',
  4: 'bg-purple-100 dark:bg-purple-900 text-purple-700 dark:text-purple-300',
  5: 'bg-orange-100 dark:bg-orange-900 text-orange-700 dark:text-orange-300',
  6: 'bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300',
  7: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300',
};

export const StoryBrowser = ({ stories, meta, onStorySelect }: StoryBrowserProps) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  const storyIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    stories.forEach((s, i) => map.set(s.story_id, i));
    return map;
  }, [stories]);

  const filteredStories = useMemo(() => {
    let result = stories.filter((s) => !s.error);

    if (selectedLevel !== 'all') {
      const level = parseInt(selectedLevel);
      if (selectedLevel === '7-9') {
        result = result.filter((s) => s.hsk_level >= 7);
      } else {
        result = result.filter((s) => s.hsk_level === level);
      }
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      result = result.filter(
        (s) =>
          s.title_chinese.includes(q) ||
          s.title_english.toLowerCase().includes(q) ||
          s.story_chinese.includes(q) ||
          s.target_words.some((w) => w.includes(q))
      );
    }

    return result;
  }, [stories, selectedLevel, searchQuery]);

  const levelCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    let highLevelCount = 0;
    for (const s of stories) {
      if (s.error) continue;
      const key = s.hsk_level >= 7 ? '7-9' : String(s.hsk_level);
      counts[key] = (counts[key] || 0) + 1;
      if (s.hsk_level >= 7) highLevelCount++;
    }
    return { counts, highLevelTotal: highLevelCount };
  }, [stories]);

  const totalWords = useMemo(() => {
    return filteredStories.reduce((sum, s) => sum + (s.word_count || 0), 0);
  }, [filteredStories]);

  return (
    <div className="space-y-4">
      {/* Header Stats */}
      {meta && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="bg-gradient-to-r from-primary/5 to-primary/10 border-primary/20">
            <CardContent className="p-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{meta.total_stories}</div>
                  <div className="text-xs text-muted-foreground">Stories</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{meta.total_hsk_words}</div>
                  <div className="text-xs text-muted-foreground">HSK Words</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">
                    {(meta.overall_coverage * 100).toFixed(0)}%
                  </div>
                  <div className="text-xs text-muted-foreground">Coverage</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-primary">{meta.levels.length}</div>
                  <div className="text-xs text-muted-foreground">HSK Levels</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Search and Filter */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search stories by title, word, or content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7"
                  onClick={() => setSearchQuery('')}
                >
                  <X className="w-3 h-3" />
                </Button>
              )}
            </div>
            <Select value={selectedLevel} onValueChange={setSelectedLevel}>
              <SelectTrigger className="w-[140px]">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Levels ({stories.filter(s=>!s.error).length})</SelectItem>
                {[1, 2, 3, 4, 5, 6].map((lv) => (
                  <SelectItem key={lv} value={String(lv)}>
                    HSK {lv} ({levelCounts.counts[String(lv)] || 0})
                  </SelectItem>
                ))}
                <SelectItem value="7-9">
                  HSK 7-9 ({levelCounts.highLevelTotal})
                </SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
            <BookOpen className="w-4 h-4" />
            <span>{filteredStories.length} stories found</span>
            <span className="mx-1">·</span>
            <span>{totalWords} target words</span>
          </div>
        </CardContent>
      </Card>

      {/* Story Cards */}
      {filteredStories.length === 0 ? (
        <Empty className="min-h-[300px]">
          <EmptyContent>
            <EmptyMedia variant="icon"><Feather className="size-6" /></EmptyMedia>
            <EmptyTitle>No Stories Found</EmptyTitle>
            <EmptyDescription>Try adjusting your search or HSK level filter to find stories.</EmptyDescription>
          </EmptyContent>
        </Empty>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredStories.map((story, i) => {
            const levelColor = hskLevelColors[story.hsk_level] || hskLevelColors[7];

            return (
              <motion.div
                key={story.story_id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3), duration: 0.3 }}
              >
                <Card
                  className="cursor-pointer hover:shadow-lg transition-all duration-300 hover:-translate-y-1 group h-full"
                  onClick={() => onStorySelect(story, storyIndexMap.get(story.story_id) ?? 0)}
                >
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-1 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="secondary" className={levelColor}>
                            {levelLabels[story.hsk_level] || `HSK ${story.hsk_level}`}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Hash className="w-3 h-3 mr-1" />
                            {story.word_count} words
                          </Badge>
                          {story.coverage >= 0.95 && (
                            <Badge variant="outline" className="text-xs text-green-600">
                              {(story.coverage * 100).toFixed(0)}%
                            </Badge>
                          )}
                        </div>
                        <CardTitle className="text-lg leading-tight line-clamp-2">
                          {story.title_chinese}
                        </CardTitle>
                        <CardDescription className="line-clamp-1">
                          {story.title_english}
                        </CardDescription>
                      </div>
                      <ArrowRight className="w-5 h-5 text-muted-foreground shrink-0 mt-1 group-hover:translate-x-1 transition-transform" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground line-clamp-3 leading-relaxed">
                      {story.story_chinese.slice(0, 120)}...
                    </p>
                    {story.coverage < 0.9 && (
                      <Progress value={story.coverage * 100} className="h-1 mt-3" />
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default StoryBrowser;
