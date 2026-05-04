import { memo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Volume2,
  XCircle,
  CheckCircle2,
  SkipForward,
  Keyboard,
} from 'lucide-react';
import { SectionLoader } from '@/components/SectionLoader';
import type { UnifiedEntry } from '@/services/unifiedDictionaryService';
import { ttsService } from '@/services/ttsService';

const QuizMode = lazy(() => import('@/components/QuizMode'));

import { lazy, Suspense } from 'react';

interface StudyViewProps {
  showQuiz: boolean;
  entries: UnifiedEntry[];
  studyEntries: UnifiedEntry[];
  currentStudyIndex: number;
  showAnswer: boolean;
  dueCount: number;
  onSetShowQuiz: (show: boolean) => void;
  onExitToDashboard: () => void;
  onSetCurrentStudyIndex: (index: number | ((prev: number) => number)) => void;
  onSetShowAnswer: (show: boolean) => void;
  onHandleStudyResult: (correct: boolean) => void;
  onIncrementQuizzes: () => void;
  onRefreshStats: () => void;
}

export const StudyView = memo(function StudyView({
  showQuiz,
  entries,
  studyEntries,
  currentStudyIndex,
  showAnswer,
  dueCount,
  onSetShowQuiz,
  onExitToDashboard,
  onSetCurrentStudyIndex,
  onSetShowAnswer,
  onHandleStudyResult,
  onIncrementQuizzes,
  onRefreshStats,
}: StudyViewProps) {
  const [autoPlayAudio, setAutoPlayAudio] = useState(() => {
    try {
      return localStorage.getItem('openhsk.study-autoplay-audio') !== 'false';
    } catch { return true; }
  });
  const [showAllExamples, setShowAllExamples] = useState(false);

  const currentEntry = studyEntries[currentStudyIndex];

  // Keyboard shortcuts
  useEffect(() => {
    if (showQuiz) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;

      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        if (!showAnswer) {
          onSetShowAnswer(true);
        }
      }
      if (e.key === '1' && showAnswer) {
        e.preventDefault();
        onHandleStudyResult(false);
        onSetShowAnswer(false);
      }
      if (e.key === '2' && showAnswer) {
        e.preventDefault();
        onHandleStudyResult(true);
        onSetShowAnswer(false);
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        if (currentStudyIndex < studyEntries.length - 1) {
          onSetCurrentStudyIndex((prev) => prev + 1);
          onSetShowAnswer(false);
        }
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        onExitToDashboard();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showQuiz, showAnswer, currentStudyIndex, studyEntries.length, onSetShowAnswer, onHandleStudyResult, onSetCurrentStudyIndex, onExitToDashboard]);

  // Auto-play audio when answer is revealed
  useEffect(() => {
    if (showAnswer && autoPlayAudio && currentEntry) {
      const timer = setTimeout(() => {
        ttsService.speak(currentEntry.hanzi);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showAnswer, currentEntry, autoPlayAudio]);

  const handleToggleAutoPlay = useCallback(() => {
    setAutoPlayAudio((prev) => {
      const next = !prev;
      try { localStorage.setItem('openhsk.study-autoplay-audio', String(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const handleSkip = useCallback(() => {
    if (currentStudyIndex < studyEntries.length - 1) {
      onSetCurrentStudyIndex((prev) => prev + 1);
      onSetShowAnswer(false);
      setShowAllExamples(false);
    } else {
      onExitToDashboard();
    }
  }, [currentStudyIndex, studyEntries.length, onSetCurrentStudyIndex, onSetShowAnswer, onExitToDashboard]);

  if (showQuiz) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <Button variant="ghost" onClick={() => {
            onSetShowQuiz(false);
            onExitToDashboard();
          }}>
            ← Exit Quiz
          </Button>
        </div>
        <Suspense fallback={<SectionLoader label="Preparing quiz mode..." />}>
          <QuizMode
            entries={entries.slice(0, 100)}
            onComplete={() => {
              onIncrementQuizzes();
              onRefreshStats();
              setTimeout(() => {
                onSetShowQuiz(false);
                onExitToDashboard();
              }, 2000);
            }}
            onExit={() => {
              onSetShowQuiz(false);
              onExitToDashboard();
            }}
          />
        </Suspense>
      </div>
    );
  }

  if (!currentEntry) return null;

  const visibleExamples = showAllExamples
    ? currentEntry.examples
    : currentEntry.examples.slice(0, 3);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onExitToDashboard}>
          ← Exit Session
        </Button>
        <div className="flex items-center gap-3">
          <button
            onClick={handleToggleAutoPlay}
            className={`text-xs flex items-center gap-1 px-2 py-1 rounded-md transition-colors ${autoPlayAudio ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:text-foreground'}`}
            title="Toggle auto-play audio"
          >
            <Volume2 className="w-3 h-3" />
            {autoPlayAudio ? 'Auto' : 'Manual'}
          </button>
          <div className="text-sm text-muted-foreground tabular-nums">
            {currentStudyIndex + 1} / {studyEntries.length}
          </div>
        </div>
      </div>

      <Progress value={(currentStudyIndex / studyEntries.length) * 100} className="h-2" />

      {/* Flashcard */}
      <Card className="p-6 sm:p-8">
        <div className="text-center space-y-5">
          {/* Due badge */}
          {dueCount > 0 && currentStudyIndex === 0 && (
            <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-xs font-medium">
              <CheckCircle2 className="w-3 h-3" />
              {dueCount} due for review
            </div>
          )}

          <div className="space-y-2">
            <div className="text-6xl sm:text-7xl font-bold">{currentEntry.hanzi}</div>
            <div className="text-xl sm:text-2xl text-muted-foreground">{currentEntry.pinyin}</div>
          </div>

          <div className="flex items-center justify-center gap-2">
            <Button variant="outline" size="sm" onClick={() => ttsService.speak(currentEntry.hanzi)}>
              <Volume2 className="w-4 h-4 mr-2" />
              Listen
            </Button>
            <Button variant="ghost" size="sm" onClick={handleSkip}>
              <SkipForward className="w-4 h-4 mr-2" />
              Skip
            </Button>
          </div>

          <AnimatePresence mode="wait">
            {showAnswer && (
              <motion.div
                key="answer"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                className="space-y-4 pt-4 border-t"
              >
                {/* Definitions */}
                <div>
                  <div className="font-medium text-lg mb-2">Meanings:</div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    {currentEntry.definitions.map((def, i) => (
                      <Badge key={i} variant="secondary" className="text-base whitespace-normal break-words max-w-full">{def}</Badge>
                    ))}
                  </div>
                </div>

                {/* Examples */}
                {visibleExamples.length > 0 && (
                  <div className="space-y-2">
                    {visibleExamples.map((ex, i) => (
                      <div key={i} className="bg-muted p-3 rounded-lg text-left">
                        <div className="text-base break-words">{ex.chinese}</div>
                        <div className="text-sm text-muted-foreground break-words">{ex.pinyin}</div>
                        <div className="text-sm text-muted-foreground break-words">{ex.english}</div>
                      </div>
                    ))}
                    {currentEntry.examples.length > 3 && (
                      <button
                        onClick={() => setShowAllExamples((p) => !p)}
                        className="text-sm text-primary hover:underline"
                      >
                        {showAllExamples ? 'Show less' : `+ ${currentEntry.examples.length - 3} more examples`}
                      </button>
                    )}
                  </div>
                )}

                {/* Action buttons */}
                <div className="flex gap-2 justify-center pt-4">
                  <Button variant="destructive" onClick={() => { onHandleStudyResult(false); onSetShowAnswer(false); setShowAllExamples(false); }}>
                    <XCircle className="w-4 h-4 mr-2" />
                    Again (1)
                  </Button>
                  <Button variant="default" onClick={() => { onHandleStudyResult(true); onSetShowAnswer(false); setShowAllExamples(false); }}>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Got it (2)
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {!showAnswer && (
            <Button className="w-full" size="lg" onClick={() => onSetShowAnswer(true)}>
              <Keyboard className="w-4 h-4 mr-2" />
              Show Answer (Space)
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
});
