import { useRef, useEffect, useState } from 'react';
import { List, useListRef } from 'react-window';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Volume2, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
import { ttsService } from '@/services/ttsService';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';
import type { CSSProperties, ReactElement } from 'react';

interface VirtualizedWordListProps {
  entries: UnifiedEntry[];
  favoriteIds: string[];
  onEntryClick: (entry: UnifiedEntry) => void;
  onToggleFavorite: (id: string) => void;
}

interface RowProps {
  entries: UnifiedEntry[];
  favoriteIds: string[];
  onEntryClick: (entry: UnifiedEntry) => void;
  onToggleFavorite: (id: string) => void;
}

interface RowComponentProps {
  index: number;
  style: CSSProperties;
  ariaAttributes: {
    'aria-posinset': number;
    'aria-setsize': number;
    role: 'listitem';
  };
}

// Row component for the list
const Row = ({ index, style, ariaAttributes, ...data }: RowComponentProps & RowProps): ReactElement | null => {
  const { entries, favoriteIds, onEntryClick, onToggleFavorite } = data;
  const entry = entries[index];
  if (!entry) return null;
  
  const isFav = favoriteIds.includes(entry.id);
  
  const handleSpeak = (e: React.MouseEvent) => {
    e.stopPropagation();
    ttsService.speak(entry.hanzi);
  };
  
  const handleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    onToggleFavorite(entry.id);
  };

  return (
    <div style={style} className="px-2 sm:px-3 py-1" {...ariaAttributes}>
      <Card 
        className="p-2.5 sm:p-3 cursor-pointer hover:shadow-md transition-all duration-200 hover:border-primary/50 group h-full overflow-hidden"
        onClick={() => onEntryClick(entry)}
      >
        <div className="flex items-start gap-2.5 sm:gap-3 h-full">
          {/* Character */}
          <div className="flex-shrink-0 min-h-11 min-w-11 sm:min-h-12 sm:min-w-12 max-w-[7.5rem] px-2 sm:px-2.5 py-1 flex items-center justify-center bg-gradient-to-br from-primary/10 to-primary/5 rounded-xl">
            <span className="block text-base sm:text-lg font-bold leading-tight text-center break-all line-clamp-2">{entry.hanzi}</span>
          </div>
          
          {/* Info - with proper overflow handling */}
          <div className="flex-1 min-w-0 overflow-hidden pt-0.5">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs sm:text-sm text-muted-foreground break-words line-clamp-1">{entry.pinyin}</span>
              {entry.hskLevel && (
                <Badge 
                  variant="secondary" 
                  className={`text-[10px] sm:text-xs hsk-badge-${entry.hskLevel >= 7 ? '7' : entry.hskLevel} px-1.5 sm:px-2 py-0 flex-shrink-0`}
                >
                  HSK {entry.hskLevel >= 7 ? '7-9' : entry.hskLevel}
                </Badge>
              )}
            </div>
            <div className="text-xs sm:text-sm text-muted-foreground line-clamp-1 break-words mt-0.5">
              {entry.definitions.slice(0, 2).join(', ')}
            </div>
            
            {/* Part of speech tags */}
            {entry.partOfSpeech.length > 0 && (
              <div className="hidden sm:flex gap-1 mt-1.5 flex-wrap">
                {entry.partOfSpeech.slice(0, 2).map((pos, i) => (
                  <Badge key={i} variant="outline" className={`text-[10px] sm:text-xs px-1.5 py-0 ${i === 1 ? 'hidden md:inline-flex' : ''}`}>
                    {pos}
                  </Badge>
                ))}
              </div>
            )}
          </div>
          
          {/* Actions */}
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity"
              onClick={handleSpeak}
            >
              <Volume2 className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 opacity-60 group-hover:opacity-100 transition-opacity"
              onClick={handleFavorite}
            >
              <Heart className={`w-4 h-4 ${isFav ? 'fill-red-500 text-red-500' : ''}`} />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export const VirtualizedWordList = ({
  entries,
  favoriteIds,
  onEntryClick,
  onToggleFavorite
}: VirtualizedWordListProps) => {
  const listRef = useListRef(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerHeight, setContainerHeight] = useState(500);
  const [itemHeight, setItemHeight] = useState(80);

  // Update dimensions based on screen size - responsive
  useEffect(() => {
    const updateDimensions = () => {
      const width = window.innerWidth;
      const isMobile = width < 640;
      const isTablet = width >= 640 && width < 1024;
      
      // Responsive item height
      setItemHeight(isMobile ? 90 : isTablet ? 94 : 98);
      
      // Calculate available height dynamically
      const headerHeight = 64; // Header height
      const searchBarHeight = isMobile ? 128 : 154; // Search bar approx height
      const padding = isMobile ? 100 : 120; // Bottom padding + mobile nav
      const availableHeight = window.innerHeight - headerHeight - searchBarHeight - padding;
      
      setContainerHeight(Math.max(300, Math.min(availableHeight, 800)));
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    
    // Also update on orientation change for mobile
    window.addEventListener('orientationchange', updateDimensions);
    
    return () => {
      window.removeEventListener('resize', updateDimensions);
      window.removeEventListener('orientationchange', updateDimensions);
    };
  }, []);

  // Scroll to top when entries change (with small delay for smoother UX)
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (listRef.current) {
        listRef.current.scrollToRow({ index: 0 });
      }
    }, 50);
    return () => clearTimeout(timeout);
  }, [entries.length, listRef]);

  const rowProps: RowProps = {
    entries,
    favoriteIds,
    onEntryClick,
    onToggleFavorite
  };

  if (entries.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col items-center justify-center h-[250px] sm:h-[350px] text-muted-foreground"
      >
        <img
          src="/brand/icons/search-hanzi.svg"
          alt="Search"
          className="mb-4 h-16 w-16 sm:h-20 sm:w-20"
          loading="lazy"
        />
        <p className="text-base sm:text-lg font-medium">No words found</p>
        <p className="text-xs sm:text-sm mt-1">Try a different search term or filter</p>
      </motion.div>
    );
  }

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="flex items-center justify-between text-xs sm:text-sm text-muted-foreground mb-2 px-2">
        <span>Showing {entries.length.toLocaleString()} words</span>
        {entries.length > 100 && (
          <span className="text-[10px] sm:text-xs">Scroll to see more</span>
        )}
      </div>
      <List
        listRef={listRef}
        rowComponent={Row}
        rowProps={rowProps}
        rowCount={entries.length}
        rowHeight={itemHeight}
        overscanCount={5}
        style={{ height: containerHeight }}
        className="scrollbar-thin scrollbar-thumb-primary/20 scrollbar-track-transparent"
      />
    </div>
  );
};

export default VirtualizedWordList;
