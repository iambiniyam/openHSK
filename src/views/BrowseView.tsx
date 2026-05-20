import { memo, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Filter, X, History, Trash2 } from 'lucide-react';
import { PaginatedWordList } from '@/components/PaginatedWordList';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';
import type { ViewMode } from '@/App';

interface BrowseViewProps {
  searchQuery: string;
  onSearchQueryChange: (value: string) => void;
  onSearchSubmit: (trimmed: string) => void;
  onClearSearch: () => void;
  selectedLevel: number | 'all' | '7-9';
  onSelectedLevelChange: (value: number | 'all' | '7-9') => void;
  selectedPOS: string;
  onSelectedPOSChange: (value: string) => void;
  searchResults: UnifiedEntry[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  browsePage: number;
  onBrowsePageChange: (page: number) => void;
  deferredSearchQuery: string;
  isPending: boolean;
  searchHistory: string[];
  onSelectHistoryTerm: (term: string) => void;
  onClearHistory: () => void;
  onOpenDetailView: (entry: UnifiedEntry, options?: { sequence?: UnifiedEntry[]; returnView?: ViewMode }) => void;
}

export const BrowseView = memo(function BrowseView({
  searchQuery,
  onSearchQueryChange,
  onSearchSubmit,
  onClearSearch,
  selectedLevel,
  onSelectedLevelChange,
  selectedPOS,
  onSelectedPOSChange,
  searchResults,
  favorites,
  onToggleFavorite,
  browsePage,
  onBrowsePageChange,
  deferredSearchQuery,
  isPending,
  searchHistory,
  onSelectHistoryTerm,
  onClearHistory,
  onOpenDetailView,
}: BrowseViewProps) {
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable;

      if (e.key === '/' && !isTyping) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape' && !isTyping && searchQuery) {
        e.preventDefault();
        onClearSearch();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchQuery, onClearSearch]);
  return (
    <div className="space-y-3 sm:space-y-4">
      <Card className="sticky top-0 z-10 shadow-md">
        <CardContent className="p-3 sm:p-4 space-y-3 sm:space-y-4">
          <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 sm:w-5 sm:h-5 text-muted-foreground" />
              <Input
                ref={searchInputRef}
                placeholder="Search character, pinyin, meaning..."
                value={searchQuery}
                onChange={(e) => onSearchQueryChange(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    onSearchSubmit(searchQuery.trim());
                  }
                }}
                className="pl-9 sm:pl-10 h-10 sm:h-12 text-base sm:text-lg"
              />
              {searchQuery && (
                <Button variant="ghost" size="icon" aria-label="Clear search" className="absolute right-1 sm:right-2 top-1/2 -translate-y-1/2 h-7 w-7 sm:h-8 sm:w-8" onClick={onClearSearch}>
                  <X className="w-3 h-3 sm:w-4 sm:h-4" />
                </Button>
              )}
            </div>

            {searchHistory.length > 0 && !searchQuery && (
              <div className="flex items-center gap-2 flex-wrap">
                <History className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                {searchHistory.slice(0, 8).map((term) => (
                  <button key={term} onClick={() => onSelectHistoryTerm(term)} className="text-xs px-2 py-1 rounded-full bg-muted hover:bg-muted/80 transition-colors text-muted-foreground">{term}</button>
                ))}
                <button onClick={onClearHistory} className="text-xs text-muted-foreground hover:text-destructive transition-colors ml-auto" title="Clear history"><Trash2 className="w-3 h-3" /></button>
              </div>
            )}

            <div className="flex gap-2">
              <Select value={selectedLevel.toString()} onValueChange={(v) => { if (v === 'all') onSelectedLevelChange('all'); else if (v === '7-9') onSelectedLevelChange('7-9'); else onSelectedLevelChange(parseInt(v)); }}>
                <SelectTrigger className="w-[100px] sm:w-[120px] h-10 sm:h-12">
                  <Filter className="w-3 h-3 sm:w-4 sm:h-4 mr-1 sm:mr-2" /><SelectValue placeholder="Level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map(l => (<SelectItem key={l} value={l.toString()}>HSK {l}</SelectItem>))}
                  <SelectItem value="7-9">HSK 7-9</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedPOS} onValueChange={onSelectedPOSChange}>
                <SelectTrigger className="w-[110px] sm:w-[140px] h-10 sm:h-12"><SelectValue placeholder="Type" /></SelectTrigger>
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

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs sm:text-sm text-muted-foreground">
              {isPending || searchQuery !== deferredSearchQuery ? (
                <span className="flex items-center gap-2">
                    <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    Searching...
                </span>
              ) : `${searchResults.length.toLocaleString()} words found`}
            </div>


          </div>
        </CardContent>
      </Card>

      <PaginatedWordList
        entries={searchResults}
        favoriteIds={favorites}
        onEntryClick={(entry) => onOpenDetailView(entry, { sequence: searchResults, returnView: 'browse' })}
        onToggleFavorite={onToggleFavorite}
        itemsPerPage={48}
        currentPage={browsePage}
        onPageChange={onBrowsePageChange}
        highlightQuery={deferredSearchQuery}
      />
      </div>
  );
});
