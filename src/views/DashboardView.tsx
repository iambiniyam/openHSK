import { Suspense, memo } from 'react';
import { motion } from 'framer-motion';
import {
  Flame,
  Trophy,
  Target,
  Heart,
  Zap,
  Brain,
  Gamepad2,
  BookOpen,
  Timer,
  GitBranch,
  ScrollText,
  Library,
  GraduationCap,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { SectionLoader } from '@/components/SectionLoader';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';
import type { UserStats } from '@/types/hsk';
import type { StoryDataset } from '@/types/stories';
import type { BookDataset } from '@/types/books';
import type { ProgressTab } from '@/App';
import { hskDataService } from '@/services/hskDataService';

const CharacterOfTheDay = lazy(() => import('@/components/CharacterOfTheDay'));
const DailyGoals = lazy(() => import('@/components/DailyGoals'));
const PomodoroTimer = lazy(() => import('@/components/PomodoroTimer'));

import { lazy } from 'react';

interface DashboardViewProps {
  userStats: UserStats | null;
  dailyStats: {
    newWordsLearned: number;
    wordsReviewed: number;
    studyTimeMinutes: number;
    quizzesCompleted: number;
    writingExercises: number;
  };
  dueCount: number;
  favorites: string[];
  storyDataset: StoryDataset | null;
  bookDataset: BookDataset | null;
  hskStats: { level: number | '7-9'; label: string; count: number }[];
  totalWords: number;
  showPomodoro: boolean;
  onOpenDetail: (entry: UnifiedEntry) => void;
  onStartStudy: () => void;
  onOpenPomodoro: (open: boolean) => void;
  onOpenProgress: (tab: ProgressTab) => void;
  onOpenStories: () => void;
  onOpenBooks: () => void;
  onOpenBrowse: () => void;
  onOpenQuiz: () => void;
  onUpdateGoals: () => void;
}

export const DashboardView = memo(function DashboardView({
  userStats,
  dailyStats,
  dueCount,
  favorites,
  storyDataset,
  bookDataset,
  hskStats,
  totalWords,
  showPomodoro,
  onOpenDetail,
  onStartStudy,
  onOpenPomodoro,
  onOpenProgress,
  onOpenStories,
  onOpenBooks,
  onOpenBrowse,
  onOpenQuiz,
  onUpdateGoals,
}: DashboardViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* Bento Grid Layout */}
      <div className="bento-grid">
        {/* Hero Stats - Small Cards */}
        {[
          {
            icon: Flame,
            label: 'Day Streak',
            value: userStats?.currentStreak || 0,
            toneClass: 'bg-orange-500/10',
            iconClass: 'text-orange-600 dark:text-orange-400',
          },
          {
            icon: Trophy,
            label: 'Words Learned',
            value: userStats?.totalStudied || 0,
            toneClass: 'bg-blue-500/10',
            iconClass: 'text-blue-600 dark:text-blue-400',
          },
          {
            icon: Target,
            label: 'Due for Review',
            value: dueCount,
            toneClass: 'bg-emerald-500/10',
            iconClass: 'text-emerald-600 dark:text-emerald-400',
          },
          {
            icon: Heart,
            label: 'Favorites',
            value: favorites.length,
            toneClass: 'bg-rose-500/10',
            iconClass: 'text-rose-600 dark:text-rose-400',
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
          >
            <Card className="h-full card-hover border-border/40">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${stat.toneClass}`}>
                  <stat.icon className={`w-5 h-5 ${stat.iconClass}`} />
                </div>
                <div className="min-w-0">
                  <div className="text-2xl font-bold tabular-nums">{stat.value}</div>
                  <div className="text-[11px] text-muted-foreground font-medium">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {/* Character of the Day - Spans 2 on large screens */}
        <motion.div
          className="bento-span-2"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <Suspense fallback={<SectionLoader label="Loading your daily character..." />}>
            <CharacterOfTheDay
              onViewDetails={(entry) => onOpenDetail(entry)}
            />
          </Suspense>
        </motion.div>

        {/* Daily Goals */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <Suspense fallback={<SectionLoader label="Preparing daily goals..." />}>
            <DailyGoals stats={dailyStats} onUpdateGoals={onUpdateGoals} />
          </Suspense>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          className="bento-span-2"
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <Card className="h-full border-border/40">
            <CardContent className="p-5">
              <h3 className="text-sm font-semibold tracking-tight mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-primary" />
                Quick Actions
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {[
                  {
                    icon: Brain,
                    title: 'Study',
                    desc: dueCount > 0 ? `${dueCount} due` : 'Learn new',
                    toneClass: 'bg-primary/10',
                    iconClass: 'text-primary',
                    onClick: onStartStudy,
                  },
                  {
                    icon: Gamepad2,
                    title: 'Quiz',
                    desc: 'Test knowledge',
                    toneClass: 'bg-emerald-500/10',
                    iconClass: 'text-emerald-600 dark:text-emerald-400',
                    onClick: onOpenQuiz,
                  },
                  {
                    icon: BookOpen,
                    title: 'Browse',
                    desc: `${totalWords.toLocaleString()} words`,
                    toneClass: 'bg-slate-500/10',
                    iconClass: 'text-slate-600 dark:text-slate-300',
                    onClick: onOpenBrowse,
                  },
                  {
                    icon: Timer,
                    title: 'Focus',
                    desc: 'Pomodoro',
                    toneClass: 'bg-blue-500/10',
                    iconClass: 'text-blue-600 dark:text-blue-400',
                    onClick: () => onOpenPomodoro(true),
                  },
                  {
                    icon: GitBranch,
                    title: 'Grammar',
                    desc: 'Track progress',
                    toneClass: 'bg-violet-500/10',
                    iconClass: 'text-violet-600 dark:text-violet-400',
                    onClick: () => onOpenProgress('grammar'),
                  },
                  ...(storyDataset ? [{
                    icon: ScrollText,
                    title: 'Stories',
                    desc: `${storyDataset.meta.total_stories} stories`,
                    toneClass: 'bg-rose-500/10',
                    iconClass: 'text-rose-600 dark:text-rose-400',
                    onClick: onOpenStories,
                  }] : []),
                  ...(bookDataset ? [{
                    icon: Library,
                    title: 'Books',
                    desc: `${bookDataset.meta.total_books} books`,
                    toneClass: 'bg-amber-500/10',
                    iconClass: 'text-amber-600 dark:text-amber-400',
                    onClick: onOpenBooks,
                  }] : []),
                ].map((action) => (
                  <button
                    key={action.title}
                    onClick={action.onClick}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl border border-border/40 bg-background/50 hover:bg-muted/60 hover:border-primary/20 transition-all duration-200 text-left group"
                  >
                    <div className={`p-1.5 rounded-lg ${action.toneClass} shrink-0`}>
                      <action.icon className={`w-4 h-4 ${action.iconClass}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-medium leading-tight">{action.title}</div>
                      <div className="text-[11px] text-muted-foreground leading-tight truncate">{action.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* HSK Progress */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
      >
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <GraduationCap className="w-4 h-4 text-muted-foreground" />
              HSK Level Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3.5">
              {hskStats.filter(s => s.level !== 0).map(({ level, count, label }) => {
                const progressKey = String(level);
                const progress = userStats?.levelProgress[progressKey];
                const studied = progress?.studied || 0;
                const percentage = count > 0 ? (studied / count) * 100 : 0;

                return (
                  <div key={level} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="font-medium flex items-center gap-2">
                        <Badge variant="outline" className={`hsk-badge-${level === '7-9' ? '7' : level} text-xs h-5`}>
                          {label}
                        </Badge>
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {studied} / {count} ({Math.round(percentage)}%)
                      </span>
                    </div>
                    <div className="relative h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full bg-primary/80 transition-all duration-700"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Pomodoro Dialog */}
      <Dialog open={showPomodoro} onOpenChange={onOpenPomodoro}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Timer className="w-5 h-5" />
              Focus Timer
            </DialogTitle>
          </DialogHeader>
          <Suspense fallback={<SectionLoader label="Loading focus timer..." />}>
            <PomodoroTimer
              onSessionComplete={(mode, duration) => {
                if (mode === 'focus') {
                  hskDataService.incrementStudyTime(Math.round(duration / 60));
                  onUpdateGoals();
                }
              }}
            />
          </Suspense>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
});
