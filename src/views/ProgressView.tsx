import { Suspense, lazy, memo } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Download, Upload, RotateCcw, BookOpen, Flame, Trophy, Clock } from 'lucide-react';
import { hskDataService } from '@/services/hskDataService';
import { SectionLoader } from './SectionLoader';
import type { UserStats } from '@/types/hsk';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';
import type { ProgressTab, ViewMode } from '@/App';

const FavoritesList = lazy(() => import('@/components/FavoritesList'));
const GrammarMap = lazy(() => import('@/components/GrammarMap'));

interface HSKStat {
  level: number | string;
  count: number;
  label: string;
}

interface ProgressViewProps {
  progressTab: ProgressTab;
  onSetProgressTab: (tab: ProgressTab) => void;
  userStats: UserStats | null;
  dueCount: number;
  hskStats: HSKStat[];
  entries: UnifiedEntry[];
  favorites: string[];
  exportData: string;
  onHandleExport: () => void;
  onShowImportDialog: () => void;
  onRefreshStats: () => void;
  onSetFavorites: (favorites: string[]) => void;
  onOpenDetailView: (entry: UnifiedEntry, options?: { sequence?: UnifiedEntry[]; returnView?: ViewMode }) => void;
}

export const ProgressView = memo(function ProgressView({
  progressTab,
  onSetProgressTab,
  userStats,
  dueCount,
  hskStats,
  entries,
  favorites,
  exportData,
  onHandleExport,
  onShowImportDialog,
  onRefreshStats,
  onSetFavorites,
  onOpenDetailView,
}: ProgressViewProps) {
  const levelColors: Record<number, string> = {
    1: 'bg-green-500',
    2: 'bg-emerald-500',
    3: 'bg-blue-500',
    4: 'bg-purple-500',
    5: 'bg-orange-500',
    6: 'bg-red-500',
  };

  return (
    <Tabs value={progressTab} onValueChange={(value) => onSetProgressTab(value as ProgressTab)} className="space-y-4">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4">
        <TabsTrigger value="stats">Statistics</TabsTrigger>
        <TabsTrigger value="favorites">Favorites</TabsTrigger>
        <TabsTrigger value="grammar">Grammar</TabsTrigger>
        <TabsTrigger value="data">Data</TabsTrigger>
      </TabsList>

      <TabsContent value="stats" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Study Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { label: 'Total Words', value: userStats?.totalStudied || 0, icon: BookOpen, color: 'text-blue-500' },
                { label: 'Current Streak', value: userStats?.currentStreak || 0, icon: Flame, color: 'text-orange-500' },
                { label: 'Longest Streak', value: userStats?.longestStreak || 0, icon: Trophy, color: 'text-amber-500' },
                { label: 'Due for Review', value: dueCount, icon: Clock, color: 'text-red-500' },
              ].map(stat => {
                const Icon = stat.icon;
                return (
                  <div key={stat.label} className="text-center p-4 bg-muted rounded-lg space-y-2">
                    <Icon className={`w-5 h-5 mx-auto ${stat.color}`} />
                    <div className="text-3xl font-bold">{stat.value}</div>
                    <div className="text-sm text-muted-foreground">{stat.label}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Level Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {hskStats.filter(s => s.level !== 0).map(({ level, count, label }) => {
                const progressKey = String(level);
                const progress = userStats?.levelProgress[progressKey];
                const studied = progress?.studied || 0;
                const percentage = count > 0 ? Math.round((studied / count) * 100) : 0;
                const levelNum = level as number;
                
                return (
                  <div key={level} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 group">
                    <div className="sm:w-20 font-medium text-sm flex items-center gap-2">
                      <span className={`w-2 h-2 rounded-full ${levelColors[levelNum] || 'bg-gray-400'}`} />
                      {label}
                    </div>
                    <div className="flex items-center gap-3 flex-1">
                      <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${levelColors[levelNum] || 'bg-gray-400'}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          transition={{ duration: 0.8, ease: 'easeOut' }}
                        />
                      </div>
                      <div className="text-right text-sm tabular-nums shrink-0 min-w-[4rem]">
                        <span className="font-medium">{percentage}%</span>
                        <span className="text-muted-foreground text-xs ml-1">({studied}/{count})</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </TabsContent>

      <TabsContent value="favorites">
        <Suspense fallback={<SectionLoader label="Loading favorites..." />}>
          <FavoritesList
            entries={entries}
            favoriteIds={favorites}
            onRemoveFavorite={(id) => {
              hskDataService.removeFromFavorites(id);
              onSetFavorites(hskDataService.getFavorites());
            }}
            onEntryClick={(entry) => {
              const favoriteEntries = entries.filter((item) => favorites.includes(item.id));
              onOpenDetailView(entry, { sequence: favoriteEntries, returnView: 'progress' });
            }}
            onClearAll={() => {
              hskDataService.clearFavorites();
              onSetFavorites([]);
            }}
          />
        </Suspense>
      </TabsContent>

      <TabsContent value="grammar">
        <Suspense fallback={<SectionLoader label="Loading grammar map..." />}>
          <GrammarMap userStats={userStats} />
        </Suspense>
      </TabsContent>

      <TabsContent value="data" className="space-y-4">
        <Card>
          <CardHeader>
            <CardTitle>Export / Import Data</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={onHandleExport}>
                <Download className="w-4 h-4 mr-2" />
                Export Data
              </Button>
              <Button variant="outline" onClick={onShowImportDialog}>
                <Upload className="w-4 h-4 mr-2" />
                Import Data
              </Button>
            </div>

            {exportData && (
              <div className="space-y-2">
                <Label>Export JSON (copy and save):</Label>
                <Textarea value={exportData} readOnly className="font-mono text-xs h-32" />
              </div>
            )}
          </CardContent>
        </Card>

        <div className="flex justify-center">
          <Button variant="destructive" onClick={() => {
            if (confirm('Are you sure you want to reset all progress? This cannot be undone.')) {
              hskDataService.resetProgress();
              onRefreshStats();
              onSetFavorites([]);
            }
          }}>
            <RotateCcw className="w-4 h-4 mr-2" />
            Reset All Progress
          </Button>
        </div>
      </TabsContent>
    </Tabs>
  );
});
