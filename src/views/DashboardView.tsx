import { Suspense, lazy, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BookOpen, Brain, Flame, Trophy, Target, Heart,
  Timer, Gamepad2, GitBranch, Volume2, BarChart3,
  ScrollText, ChevronRight, Sparkles, X, GraduationCap,
} from 'lucide-react';
import { SectionLoader } from './SectionLoader';
import type { UserStats } from '@/types/hsk';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';
import type { StoryDataset } from '@/types/stories';
import type { BookDataset } from '@/types/books';
import type { ViewMode, ProgressTab } from '@/App';

import { hskDataService } from '@/services/hskDataService';

const CharacterOfTheDay = lazy(() => import('@/components/CharacterOfTheDay'));
const DailyGoals = lazy(() => import('@/components/DailyGoals'));
const PomodoroTimer = lazy(() => import('@/components/PomodoroTimer'));

interface HSKStat {
  level: number | string;
  count: number;
  label: string;
}

interface DashboardViewProps {
  showWelcomeBanner: boolean;
  userStats: UserStats | null;
  dueCount: number;
  totalWords: number;
  favorites: string[];
  hskStats: HSKStat[];
  dailyStats: {
    newWordsLearned: number;
    wordsReviewed: number;
    studyTimeMinutes: number;
    quizzesCompleted: number;
    writingExercises: number;
  };
  storyDataset: StoryDataset | null;
  bookDataset: BookDataset | null;
  showPomodoro: boolean;
  onDismissWelcomeBanner: () => void;
  onShowFeatureGuide: () => void;
  onShowStudyDialog: () => void;
  onStartQuiz: () => void;
  onNavigateTo: (view: ViewMode) => void;
  onShowPomodoro: () => void;
  onSetProgressTab: (tab: ProgressTab) => void;
  onOpenDetailView: (entry: UnifiedEntry, options?: { sequence?: UnifiedEntry[]; returnView?: ViewMode }) => void;
  onRefreshStats: () => void;
  onSetShowPomodoro: (open: boolean) => void;
}

export const DashboardView = memo(function DashboardView({
  showWelcomeBanner,
  userStats,
  dueCount,
  totalWords,
  favorites,
  hskStats,
  dailyStats,
  storyDataset,
  bookDataset,
  showPomodoro,
  onDismissWelcomeBanner,
  onShowFeatureGuide,
  onShowStudyDialog,
  onStartQuiz,
  onNavigateTo,
  onShowPomodoro,
  onSetProgressTab,
  onOpenDetailView,
  onRefreshStats,
  onSetShowPomodoro,
}: DashboardViewProps) {
  const heroStats = [
    { icon: Flame, label: 'Day Streak', value: userStats?.currentStreak || 0, toneClass: 'bg-orange-100 dark:bg-orange-900', iconClass: 'text-orange-600 dark:text-orange-400' },
    { icon: Trophy, label: 'Words Learned', value: userStats?.totalStudied || 0, toneClass: 'bg-blue-100 dark:bg-blue-900', iconClass: 'text-blue-600 dark:text-blue-400' },
    { icon: Target, label: 'Due for Review', value: dueCount, toneClass: 'bg-green-100 dark:bg-green-900', iconClass: 'text-green-600 dark:text-green-400', onClick: onShowStudyDialog },
    { icon: Heart, label: 'Favorites', value: favorites.length, toneClass: 'bg-red-100 dark:bg-red-900', iconClass: 'text-red-600 dark:text-red-400' },
  ];

  const quickActions = [
    { icon: Brain, title: 'Study Session', desc: dueCount > 0 ? `${dueCount} due for review` : 'Learn new words', tooltip: 'Review due words or learn new ones with spaced repetition (SRS)', toneClass: 'bg-primary/10', iconClass: 'text-primary', onClick: onShowStudyDialog },
    { icon: Gamepad2, title: 'Quiz Mode', desc: 'Test your knowledge', tooltip: 'Multiple-choice questions with 4 types and keyboard shortcuts', toneClass: 'bg-green-100 dark:bg-green-900', iconClass: 'text-green-600 dark:text-green-400', onClick: onStartQuiz },
    { icon: BookOpen, title: 'Browse Dictionary', desc: `${totalWords.toLocaleString()} words`, tooltip: 'Search and explore the full HSK dictionary with enrichments', toneClass: 'bg-slate-100 dark:bg-slate-800', iconClass: 'text-slate-700 dark:text-slate-200', onClick: () => onNavigateTo('browse') },
    { icon: Timer, title: 'Focus Timer', desc: 'Pomodoro session', tooltip: 'Stay focused with timed study sessions (25/5/15 min)', toneClass: 'bg-blue-100 dark:bg-blue-900', iconClass: 'text-blue-600 dark:text-blue-400', onClick: onShowPomodoro },
    { icon: GitBranch, title: 'Grammar Map', desc: 'Track prerequisites', tooltip: 'Interactive grammar dependency graph across HSK levels', toneClass: 'bg-violet-100 dark:bg-violet-900', iconClass: 'text-violet-700 dark:text-violet-300', onClick: () => { onSetProgressTab('grammar'); onNavigateTo('progress'); } },
    { icon: Volume2, title: 'Audio Playlist', desc: 'Passive listening', tooltip: 'Listen to HSK vocabulary with text-to-speech', toneClass: 'bg-amber-100 dark:bg-amber-900', iconClass: 'text-amber-600 dark:text-amber-400', onClick: () => onNavigateTo('audio') },
    { icon: BarChart3, title: 'Progress', desc: 'Stats & favorites', tooltip: 'Track streaks, review schedules, favorites, and export data', toneClass: 'bg-rose-100 dark:bg-rose-900', iconClass: 'text-rose-600 dark:text-rose-400', onClick: () => onNavigateTo('progress') },
    ...(storyDataset ? [{ icon: ScrollText, title: 'Stories', desc: `${storyDataset.meta.total_stories} stories`, tooltip: 'Read AI-generated short stories at your HSK level', toneClass: 'bg-cyan-100 dark:bg-cyan-900', iconClass: 'text-cyan-600 dark:text-cyan-400', onClick: () => onNavigateTo('stories') }] : []),
    ...(bookDataset ? [{ icon: BookOpen, title: 'Books', desc: `${bookDataset.meta.total_books} books`, tooltip: 'Read continuous genre-based stories with chapters', toneClass: 'bg-teal-100 dark:bg-teal-900', iconClass: 'text-teal-600 dark:text-teal-400', onClick: () => onNavigateTo('books') }] : []),
  ];

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      {/* Welcome Banner */}
      <AnimatePresence>
        {showWelcomeBanner && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="p-4 sm:p-5">
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-xl bg-primary/10 shrink-0"><Sparkles className="w-5 h-5 text-primary" /></div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-sm sm:text-base mb-1">Welcome to OpenHSK!</h3>
                    <p className="text-xs sm:text-sm text-muted-foreground mb-3">Here's everything you can do to accelerate your Chinese learning.</p>
                    <div className="flex flex-wrap gap-2">
                      <Button size="sm" onClick={onShowFeatureGuide}><BookOpen className="w-3.5 h-3.5 mr-1.5" />Explore Features</Button>
                      <Button size="sm" variant="outline" onClick={onShowStudyDialog}><Brain className="w-3.5 h-3.5 mr-1.5" />Start Studying</Button>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-1 -mt-1" onClick={onDismissWelcomeBanner} aria-label="Dismiss welcome banner"><X className="w-3.5 h-3.5" /></Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Hero Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {heroStats.map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }}>
            <Card className={`hover:shadow-lg transition-all duration-200 ${stat.onClick ? 'cursor-pointer hover:scale-[1.02] active:scale-[0.98]' : ''}`} onClick={stat.onClick}>
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`p-3 rounded-xl ${stat.toneClass}`}><stat.icon className={`w-6 h-6 ${stat.iconClass}`} /></div>
                <div>
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-xs text-muted-foreground">{stat.label}</div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Character of the Day */}
      <Suspense fallback={<SectionLoader label="Loading your daily character..." />}>
        <CharacterOfTheDay onViewDetails={(entry) => onOpenDetailView(entry, { sequence: [entry], returnView: 'dashboard' })} />
      </Suspense>

      {/* Daily Goals */}
      <Suspense fallback={<SectionLoader label="Preparing daily goals..." />}>
        <DailyGoals stats={dailyStats} onUpdateGoals={onRefreshStats} />
      </Suspense>

      {/* Quick Actions */}
      <TooltipProvider delayDuration={400}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {quickActions.map((action, i) => (
            <motion.div key={action.title} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.08 }}>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Card className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group" onClick={action.onClick}>
                    <CardContent className="p-6 flex items-center gap-4">
                      <div className={`p-4 rounded-2xl group-hover:scale-110 transition-transform ${action.toneClass}`}><action.icon className={`w-8 h-8 ${action.iconClass}`} /></div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold break-words">{action.title}</h3>
                        <p className="text-sm text-muted-foreground break-words">{action.desc}</p>
                      </div>
                      <ChevronRight className="w-5 h-5 text-muted-foreground group-hover:translate-x-1 transition-transform shrink-0" />
                    </CardContent>
                  </Card>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-[240px] text-center"><p>{action.tooltip}</p></TooltipContent>
              </Tooltip>
            </motion.div>
          ))}
        </div>
      </TooltipProvider>

      {/* HSK Progress */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><GraduationCap className="w-5 h-5" />HSK Level Progress</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {hskStats.filter(s => s.level !== 0).map(({ level, count, label }) => {
              const progressKey = String(level);
              const progress = userStats?.levelProgress[progressKey];
              const studied = progress?.studied || 0;
              const percentage = count > 0 ? (studied / count) * 100 : 0;
              return (
                <div key={level} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="font-medium flex items-center gap-2">
                      <Badge variant="outline" className={`hsk-badge-${level === '7-9' ? '7' : level}`}>{label}</Badge>
                    </span>
                    <span className="text-muted-foreground">{studied} / {count} ({Math.round(percentage)}%)</span>
                  </div>
                  <Progress value={percentage} className="h-2" />
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Pomodoro Dialog */}
      <Dialog open={showPomodoro} onOpenChange={onSetShowPomodoro}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Timer className="w-5 h-5" />Focus Timer</DialogTitle>
          </DialogHeader>
          <Suspense fallback={<SectionLoader label="Loading focus timer..." />}>
            <PomodoroTimer onSessionComplete={(mode, duration) => { if (mode === 'focus') { hskDataService.incrementStudyTime(Math.round(duration / 60)); onRefreshStats(); } }} />
          </Suspense>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
});
