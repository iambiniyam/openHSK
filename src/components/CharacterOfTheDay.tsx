import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
    // Get today's date as seed for consistent daily character
    const today = new Date();
    const dateString = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;

    // Use date to select a character (pseudo-random but consistent for the day)
    const allEntries = unifiedDictionary.getAllEntries();
    if (allEntries.length === 0) {
      return null;
    }

    const seed = dateString.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const index = seed % allEntries.length;

    // Prefer single characters or common words
    const candidates = allEntries.filter((e) =>
      e.hskLevel && e.hskLevel <= 4 && e.examples.length > 0
    );
    const candidateIndex = candidates.length > 0 ? seed % candidates.length : -1;

    return candidates[candidateIndex] || allEntries[index];
  }, []);

  const [dailyChar, setDailyChar] = useState<UnifiedEntry | null>(() => pickDailyCharacter());
  const [showHint, setShowHint] = useState(false);

  const loadDailyCharacter = useCallback(() => {
    setDailyChar(pickDailyCharacter());
    setShowHint(false);
  }, [pickDailyCharacter]);

  const speak = (text: string) => {
    ttsService.speak(text);
  };

  if (!dailyChar) return null;

  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-amber-500/10 to-orange-500/10">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-500" />
            <CardTitle className="text-lg">Character of the Day</CardTitle>
          </div>
          <Button variant="ghost" size="sm" onClick={loadDailyCharacter}>
            <RotateCcw className="w-4 h-4 mr-1" />
            New
          </Button>
        </div>
        <CardDescription>Learn a new character every day</CardDescription>
      </CardHeader>
      
      <CardContent className="p-6">
        <div className="flex flex-col sm:flex-row items-center gap-6">
          {/* Large Character */}
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center"
          >
            <div 
              className="text-8xl sm:text-9xl font-bold bg-gradient-to-br from-primary to-primary/70 bg-clip-text text-transparent cursor-pointer hover:scale-105 transition-transform"
              onClick={() => onViewDetails(dailyChar)}
            >
              {dailyChar.hanzi}
            </div>
          </motion.div>
          
          {/* Details */}
          <div className="flex-1 space-y-4 text-center sm:text-left">
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-3 mb-2">
                <span className="text-2xl text-primary font-medium break-words">{dailyChar.pinyin}</span>
                <Button variant="ghost" size="icon" onClick={() => speak(dailyChar.hanzi)}>
                  <Volume2 className="w-5 h-5" />
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
                {dailyChar.hskLevel && (
                  <Badge variant="outline" className={`hsk-badge-${dailyChar.hskLevel}`}>
                    HSK {dailyChar.hskLevel}
                  </Badge>
                )}
                {dailyChar.strokeCount && (
                  <Badge variant="outline">{dailyChar.strokeCount} strokes</Badge>
                )}
              </div>
            </div>
            
            <div className="space-y-2">
              <p className="text-lg break-words">{dailyChar.definitions.slice(0, 2).join(', ')}</p>
              
              {dailyChar.mnemonic && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: showHint ? 1 : 0, height: showHint ? 'auto' : 0 }}
                  className="overflow-hidden"
                >
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg flex items-start gap-2">
                    <Lightbulb className="w-5 h-5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                    <p className="text-sm text-yellow-800 dark:text-yellow-200 break-words">{dailyChar.mnemonic}</p>
                  </div>
                </motion.div>
              )}
            </div>
            
            <div className="flex flex-wrap gap-2 justify-center sm:justify-start">
              {dailyChar.mnemonic && (
                <Button variant="outline" size="sm" onClick={() => setShowHint(!showHint)}>
                  <Lightbulb className="w-4 h-4 mr-1" />
                  {showHint ? 'Hide Hint' : 'Show Hint'}
                </Button>
              )}
              <Button size="sm" onClick={() => onViewDetails(dailyChar)}>
                View Details
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </div>
          </div>
        </div>
        
        {/* Example */}
        {dailyChar.examples.length > 0 && (
          <div className="mt-6 pt-4 border-t">
            <p className="text-sm text-muted-foreground mb-2">Example:</p>
            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-lg break-words">{dailyChar.examples[0].chinese}</p>
              <p className="text-sm text-primary break-words">{dailyChar.examples[0].pinyin}</p>
              <p className="text-sm text-muted-foreground break-words">{dailyChar.examples[0].english}</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default CharacterOfTheDay;
