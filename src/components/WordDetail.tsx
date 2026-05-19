import { lazy, Suspense, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { 
  Volume2, 
  Heart, 
  Share2, 
  BookOpen, 
  Lightbulb, 
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  GitBranch,
  MessageCircle,
  Layers,
  Puzzle,
  Info,
} from 'lucide-react';
import { toast } from 'sonner';
import { unifiedDictionary, type UnifiedEntry } from '@/services/unifiedDictionaryService';
import { ttsService } from '@/services/ttsService';

const HanziWriterComponent = lazy(() => import('./HanziWriterComponent'));
const WordGraph = lazy(() => import('./WordGraph'));

interface WordDetailProps {
  entry: UnifiedEntry;
  isFavorite: boolean;
  onToggleFavorite: () => void;
  onRelatedWordClick: (entry: UnifiedEntry) => void;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  onGoPrevious?: () => void;
  onGoNext?: () => void;
  navigationLabel?: string;
}

export const WordDetail = ({ 
  entry, 
  isFavorite, 
  onToggleFavorite,
  onRelatedWordClick,
  canGoPrevious = false,
  canGoNext = false,
  onGoPrevious,
  onGoNext,
  navigationLabel,
}: WordDetailProps) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [selectedOverviewChar, setSelectedOverviewChar] = useState(0);
  const [selectedWritingChar, setSelectedWritingChar] = useState(0);
  const wordChars = useMemo(() => entry.hanzi.split(''), [entry.hanzi]);
  const activeOverviewChar = wordChars[Math.min(selectedOverviewChar, Math.max(wordChars.length - 1, 0))] || entry.hanzi;
  const activeWritingChar = wordChars[Math.min(selectedWritingChar, Math.max(wordChars.length - 1, 0))] || entry.hanzi;
  const relatedEntries = useMemo(
    () => unifiedDictionary.getRelatedEntries(entry.hanzi),
    [entry.hanzi]
  );
  const etymologyNarrative = useMemo(() => {
    if (!entry.characterBreakdown || entry.characterBreakdown.length < 2) {
      return '';
    }

    const pieces = entry.characterBreakdown
      .map((char) => {
        const clue =
          char.etymology?.semantic ||
          char.etymology?.hint ||
          char.definition ||
          '';
        if (!clue) {
          return char.char;
        }

        return `${char.char} (${clue.replace(/\s+/g, ' ').trim()})`;
      })
      .slice(0, 4);

    if (pieces.length < 2) {
      return '';
    }

    return `${entry.hanzi} combines ${pieces.join(' + ')} into a compound used in modern HSK contexts.`;
  }, [entry.characterBreakdown, entry.hanzi]);

  const speak = (text: string) => {
    ttsService.speak(text);
  };

  // Get HSK color
  const getHSKColor = (level?: number) => {
    const colors: { [key: number]: string } = {
      1: 'bg-green-100 text-green-800 border-green-300',
      2: 'bg-blue-100 text-blue-800 border-blue-300',
      3: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      4: 'bg-orange-100 text-orange-800 border-orange-300',
      5: 'bg-purple-100 text-purple-800 border-purple-300',
      6: 'bg-pink-100 text-pink-800 border-pink-300',
    };
    return colors[level || 1] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  // Check if word has stroke data for all characters
  const hasStrokeData = entry.hanzi.split('').every(char => unifiedDictionary.hasStrokeData(char));

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <Card className="overflow-hidden">
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                {/* Main Character */}
                <h1 className="text-5xl sm:text-7xl font-bold mb-2 tracking-tight break-all">
                  {entry.hanzi}
                </h1>
                
                {/* Pinyin */}
                <div className="flex items-center gap-3 mb-3 flex-wrap">
                  <span className="text-xl sm:text-2xl text-primary font-medium">
                    {entry.pinyin}
                  </span>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => speak(entry.hanzi)}
                    className="hover:bg-primary/10"
                  >
                    <Volume2 className="w-5 h-5" />
                  </Button>
                </div>
                
                {/* Badges */}
                <div className="flex flex-wrap gap-2">
                  {entry.hskLevel && (
                    <Badge className={`${getHSKColor(entry.hskLevel)} text-sm px-3 py-1`}>
                      HSK {entry.hskLevel}
                    </Badge>
                  )}
                  {entry.strokeCount && (
                    <Badge variant="outline" className="text-sm">
                      {entry.strokeCount} strokes
                    </Badge>
                  )}
                  {entry.radical && (
                    <Badge variant="outline" className="text-sm">
                      Radical: {entry.radical}
                    </Badge>
                  )}
                  {!hasStrokeData && (
                    <Badge variant="secondary" className="text-xs">
                      <Info className="w-3 h-3 mr-1" />
                      Limited stroke data
                    </Badge>
                  )}
                </div>
              </div>
              
              {/* Actions */}
              <div className="flex flex-col items-end gap-2 flex-shrink-0">
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onToggleFavorite}
                    className={isFavorite ? 'bg-red-50 border-red-200' : ''}
                    title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Copy to clipboard"
                    onClick={async () => {
                      const text = `${entry.hanzi} (${entry.pinyin}) — ${entry.definitions.join('; ')}`;
                      try {
                        if (navigator.share) {
                          await navigator.share({ title: `OpenHSK — ${entry.hanzi}`, text, url: window.location.href });
                        } else if (navigator.clipboard) {
                          await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
                          toast.success('Copied to clipboard');
                        }
                      } catch {
                        // User cancelled or share failed
                      }
                    }}
                  >
                    <Share2 className="w-5 h-5" />
                  </Button>
                </div>

                {(onGoPrevious || onGoNext) && (
                  <div className="flex flex-col items-end gap-1">
                    {navigationLabel && (
                      <span className="text-xs text-muted-foreground">{navigationLabel}</span>
                    )}
                    <div className="flex gap-1">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onGoPrevious}
                        disabled={!canGoPrevious}
                      >
                        <ChevronLeft className="w-4 h-4 mr-1" />
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={onGoNext}
                        disabled={!canGoNext}
                      >
                        Next
                        <ChevronRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Definitions */}
          <CardContent className="pt-4">
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                Definitions
              </h3>
              <div className="flex flex-wrap gap-2">
                {entry.definitions.map((def, i) => (
                  <Badge 
                    key={i} 
                    variant="secondary" 
                    className="text-sm sm:text-base px-3 py-1.5 font-normal max-w-full whitespace-normal break-words"
                  >
                    {i + 1}. {def}
                  </Badge>
                ))}
              </div>
            </div>
            
            {/* Part of Speech */}
            {entry.partOfSpeech.length > 0 && (
              <div className="mt-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  Part of Speech
                </h3>
                <div className="flex flex-wrap gap-2">
                  {entry.partOfSpeech.map((pos, i) => (
                    <Badge key={i} variant="outline" className="capitalize">
                      {pos}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>

      {/* Character Breakdown for Multi-Character Words */}
      {entry.characterBreakdown && entry.characterBreakdown.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Puzzle className="w-5 h-5" />
                Character Breakdown
              </CardTitle>
              <CardDescription>
                Learn the individual characters that make up this word
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                {entry.characterBreakdown.map((char, idx) => (
                  <motion.div
                    key={`${char.char}-${idx}`}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card 
                      className="p-0 overflow-hidden hover:shadow-md transition-shadow cursor-pointer border-l-4 border-l-primary/40"
                      onClick={() => {
                        const found = unifiedDictionary.getEntryByHanzi(char.char);
                        if (found) onRelatedWordClick(found);
                      }}
                    >
                      <div className="p-3 text-center">
                        <div className="text-3xl sm:text-4xl font-bold mb-1">{char.char}</div>
                        <div className="text-sm text-primary font-medium">{char.pinyin}</div>
                      </div>
                      <div className="px-3 pb-3 space-y-1">
                        {char.definition && (
                          <div className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                            {char.definition}
                          </div>
                        )}
                        <div className="flex items-center justify-between text-[10px] text-muted-foreground/70 pt-1">
                          {char.radical && <span>Radical: {char.radical}</span>}
                          {char.strokeCount ? <span>{char.strokeCount} strokes</span> : null}
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">
            <BookOpen className="w-4 h-4 mr-1 sm:mr-2" /> 
            <span className="hidden sm:inline">Overview</span>
            <span className="sm:hidden">Info</span>
          </TabsTrigger>
          <TabsTrigger value="writing" className="text-xs sm:text-sm py-2">
            <Layers className="w-4 h-4 mr-1 sm:mr-2" /> 
            <span className="hidden sm:inline">Writing</span>
            <span className="sm:hidden">Write</span>
          </TabsTrigger>
          <TabsTrigger value="examples" className="text-xs sm:text-sm py-2">
            <MessageCircle className="w-4 h-4 mr-1 sm:mr-2" /> 
            <span className="hidden sm:inline">Examples</span>
            <span className="sm:hidden">Ex</span>
          </TabsTrigger>
          <TabsTrigger value="related" className="text-xs sm:text-sm py-2">
            <GitBranch className="w-4 h-4 mr-1 sm:mr-2" /> 
            <span className="hidden sm:inline">Related</span>
            <span className="sm:hidden">Rel</span>
          </TabsTrigger>
          <TabsTrigger value="etymology" className="text-xs sm:text-sm py-2">
            <Lightbulb className="w-4 h-4 mr-1 sm:mr-2" /> 
            <span className="hidden sm:inline">Etymology</span>
            <span className="sm:hidden">Origin</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Stroke Animation */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Stroke Order</CardTitle>
                {wordChars.length > 1 && (
                  <CardDescription>
                    Select one character to preview detailed stroke order.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                {wordChars.length > 1 && (
                  <div className="flex flex-wrap justify-center gap-2">
                    {wordChars.map((char, idx) => (
                      <Button
                        key={`${char}-${idx}`}
                        variant={idx === selectedOverviewChar ? 'default' : 'outline'}
                        size="sm"
                        className="min-w-10"
                        onClick={() => setSelectedOverviewChar(idx)}
                      >
                        {char}
                      </Button>
                    ))}
                  </div>
                )}

                <div className="flex justify-center">
                  <Suspense fallback={<div className="text-sm text-muted-foreground">Loading stroke animation...</div>}>
                    <HanziWriterComponent 
                      character={activeOverviewChar}
                      size={220}
                      showQuiz={false}
                    />
                  </Suspense>
                </div>

                {wordChars.length > 1 && (
                  <p className="text-xs text-center text-muted-foreground">
                    Showing stroke order for: <span className="font-medium">{activeOverviewChar}</span>
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Word Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {entry.decomposition && entry.hanzi.length === 1 && (
                  <div>
                    <span className="text-sm text-muted-foreground">Decomposition:</span>
                    <div className="font-mono text-lg mt-1">{entry.decomposition}</div>
                  </div>
                )}
                
                {entry.usageNotes && (
                  <div>
                    <span className="text-sm text-muted-foreground">Usage:</span>
                    <p className="mt-1 break-words">{entry.usageNotes}</p>
                  </div>
                )}
                
                {entry.mnemonic && (
                  <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                    <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                      <Lightbulb className="w-4 h-4" /> Memory Aid
                    </span>
                    <p className="mt-1 text-sm break-words">{entry.mnemonic}</p>
                  </div>
                )}
                
                {entry.commonMistakes && entry.commonMistakes.length > 0 && (
                  <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                    <span className="text-sm font-medium text-red-700 dark:text-red-300 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4" /> Common Mistakes
                    </span>
                    <ul className="mt-1 text-sm list-disc list-inside">
                      {entry.commonMistakes.map((mistake, i) => (
                        <li key={i} className="break-words">{mistake}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Collocations */}
          {entry.collocations.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Common Collocations</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {entry.collocations.map((col, i) => (
                    <Badge key={i} variant="outline" className="text-sm px-3 py-1 max-w-full whitespace-normal break-words">
                      {col}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Writing Tab */}
        <TabsContent value="writing">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                Character Writing Practice
              </CardTitle>
              <CardDescription>
                Use animate, loop, and practice mode without opening multiple large stroke panes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {wordChars.length > 1 && (
                <div className="flex flex-wrap justify-center gap-2">
                  {wordChars.map((char, idx) => (
                    <Button
                      key={`write-${char}-${idx}`}
                      variant={idx === selectedWritingChar ? 'default' : 'outline'}
                      size="sm"
                      className="min-w-10"
                      onClick={() => setSelectedWritingChar(idx)}
                    >
                      {char}
                    </Button>
                  ))}
                </div>
              )}

              <div className="flex justify-center">
                <Suspense fallback={<div className="text-sm text-muted-foreground">Loading writing practice...</div>}>
                  <HanziWriterComponent
                    character={activeWritingChar}
                    size={230}
                    showQuiz={true}
                  />
                </Suspense>
              </div>

              {wordChars.length > 1 && (
                <p className="text-xs text-center text-muted-foreground">
                  Practicing: <span className="font-medium">{activeWritingChar}</span>
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Examples Tab */}
        <TabsContent value="examples">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Example Sentences</CardTitle>
              <CardDescription>{entry.examples.length} example{entry.examples.length !== 1 ? 's' : ''} from HSK and Tatoeba</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {entry.examples.length > 0 ? (
                entry.examples.map((example, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.06, 0.3) }}
                    className="rounded-xl border border-border/60 hover:border-primary/30 hover:shadow-sm transition-all bg-card"
                  >
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-lg font-medium break-words leading-relaxed">{example.chinese}</p>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={() => speak(example.chinese)}
                          className="flex-shrink-0 h-8 w-8"
                        >
                          <Volume2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-primary/80 break-words italic">{example.pinyin}</p>
                      <p className="text-sm text-muted-foreground break-words leading-relaxed">{example.english}</p>
                    </div>
                    <div className="px-4 py-2 border-t bg-muted/30 rounded-b-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize h-5">
                          {example.difficulty}
                        </Badge>
                        {example.source && (
                          <span className="text-[10px] text-muted-foreground">
                            {example.sourceUrl ? (
                              <a href={example.sourceUrl} target="_blank" rel="noreferrer" className="underline hover:text-primary">
                                {example.source}
                              </a>
                            ) : (
                              example.source
                            )}
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums">#{i + 1}</span>
                    </div>
                  </motion.div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  No examples available for this word.
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Related Tab */}
        <TabsContent value="related" className="space-y-4">
          {/* Synonyms & Antonyms */}
          {(entry.synonyms.length > 0 || entry.antonyms.length > 0 || entry.wordFamily.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Related Words</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {entry.synonyms.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Synonyms</h4>
                    <div className="flex flex-wrap gap-2">
                      {entry.synonyms.map((syn, i) => (
                        <Button
                          key={`syn-${i}`}
                          variant="outline"
                          size="sm"
                          className="h-auto py-1.5 px-3 text-sm gap-1.5"
                          onClick={() => {
                            const found = unifiedDictionary.getEntryByHanzi(syn.hanzi);
                            if (found) onRelatedWordClick(found);
                          }}
                        >
                          <span className="font-medium">{syn.hanzi}</span>
                          {syn.pinyin && <span className="text-xs text-muted-foreground">{syn.pinyin}</span>}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {entry.antonyms.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Antonyms</h4>
                    <div className="flex flex-wrap gap-2">
                      {entry.antonyms.map((ant, i) => (
                        <Button
                          key={`ant-${i}`}
                          variant="outline"
                          size="sm"
                          className="h-auto py-1.5 px-3 text-sm gap-1.5 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/30"
                          onClick={() => {
                            const found = unifiedDictionary.getEntryByHanzi(ant.hanzi);
                            if (found) onRelatedWordClick(found);
                          }}
                        >
                          <span className="font-medium">{ant.hanzi}</span>
                          {ant.pinyin && <span className="text-xs text-muted-foreground">{ant.pinyin}</span>}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
                {entry.wordFamily.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-muted-foreground mb-2">Word Family</h4>
                    <div className="flex flex-wrap gap-2">
                      {entry.wordFamily.map((w, i) => (
                        <Button
                          key={`fam-${i}`}
                          variant="outline"
                          size="sm"
                          className="h-auto py-1.5 px-3 text-sm gap-1.5 border-blue-200 hover:bg-blue-50 dark:hover:bg-blue-950/30"
                          onClick={() => {
                            const found = unifiedDictionary.getEntryByHanzi(w.hanzi);
                            if (found) onRelatedWordClick(found);
                          }}
                        >
                          <span className="font-medium">{w.hanzi}</span>
                          {w.pinyin && <span className="text-xs text-muted-foreground">{w.pinyin}</span>}
                        </Button>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Visual Graph</CardTitle>
              <CardDescription>
                Click on any word to see details, double-click to open it
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Suspense fallback={<div className="text-sm text-muted-foreground">Loading relationship graph...</div>}>
                {activeTab === 'related' ? (
                  <WordGraph
                    entry={entry}
                    relatedEntries={relatedEntries}
                    onNodeClick={onRelatedWordClick}
                    onNodeDoubleClick={onRelatedWordClick}
                  />
                ) : null}
              </Suspense>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Etymology Tab */}
        <TabsContent value="etymology">
          <div className="space-y-4">
            {/* Single Character Etymology */}
            {entry.hanzi.length === 1 && entry.etymology && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Character Etymology</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="text-sm">
                      {entry.etymology.type === 'ideographic' ? 'Ideographic' : 'Pictophonetic'}
                    </Badge>
                  </div>
                  
                  {entry.etymology.hint && (
                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-700 dark:text-blue-300 mb-2">
                        Origin & Meaning
                      </h4>
                      <p className="break-words">{entry.etymology.hint}</p>
                    </div>
                  )}
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {entry.etymology.phonetic && (
                      <div className="p-3 border rounded-lg">
                        <span className="text-sm text-muted-foreground">Phonetic Component:</span>
                        <p className="text-lg font-medium">{entry.etymology.phonetic}</p>
                      </div>
                    )}
                    {entry.etymology.semantic && (
                      <div className="p-3 border rounded-lg">
                        <span className="text-sm text-muted-foreground">Semantic Component:</span>
                        <p className="text-lg font-medium">{entry.etymology.semantic}</p>
                      </div>
                    )}
                  </div>
                  
                  {entry.decomposition && (
                    <>
                      <Separator />
                      <div>
                        <h4 className="font-medium mb-2">Character Decomposition</h4>
                        <div className="font-mono text-lg p-3 bg-muted rounded-lg">
                          {entry.decomposition}
                        </div>
                        <p className="text-sm text-muted-foreground mt-2">
                          This shows how the character is structured. Each symbol represents a structural relationship:
                          ⿰ (left-right), ⿱ (top-bottom), ⿴ (surround), etc.
                        </p>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* Multi-Character Word Etymology */}
            {entry.hanzi.length > 1 && entry.characterBreakdown && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Character Etymologies</CardTitle>
                  <CardDescription>
                    Etymology information for each character in this word
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {etymologyNarrative && (
                    <div className="rounded-lg border bg-muted/30 p-3">
                      <p className="text-sm break-words">{etymologyNarrative}</p>
                    </div>
                  )}

                  {entry.characterBreakdown.map((char, idx) => (
                    char.etymology && (
                      <div key={`${char.char}-ety-${idx}`} className="border rounded-lg p-4">
                        <div className="flex items-center gap-3 mb-3">
                          <span className="text-3xl font-bold">{char.char}</span>
                          <div>
                            <div className="text-sm text-muted-foreground">{char.pinyin}</div>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {char.etymology.type === 'ideographic' ? 'Ideographic' : 'Pictophonetic'}
                            </Badge>
                          </div>
                        </div>
                        
                        {char.etymology.hint && (
                          <p className="text-sm mb-2 break-words">{char.etymology.hint}</p>
                        )}
                        
                        <div className="flex flex-wrap gap-2 text-xs">
                          {char.etymology.phonetic && (
                            <span className="px-2 py-1 bg-muted rounded">
                              Phonetic: {char.etymology.phonetic}
                            </span>
                          )}
                          {char.etymology.semantic && (
                            <span className="px-2 py-1 bg-muted rounded">
                              Semantic: {char.etymology.semantic}
                            </span>
                          )}
                        </div>
                      </div>
                    )
                  ))}
                  
                  {!entry.characterBreakdown.some(c => c.etymology) && (
                    <div className="text-center text-muted-foreground py-8">
                      No etymology data available for the characters in this word.
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            
            {/* No Etymology Message */}
            {!entry.etymology && (!entry.characterBreakdown || !entry.characterBreakdown.some(c => c.etymology)) && (
              <Card>
                <CardContent className="py-12 text-center">
                  <Lightbulb className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No etymology data available for this word.</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    Etymology data is currently available for approximately 85% of single characters.
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WordDetail;
