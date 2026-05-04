import { Suspense, memo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Download, Upload, RotateCcw } from 'lucide-react';
import { SectionLoader } from '@/components/SectionLoader';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';
import type { UserStats } from '@/types/hsk';
import type { ProgressTab } from '@/App';
import { hskDataService } from '@/services/hskDataService';

const FavoritesList = lazy(() => import('@/components/FavoritesList'));
const GrammarMap = lazy(() => import('@/components/GrammarMap'));

import { lazy } from 'react';

interface ProgressViewProps {
  progressTab: ProgressTab;
  userStats: UserStats | null;
  dueCount: number;
  hskStats: { level: number | '7-9'; label: string; count: number }[];
  entries: UnifiedEntry[];
  favorites: string[];
  exportData: string;
  onSetProgressTab: (tab: ProgressTab) => void;
  onSetShowImportDialog: (show: boolean) => void;
  onHandleExport: () => void;
  onRefreshStats: () => void;
  onSetFavorites: (favs: string[]) => void;
  onOpenDetail: (entry: UnifiedEntry, sequence: UnifiedEntry[]) => void;
}

export const ProgressView = memo(function ProgressView({
  progressTab,
  userStats,
  dueCount,
  hskStats,
  entries,
  favorites,
  exportData,
  onSetProgressTab,
  onSetShowImportDialog,
  onHandleExport,
  onRefreshStats,
  onSetFavorites,
  onOpenDetail,
}: ProgressViewProps) {
  return (
    <Tabs value={progressTab} onValueChange={(value) => onSetProgressTab(value as ProgressTab)} className="space-y-4">
      <TabsList className="grid w-full grid-cols-4">
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
                { label: 'Total Words', value: userStats?.totalStudied || 0 },
                { label: 'Current Streak', value: userStats?.currentStreak || 0 },
                { label: 'Longest Streak', value: userStats?.longestStreak || 0 },
                { label: 'Due for Review', value: dueCount },
              ].map(stat => (
                <div key={stat.label} className="text-center p-4 bg-muted rounded-lg">
                  <div className="text-3xl font-bold">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
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
                const percentage = count > 0 ? (studied / count) * 100 : 0;

                return (
                  <div key={level} className="flex items-center gap-4">
                    <div className="w-20 font-medium">{label}</div>
                    <Progress value={percentage} className="flex-1 h-3" />
                    <div className="w-24 text-right text-sm text-muted-foreground">
                      {studied} / {count}
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
              onOpenDetail(entry, favoriteEntries);
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
              <Button variant="outline" onClick={() => onSetShowImportDialog(true)}>
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
