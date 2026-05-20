import { memo } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  BookOpen, Flame, Trophy, Target, Heart,
  Timer, Volume2,
  ScrollText, ChevronRight, Sparkles, X, GraduationCap,
} from 'lucide-react';
import type { UserStats } from '@/types/hsk';
import type { StoryDataset } from '@/types/stories';
import type { BookDataset } from '@/types/books';
import type { ViewMode } from '@/App';

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
  onDismissWelcomeBanner: () => void;
  onShowFeatureGuide: () => void;
  onNavigateTo: (view: ViewMode) => void;
  onShowPomodoro: () => void;
}

export const DashboardView = memo(function DashboardView({
  showWelcomeBanner,
  userStats,
  dueCount,
  totalWords,
  favorites,
  hskStats,
  storyDataset,
  bookDataset,
  onDismissWelcomeBanner,
  onShowFeatureGuide,
  onNavigateTo,
  onShowPomodoro,
}: DashboardViewProps) {
  type HeroStat = { icon: typeof Flame; label: string; value: number; toneClass: string; iconClass: string };
  const heroStats: HeroStat[] = [
    { icon: Flame, label: 'Day Streak', value: userStats?.currentStreak || 0, toneClass: 'bg-orange-100 dark:bg-orange-900', iconClass: 'text-orange-600 dark:text-orange-400' },
    { icon: Trophy, label: 'Words Learned', value: userStats?.totalStudied || 0, toneClass: 'bg-blue-100 dark:bg-blue-900', iconClass: 'text-blue-600 dark:text-blue-400' },
    { icon: Target, label: 'Due for Review', value: dueCount, toneClass: 'bg-green-100 dark:bg-green-900', iconClass: 'text-green-600 dark:text-green-400' },
    { icon: Heart, label: 'Favorites', value: favorites.length, toneClass: 'bg-red-100 dark:bg-red-900', iconClass: 'text-red-600 dark:text-red-400' },
  ];

  const quickActions = [
    { icon: BookOpen, title: 'Browse Dictionary', desc: `${totalWords.toLocaleString()} words`, tooltip: 'Search and explore the full HSK dictionary', toneClass: 'bg-slate-100 dark:bg-slate-800', iconClass: 'text-slate-700 dark:text-slate-200', onClick: () => onNavigateTo('browse') },
    { icon: Timer, title: 'Focus Timer', desc: 'Pomodoro session', tooltip: 'Stay focused with timed study sessions', toneClass: 'bg-blue-100 dark:bg-blue-900', iconClass: 'text-blue-600 dark:text-blue-400', onClick: onShowPomodoro },
    { icon: Volume2, title: 'Audio Playlist', desc: 'Passive listening', tooltip: 'Listen to HSK vocabulary with text-to-speech', toneClass: 'bg-amber-100 dark:bg-amber-900', iconClass: 'text-amber-600 dark:text-amber-400', onClick: () => onNavigateTo('audio') },
    ...(storyDataset ? [{ icon: ScrollText, title: 'Stories', desc: `${storyDataset.meta.total_stories} stories`, tooltip: 'Read AI-generated short stories at your HSK level', toneClass: 'bg-cyan-100 dark:bg-cyan-900', iconClass: 'text-cyan-600 dark:text-cyan-400', onClick: () => onNavigateTo('stories') }] : []),
    ...(bookDataset ? [{ icon: BookOpen, title: 'Books', desc: `${bookDataset.meta.total_books} books`, tooltip: 'Read continuous genre-based stories with chapters', toneClass: 'bg-teal-100 dark:bg-teal-900', iconClass: 'text-teal-600 dark:text-teal-400', onClick: () => onNavigateTo('books') }] : []),
  ];

  return (
    <div className="space-y-6">
      {showWelcomeBanner && (
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="p-4 sm:p-5">
            <div className="flex items-start gap-3">
              <div className="p-2 rounded-xl bg-primary/10 shrink-0"><Sparkles className="w-5 h-5 text-primary" /></div>
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-sm sm:text-base mb-1">Welcome to OpenHSK!</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-3">Here's everything you can do to accelerate your Chinese learning.</p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={onShowFeatureGuide}><BookOpen className="w-3.5 h-3.5 mr-1.5" />Explore Features</Button>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0 -mr-1 -mt-1" onClick={onDismissWelcomeBanner} aria-label="Dismiss welcome banner"><X className="w-3.5 h-3.5" /></Button>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {heroStats.map((stat) => (
          <Card key={stat.label} className="hover:shadow-lg transition-all duration-200">
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-3 rounded-xl ${stat.toneClass}`}><stat.icon className={`w-6 h-6 ${stat.iconClass}`} /></div>
              <div>
                <div className="text-3xl font-bold">{stat.value}</div>
                <div className="text-xs text-muted-foreground">{stat.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <TooltipProvider delayDuration={400}>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {quickActions.map((action) => (
            <Tooltip key={action.title}>
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
          ))}
        </div>
      </TooltipProvider>

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
    </div>
  );
});
