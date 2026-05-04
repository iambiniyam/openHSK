import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Volume2, Lightbulb, ChevronRight, Sparkles, RotateCcw } from 'lucide-react';
import { ttsService } from '@/services/ttsService';
import { unifiedDictionary, type UnifiedEntry } from '@/services/unifiedDictionaryService';

interface CharacterOfTheDayProps {
  onViewDetails: (entry: UnifiedEntry) => void;
}

export const CharacterOfTheDay = ({ onViewDetails }: CharacterOfTheDayProps) => {
  const pickDailyCharacter = useCallback((): UnifiedEntry | null => {
    const today = new Date();
    const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
    const allEntries = unifiedDictionary.getAllEntries();
    if (allEntries.length === 0) return null;

    const seed = dateString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const candidates = allEntries.filter((e) => e.hskLevel && e.hskLevel <= 4 && e.examples.length > 0);
    const candidateIndex = candidates.length > 0 ? seed % candidates.length : -1;
    return candidates[candidateIndex] || allEntries[seed % allEntries.length];
  }, []);

  const [dailyChar, setDailyChar] = useState<UnifiedEntry | null>(() => pickDailyCharacter());
  const [showHint, setShowHint] = useState(false);

  const loadDailyCharacter = useCallback(() => {
    setDailyChar(pickDailyCharacter());
    setShowHint(false);
  }, [pickDailyCharacter]);

  const speak = (text: string) => ttsService.speak(text);

  if (!dailyChar) return null;

  return (
    <Card className="overflow-hidden border-primary/10 bg-gradient-to-br from-card to-card/95 relative">
      {/* Decorative background */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-primary/3 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none" />
      
      <CardContent className="p-5 sm:p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-amber-500/10">
              <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-semibold tracking-tight">Character of the Day</span>
          </div>
          <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={loadDailyCharacter}>
            <RotateCcw className="w-3 h-3" />
            New
          </Button>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-5 sm:gap-6">
          {/* Large Character */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 15 }}
            className="text-center shrink-0 overflow-hidden"
          >
            <button
              className="text-7xl sm:text-8xl font-bold bg-gradient-to-br from-primary via-primary to-amber-500 bg-clip-text text-transparent hover:scale-105 transition-transform duration-300 cursor-pointer leading-none block mx-auto"
              onClick={() => onViewDetails(dailyChar)}
              aria-label={`View details for ${dailyChar.hanzi}`}
            >
              {dailyChar.hanzi}
            </button>
          </motion.div>

          {/* Details */}
          <div className="flex-1 space-y-3 text-center sm:text-left min-w-0">
            <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
              <span className="text-xl sm:text-2xl text-primary font-medium font-cn">{dailyChar.pinyin}</span>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={() => speak(dailyChar.hanzi)} aria-label="Listen">
                <Volume2 className="w-4 h-4" />
              </Button>
            </div>

            <div className="flex flex-wrap gap-1.5 justify-center sm:justify-start">
              {dailyChar.hskLevel && (
                <Badge variant="outline" className={`hsk-badge-${dailyChar.hskLevel} text-xs`}>
                  HSK {dailyChar.hskLevel}
                </Badge>
              )}
              {dailyChar.strokeCount && (
                <Badge variant="outline" className="text-xs bg-muted/50">
                  {dailyChar.strokeCount} strokes
                </Badge>
              )}
            </div>

            <p className="text-base text-muted-foreground leading-snug break-words">
              {dailyChar.definitions.slice(0, 2).join(', ')}
            </p>

            {dailyChar.mnemonic && (
              <motion.div
                initial={false}
                animate={{ opacity: showHint ? 1 : 0, height: showHint ? 'auto' : 0 }}
                className="overflow-hidden"
              >
                <div className="bg-amber-50 dark:bg-amber-900/15 p-3 rounded-xl flex items-start gap-2 border border-amber-200/50 dark:border-amber-800/30">
                  <Lightbulb className="w-4 h-4 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                  <p className="text-sm text-amber-800 dark:text-amber-200 break-words">{dailyChar.mnemonic}</p>
                </div>
              </motion.div>
            )}

            <div className="flex flex-wrap gap-2 justify-center sm:justify-start pt-1">
              {dailyChar.mnemonic && (
                <Button variant="outline" size="sm" className="h-8 text-xs rounded-lg" onClick={() => setShowHint(!showHint)}>
                  <Lightbulb className="w-3.5 h-3.5 mr-1.5" />
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </Button>
              )}
              <Button size="sm" className="h-8 text-xs rounded-lg gap-1" onClick={() => onViewDetails(dailyChar)}>
                View Details
                <ChevronRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Example */}
        {dailyChar.examples.length > 0 && (
          <div className="mt-5 pt-4 border-t border-border/40">
            <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium mb-2">Example</p>
            <div className="bg-muted/40 p-3 sm:p-4 rounded-xl border border-border/30">
              <p className="text-base sm:text-lg break-words font-cn">{dailyChar.examples[0].chinese}</p>
              <p className="text-sm text-primary/80 break-words mt-1">{dailyChar.examples[0].pinyin}</p>
              <p className="text-sm text-muted-foreground break-words mt-0.5">{dailyChar.examples[0].english}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CharacterOfTheDay;
