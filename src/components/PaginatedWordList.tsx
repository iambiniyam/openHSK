import { useMemo, useState, type ReactNode } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Volume2, Heart, ChevronRight } from 'lucide-react';

import { ttsService } from '@/services/ttsService';
import { Pagination } from './Pagination';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';

interface PaginatedWordListProps {
  entries: UnifiedEntry[];
  favoriteIds: string[];
  onEntryClick: (entry: UnifiedEntry) => void;
  onToggleFavorite: (id: string) => void;
  itemsPerPage?: number;
  currentPage?: number;
  onPageChange?: (page: number) => void;
  highlightQuery?: string;
}

function highlightMatch(text: string, query: string): ReactNode {
  if (!query.trim()) return text;
  const normalizedQuery = query.toLowerCase().trim();
  const normalizedText = text.toLowerCase();
  const idx = normalizedText.indexOf(normalizedQuery);
  if (idx === -1) return text;

  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-amber-200/60 text-inherit rounded px-0.5">
        {text.slice(idx, idx + normalizedQuery.length)}
      </mark>
      {text.slice(idx + normalizedQuery.length)}
    </>
  );
}

export const PaginatedWordList = ({
  entries,
  favoriteIds,
  onEntryClick,
  onToggleFavorite,
  itemsPerPage = 50,
  currentPage,
  onPageChange,
  highlightQuery,
}: PaginatedWordListProps) => {
  const [internalPage, setInternalPage] = useState(1);
  const activePage = currentPage ?? internalPage;
  const totalPages = Math.max(1, Math.ceil(entries.length / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(activePage, 1), totalPages);
  const favoriteSet = useMemo(() => new Set(favoriteIds), [favoriteIds]);

  // Paginated view for the current page
  const paginatedEntries = useMemo(() => {
    const start = (safeCurrentPage - 1) * itemsPerPage;
    return entries.slice(start, start + itemsPerPage);
  }, [entries, safeCurrentPage, itemsPerPage]);

  const handlePageChange = (page: number) => {
    const nextPage = Math.min(Math.max(page, 1), totalPages);
    if (currentPage === undefined) {
      setInternalPage(nextPage);
    }
    onPageChange?.(nextPage);
    // Scroll to top of list
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSpeak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    ttsService.speak(text);
  };

  const handleFavorite = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    onToggleFavorite(id);
  };

  if (entries.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-[250px] sm:h-[350px] text-muted-foreground">
        <img
          src="/brand/icons/search-hanzi.svg"
          alt="Search"
          className="mb-4 h-16 w-16 sm:h-20 sm:w-20"
          loading="lazy"
        />
        <p className="text-base sm:text-lg font-medium">No words found</p>
        <p className="text-xs sm:text-sm mt-1">Try a different search term or filter</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Results Info */}
      <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground px-1">
        <span>{entries.length.toLocaleString()} words total</span>
        <span className="text-[10px] sm:text-xs">Page {safeCurrentPage} of {totalPages}</span>
      </div>

      {/* Word Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
        {paginatedEntries.map((entry) => {
          const isFav = favoriteSet.has(entry.id);
          
          return (
            <div key={entry.id}>
              <Card
                className="p-3 sm:p-4 cursor-pointer hover:shadow-lg transition-all duration-200 hover:border-primary/50 group h-full overflow-hidden"
                onClick={() => onEntryClick(entry)}
              >
                <div className="flex flex-col h-full">
                  {/* Header */}
                  <div className="flex items-start justify-between gap-2 sm:gap-3">
                    <div className="flex min-w-0 flex-1 items-start gap-2 sm:gap-3">
                      {/* Character */}
                      <div className="flex-shrink-0 min-h-12 min-w-12 sm:min-h-14 sm:min-w-14 max-w-[8.5rem] px-2 sm:px-2.5 py-1.5 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
                        <span className="block text-lg sm:text-xl font-bold leading-tight text-center break-all line-clamp-2">
                          {highlightMatch(entry.hanzi, highlightQuery || '')}
                        </span>
                      </div>
                      
                      {/* Info */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
                          <span className="max-w-full text-xs sm:text-sm text-muted-foreground break-words line-clamp-1">
                            {highlightMatch(entry.pinyin, highlightQuery || '')}
                          </span>
                          {entry.hskLevel && (
                            <Badge
                              variant="secondary"
                              className={`text-[9px] sm:text-xs hsk-badge-${entry.hskLevel >= 7 ? '7' : entry.hskLevel} px-1 sm:px-2 py-0`}
                            >
                              HSK {entry.hskLevel >= 7 ? '7-9' : entry.hskLevel}
                            </Badge>
                          )}
                        </div>
                        <div className="text-xs sm:text-sm text-muted-foreground mt-0.5 line-clamp-2 break-words">
                          {highlightMatch(entry.definitions.slice(0, 2).join(', '), highlightQuery || '')}
                        </div>
                      </div>
                    </div>
                    
                    {/* Actions */}
                    <div className="flex flex-col gap-1 flex-shrink-0">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Listen to ${entry.hanzi}`}
                        className="h-7 w-7 sm:h-8 sm:w-8 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity active:scale-90"
                        onClick={(e) => handleSpeak(e, entry.hanzi)}
                      >
                        <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={isFav ? `Remove ${entry.hanzi} from favorites` : `Add ${entry.hanzi} to favorites`}
                        className="h-7 w-7 sm:h-8 sm:w-8 opacity-100 sm:opacity-60 sm:group-hover:opacity-100 transition-opacity active:scale-90"
                        onClick={(e) => handleFavorite(e, entry.id)}
                      >
                        <Heart className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Part of speech tags */}
                  {entry.partOfSpeech.length > 0 && (
                    <div className="flex gap-1 mt-2 sm:mt-3 flex-wrap">
                      {entry.partOfSpeech.slice(0, 2).map((pos, i) => (
                        <Badge key={i} variant="outline" className="text-[9px] sm:text-xs px-1.5 sm:px-2 py-0 whitespace-normal break-words">
                          {pos}
                        </Badge>
                      ))}
                    </div>
                  )}
                  
                  <div className="mt-auto pt-2 sm:pt-3 flex items-center justify-between">
                    <span />
                    <ChevronRight className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </Card>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      <Pagination
        currentPage={safeCurrentPage}
        totalPages={totalPages}
        onPageChange={handlePageChange}
        itemsPerPage={itemsPerPage}
        totalItems={entries.length}
      />
    </div>
  );
};

export default PaginatedWordList;
