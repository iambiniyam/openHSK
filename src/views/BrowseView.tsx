import { Suspense, memo, lazy } from 'react';
import { motion } from 'framer-motion';
import { Search, Filter, X, LayoutGrid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { SectionLoader } from '@/components/SectionLoader';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';

const PaginatedWordList = lazy(() => import('@/components/PaginatedWordList'));
const VirtualizedWordList = lazy(() => import('@/components/VirtualizedWordList'));

export type ListViewMode = 'paginated' | 'virtualized';

interface BrowseViewProps {
  searchQuery: string;
  selectedLevel: number | 'all' | '7-9';
  selectedPOS: string;
  searchResults: UnifiedEntry[];
  listViewMode: ListViewMode;
  browsePage: number;
  isPending: boolean;
  deferredSearchQuery: string;
  favorites: string[];
  onSearchChange: (query: string) => void;
  onLevelChange: (level: number | 'all' | '7-9') => void;
  onPOSChange: (pos: string) => void;
  onListViewModeChange: (mode: ListViewMode) => void;
  onBrowsePageChange: (page: number) => void;
  onAddToSearchHistory: (query: string) => void;
  onEntryClick: (entry: UnifiedEntry, sequence: UnifiedEntry[]) => void;
  onToggleFavorite: (id: string) => void;
}

export const BrowseView = memo(function BrowseView({
  searchQuery,
  selectedLevel,
  selectedPOS,
  searchResults,
  listViewMode,
  browsePage,
  isPending,
  deferredSearchQuery,
  favorites,
  onSearchChange,
  onLevelChange,
  onPOSChange,
  onListViewModeChange,
  onBrowsePageChange,
  onAddToSearchHistory,
  onEntryClick,
  onToggleFavorite,
}: BrowseViewProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3 sm:space-y-4"
    >
      {/* Search Bar */}
      <Card className="sticky top-0 z-10 shadow-md">
        <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <Input
                placeholder="Search character, pinyin, meaning..."
                value={searchQuery}
                onChange={(e) => {
                  onSearchChange(e.target.value);
                  onBrowsePageChange(1);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    onAddToSearchHistory(searchQuery);
                  }
                }}
                className="pl-9 sm:pl-10 h-10 sm:h-12 text-base sm:text-lg"
                data-search-input
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8"
                  onClick={() => {
                    onSearchChange('');
                    onBrowsePageChange(1);
                  }}
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              )}
            </div>

            {/* Filters */}
            <div className="flex gap-2">
              <Select
                value={selectedLevel.toString()}
                onValueChange={(v) => {
                  if (v === 'all') onLevelChange('all');
                  else if (v === '7-9') onLevelChange('7-9');
                  else onLevelChange(parseInt(v));
                  onBrowsePageChange(1);
                }}
              >
                <SelectTrigger className="w-[100px] sm:w-[120px] h-10 sm:h-12">
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" />
                  <SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map(l => (
                    <SelectItem key={l} value={l.toString()}>HSK {l}</SelectItem>
                  ))}
                  <SelectItem value="7-9">HSK 7-9</SelectItem>
                </SelectContent>
              </Select>

              <Select
                value={selectedPOS}
                onValueChange={(value) => {
                  onPOSChange(value);
                  onBrowsePageChange(1);
                }}
              >
                <SelectTrigger className="w-[110px] sm:w-[140px] h-10 sm:h-12">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="noun">Noun</SelectItem>
                  <SelectItem value="verb">Verb</SelectItem>
                  <SelectItem value="adjective">Adj</SelectItem>
                  <SelectItem value="adverb">Adv</SelectItem>
                  <SelectItem value="pronoun">Pronoun</SelectItem>
                  <SelectItem value="measure word">Measure</SelectItem>
                  <SelectItem value="particle">Particle</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* View Mode Toggle & Stats */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              {isPending || searchQuery !== deferredSearchQuery ? (
                <span className="flex items-center gap-2">
                  <motion.div
                    className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full"
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  />
                  Searching...
                </span>
              ) : `${searchResults.length.toLocaleString()} words found`}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={listViewMode === 'paginated' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => onListViewModeChange('paginated')}
                    >
                      <LayoutGrid className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Grid View (Paginated)</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant={listViewMode === 'virtualized' ? 'secondary' : 'ghost'}
                      size="icon"
                      className="h-7 w-7 sm:h-8 sm:w-8"
                      onClick={() => onListViewModeChange('virtualized')}
                    >
                      <List className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>List View (Virtualized)</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results - Paginated or Virtualized */}
      <Suspense fallback={<SectionLoader label="Rendering word list..." />}>
        {listViewMode === 'paginated' ? (
          <PaginatedWordList
            entries={searchResults}
            favoriteIds={favorites}
            onEntryClick={(entry) => onEntryClick(entry, searchResults)}
            onToggleFavorite={onToggleFavorite}
            itemsPerPage={48}
            currentPage={browsePage}
            onPageChange={onBrowsePageChange}
          />
        ) : (
          <VirtualizedWordList
            entries={searchResults}
            favoriteIds={favorites}
            onEntryClick={(entry) => onEntryClick(entry, searchResults)}
            onToggleFavorite={onToggleFavorite}
          />
        )}
      </Suspense>
    </motion.div>
  );
});
