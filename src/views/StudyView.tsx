import { Suspense, lazy, memo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Volume2, Headphones, XCircle, CheckCircle2, Trophy, RotateCcw } from 'lucide-react';
import { ttsService } from '@/services/ttsService';
import { hskDataService } from '@/services/hskDataService';
import { SectionLoader } from './SectionLoader';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';
import type { ViewMode } from '@/App';

const QuizMode = lazy(() => import('@/components/QuizMode'));

interface StudyViewProps {
  studyEntries: UnifiedEntry[];
  currentStudyIndex: number;
  showAnswer: boolean;
  showQuiz: boolean;
  showStudyComplete: boolean;
  studyAutoPlay: boolean;
  quizEntries: UnifiedEntry[];
  onSetShowAnswer: (show: boolean) => void;
  onSetStudyAutoPlay: (value: boolean | ((prev: boolean) => boolean)) => void;
  onHandleStudyResult: (rating: 1 | 2 | 3 | 4) => void;
  onSetShowQuiz: (show: boolean) => void;
  onSetShowStudyComplete: (show: boolean) => void;
  onSetCurrentView: (view: ViewMode) => void;
  onStartStudySession: (size: number) => void;
  onRefreshStats: () => void;
}

export const StudyView = memo(function StudyView({
  studyEntries,
  currentStudyIndex,
  showAnswer,
  showQuiz,
  showStudyComplete,
  studyAutoPlay,
  quizEntries,
  onSetShowAnswer,
  onSetStudyAutoPlay,
  onHandleStudyResult,
  onSetShowQuiz,
  onSetShowStudyComplete,
  onSetCurrentView,
  onStartStudySession,
  onRefreshStats,
}: StudyViewProps) {
  if (showQuiz) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => { onSetShowQuiz(false); onSetCurrentView('dashboard'); }}>← Exit Quiz</Button>
        </div>
        <Suspense fallback={<SectionLoader label="Preparing quiz mode..." />}>
          <QuizMode
            entries={quizEntries}
            onComplete={() => {
              hskDataService.incrementQuizzes();
              onRefreshStats();
              setTimeout(() => { onSetShowQuiz(false); onSetCurrentView('dashboard'); }, 2000);
            }}
            onExit={() => { onSetShowQuiz(false); onSetCurrentView('dashboard'); }}
          />
        </Suspense>
      </div>
    );
  }

  if (showStudyComplete) {
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto">
        <Card className="p-8 text-center space-y-6">
          <div className="flex justify-center"><div className="p-4 bg-primary/10 rounded-full"><Trophy className="w-12 h-12 text-primary" /></div></div>
          <div>
            <h2 className="text-2xl font-bold mb-2">Session Complete!</h2>
            <p className="text-muted-foreground">You reviewed {studyEntries.length} words. Great work!</p>
          </div>
          <div className="flex gap-2 justify-center">
            <Button onClick={() => { onSetShowStudyComplete(false); onStartStudySession(studyEntries.length); }}><RotateCcw className="w-4 h-4 mr-2" />Study Again</Button>
            <Button variant="outline" onClick={() => { onSetShowStudyComplete(false); onSetCurrentView('dashboard'); }}>Back to Dashboard</Button>
          </div>
        </Card>
      </motion.div>
    );
  }

  const currentEntry = studyEntries[currentStudyIndex];
  if (!currentEntry) return null;

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={() => onSetCurrentView('dashboard')}>← Exit Session</Button>
        <div className="text-sm text-muted-foreground">{currentStudyIndex + 1} / {studyEntries.length}</div>
      </div>

      <Progress value={(currentStudyIndex / studyEntries.length) * 100} className="h-2" />

      <Card className="p-8">
        <div className="text-center space-y-6">
          <div className="space-y-2">
            <div className="text-5xl sm:text-7xl font-bold">{currentEntry.hanzi}</div>
            <div className="text-2xl text-muted-foreground">{currentEntry.pinyin}</div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => ttsService.speak(currentEntry.hanzi)}><Volume2 className="w-4 h-4 mr-2" />Listen</Button>
            <Button variant={studyAutoPlay ? 'secondary' : 'ghost'} size="sm" className="gap-1 text-xs" onClick={() => onSetStudyAutoPlay(prev => { const next = !prev; try { localStorage.setItem('openhsk.study-autoplay.v1', String(next)); } catch { /* ignore */ } return next; })}>
              <Headphones className="w-3.5 h-3.5" />Auto
            </Button>
          </div>

          <AnimatePresence>
            {showAnswer && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-4 pt-4 border-t">
                <div>
                  <div className="font-medium text-lg mb-2">Meanings:</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {currentEntry.definitions.map((def, i) => (
                      <Badge key={i} variant="secondary" className="text-base whitespace-normal break-words max-w-full">{def}</Badge>
                    ))}
                  </div>
                </div>

                {currentEntry.examples.length > 0 && (
                  <div className="bg-muted p-4 rounded-lg">
                    <div className="font-medium mb-1">Example:</div>
                    <div className="text-lg break-words">{currentEntry.examples[0].chinese}</div>
                    <div className="text-sm text-muted-foreground break-words">{currentEntry.examples[0].pinyin}</div>
                    <div className="text-sm text-muted-foreground break-words">{currentEntry.examples[0].english}</div>
                  </div>
                )}

                {currentEntry.characterBreakdown && currentEntry.characterBreakdown.length > 1 && (
                  <div className="bg-primary/[0.03] border border-primary/10 p-4 rounded-lg">
                    <div className="font-medium text-sm mb-2 flex items-center gap-1.5 text-primary/80">Character Breakdown</div>
                    <div className="flex flex-wrap gap-2 justify-center">
                      {currentEntry.characterBreakdown.map((char) => (
                        <div key={char.char} className="flex flex-col items-center gap-1 px-3 py-2 bg-background rounded-lg border border-border/50 min-w-[60px]">
                          <span className="text-xl font-bold">{char.char}</span>
                          <span className="text-xs text-muted-foreground">{char.pinyin}</span>
                          {char.definition && <span className="text-[10px] text-muted-foreground text-center leading-tight max-w-[80px]">{char.definition}</span>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="flex flex-wrap gap-2 justify-center pt-4">
                  <Button variant="destructive" onClick={() => onHandleStudyResult(1)} className="flex-1 min-w-[100px]"><XCircle className="w-4 h-4 mr-1.5" />Again <span className="ml-1 opacity-70 text-xs">(1)</span></Button>
                  <Button variant="outline" onClick={() => onHandleStudyResult(2)} className="flex-1 min-w-[100px] border-amber-500/50 text-amber-700 dark:text-amber-400 hover:bg-amber-500/10">Hard <span className="ml-1 opacity-70 text-xs">(2)</span></Button>
                  <Button variant="default" onClick={() => onHandleStudyResult(3)} className="flex-1 min-w-[100px]"><CheckCircle2 className="w-4 h-4 mr-1.5" />Good <span className="ml-1 opacity-70 text-xs">(3)</span></Button>
                  <Button variant="secondary" onClick={() => onHandleStudyResult(4)} className="flex-1 min-w-[100px] bg-green-100 text-green-700 hover:bg-green-200 dark:bg-green-900/40 dark:text-green-300 dark:hover:bg-green-900/60">Easy <span className="ml-1 opacity-70 text-xs">(4)</span></Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showAnswer && (
            <Button className="w-full" size="lg" onClick={() => onSetShowAnswer(true)}>Show Answer <span className="ml-2 opacity-60 text-sm">(Space)</span></Button>
          )}
        </div>
      </Card>
    </div>
  );
});
