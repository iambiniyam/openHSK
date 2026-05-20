import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Volume2, Heart, Share2, BookOpen, MessageCircle, GitBranch,
  ChevronLeft, ChevronRight, Lightbulb, AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';
import { unifiedDictionary, type UnifiedEntry } from '@/services/unifiedDictionaryService';
import { ttsService } from '@/services/ttsService';

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

  const speak = (text: string) => ttsService.speak(text);

  const getHSKColor = (level: number) => {
    const colors: Record<number, string> = {
      1: 'bg-green-100 text-green-800 border-green-300',
      2: 'bg-blue-100 text-blue-800 border-blue-300',
      3: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      4: 'bg-orange-100 text-orange-800 border-orange-300',
      5: 'bg-purple-100 text-purple-800 border-purple-300',
      6: 'bg-pink-100 text-pink-800 border-pink-300',
    };
    return colors[level || 1] || 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <Card className="overflow-hidden">
        <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-4 sm:p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-5xl sm:text-7xl font-bold mb-2 tracking-tight break-all">
                {entry.hanzi}
              </h1>
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
              <div className="flex flex-wrap gap-2">
                {entry.hskLevel && (
                  <Badge className={`${getHSKColor(entry.hskLevel)} text-sm px-3 py-1`}>
                    HSK {entry.hskLevel}
                  </Badge>
                )}
              </div>
            </div>

            <div className="flex flex-col items-end gap-2 flex-shrink-0">
              <div className="flex gap-2">
                <Button variant="outline" size="icon" onClick={onToggleFavorite}
                  className={isFavorite ? 'bg-red-50 border-red-200' : ''}
                  title={isFavorite ? 'Remove from favorites' : 'Add to favorites'}>
                  <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
                </Button>
                <Button variant="outline" size="icon" title="Copy to clipboard"
                  onClick={async () => {
                    const text = `${entry.hanzi} (${entry.pinyin}) — ${entry.definitions.join('; ')}`;
                    try {
                      if (navigator.share) {
                        await navigator.share({ title: `OpenHSK — ${entry.hanzi}`, text, url: window.location.href });
                      } else if (navigator.clipboard) {
                        await navigator.clipboard.writeText(`${text}\n${window.location.href}`);
                        toast.success('Copied to clipboard');
                      }
                    } catch { /* user cancelled */ }
                  }}>
                  <Share2 className="w-5 h-5" />
                </Button>
              </div>

              {(onGoPrevious || onGoNext) && (
                <div className="flex flex-col items-end gap-1">
                  {navigationLabel && (
                    <span className="text-xs text-muted-foreground">{navigationLabel}</span>
                  )}
                  <div className="flex gap-1">
                    <Button variant="outline" size="sm" onClick={onGoPrevious} disabled={!canGoPrevious}>
                      <ChevronLeft className="w-4 h-4 mr-1" /> Previous
                    </Button>
                    <Button variant="outline" size="sm" onClick={onGoNext} disabled={!canGoNext}>
                      Next <ChevronRight className="w-4 h-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <CardContent className="pt-4">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Definitions</h3>
            <div className="flex flex-wrap gap-2">
              {entry.definitions.map((def, i) => (
                <Badge key={i} variant="secondary" className="text-sm sm:text-base px-3 py-1.5 font-normal max-w-full whitespace-normal break-words">
                  {i + 1}. {def}
                </Badge>
              ))}
            </div>
          </div>
          {entry.partOfSpeech.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Part of Speech</h3>
              <div className="flex flex-wrap gap-2">
                {entry.partOfSpeech.map((pos, i) => (
                  <Badge key={i} variant="outline" className="capitalize">{pos}</Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto">
          <TabsTrigger value="overview" className="text-xs sm:text-sm py-2">
            <BookOpen className="w-4 h-4 mr-1 sm:mr-2" />
            <span>Overview</span>
          </TabsTrigger>
          <TabsTrigger value="examples" className="text-xs sm:text-sm py-2">
            <MessageCircle className="w-4 h-4 mr-1 sm:mr-2" />
            <span>Examples</span>
          </TabsTrigger>
          <TabsTrigger value="related" className="text-xs sm:text-sm py-2">
            <GitBranch className="w-4 h-4 mr-1 sm:mr-2" />
            <span>Related</span>
          </TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          {entry.usageNotes && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Usage</CardTitle></CardHeader>
              <CardContent><p className="break-words">{entry.usageNotes}</p></CardContent>
            </Card>
          )}

          {entry.mnemonic && (
            <Card>
              <CardContent className="p-4">
                <div className="bg-yellow-50 dark:bg-yellow-900/20 p-3 rounded-lg">
                  <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" /> Memory Aid
                  </span>
                  <p className="mt-1 text-sm break-words">{entry.mnemonic}</p>
                </div>
              </CardContent>
            </Card>
          )}

          {entry.commonMistakes && entry.commonMistakes.length > 0 && (
            <Card>
              <CardContent className="p-4">
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
              </CardContent>
            </Card>
          )}

          {entry.collocations.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Common Collocations</CardTitle></CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {entry.collocations.map((col, i) => (
                    <Badge key={i} variant="outline" className="text-sm px-3 py-1">{col}</Badge>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Examples Tab */}
        <TabsContent value="examples">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Example Sentences</CardTitle>
              <CardDescription>{entry.examples.length} example{entry.examples.length !== 1 ? 's' : ''}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {entry.examples.length > 0 ? (
                entry.examples.map((example, i) => (
                  <div key={i} className="rounded-xl border border-border/60 hover:border-primary/30 hover:shadow-sm transition-all bg-card">
                    <div className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-3">
                        <p className="text-lg font-medium break-words leading-relaxed">{example.chinese}</p>
                        <Button variant="ghost" size="icon" onClick={() => speak(example.chinese)} className="flex-shrink-0 h-8 w-8">
                          <Volume2 className="w-4 h-4" />
                        </Button>
                      </div>
                      <p className="text-sm text-primary/80 break-words italic">{example.pinyin}</p>
                      <p className="text-sm text-muted-foreground break-words leading-relaxed">{example.english}</p>
                    </div>
                    <div className="px-4 py-2 border-t bg-muted/30 rounded-b-xl flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="text-[10px] capitalize h-5">{example.difficulty}</Badge>
                        {example.source && (
                          <span className="text-[10px] text-muted-foreground">{example.source}</span>
                        )}
                      </div>
                      <span className="text-[10px] text-muted-foreground/60 tabular-nums">#{i + 1}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center text-muted-foreground py-8">No examples available for this word.</div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Related Tab */}
        <TabsContent value="related" className="space-y-4">
          {entry.synonyms.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Synonyms</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {entry.synonyms.map((syn, i) => (
                    <Card key={i} className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        const found = unifiedDictionary.getEntryByHanzi(syn.hanzi);
                        if (found) onRelatedWordClick(found);
                      }}>
                      <div className="text-xl font-bold">{syn.hanzi}</div>
                      {syn.pinyin && <div className="text-xs text-primary">{syn.pinyin}</div>}
                      {syn.hskLevel && <Badge variant="outline" className="mt-1 text-[10px]">HSK {syn.hskLevel}</Badge>}
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {entry.antonyms.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Antonyms</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {entry.antonyms.map((ant, i) => (
                    <Card key={i} className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        const found = unifiedDictionary.getEntryByHanzi(ant.hanzi);
                        if (found) onRelatedWordClick(found);
                      }}>
                      <div className="text-xl font-bold">{ant.hanzi}</div>
                      {ant.pinyin && <div className="text-xs text-primary">{ant.pinyin}</div>}
                      {ant.hskLevel && <Badge variant="outline" className="mt-1 text-[10px]">HSK {ant.hskLevel}</Badge>}
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {entry.wordFamily.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-lg">Word Family</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {entry.wordFamily.map((wf, i) => (
                    <Card key={i} className="p-3 cursor-pointer hover:shadow-md transition-shadow"
                      onClick={() => {
                        const found = unifiedDictionary.getEntryByHanzi(wf.hanzi);
                        if (found) onRelatedWordClick(found);
                      }}>
                      <div className="text-xl font-bold">{wf.hanzi}</div>
                      {wf.pinyin && <div className="text-xs text-primary">{wf.pinyin}</div>}
                      {wf.hskLevel && <Badge variant="outline" className="mt-1 text-[10px]">HSK {wf.hskLevel}</Badge>}
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default WordDetail;
