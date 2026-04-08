import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Heart, Trash2, Volume2, ExternalLink } from 'lucide-react';
import { ttsService } from '@/services/ttsService';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';

interface FavoritesListProps {
  entries: UnifiedEntry[];
  favoriteIds: string[];
  onRemoveFavorite: (id: string) => void;
  onEntryClick: (entry: UnifiedEntry) => void;
  onClearAll: () => void;
}

export const FavoritesList = ({ 
  entries, 
  favoriteIds, 
  onRemoveFavorite, 
  onEntryClick,
  onClearAll 
}: FavoritesListProps) => {
  const favorites = useMemo(
    () => entries.filter((e) => favoriteIds.includes(e.id)),
    [entries, favoriteIds]
  );

  const speak = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    ttsService.speak(text);
  };

  if (favorites.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Heart className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium mb-2">No Favorites Yet</h3>
          <p className="text-sm text-muted-foreground">
            Click the heart icon on any word to add it to your favorites.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <Heart className="w-5 h-5 text-red-500 fill-red-500" />
          Favorites ({favorites.length})
        </CardTitle>
        <Button variant="ghost" size="sm" onClick={onClearAll}>
          <Trash2 className="w-4 h-4 mr-2" />
          Clear All
        </Button>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[400px]">
          <div className="space-y-2">
            {favorites.map((entry) => (
              <div
                key={entry.id}
                className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors cursor-pointer group"
                onClick={() => onEntryClick(entry)}
              >
                <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-muted rounded-lg">
                  <span className="text-xl font-bold">{entry.hanzi}</span>
                </div>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{entry.pinyin}</span>
                    {entry.hskLevel && (
                      <Badge variant="secondary" className="text-xs">HSK {entry.hskLevel}</Badge>
                    )}
                  </div>
                  <div className="text-sm text-muted-foreground truncate">
                    {entry.definitions.slice(0, 2).join(', ')}
                  </div>
                </div>

                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => speak(e, entry.hanzi)}
                  >
                    <Volume2 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemoveFavorite(entry.id);
                    }}
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                  </Button>
                  <Button variant="ghost" size="icon">
                    <ExternalLink className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};

export default FavoritesList;
